import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DocumentService, type UploadIntentRepository, type UploadSigner } from "./document-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const FILE_ID = "66666666-6666-4666-8666-666666666666";
const INTENT_ID = "77777777-7777-4777-8777-777777777777";
const CREATED_AT = "2026-10-06T12:00:00.000Z";
const EXPIRES_AT = "2026-10-06T12:10:00.000Z";
const OBJECT_KEY = `users/${USER_ID}/files/${FILE_ID}`;

const reservation = {
  chapterId: null,
  createdAt: CREATED_AT,
  displayName: "lecture.pdf",
  expiresAt: EXPIRES_AT,
  extension: "pdf",
  fileId: FILE_ID,
  folderId: null,
  intentId: INTENT_ID,
  mimeType: "application/pdf",
  objectKey: OBJECT_KEY,
  originalFilename: "lecture.pdf",
  sizeBytes: 512,
  subjectId: SUBJECT_ID,
  uploadState: "pending" as const,
};

function repository(overrides: Partial<UploadIntentRepository> = {}): UploadIntentRepository {
  return {
    reserveOwned: vi.fn().mockResolvedValue({ data: reservation, errorCode: null }),
    ...overrides,
  };
}

function signer(overrides: Partial<UploadSigner> = {}): UploadSigner {
  return {
    presignUpload: vi.fn().mockResolvedValue("https://upload.example.test/signed"),
    ...overrides,
  };
}

describe("DocumentService.createUploadIntent", () => {
  it("reserves quota before signing a Content-Type-bound upload", async () => {
    const repo = repository();
    const storage = signer();
    const result = await new DocumentService(repo, storage).createUploadIntent(USER_ID, {
      filename: " lecture.pdf ", mimeType: "APPLICATION/PDF", sizeBytes: 512, subjectId: SUBJECT_ID,
    });

    expect(result).toEqual({
      data: {
        expiresAt: EXPIRES_AT,
        file: {
          chapterId: null, createdAt: CREATED_AT, displayName: "lecture.pdf", extension: "pdf",
          folderId: null, id: FILE_ID, mimeType: "application/pdf", originalFilename: "lecture.pdf",
          sizeBytes: 512, subjectId: SUBJECT_ID, uploadState: "pending",
        },
        requiredHeaders: { "Content-Type": "application/pdf" },
        uploadUrl: "https://upload.example.test/signed",
      },
      status: "success",
    });
    expect(repo.reserveOwned).toHaveBeenCalledWith(USER_ID, {
      chapterId: null, extension: "pdf", filename: "lecture.pdf", folderId: null,
      mimeType: "application/pdf", sizeBytes: 512, subjectId: SUBJECT_ID,
    });
    expect(storage.presignUpload).toHaveBeenCalledWith({
      contentType: "application/pdf", expiresInSeconds: 600, key: OBJECT_KEY,
    });
  });

  it("maps invalid actor, unsupported files, foreign locations, and quota exhaustion", async () => {
    expect(await new DocumentService(repository(), signer()).createUploadIntent("bad", {}))
      .toEqual({ code: "INVALID_ACTOR", status: "error" });
    expect(await new DocumentService(repository(), signer()).createUploadIntent(USER_ID, {
      filename: "malware.exe", mimeType: "application/octet-stream", sizeBytes: 1, subjectId: SUBJECT_ID,
    })).toEqual({ code: "FILE_TYPE_NOT_ALLOWED", status: "error" });
    expect(await new DocumentService(repository(), signer()).createUploadIntent(USER_ID, {
      filename: "lecture.pdf", mimeType: "application/pdf", sizeBytes: 52_428_801, subjectId: SUBJECT_ID,
    })).toEqual({ code: "FILE_TOO_LARGE", status: "error" });
    expect(await new DocumentService(repository(), signer()).createUploadIntent(USER_ID, {
      filename: "lecture.pdf", mimeType: "application/pdf", sizeBytes: 1, subjectId: "bad",
    })).toEqual({ code: "INVALID_INPUT", status: "error" });
    expect(await new DocumentService(repository({
      reserveOwned: vi.fn().mockResolvedValue({ data: null, errorCode: "23503" }),
    }), signer()).createUploadIntent(USER_ID, {
      filename: "lecture.pdf", mimeType: "application/pdf", sizeBytes: 1, subjectId: SUBJECT_ID,
    })).toEqual({ code: "NOT_FOUND", status: "error" });
    expect(await new DocumentService(repository({
      reserveOwned: vi.fn().mockResolvedValue({ data: null, errorCode: "WSQ01" }),
    }), signer()).createUploadIntent(USER_ID, {
      filename: "lecture.pdf", mimeType: "application/pdf", sizeBytes: 1, subjectId: SUBJECT_ID,
    })).toEqual({ code: "STORAGE_QUOTA_EXCEEDED", status: "error" });
  });

  it("sanitizes database and signing failures", async () => {
    expect(await new DocumentService(repository({
      reserveOwned: vi.fn().mockRejectedValue(new Error("database secret")),
    }), signer()).createUploadIntent(USER_ID, {
      filename: "lecture.pdf", mimeType: "application/pdf", sizeBytes: 1, subjectId: SUBJECT_ID,
    })).toEqual({ code: "STORAGE_UNAVAILABLE", status: "error" });
    expect(await new DocumentService(repository(), signer({
      presignUpload: vi.fn().mockRejectedValue(new Error("provider secret")),
    })).createUploadIntent(USER_ID, {
      filename: "lecture.pdf", mimeType: "application/pdf", sizeBytes: 1, subjectId: SUBJECT_ID,
    })).toEqual({ code: "STORAGE_UNAVAILABLE", status: "error" });
  });
});
