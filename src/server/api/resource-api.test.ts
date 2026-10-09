import { describe, expect, it, vi } from "vitest";

import type { DocumentLibraryService } from "@/server/study/document-library-service";
import type { ProfileService } from "@/server/study/profile-service";
import type { PublicApiRequestContext } from "./public-api-handler";
import { createFileItemAdapter, createFilesCollectionAdapter, createProfileAdapter,
  createStorageAdapter, createUnavailableStorageAdapter } from "./resource-api";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const FILE_ID = "22222222-2222-4222-8222-222222222222";
const SUBJECT_ID = "33333333-3333-4333-8333-333333333333";
const PROFILE = { avatarObjectKey: null, createdAt: "2026-10-01T00:00:00Z", displayName: "Nas",
  id: USER_ID, storageQuotaBytes: 2_147_483_648, storageReservedBytes: 10,
  storageUsedBytes: 20, timezone: "Africa/Tunis", updatedAt: "2026-10-01T00:00:00Z" };
const FILE = { chapterId: null, createdAt: "2026-10-06T12:00:00Z", displayName: "Lecture.pdf",
  extension: "pdf", folderId: null, id: FILE_ID, mimeType: "application/pdf",
  originalFilename: "Lecture.pdf", sizeBytes: 512, subjectId: SUBJECT_ID, uploadState: "ready" as const };
const CONTEXT: PublicApiRequestContext = { actor: { apiKeyId: FILE_ID, userId: USER_ID }, requestId: "resource-1" };

function dependencies() {
  return {
    files: { delete: vi.fn(), find: vi.fn(), list: vi.fn(), move: vi.fn() } as unknown as DocumentLibraryService,
    profile: { get: vi.fn(), update: vi.fn() } as unknown as ProfileService,
  };
}

