import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createSupabaseChapterRepository,
  createSupabaseDocumentLibraryRepository,
  createSupabaseFolderRepository,
  createSupabaseUploadIntentRepository,
} from "./supabase-document-repositories";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const CHAPTER_ID = "33333333-3333-4333-8333-333333333333";
const FOLDER_ID = "44444444-4444-4444-8444-444444444444";
const PARENT_ID = "55555555-5555-4555-8555-555555555555";
const chapterRow = { created_at: "2026-10-06T00:00:00Z", id: CHAPTER_ID, name: "Algebra", position: 0, subject_id: SUBJECT_ID, updated_at: "2026-10-06T00:00:00Z" };
const folderRow = { chapter_id: CHAPTER_ID, created_at: "2026-10-06T00:00:00Z", id: FOLDER_ID, name: "Cours", parent_id: null, position: 0, subject_id: SUBJECT_ID, updated_at: "2026-10-06T00:00:00Z" };
const uploadRow = {
  chapter_id: null, created_at: "2026-10-06T12:00:00Z", display_name: "lecture.pdf",
  expires_at: "2026-10-06T12:10:00Z", extension: "pdf", file_id: "66666666-6666-4666-8666-666666666666",
  folder_id: null, intent_id: "77777777-7777-4777-8777-777777777777", mime_type: "application/pdf",
  object_key: `users/${USER_ID}/files/66666666-6666-4666-8666-666666666666`, original_filename: "lecture.pdf",
  size_bytes: 512, subject_id: SUBJECT_ID, upload_state: "pending",
};

function chain(reply: { data: unknown; error: unknown }) {
  const builder = { delete: vi.fn(), eq: vi.fn(), ilike: vi.fn(), insert: vi.fn(), is: vi.fn(), limit: vi.fn().mockResolvedValue(reply), maybeSingle: vi.fn().mockResolvedValue(reply), order: vi.fn(), select: vi.fn(), single: vi.fn().mockResolvedValue(reply), update: vi.fn() };
  for (const method of [builder.delete, builder.eq, builder.ilike, builder.insert, builder.is, builder.order, builder.select, builder.update]) method.mockReturnValue(builder);
  return builder;
}

describe("Supabase document hierarchy repositories", () => {
  it("creates a chapter through the atomic starter-folder RPC", async () => {
    const builder = chain({ data: chapterRow, error: null });
    const client = { rpc: vi.fn().mockReturnValue(builder) };
    const result = await createSupabaseChapterRepository(client as never).createOwnedWithStarters(USER_ID, {
      name: "Algebra", position: 0, subjectId: SUBJECT_ID,
    }, ["Cours", "TD", "Resume"]);
    expect(result).toMatchObject({ data: { id: CHAPTER_ID, subjectId: SUBJECT_ID }, errorCode: null });
    expect(client.rpc).toHaveBeenCalledWith("create_chapter_with_starter_folders", {
      p_name: "Algebra", p_position: 0, p_starter_names: ["Cours", "TD", "Resume"],
      p_subject_id: SUBJECT_ID, p_user_id: USER_ID,
    });
  });

  it("applies every supplied folder filter in addition to actor ownership", async () => {
    const builder = chain({ data: [folderRow], error: null });
    builder.order.mockResolvedValue({ data: [folderRow], error: null });
    const client = { from: vi.fn().mockReturnValue(builder) };
    const result = await createSupabaseFolderRepository(client as never).listOwned(USER_ID, {
      chapterId: CHAPTER_ID, parentId: null, subjectId: SUBJECT_ID,
    });
    expect(result).toMatchObject({ data: [{ id: FOLDER_ID }], errorCode: null });
    expect(builder.eq.mock.calls).toEqual(expect.arrayContaining([
      ["user_id", USER_ID], ["subject_id", SUBJECT_ID], ["chapter_id", CHAPTER_ID],
    ]));
    expect(builder.is).toHaveBeenCalledWith("parent_id", null);
  });

  it("delegates descendant checks to the owner-scoped invoker function", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: true, error: null }) };
    expect(await createSupabaseFolderRepository(client as never).isDescendantOwned(USER_ID, FOLDER_ID, PARENT_ID))
      .toEqual({ data: true, errorCode: null });
    expect(client.rpc).toHaveBeenCalledWith("is_folder_descendant", {
      p_ancestor_id: FOLDER_ID, p_candidate_id: PARENT_ID, p_user_id: USER_ID,
    });
  });

  it("fails closed on malformed provider rows and returned delete identities", async () => {
    const malformed = chain({ data: { ...folderRow, position: "zero" }, error: null });
    const malformedClient = { from: vi.fn().mockReturnValue(malformed) };
    expect(await createSupabaseFolderRepository(malformedClient as never).findOwned(USER_ID, FOLDER_ID))
      .toEqual({ data: null, errorCode: "provider_error" });

    const wrong = chain({ data: { id: PARENT_ID }, error: null });
    const wrongClient = { from: vi.fn().mockReturnValue(wrong) };
    expect(await createSupabaseFolderRepository(wrongClient as never).deleteOwned(USER_ID, FOLDER_ID))
      .toEqual({ data: false, errorCode: "provider_error" });
  });
});

