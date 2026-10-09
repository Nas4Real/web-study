import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL(
  "../../../supabase/migrations/20261009174015_allow_server_api_calendar_exceptions.sql",
  import.meta.url,
));

describe("calendar public API service-role migration", () => {
  it("keeps occurrence writes invoker-scoped and explicitly owner-aware", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("auth.uid() is distinct from p_user_id");
    expect(sql).toContain("current_user <> 'service_role'");
    expect(sql).toContain("s.id = p_series_id and s.user_id = p_user_id");
    expect(sql).not.toContain("security definer");
  });

  it("grants execution to sessions and the server role but never anon", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("to authenticated, service_role");
    expect(sql).not.toMatch(/grant execute[\s\S]*to (?:public|anon);/i);
  });
});
