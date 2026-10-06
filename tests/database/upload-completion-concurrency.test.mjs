// Local integration proof: node --test tests/database/upload-completion-concurrency.test.mjs
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
    insert into public.subjects (id, user_id, name, color, position) values ('${subject}', '${actor}', 'Completion race', '#2563eb', 0); commit;`);
  const auth = `set local role authenticated; select set_config('request.jwt.claim.sub', '${actor}', true);`;
  const file = (await query(`begin; ${auth} select file_id from public.reserve_file_upload('${actor}', '${subject}', null, null, 'race.pdf', 'application/pdf', 'pdf', 1000); commit;`)).split(/\r?\n/).at(-1);
  const finalize = `select result_code from public.finalize_file_upload('${actor}', '${file}', 800, 'application/pdf');`;
  const cleanup = () => query(`delete from public.files where user_id = '${actor}'; delete from public.subjects where id = '${subject}'; delete from auth.users where id = '${actor}';`);
  return { actor, auth, file, finalize, cleanup };
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
  assert.fail("Concurrent completion did not wait on the file row lock");
}

test("concurrent completion retries count used bytes exactly once", { timeout: 30000 }, async () => {
  const f = await fixture();
  let release;
  try {
    release = await hold(`${f.auth} ${f.finalize}`);
    const name = `completion-proof-${randomUUID()}`;
    const pending = query(`set application_name = '${name}'; begin; ${f.auth} ${f.finalize} commit;`);
    await assertBlocked(name);
    await release(true); release = null;
    assert.equal((await pending).split(/\r?\n/).at(-1), "READY");
    assert.equal(await query(`select storage_used_bytes from public.profiles where id = '${f.actor}';`), "800");
    assert.equal(await query(`select storage_reserved_bytes from public.profiles where id = '${f.actor}';`), "0");
    assert.equal(await query(`select status from public.upload_intents where file_id = '${f.file}';`), "completed");
  } finally {
    if (release) await release(false);
    await f.cleanup();
  }
});