describe("Supabase upload intent repository", () => {
  it("delegates quota reservation to one atomic RPC and validates its result", async () => {
    const builder = chain({ data: uploadRow, error: null });
    const client = { rpc: vi.fn().mockReturnValue(builder) };
    const result = await createSupabaseUploadIntentRepository(client as never).reserveOwned(USER_ID, {
      chapterId: null, extension: "pdf", filename: "lecture.pdf", folderId: null,
      mimeType: "application/pdf", sizeBytes: 512, subjectId: SUBJECT_ID,
    });
    expect(result).toMatchObject({ data: { fileId: uploadRow.file_id, intentId: uploadRow.intent_id }, errorCode: null });
    expect(client.rpc).toHaveBeenCalledWith("reserve_file_upload", {
      p_chapter_id: null, p_extension: "pdf", p_filename: "lecture.pdf", p_folder_id: null,
      p_mime_type: "application/pdf", p_size_bytes: 512, p_subject_id: SUBJECT_ID, p_user_id: USER_ID,
    });
  });

  it("fails closed when the provider returns malformed reservation data", async () => {
    const builder = chain({ data: { ...uploadRow, object_key: "foreign/key" }, error: null });
    const client = { rpc: vi.fn().mockReturnValue(builder) };
    expect(await createSupabaseUploadIntentRepository(client as never).reserveOwned(USER_ID, {
      chapterId: null, extension: "pdf", filename: "lecture.pdf", folderId: null,
      mimeType: "application/pdf", sizeBytes: 512, subjectId: SUBJECT_ID,
    })).toEqual({ data: null, errorCode: "provider_error" });
  });

  it("loads and finalizes upload completion through owner-scoped RPCs", async () => {
    const targetRow = {
      ...uploadRow, expected_mime_type: "application/pdf", intent_status: "pending",
    };
    delete (targetRow as Partial<typeof targetRow>).intent_id;
    const readyRow = {
      chapter_id: null, created_at: uploadRow.created_at, display_name: "lecture.pdf",
      extension: "pdf", file_id: uploadRow.file_id, folder_id: null, mime_type: "application/pdf",
      original_filename: "lecture.pdf", result_code: "READY", size_bytes: 500,
      subject_id: SUBJECT_ID, upload_state: "ready",
    };
    const targetBuilder = chain({ data: targetRow, error: null });
    const readyBuilder = chain({ data: readyRow, error: null });
    const client = { rpc: vi.fn().mockReturnValueOnce(targetBuilder).mockReturnValueOnce(readyBuilder) };
    const repo = createSupabaseUploadIntentRepository(client as never);
    expect(await repo.findCompletionTargetOwned(USER_ID, uploadRow.file_id))
      .toMatchObject({ data: { intentStatus: "pending", objectKey: uploadRow.object_key }, errorCode: null });
    expect(await repo.finalizeOwned(USER_ID, uploadRow.file_id, {
      actualMimeType: "application/pdf", actualSizeBytes: 500,
    })).toMatchObject({ data: { code: "READY", file: { id: uploadRow.file_id, sizeBytes: 500 } }, errorCode: null });
  });

  it("uses bounded server cleanup RPCs and validates their output", async () => {
    const client = { rpc: vi.fn()
      .mockResolvedValueOnce({ data: 2, error: null })
      .mockResolvedValueOnce({ data: [{ id: uploadRow.intent_id, object_key: uploadRow.object_key }], error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null }) };
    const repo = createSupabaseUploadIntentRepository(client as never);
    expect(await repo.expirePending(25)).toEqual({ data: 2, errorCode: null });
    expect(await repo.listDueCleanup(25)).toMatchObject({ data: [{ id: uploadRow.intent_id }] });
    expect(await repo.markCleanupCompleted(uploadRow.intent_id)).toEqual({ data: true, errorCode: null });
    expect(await repo.markCleanupRetry(uploadRow.intent_id, "PROVIDER_UNAVAILABLE"))
      .toEqual({ data: true, errorCode: null });
  });
});

