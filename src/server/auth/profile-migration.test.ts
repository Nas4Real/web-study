import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../../supabase/migrations/20261001170000_auth_profile_bootstrap.sql",
    import.meta.url,
  ),
);

describe("auth profile bootstrap migration", () => {
  it("keeps profiles private and owner-scoped", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("alter table public.profiles enable row level security");
    expect(sql).toContain("revoke all on table public.profiles from anon");
    expect(sql).toContain("with check ((select auth.uid()) = id)");
    expect(sql).not.toMatch(/grant\s+[^;]+\s+to\s+anon/i);
  });

  it("bootstraps auth users through a locked-down security-definer trigger", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("after insert on auth.users");
    expect(sql).toContain(
      "revoke all on function public.bootstrap_auth_profile() from public, anon, authenticated",
    );
  });
});
