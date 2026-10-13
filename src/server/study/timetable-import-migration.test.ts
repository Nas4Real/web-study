import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync("supabase/migrations/20261013123750_calendar_json_import.sql", "utf8");
describe("atomic timetable migration security contract", () => {
  it("enables owner-only RLS on import receipts", () => {
    expect(sql).toContain("alter table public.calendar_imports enable row level security");
    expect(sql).toContain("using ((select auth.uid()) = user_id)");
    expect(sql).toContain("unique (user_id, fingerprint)");
  });
  it("uses an invoker function with server-only execution", () => {
    expect(sql).toContain("security invoker");
    expect(sql).not.toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("current_user <> 'service_role'");
  });
  it("claims the idempotent receipt before inserting sessions and scopes foreign references", () => {
    expect(sql.indexOf("insert into public.calendar_imports")).toBeLessThan(sql.indexOf("insert into public.calendar_series"));
    expect(sql).toContain("on conflict (user_id, fingerprint) do nothing");
    expect(sql).toContain("where id = v_subject_id and user_id = p_user_id");
  });
});