describe("Supabase document library repository", () => {
  const fileRow = {
    chapter_id: null, created_at: uploadRow.created_at, display_name: "lecture.pdf",
    extension: "pdf", folder_id: null, id: uploadRow.file_id, mime_type: "application/pdf",
    original_filename: "lecture.pdf", size_bytes: 500, subject_id: SUBJECT_ID, upload_state: "ready",
  };

  it("lists only owned ready files with validated filters and ordering", async () => {
    const builder = chain({ data: [fileRow], error: null });
    const client = { from: vi.fn().mockReturnValue(builder) };
    const result = await createSupabaseDocumentLibraryRepository(client as never).listOwned(USER_ID, {
      limit: 25, query: "100%_lecture", sort: "name", subjectId: SUBJECT_ID,
    });
    expect(result).toMatchObject({ data: [{ id: uploadRow.file_id }], errorCode: null });
    expect(builder.eq.mock.calls).toEqual(expect.arrayContaining([
      ["user_id", USER_ID], ["upload_state", "ready"], ["subject_id", SUBJECT_ID],
    ]));
    expect(builder.ilike).toHaveBeenCalledWith("display_name", "%100\\%\\_lecture%");
    expect(builder.order).toHaveBeenCalledWith("display_name", { ascending: true });
  });

  it("validates the owned object key before returning a download target", async () => {
    const builder = chain({ data: { ...fileRow, object_key: `users/${USER_ID}/files/${uploadRow.file_id}` }, error: null });
    const client = { from: vi.fn().mockReturnValue(builder) };
    expect(await createSupabaseDocumentLibraryRepository(client as never).findDownloadOwned(USER_ID, uploadRow.file_id))
      .toMatchObject({ data: { objectKey: uploadRow.object_key }, errorCode: null });
  });

  it("uses owner-scoped RPCs for moves and idempotent logical deletion", async () => {
    const moved = chain({ data: fileRow, error: null });
    const client = { rpc: vi.fn().mockReturnValueOnce(moved).mockResolvedValueOnce({ data: true, error: null }) };
    const repository = createSupabaseDocumentLibraryRepository(client as never);
    expect(await repository.moveOwned(USER_ID, uploadRow.file_id, { chapterId: null, folderId: null }))
      .toMatchObject({ data: { id: uploadRow.file_id } });
    expect(await repository.deleteOwned(USER_ID, uploadRow.file_id)).toEqual({ data: true, errorCode: null });
  });
});
