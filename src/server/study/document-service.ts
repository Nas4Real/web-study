import "server-only";

import { z } from "zod";

import {
  MAX_FILE_BYTES,
  UPLOAD_URL_TTL_SECONDS,
  uploadIntentInputSchema,
  type UploadIntent,
  type UploadIntentInput,
  type UploadIntentReservation,
} from "./document-domain";
import {
  actorIdSchema, INVALID_ACTOR, INVALID_INPUT, NOT_FOUND,
  type RepositoryResult, STORAGE_UNAVAILABLE, type StudyResult,
} from "./study-domain";

type DocumentResult<T> = StudyResult<T,
  "FILE_TOO_LARGE" | "FILE_TYPE_NOT_ALLOWED" | "STORAGE_QUOTA_EXCEEDED"
>;

export type UploadIntentRepository = Readonly<{
  reserveOwned(userId: string, input: UploadIntentInput): Promise<RepositoryResult<UploadIntentReservation>>;
}>;

export type UploadSigner = Readonly<{
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
    private readonly repository: UploadIntentRepository,
    private readonly storage: UploadSigner,
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
}
