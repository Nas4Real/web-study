import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../../supabase/migrations/20261002000429_profile_subject_avatar_domain.sql",
    import.meta.url,
  ),
);

describe("profile, subject, and avatar migration", () => {
  it("creates a constrained owner-addressable subjects table", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("create table public.subjects");
    expect(sql).toContain("unique (id, user_id)");
    expect(sql).toContain("subjects_user_id_idx");
    expect(sql).toContain("subjects_user_name_ci_uidx");
    expect(sql).toMatch(/lower\(name\)/);
    expect(sql).toContain("color text not null check (color ~ '^#[0-9a-f]{6}$')");
  });

  it("keeps every subject operation private and owner-scoped", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("alter table public.subjects enable row level security");
    expect(sql).toContain("revoke all on table public.subjects from anon");
    expect(sql).toContain(
      "grant select, delete on table public.subjects to authenticated",
    );
    expect(sql).toContain(
      "grant insert (user_id, name, color, icon, position) on public.subjects to authenticated",
    );
    expect(sql).toContain(
      "grant update (name, color, icon, position) on public.subjects to authenticated",
    );
    expect(sql.match(/using \(\(select auth\.uid\(\)\) = user_id\)/g)).toHaveLength(3);
    expect(sql.match(/with check \(\(select auth\.uid\(\)\) = user_id\)/g)).toHaveLength(2);
    expect(sql).not.toMatch(/grant\s+[^;]+\s+to\s+anon/i);
  });

  it("limits profile avatar keys to the owning user's opaque namespace", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("profiles_avatar_object_key_owned");
    expect(sql).toContain("'^users/' || id::text || '/avatars/'");
  });

  it("allows profile writes only to user-editable columns", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain(
      "revoke insert, update on table public.profiles from authenticated",
    );
    expect(sql).toContain(
      "grant insert (id, display_name, timezone, avatar_object_key) on public.profiles to authenticated",
    );
    expect(sql).toContain(
      "grant update (display_name, timezone, avatar_object_key) on public.profiles to authenticated",
    );
    expect(sql).not.toMatch(/grant update \([^)]*storage_/i);
  });
});
