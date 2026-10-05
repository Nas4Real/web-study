import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/20261006003015_document_hierarchy.sql", import.meta.url),
);

describe("document hierarchy migration", () => {
  it("creates constrained owner-aware chapters and folders with indexed foreign keys", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("create table public.chapters");
    expect(sql).toContain("create table public.folders");
    expect(sql).toContain("chapters_subject_owner_fk");
    expect(sql).toContain("folders_chapter_subject_owner_fk");
    expect(sql).toContain("folders_parent_subject_owner_fk");
    for (const index of ["chapters_subject_position_idx", "folders_chapter_parent_position_idx", "folders_parent_id_idx"]) {
      expect(sql).toContain(index);
    }
  });

  it("uses explicit grants plus complete owner RLS without anonymous access", async () => {
    const sql = await readFile(migrationPath, "utf8");
    for (const table of ["chapters", "folders"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on table public.${table} from anon`);
    }
    expect(sql.match(/using \(\(select auth\.uid\(\)\) = user_id\)/g)).toHaveLength(6);
    expect(sql.match(/with check \(\(select auth\.uid\(\)\) = user_id\)/g)).toHaveLength(4);
    expect(sql).not.toMatch(/grant\s+[^;]+\s+to\s+anon/i);
  });

  it("creates starter folders atomically and guards every hierarchy write against cycles", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("create function public.create_chapter_with_starter_folders");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("array['Cours', 'TD', 'Resume']");
    expect(sql).toContain("create function public.validate_folder_hierarchy");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("errcode = 'WSC01'");
    expect(sql).toContain("errcode = 'WSC02'");
    expect(sql).not.toContain("security definer");
  });
});
