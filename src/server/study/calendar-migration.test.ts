import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../../supabase/migrations/20261002220247_calendar_domain.sql",
    import.meta.url,
  ),
);

describe("calendar domain migration", () => {
  it("creates owner-aware series and stable occurrence exceptions", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("create table public.calendar_series");
    expect(sql).toContain("constraint calendar_series_subject_owner_fk");
    expect(sql).toContain("references public.subjects (id, user_id)");
    expect(sql).toContain("kind in ('exam', 'university', 'revision')");
    expect(sql).toContain("kind = 'exam' or duration_minutes is not null");
    expect(sql).toContain("create table public.calendar_exceptions");
    expect(sql).toContain("unique (series_id, original_start)");
    expect(sql).toContain("constraint calendar_exceptions_series_owner_fk");
    expect(sql).toContain("calendar_exceptions_series_start_idx");
  });

  it("enables private RLS with least-privilege column grants", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("alter table public.calendar_series enable row level security");
    expect(sql).toContain("alter table public.calendar_exceptions enable row level security");
    expect(sql).toContain("revoke all on table public.calendar_series from anon");
    expect(sql).toContain("revoke all on table public.calendar_exceptions from anon");
    expect(sql).toContain("grant insert (user_id, subject_id, kind, title, starts_at");
    expect(sql).not.toMatch(/grant\s+[^;]+\s+to\s+anon/i);
    expect(sql.match(/using \(\(select auth\.uid\(\)\) = user_id\)/g)).toHaveLength(6);
    expect(sql.match(/with check \(\(select auth\.uid\(\)\) = user_id\)/g)).toHaveLength(4);
  });

  it("bounds structured content and allowlists exception override keys", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("public.valid_calendar_notes_items");
    expect(sql).toContain("public.valid_calendar_override_payload");
    expect(sql).toContain("override_payload - array[");
    expect(sql).toContain("if p_action = 'cancelled' then");
    expect(sql).toContain("return override_payload = '{}'::jsonb");
    expect(sql).not.toContain("security definer");
  });
});
