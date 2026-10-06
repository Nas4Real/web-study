import "server-only";

import { z } from "zod";

import {
  MAX_FILE_BYTES,
  UPLOAD_URL_TTL_SECONDS,
  uploadIntentInputSchema,
  type FileMetadata,
  type UploadIntent,
  type UploadIntentInput,
  type UploadIntentReservation,
} from "./document-domain";
import {
  actorIdSchema, INVALID_ACTOR, INVALID_INPUT, NOT_FOUND,
  type RepositoryResult, STORAGE_UNAVAILABLE, type StudyResult,
} from "./study-domain";

type DocumentResult<T> = StudyResult<T,
  "FILE_TOO_LARGE" | "FILE_TYPE_NOT_ALLOWED" | "STORAGE_QUOTA_EXCEEDED" |
  "UPLOAD_INTENT_EXPIRED" | "UPLOAD_VERIFICATION_FAILED"
>;

type CompletionTarget = Readonly<{
  expectedMimeType: string;
  expiresAt: string;
  file: FileMetadata;
  intentStatus: "pending" | "completed" | "expired" | "failed";
  objectKey: string;
}>;
type FinalizeResult = Readonly<{
  code: "READY" | "NOT_FOUND" | "EXPIRED" | "VERIFICATION_FAILED" | "QUOTA_EXCEEDED";
  file: FileMetadata | null;
}>;
type CleanupJob = Readonly<{ id: string; objectKey: string }>;

export type DocumentRepository = Readonly<{
  expirePending(limit: number): Promise<RepositoryResult<number>>;
  finalizeOwned(userId: string, fileId: string, actual: {
    actualMimeType: string | null;
    actualSizeBytes: number;
  }): Promise<RepositoryResult<FinalizeResult>>;
  findCompletionTargetOwned(userId: string, fileId: string): Promise<RepositoryResult<CompletionTarget>>;
  listDueCleanup(limit: number): Promise<RepositoryResult<readonly CleanupJob[]>>;
  markCleanupCompleted(jobId: string): Promise<RepositoryResult<boolean>>;
  markCleanupRetry(jobId: string, errorCode: "PROVIDER_UNAVAILABLE"): Promise<RepositoryResult<boolean>>;
  reserveOwned(userId: string, input: UploadIntentInput): Promise<RepositoryResult<UploadIntentReservation>>;
}>;

export type DocumentStorage = Readonly<{
  deleteObject(key: string): Promise<void>;
  headObject(key: string): Promise<Readonly<{
    contentLength: number | null;
    contentType: string | null;
    etag: string | null;
  }>>;
  presignUpload(input: {
    contentType: string;
    expiresInSeconds: number;
    key: string;
  }): Promise<string>;
}>;

function validationError(input: unknown) {
  const size = z.object({ sizeBytes: z.number() }).passthrough().safeParse(input);
  if (size.success && size.data.sizeBytes > MAX_FILE_BYTES) {
    return { code: "FILE_TOO_LARGE", status: "error" } as const;
  }
  const file = z.object({ filename: z.string(), mimeType: z.string() }).passthrough().safeParse(input);
  if (file.success) {
    const typeProbe = uploadIntentInputSchema.safeParse({
      chapterId: null,
      filename: file.data.filename,
      folderId: null,
      mimeType: file.data.mimeType,
      sizeBytes: 1,
      subjectId: "00000000-0000-4000-8000-000000000000",
    });
    if (!typeProbe.success) return { code: "FILE_TYPE_NOT_ALLOWED", status: "error" } as const;
  }
  return INVALID_INPUT;
}

