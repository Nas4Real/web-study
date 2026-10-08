import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL(
  "../../../supabase/migrations/20261008172409_personal_api_keys.sql",
  import.meta.url,
));

describe("personal API key migration", () => {
  it("stores only a prefix and fixed-length digest with bounded metadata", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("create table public.api_keys");
    expect(sql).toContain("key_prefix text not null unique");
    expect(sql).toContain("secret_digest text not null");
    expect(sql).not.toMatch(/raw_(key|token)|plaintext|secret_key/);
    expect(sql).toContain("api_keys_active_prefix_idx");
  });

  it("keeps key infrastructure inaccessible to browser roles", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("alter table public.api_keys enable row level security");
    expect(sql).toContain("revoke all on table public.api_keys from public, anon, authenticated");
    expect(sql).toContain("grant select, insert, update on table public.api_keys to service_role");
    expect(sql).not.toMatch(/grant .*api_keys to (anon|authenticated)/);
  });
});
