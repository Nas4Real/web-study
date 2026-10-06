import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createSupabaseChapterRepository,
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
  const builder = { delete: vi.fn(), eq: vi.fn(), insert: vi.fn(), is: vi.fn(), maybeSingle: vi.fn().mockResolvedValue(reply), order: vi.fn(), select: vi.fn(), single: vi.fn().mockResolvedValue(reply), update: vi.fn() };
  for (const method of [builder.delete, builder.eq, builder.insert, builder.is, builder.order, builder.select, builder.update]) method.mockReturnValue(builder);
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
});
