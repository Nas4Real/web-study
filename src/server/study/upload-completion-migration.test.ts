import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL(
  "../../../supabase/migrations/20261006130600_upload_completion_cleanup.sql", import.meta.url,
));

describe("upload completion and cleanup migration", () => {
  it("creates a private bounded retry queue", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("create table public.file_cleanup_jobs");
    expect(sql).toContain("alter table public.file_cleanup_jobs enable row level security");
    expect(sql).toContain("file_cleanup_jobs_due_idx");
    expect(sql).toContain("attempts < 20");
  });

  it("locks completion state and finalizes reserved-to-used accounting exactly once", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("create function public.finalize_file_upload");
    expect(sql.match(/for update;/g)?.length).toBeGreaterThanOrEqual(3);
    expect(sql).toContain("storage_reserved_bytes = storage_reserved_bytes - locked_intent.declared_size_bytes");
    expect(sql).toContain("storage_used_bytes = storage_used_bytes + p_actual_size_bytes");
    expect(sql).toContain("locked_intent.status = 'completed'");
  });

  it("expires stale intents with skip-locked batching and releases reservations", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("create function public.expire_file_uploads");
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("least(greatest(coalesce(p_limit, 50), 1), 100)");
    expect(sql).toContain("grant execute on function public.expire_file_uploads(integer) to service_role");
  });
});
