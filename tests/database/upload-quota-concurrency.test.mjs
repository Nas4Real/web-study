// Local integration proof: node --test tests/database/upload-quota-concurrency.test.mjs
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
  const actor = randomUUID(), subject = randomUUID();
  await query(`begin; insert into auth.users (id, email) values ('${actor}', '${actor}@example.test');
    update public.profiles set storage_quota_bytes = 52428800 where id = '${actor}';
    insert into public.subjects (id, user_id, name, color, position) values ('${subject}', '${actor}', 'Quota race', '#2563eb', 0); commit;`);
  const auth = `set local role authenticated; select set_config('request.jwt.claim.sub', '${actor}', true);`;
  const reserve = name => `select * from public.reserve_file_upload('${actor}', '${subject}', null, null, '${name}.pdf', 'application/pdf', 'pdf', 52428800);`;
  const cleanup = () => query(`delete from public.files where user_id = '${actor}'; delete from public.subjects where id = '${subject}'; delete from auth.users where id = '${actor}';`);
  return { actor, auth, reserve, cleanup };
}

async function hold(sql) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "", errors = "";
  child.stderr.on("data", chunk => { errors += chunk; });
  const closed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(errors)));
  });
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
  for (let attempt = 0; attempt < 30; attempt++) {
    if (await query(`select count(*) from pg_stat_activity where application_name = '${name}' and wait_event_type = 'Lock';`) === "1") return;
    await delay(100);
  }
  assert.fail("Concurrent reservation did not wait on the profile row lock");
}

test("only one concurrent reservation can consume the remaining quota", { timeout: 30000 }, async () => {
  const f = await fixture();
  let release;
  try {
    release = await hold(`${f.auth} ${f.reserve("winner")}`);
    const name = `quota-proof-${randomUUID()}`;
    const pending = query(`set application_name = '${name}'; begin; ${f.auth} ${f.reserve("loser")} commit;`)
      .then(stdout => ({ stdout }), error => ({ error }));
    await assertBlocked(name);
    await release(true); release = null;
    const result = await pending;
    assert.ok(result.error, "The second reservation must fail after rechecking committed quota");
    assert.match(result.error.stderr, /storage quota exceeded/);
    assert.equal(await query(`select storage_reserved_bytes from public.profiles where id = '${f.actor}';`), "52428800");
    assert.equal(await query(`select count(*) from public.files where user_id = '${f.actor}';`), "1");
    assert.equal(await query(`select count(*) from public.upload_intents where user_id = '${f.actor}';`), "1");
  } finally {
    if (release) await release(false);
    await f.cleanup();
  }
});
