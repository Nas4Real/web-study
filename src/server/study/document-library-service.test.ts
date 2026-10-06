import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DocumentLibraryService,
  type DocumentLibraryRepository,
  type DocumentLibraryStorage,
} from "./document-library-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const FILE_ID = "22222222-2222-4222-8222-222222222222";
const SUBJECT_ID = "33333333-3333-4333-8333-333333333333";
const FILE = {
  chapterId: null,
  createdAt: "2026-10-06T12:00:00.000Z",
  displayName: "Lecture.pdf",
  extension: "pdf",
  folderId: null,
  id: FILE_ID,
  mimeType: "application/pdf",
  originalFilename: "Lecture.pdf",
  sizeBytes: 512,
  subjectId: SUBJECT_ID,
  uploadState: "ready" as const,
};

function repository(
  overrides: Partial<DocumentLibraryRepository> = {},
): DocumentLibraryRepository {
  return {
    deleteOwned: vi.fn().mockResolvedValue({ data: true, errorCode: null }),
    findDownloadOwned: vi
      .fn()
      .mockResolvedValue({
        data: { file: FILE, objectKey: `users/${USER_ID}/files/${FILE_ID}` },
        errorCode: null,
      }),
    listOwned: vi.fn().mockResolvedValue({ data: [FILE], errorCode: null }),
    moveOwned: vi.fn().mockResolvedValue({ data: FILE, errorCode: null }),
    ...overrides,
  };
}

const storage: DocumentLibraryStorage = {
  presignDownload: vi.fn().mockResolvedValue("https://example.com/download"),
};

describe("DocumentLibraryService", () => {
  it("normalizes search and scopes ready-file listing to the actor", async () => {
    const repo = repository();
    const result = await new DocumentLibraryService(repo, storage).list(
      USER_ID,
      { query: "  lecture  ", sort: "name" },
    );
    expect(result).toEqual({ data: [FILE], status: "success" });
    expect(repo.listOwned).toHaveBeenCalledWith(USER_ID, {
      limit: 100,
      query: "lecture",
      sort: "name",
    });
  });

  it("issues a short-lived URL only for an owned ready file", async () => {
    const result = await new DocumentLibraryService(
      repository(),
      storage,
    ).createDownloadUrl(USER_ID, FILE_ID);
    expect(result).toEqual({
      data: { expiresInSeconds: 300, url: "https://example.com/download" },
      status: "success",
    });
    expect(storage.presignDownload).toHaveBeenCalledWith({
      expiresInSeconds: 300,
      key: `users/${USER_ID}/files/${FILE_ID}`,
    });
  });

  it("does not enumerate foreign files across download, move, and delete", async () => {
    const repo = repository({
      deleteOwned: vi.fn().mockResolvedValue({ data: false, errorCode: null }),
      findDownloadOwned: vi
        .fn()
        .mockResolvedValue({ data: null, errorCode: null }),
      moveOwned: vi.fn().mockResolvedValue({ data: null, errorCode: null }),
    });
    const service = new DocumentLibraryService(repo, storage);
    expect(await service.createDownloadUrl(USER_ID, FILE_ID)).toEqual({
      code: "NOT_FOUND",
      status: "error",
    });
    expect(
      await service.move(USER_ID, FILE_ID, { chapterId: null, folderId: null }),
    ).toEqual({ code: "NOT_FOUND", status: "error" });
    expect(await service.delete(USER_ID, FILE_ID)).toEqual({
      code: "NOT_FOUND",
      status: "error",
    });
  });

  it("rejects malformed actors and filters before reaching storage", async () => {
    const repo = repository();
    const service = new DocumentLibraryService(repo, storage);
    expect(await service.list("bad", {})).toEqual({
      code: "INVALID_ACTOR",
      status: "error",
    });
    expect(await service.list(USER_ID, { sort: "random" })).toEqual({
      code: "INVALID_INPUT",
      status: "error",
    });
    expect(repo.listOwned).not.toHaveBeenCalled();
  });
});
