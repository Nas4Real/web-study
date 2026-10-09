import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL(
  "../../../supabase/migrations/20261009100201_allow_server_api_service_operations.sql",
  import.meta.url,
));

describe("public API service-role migration", () => {
  it("keeps canonical functions invoker-scoped and owner-aware", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql.match(/security invoker/g)).toHaveLength(3);
    expect(sql.match(/set search_path = ''/g)).toHaveLength(3);
    expect(sql).toContain("auth.uid() is distinct from p_user_id");
    expect(sql).toContain("current_user <> 'service_role'");
    expect(sql).toContain("current_user = 'service_role'");
    expect(sql).not.toContain("security definer");
  });

  it("grants only authenticated sessions and the server role", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("to authenticated, service_role");
    expect(sql).not.toMatch(/grant execute[\s\S]*to (?:public|anon);/i);
  });
});
