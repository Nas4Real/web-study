import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../../supabase/migrations/20261002135935_task_domain.sql",
    import.meta.url,
  ),
);

describe("task domain migration", () => {
  it("creates constrained owner-aware tasks and ordered subtasks", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("create table public.tasks");
    expect(sql).toContain("constraint tasks_subject_owner_fk");
    expect(sql).toContain("references public.subjects (id, user_id)");
    expect(sql).toContain("status in ('pending', 'completed', 'someday')");
    expect(sql).toContain("status = 'completed' and completed_at is not null");
    expect(sql).toContain("description text");
    expect(sql).not.toMatch(/\bnotes\b/i);
    expect(sql).toContain("create table public.task_subtasks");
    expect(sql).toContain("constraint task_subtasks_task_owner_fk");
    expect(sql).toContain("task_subtasks_task_position_idx");
  });

  it("enables owner-scoped RLS and explicit least-privilege grants", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("alter table public.tasks enable row level security");
    expect(sql).toContain(
      "alter table public.task_subtasks enable row level security",
    );
    expect(sql).toContain("revoke all on table public.tasks from anon");
    expect(sql).toContain("revoke all on table public.task_subtasks from anon");
    expect(sql).toContain(
      "grant insert (user_id, subject_id, title, description, priority, due_at) on public.tasks to authenticated",
    );
    expect(sql).toContain(
      "grant update (subject_id, title, description, priority, status, due_at, completed_at) on public.tasks to authenticated",
    );
    expect(sql.match(/using \(\(select auth\.uid\(\)\) = user_id\)/g)).toHaveLength(6);
    expect(sql.match(/with check \(\(select auth\.uid\(\)\) = user_id\)/g)).toHaveLength(4);
    expect(sql).not.toMatch(/grant\s+[^;]+\s+to\s+anon/i);
  });

  it("uses an invoker-rights atomic creation function with restricted execute", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("create function public.create_task_with_subtasks");
    expect(sql).toContain("security invoker");
    expect(sql).not.toContain("security definer");
    expect(sql).toContain(
      "revoke all on function public.create_task_with_subtasks",
    );
    expect(sql).toContain(
      "grant execute on function public.create_task_with_subtasks",
    );
  });
});
