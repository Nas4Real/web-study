import "server-only";

import {
  fileListFilterSchema,
  fileMoveInputSchema,
  type FileListFilter,
  type FileMetadata,
  type FileMoveInput,
} from "./document-domain";
import {
  actorIdSchema,
  entityIdSchema,
  INVALID_ACTOR,
  INVALID_INPUT,
  NOT_FOUND,
  type RepositoryResult,
  STORAGE_UNAVAILABLE,
  type StudyResult,
} from "./study-domain";

const DOWNLOAD_TTL_SECONDS = 300;

type DownloadTarget = Readonly<{ file: FileMetadata; objectKey: string }>;

export type DocumentLibraryRepository = Readonly<{
  deleteOwned(
    userId: string,
    fileId: string,
  ): Promise<RepositoryResult<boolean>>;
  findDownloadOwned(
    userId: string,
    fileId: string,
  ): Promise<RepositoryResult<DownloadTarget>>;
  listOwned(
    userId: string,
    filter: FileListFilter,
  ): Promise<RepositoryResult<readonly FileMetadata[]>>;
  moveOwned(
    userId: string,
    fileId: string,
    input: FileMoveInput,
  ): Promise<RepositoryResult<FileMetadata>>;
}>;

export type DocumentLibraryStorage = Readonly<{
  presignDownload(input: {
    expiresInSeconds: number;
    key: string;
  }): Promise<string>;
}>;

type LibraryResult<T> = StudyResult<T>;

function repositoryError(code: string | null) {
  if (code === "23503" || code === "foreign_key_violation") return NOT_FOUND;
  return STORAGE_UNAVAILABLE;
}

export class DocumentLibraryService {
  constructor(
    private readonly repository: DocumentLibraryRepository,
    private readonly storage: DocumentLibraryStorage,
  ) {}

  async list(
    actorId: unknown,
    filter: unknown = {},
  ): Promise<LibraryResult<readonly FileMetadata[]>> {
    const actor = actorIdSchema.safeParse(actorId);
    const parsed = fileListFilterSchema.safeParse(filter);
    if (!actor.success) return INVALID_ACTOR;
    if (!parsed.success) return INVALID_INPUT;
    try {
      const result = await this.repository.listOwned(actor.data, parsed.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      return { data: result.data ?? [], status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async createDownloadUrl(
    actorId: unknown,
    fileId: unknown,
  ): Promise<LibraryResult<{ expiresInSeconds: number; url: string }>> {
    const actor = actorIdSchema.safeParse(actorId);
    const id = entityIdSchema.safeParse(fileId);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success) return INVALID_INPUT;
    try {
      const target = await this.repository.findDownloadOwned(
        actor.data,
        id.data,
      );
      if (target.errorCode) return repositoryError(target.errorCode);
      if (!target.data) return NOT_FOUND;
      const url = await this.storage.presignDownload({
        expiresInSeconds: DOWNLOAD_TTL_SECONDS,
        key: target.data.objectKey,
      });
      return {
        data: { expiresInSeconds: DOWNLOAD_TTL_SECONDS, url },
        status: "success",
      };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async move(
    actorId: unknown,
    fileId: unknown,
    input: unknown,
  ): Promise<LibraryResult<FileMetadata>> {
    const actor = actorIdSchema.safeParse(actorId);
    const id = entityIdSchema.safeParse(fileId);
    const parsed = fileMoveInputSchema.safeParse(input);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success || !parsed.success) return INVALID_INPUT;
    try {
      const result = await this.repository.moveOwned(
        actor.data,
        id.data,
        parsed.data,
      );
      if (result.errorCode) return repositoryError(result.errorCode);
      return result.data ? { data: result.data, status: "success" } : NOT_FOUND;
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async delete(
    actorId: unknown,
    fileId: unknown,
  ): Promise<LibraryResult<null>> {
    const actor = actorIdSchema.safeParse(actorId);
    const id = entityIdSchema.safeParse(fileId);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success) return INVALID_INPUT;
    try {
      const result = await this.repository.deleteOwned(actor.data, id.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      return result.data ? { data: null, status: "success" } : NOT_FOUND;
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }
}