describe("remaining public resource adapters", () => {
  it("projects profile and storage without exposing object keys", async () => {
    const deps = dependencies();
    vi.mocked(deps.profile.get).mockResolvedValue({ data: PROFILE, status: "success" });
    const profile = await createProfileAdapter(deps.profile)(new Request("https://x.test/profile"), CONTEXT);
    const storage = await createStorageAdapter(deps.profile)(new Request("https://x.test/storage"), CONTEXT);
    expect(await profile.json()).toMatchObject({ avatar_url: null, display_name: "Nas" });
    expect(await storage.json()).toEqual({ available_bytes: 2_147_483_618, quota_bytes: 2_147_483_648,
      reserved_bytes: 10, used_bytes: 20 });
  });

  it("lists and reads only safe file metadata", async () => {
    const deps = dependencies();
    vi.mocked(deps.files.list).mockResolvedValue({ data: [FILE], status: "success" });
    vi.mocked(deps.files.find).mockResolvedValue({ data: FILE, status: "success" });
    const list = await createFilesCollectionAdapter(deps.files)(new Request(
      `https://x.test/files?subject_id=${SUBJECT_ID}&limit=20&sort=name`,
    ), CONTEXT);
    const item = await createFileItemAdapter(deps.files, FILE_ID)(new Request(`https://x.test/files/${FILE_ID}`), CONTEXT);
    expect(deps.files.list).toHaveBeenCalledWith(USER_ID, { limit: 20, sort: "name", subjectId: SUBJECT_ID });
    expect(await list.json()).toEqual([expect.objectContaining({ id: FILE_ID, original_filename: "Lecture.pdf" })]);
    expect(JSON.stringify(await item.json())).not.toContain("object_key");
  });

  it("returns a stable unavailable response for R2-dependent operations", async () => {
    const response = await createUnavailableStorageAdapter()(new Request("https://x.test/files/upload-intents"), CONTEXT);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "PROVIDER_UNAVAILABLE" } });
  });

  it("merges profile patches without exposing or replacing the avatar object key", async () => {
    const deps = dependencies();
    vi.mocked(deps.profile.get).mockResolvedValue({ data: PROFILE, status: "success" });
    vi.mocked(deps.profile.update).mockResolvedValue({
      data: { ...PROFILE, displayName: "Nassim" },
      status: "success",
    });
    const response = await createProfileAdapter(deps.profile)(new Request("https://x.test/profile", {
      body: JSON.stringify({ display_name: "Nassim" }),
      method: "PATCH",
    }), CONTEXT);
    expect(deps.profile.update).toHaveBeenCalledWith(USER_ID, {
      avatarObjectKey: null,
      displayName: "Nassim",
      timezone: "Africa/Tunis",
    });
    expect(JSON.stringify(await response.json())).not.toContain("avatarObjectKey");
  });

  it("rejects malformed profile and file inputs", async () => {
    const deps = dependencies();
    vi.mocked(deps.profile.get).mockResolvedValue({ data: PROFILE, status: "success" });
    const profile = await createProfileAdapter(deps.profile)(new Request("https://x.test/profile", {
      body: JSON.stringify({ avatar_object_key: "users/other/avatar" }),
      method: "PATCH",
    }), CONTEXT);
    const files = await createFilesCollectionAdapter(deps.files)(
      new Request("https://x.test/files?unknown=true"), CONTEXT,
    );
    const duplicate = await createFilesCollectionAdapter(deps.files)(
      new Request("https://x.test/files?limit=10&limit=20"), CONTEXT,
    );
    const item = await createFileItemAdapter(deps.files, FILE_ID)(new Request(
      `https://x.test/files/${FILE_ID}`,
      { body: "{}", method: "PATCH" },
    ), CONTEXT);
    expect(profile.status).toBe(422);
    expect(files.status).toBe(422);
    expect(duplicate.status).toBe(422);
    expect(item.status).toBe(422);
    expect(deps.profile.update).not.toHaveBeenCalled();
    expect(deps.files.find).not.toHaveBeenCalled();
  });

  it("moves and deletes owned file metadata", async () => {
    const deps = dependencies();
    vi.mocked(deps.files.find).mockResolvedValue({ data: FILE, status: "success" });
    vi.mocked(deps.files.move).mockResolvedValue({
      data: { ...FILE, folderId: FILE_ID }, status: "success",
    });
    vi.mocked(deps.files.delete).mockResolvedValue({ data: null, status: "success" });
    const moved = await createFileItemAdapter(deps.files, FILE_ID)(new Request(
      `https://x.test/files/${FILE_ID}`,
      { body: JSON.stringify({ folder_id: FILE_ID }), method: "PATCH" },
    ), CONTEXT);
    const deleted = await createFileItemAdapter(deps.files, FILE_ID)(new Request(
      `https://x.test/files/${FILE_ID}`, { method: "DELETE" },
    ), CONTEXT);
    expect(deps.files.move).toHaveBeenCalledWith(USER_ID, FILE_ID, {
      chapterId: null,
      folderId: FILE_ID,
    });
    expect((await moved.json()).folder_id).toBe(FILE_ID);
    expect(deleted.status).toBe(204);
  });

  it("conceals missing files and sanitizes provider failures", async () => {
    const deps = dependencies();
    vi.mocked(deps.files.find)
      .mockResolvedValueOnce({ code: "NOT_FOUND", status: "error" })
      .mockResolvedValueOnce({ code: "STORAGE_UNAVAILABLE", status: "error" });
    const missing = await createFileItemAdapter(deps.files, FILE_ID)(
      new Request(`https://x.test/files/${FILE_ID}`), CONTEXT,
    );
    const unavailable = await createFileItemAdapter(deps.files, FILE_ID)(
      new Request(`https://x.test/files/${FILE_ID}`), CONTEXT,
    );
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ error: {
      code: "PROVIDER_UNAVAILABLE",
      message: "The service is temporarily unavailable.",
      request_id: "resource-1",
    } });
  });
});
