import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL(
  "../../../supabase/migrations/20261008175956_api_rate_windows.sql",
  import.meta.url,
));

describe("public API rate-window migration", () => {
  it("uses one atomic upsert for each key and fixed window", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("create table public.api_rate_windows");
    expect(sql).toContain("primary key (api_key_id, window_start)");
    expect(sql).toContain("on conflict (api_key_id, window_start)");
    expect(sql).toContain("request_count = api_rate_windows.request_count + 1");
    expect(sql).toContain("returning api_rate_windows.request_count");
  });

  it("keeps the table and function server-only with a locked search path", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("alter table public.api_rate_windows enable row level security");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("revoke all on function public.consume_api_rate_limit");
    expect(sql).toContain("grant execute on function public.consume_api_rate_limit");
    expect(sql).not.toMatch(/grant .*api_rate_windows to (anon|authenticated)/);
  });
});
