import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DocumentService, type DocumentRepository, type DocumentStorage,
} from "./document-service";

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

const readyFile = {
  chapterId: null, createdAt: CREATED_AT, displayName: "lecture.pdf", extension: "pdf",
  folderId: null, id: FILE_ID, mimeType: "application/pdf", originalFilename: "lecture.pdf",
  sizeBytes: 500, subjectId: SUBJECT_ID, uploadState: "ready" as const,
};
const completionTarget = {
  expiresAt: EXPIRES_AT, expectedMimeType: "application/pdf", file: { ...readyFile, sizeBytes: 512, uploadState: "pending" as const },
  intentStatus: "pending" as const, objectKey: OBJECT_KEY,
};

function repository(overrides: Partial<DocumentRepository> = {}): DocumentRepository {
  return {
    expirePending: vi.fn().mockResolvedValue({ data: 0, errorCode: null }),
    finalizeOwned: vi.fn().mockResolvedValue({ data: { code: "READY", file: readyFile }, errorCode: null }),
    findCompletionTargetOwned: vi.fn().mockResolvedValue({ data: completionTarget, errorCode: null }),
    listDueCleanup: vi.fn().mockResolvedValue({ data: [], errorCode: null }),
    markCleanupCompleted: vi.fn().mockResolvedValue({ data: true, errorCode: null }),
    markCleanupRetry: vi.fn().mockResolvedValue({ data: true, errorCode: null }),
    reserveOwned: vi.fn().mockResolvedValue({ data: reservation, errorCode: null }),
    ...overrides,
  };
}

function signer(overrides: Partial<DocumentStorage> = {}): DocumentStorage {
  return {
    deleteObject: vi.fn().mockResolvedValue(undefined),
    headObject: vi.fn().mockResolvedValue({ contentLength: 500, contentType: "application/pdf", etag: "etag" }),
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

describe("DocumentService.completeUpload", () => {
  it("HEAD-verifies the owned object and atomically finalizes actual quota", async () => {
    const repo = repository();
    const storage = signer();
    expect(await new DocumentService(repo, storage).completeUpload(USER_ID, FILE_ID))
      .toEqual({ data: readyFile, status: "success" });
    expect(storage.headObject).toHaveBeenCalledWith(OBJECT_KEY);
    expect(repo.finalizeOwned).toHaveBeenCalledWith(USER_ID, FILE_ID, {
      actualMimeType: "application/pdf", actualSizeBytes: 500,
    });
  });

  it("returns an already-ready file without re-reading R2", async () => {
    const storage = signer();
    const repo = repository({
      findCompletionTargetOwned: vi.fn().mockResolvedValue({
        data: { ...completionTarget, file: readyFile, intentStatus: "completed" }, errorCode: null,
      }),
    });
    expect(await new DocumentService(repo, storage).completeUpload(USER_ID, FILE_ID))
      .toEqual({ data: readyFile, status: "success" });
    expect(storage.headObject).not.toHaveBeenCalled();
  });

  it("maps missing, expired, invalid, and quota-exceeding uploads to stable errors", async () => {
    expect(await new DocumentService(repository(), signer()).completeUpload("bad", FILE_ID))
      .toEqual({ code: "INVALID_ACTOR", status: "error" });
    expect(await new DocumentService(repository(), signer()).completeUpload(USER_ID, "bad"))
      .toEqual({ code: "INVALID_INPUT", status: "error" });
    expect(await new DocumentService(repository({
      findCompletionTargetOwned: vi.fn().mockResolvedValue({ data: null, errorCode: null }),
    }), signer()).completeUpload(USER_ID, FILE_ID)).toEqual({ code: "NOT_FOUND", status: "error" });
    for (const [databaseCode, publicCode] of [
      ["EXPIRED", "UPLOAD_INTENT_EXPIRED"],
      ["VERIFICATION_FAILED", "UPLOAD_VERIFICATION_FAILED"],
      ["QUOTA_EXCEEDED", "STORAGE_QUOTA_EXCEEDED"],
    ] as const) {
      const repo = repository({
        finalizeOwned: vi.fn().mockResolvedValue({ data: { code: databaseCode, file: null }, errorCode: null }),
      });
      expect(await new DocumentService(repo, signer()).completeUpload(USER_ID, FILE_ID))
        .toEqual({ code: publicCode, status: "error" });
    }
  });

  it("records a missing R2 object as a verification failure", async () => {
    const repo = repository({
      finalizeOwned: vi.fn().mockResolvedValue({ data: { code: "VERIFICATION_FAILED", file: null }, errorCode: null }),
    });
    const storage = signer({
      headObject: vi.fn().mockRejectedValue({ code: "OBJECT_NOT_FOUND" }),
    });
    expect(await new DocumentService(repo, storage).completeUpload(USER_ID, FILE_ID))
      .toEqual({ code: "UPLOAD_VERIFICATION_FAILED", status: "error" });
    expect(repo.finalizeOwned).toHaveBeenCalledWith(USER_ID, FILE_ID, {
      actualMimeType: null, actualSizeBytes: 0,
    });
  });
});

describe("DocumentService.runUploadCleanup", () => {
  it("expires stale reservations and deletes due objects idempotently", async () => {
    const repo = repository({
      expirePending: vi.fn().mockResolvedValue({ data: 2, errorCode: null }),
      listDueCleanup: vi.fn().mockResolvedValue({
        data: [{ id: INTENT_ID, objectKey: OBJECT_KEY }], errorCode: null,
      }),
    });
    const storage = signer();
    expect(await new DocumentService(repo, storage).runUploadCleanup(25)).toEqual({
      data: { deleted: 1, expired: 2, retrying: 0 }, status: "success",
    });
    expect(storage.deleteObject).toHaveBeenCalledWith(OBJECT_KEY);
    expect(repo.markCleanupCompleted).toHaveBeenCalledWith(INTENT_ID);
  });

  it("schedules a sanitized retry when R2 deletion fails", async () => {
    const repo = repository({
      listDueCleanup: vi.fn().mockResolvedValue({
        data: [{ id: INTENT_ID, objectKey: OBJECT_KEY }], errorCode: null,
      }),
    });
    const storage = signer({ deleteObject: vi.fn().mockRejectedValue(new Error("provider secret")) });
    expect(await new DocumentService(repo, storage).runUploadCleanup(10)).toEqual({
      data: { deleted: 0, expired: 0, retrying: 1 }, status: "success",
    });
    expect(repo.markCleanupRetry).toHaveBeenCalledWith(INTENT_ID, "PROVIDER_UNAVAILABLE");
  });
});