function repositoryError(code: string | null) {
  if (code === "WSQ01") return { code: "STORAGE_QUOTA_EXCEEDED", status: "error" } as const;
  if (code === "23503" || code === "foreign_key_violation") return NOT_FOUND;
  return STORAGE_UNAVAILABLE;
}

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly storage: DocumentStorage,
  ) {}

  async createUploadIntent(actorId: unknown, input: unknown): Promise<DocumentResult<UploadIntent>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const parsed = uploadIntentInputSchema.safeParse(input);
    if (!parsed.success) return validationError(input);

    try {
      const reserved = await this.repository.reserveOwned(actor.data, parsed.data);
      if (reserved.errorCode) return repositoryError(reserved.errorCode);
      if (!reserved.data) return STORAGE_UNAVAILABLE;

      const uploadUrl = await this.storage.presignUpload({
        contentType: reserved.data.mimeType,
        expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
        key: reserved.data.objectKey,
      });
      return {
        data: {
          expiresAt: reserved.data.expiresAt,
          file: {
            chapterId: reserved.data.chapterId,
            createdAt: reserved.data.createdAt,
            displayName: reserved.data.displayName,
            extension: reserved.data.extension,
            folderId: reserved.data.folderId,
            id: reserved.data.fileId,
            mimeType: reserved.data.mimeType,
            originalFilename: reserved.data.originalFilename,
            sizeBytes: reserved.data.sizeBytes,
            subjectId: reserved.data.subjectId,
            uploadState: reserved.data.uploadState,
          },
          requiredHeaders: { "Content-Type": reserved.data.mimeType },
          uploadUrl,
        },
        status: "success",
      };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async completeUpload(actorId: unknown, fileId: unknown): Promise<DocumentResult<FileMetadata>> {
    const actor = actorIdSchema.safeParse(actorId);
    const id = z.string().uuid().safeParse(fileId);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success) return INVALID_INPUT;

    try {
      const target = await this.repository.findCompletionTargetOwned(actor.data, id.data);
      if (target.errorCode) return repositoryError(target.errorCode);
      if (!target.data) return NOT_FOUND;
      if (target.data.intentStatus === "completed" && target.data.file.uploadState === "ready") {
        return { data: target.data.file, status: "success" };
      }

      let actualSizeBytes = 0;
      let actualMimeType: string | null = null;
      try {
        const metadata = await this.storage.headObject(target.data.objectKey);
        actualSizeBytes = metadata.contentLength ?? 0;
        actualMimeType = metadata.contentType?.trim().toLowerCase() ?? null;
      } catch (error) {
        const code = error && typeof error === "object" ? Reflect.get(error, "code") : null;
        if (code !== "OBJECT_NOT_FOUND") return STORAGE_UNAVAILABLE;
      }

      const finalized = await this.repository.finalizeOwned(actor.data, id.data, {
        actualMimeType, actualSizeBytes,
      });
      if (finalized.errorCode) return repositoryError(finalized.errorCode);
      if (!finalized.data) return STORAGE_UNAVAILABLE;
      if (finalized.data.code === "READY" && finalized.data.file) {
        return { data: finalized.data.file, status: "success" };
      }
      if (finalized.data.code === "NOT_FOUND") return NOT_FOUND;
      if (finalized.data.code === "EXPIRED") {
        return { code: "UPLOAD_INTENT_EXPIRED", status: "error" };
      }
      if (finalized.data.code === "QUOTA_EXCEEDED") {
        return { code: "STORAGE_QUOTA_EXCEEDED", status: "error" };
      }
      return { code: "UPLOAD_VERIFICATION_FAILED", status: "error" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async runUploadCleanup(limitInput: unknown = 50): Promise<DocumentResult<{
    deleted: number;
    expired: number;
    retrying: number;
  }>> {
    const limit = z.number().int().min(1).max(100).safeParse(limitInput);
    if (!limit.success) return INVALID_INPUT;
    try {
      const expired = await this.repository.expirePending(limit.data);
      if (expired.errorCode || expired.data === null) return STORAGE_UNAVAILABLE;
      const due = await this.repository.listDueCleanup(limit.data);
      if (due.errorCode || !due.data) return STORAGE_UNAVAILABLE;
      let deleted = 0, retrying = 0;
      for (const job of due.data) {
        try {
          await this.storage.deleteObject(job.objectKey);
          const marked = await this.repository.markCleanupCompleted(job.id);
          if (marked.errorCode || !marked.data) return STORAGE_UNAVAILABLE;
          deleted += 1;
        } catch {
          const marked = await this.repository.markCleanupRetry(job.id, "PROVIDER_UNAVAILABLE");
          if (marked.errorCode || !marked.data) return STORAGE_UNAVAILABLE;
          retrying += 1;
        }
      }
      return { data: { deleted, expired: expired.data, retrying }, status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }
}
