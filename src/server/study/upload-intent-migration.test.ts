import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/20261006123320_file_upload_intents.sql", import.meta.url),
);

describe("file upload intent migration", () => {
  it("creates private owner-aware file and intent tables", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("create table public.files");
    expect(sql).toContain("create table public.upload_intents");
    expect(sql).toContain("files_subject_owner_fk");
    expect(sql).toContain("files_chapter_subject_owner_fk");
    expect(sql).toContain("files_folder_subject_owner_fk");
    expect(sql).toContain("upload_intents_file_owner_fk");
    expect(sql).toContain("alter table public.files enable row level security");
    expect(sql).toContain("alter table public.upload_intents enable row level security");
    expect(sql).toContain("revoke all on table public.upload_intents from authenticated");
  });

  it("reserves quota and creates metadata in one locked security-definer function", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("create function public.reserve_file_upload");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toMatch(/from public\.profiles[\s\S]+for update/);
    expect(sql).toContain("errcode = 'WSQ01'");
    expect(sql).toContain("storage_reserved_bytes = storage_reserved_bytes + p_size_bytes");
    expect(sql).toContain("grant execute on function public.reserve_file_upload");
  });

  it("prevents direct quota-counter and upload metadata writes", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("revoke update (storage_quota_bytes, storage_used_bytes, storage_reserved_bytes)");
    expect(sql).not.toMatch(/grant\s+(?:insert|update|delete)[^;]+public\.upload_intents\s+to authenticated/i);
    expect(sql).not.toMatch(/grant\s+(?:insert|update|delete)[^;]+public\.files\s+to authenticated/i);
  });
});
