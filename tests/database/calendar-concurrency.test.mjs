// Local integration proof: node --test tests/database/calendar-concurrency.test.mjs
// Uses only the existing local Docker database, never a linked/remote project.
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

const exec = promisify(execFile);
const args = ["exec", "-i", "supabase_db_STUDY_APP", "psql", "-U", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1"];
const query = async sql => (await exec("docker", [...args, "-c", sql], { timeout: 10000 })).stdout.trim();

async function fixture() {
  const actor = randomUUID(), subject = randomUUID(), series = randomUUID();
  await query(`begin; insert into auth.users (id, email) values ('${actor}', '${actor}@example.test');
    insert into public.subjects (id, user_id, name, color, position) values ('${subject}', '${actor}', 'Concurrency proof', '#2563eb', 0);
    insert into public.calendar_series (id, user_id, subject_id, kind, title, starts_at, duration_minutes, timezone, recurrence_rule)
    values ('${series}', '${actor}', '${subject}', 'university', 'Concurrency proof', '2026-10-05T08:00:00Z', 45, 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3'); commit;`);
  const auth = `set local role authenticated; select set_config('request.jwt.claim.sub', '${actor}', true);`;
  const mutation = `select * from public.save_calendar_exception('${actor}', '${series}', '2026-10-12T08:00:00Z', 'cancelled', '{}', '2026-10-05T08:00:00Z', 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3');`;
  const direct = `insert into public.calendar_exceptions (user_id, series_id, original_start, action) values ('${actor}', '${series}', '2026-10-12T08:00:00Z', 'cancelled');`;
  const rewrite = `update public.calendar_series set starts_at = '2026-10-06T08:00:00Z' where id = '${series}';`;
  const cleanup = () => query(`delete from public.calendar_series where id = '${series}' and user_id = '${actor}';
    delete from public.subjects where id = '${subject}' and user_id = '${actor}'; delete from auth.users where id = '${actor}';`);
  return { actor, series, auth, mutation, direct, rewrite, cleanup };
}

async function hold(sql) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "", errors = "";
  child.stderr.on("data", chunk => { errors += chunk; });
  const closed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(errors)));
  });
  // Attach immediately so an early process failure never becomes unhandled.
  closed.catch(() => {});
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error(`Lock-holder timeout: ${errors}`)); }, 10000);
    child.stdout.on("data", chunk => {
      output += chunk;
      if (output.includes("LOCK_READY")) { clearTimeout(timeout); resolve(); }
    });
    closed.catch(error => { clearTimeout(timeout); reject(error); });
    child.stdin.write(`begin; ${sql} select 'LOCK_READY';\n`);
  });
  return async commit => { child.stdin.end(`${commit ? "commit" : "rollback"};\n\\q\n`); await closed; };
}

async function assertBlocked(name) {
  // Synchronize on the database lock wait, not a guessed sleep duration.
  for (let attempt = 0; attempt < 30; attempt++) {
    if (await query(`select count(*) from pg_stat_activity where application_name = '${name}' and wait_event_type = 'Lock';`) === "1") return;
    await delay(100);
  }
  assert.fail("Concurrent writer did not wait on the master lock");
}

for (const first of ["occurrence", "direct occurrence", "schedule"]) {
  test(`${first} winner rejects the conflicting concurrent writer`, { timeout: 30000 }, async () => {
    const f = await fixture();
    let release;
    try {
      const occurrenceWins = first !== "schedule";
      release = await hold(`${f.auth} ${first === "direct occurrence" ? f.direct : occurrenceWins ? f.mutation : f.rewrite}`);
      const name = `calendar-proof-${randomUUID()}`;
      const pending = query(`set application_name = '${name}'; begin; ${f.auth} ${occurrenceWins ? f.rewrite : f.mutation} commit;`)
        .then(stdout => ({ stdout }), error => ({ error }));
      await assertBlocked(name);
      await release(true); release = null;
      const result = await pending;
      assert.ok(result.error, "Conflicting writer must fail rather than corrupt original identities");
      assert.match(result.error.stderr, occurrenceWins ? /Calendar schedule has exceptions/ : /Calendar schedule changed/);
      assert.equal(await query(`select count(*) from public.calendar_exceptions where series_id = '${f.series}';`), occurrenceWins ? "1" : "0");
      assert.equal(await query(`select starts_at = '${occurrenceWins ? "2026-10-05" : "2026-10-06"}T08:00:00Z'::timestamptz from public.calendar_series where id = '${f.series}';`), "t");
    } finally {
      if (release) await release(false);
      await f.cleanup();
    }
  });
}
