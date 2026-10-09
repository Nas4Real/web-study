import {
  folderCreateInputSchema, folderListFilterSchema, folderUpdateInputSchema,
  type Folder, type FolderCreate, type FolderListFilter, type FolderUpdate,
} from "./document-domain";
import {
  actorIdSchema, entityIdSchema, INVALID_ACTOR, INVALID_INPUT, NOT_FOUND,
  type RepositoryResult, STORAGE_UNAVAILABLE, type StudyResult,
} from "./study-domain";

type FolderResult<T> = StudyResult<T, "CONFLICT" | "FOLDER_CYCLE">;

export type FolderPageRequest = FolderListFilter & Readonly<{
  cursor: Readonly<{ createdAt: string; id: string; position: number }> | null;
  limit: number;
}>;

export type FolderPage = Readonly<{
  items: readonly Folder[];
  nextCursor: FolderPageRequest["cursor"];
}>;

export type FolderRepository = Readonly<{
  createOwned(userId: string, input: FolderCreate): Promise<RepositoryResult<Folder>>;
  deleteOwned(userId: string, folderId: string): Promise<RepositoryResult<boolean>>;
  findOwned(userId: string, folderId: string): Promise<RepositoryResult<Folder>>;
  isDescendantOwned(userId: string, folderId: string, candidateId: string): Promise<RepositoryResult<boolean>>;
  listOwned(userId: string, filter: FolderListFilter): Promise<RepositoryResult<readonly Folder[]>>;
  listPageOwned(userId: string, input: FolderPageRequest): Promise<RepositoryResult<readonly Folder[]>>;
  updateOwned(userId: string, folderId: string, input: FolderUpdate): Promise<RepositoryResult<Folder>>;
}>;

function repositoryError(code: string | null, operation: "write" | "delete") {
  if (code === "WSC01") return { code: "FOLDER_CYCLE", status: "error" } as const;
  if (code === "WSC02") return { code: "CONFLICT", status: "error" } as const;
  if (code === "23505" || code === "unique_violation") return { code: "DUPLICATE_NAME", status: "error" } as const;
  if (code === "23503" || code === "foreign_key_violation") {
    return operation === "delete"
      ? { code: "CONFLICT", status: "error" } as const
      : NOT_FOUND;
  }
  if (code === "23514" || code === "check_violation") return INVALID_INPUT;
  return STORAGE_UNAVAILABLE;
}

export class FolderService {
  constructor(private readonly repository: FolderRepository) {}

  async list(actorId: unknown, filter: unknown = {}): Promise<FolderResult<readonly Folder[]>> {
    const actor = actorIdSchema.safeParse(actorId), parsed = folderListFilterSchema.safeParse(filter);
    if (!actor.success) return INVALID_ACTOR;
    if (!parsed.success) return INVALID_INPUT;
    try {
      const result = await this.repository.listOwned(actor.data, parsed.data);
      if (result.errorCode) return repositoryError(result.errorCode, "write");
      return { data: result.data ?? [], status: "success" };
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async listPage(actorId: unknown, input: FolderPageRequest): Promise<FolderResult<FolderPage>> {
    const actor = actorIdSchema.safeParse(actorId);
    const filter = folderListFilterSchema.safeParse({
      ...(input.chapterId === undefined ? {} : { chapterId: input.chapterId }),
      ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
      ...(input.subjectId === undefined ? {} : { subjectId: input.subjectId }),
    });
    if (!actor.success) return INVALID_ACTOR;
    if (!filter.success || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) return INVALID_INPUT;
    try {
      const result = await this.repository.listPageOwned(actor.data, {
        ...filter.data, cursor: input.cursor, limit: input.limit + 1,
      });
      if (result.errorCode) return repositoryError(result.errorCode, "write");
      const rows = result.data ?? [];
      const items = rows.slice(0, input.limit);
      const last = items.at(-1);
      return {
        data: {
          items,
          nextCursor: rows.length > input.limit && last
            ? { createdAt: last.createdAt, id: last.id, position: last.position }
            : null,
        },
        status: "success",
      };
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async find(actorId: unknown, folderId: unknown): Promise<FolderResult<Folder>> {
    const actor = actorIdSchema.safeParse(actorId), id = entityIdSchema.safeParse(folderId);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success) return INVALID_INPUT;
    try {
      const result = await this.repository.findOwned(actor.data, id.data);
      if (result.errorCode) return repositoryError(result.errorCode, "write");
      return result.data ? { data: result.data, status: "success" } : NOT_FOUND;
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async create(actorId: unknown, input: unknown): Promise<FolderResult<Folder>> {
    const actor = actorIdSchema.safeParse(actorId), parsed = folderCreateInputSchema.safeParse(input);
    if (!actor.success) return INVALID_ACTOR;
    if (!parsed.success) return INVALID_INPUT;
    try {
      const result = await this.repository.createOwned(actor.data, parsed.data);
      if (result.errorCode) return repositoryError(result.errorCode, "write");
      return result.data ? { data: result.data, status: "success" } : STORAGE_UNAVAILABLE;
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async update(actorId: unknown, folderId: unknown, input: unknown): Promise<FolderResult<Folder>> {
    const actor = actorIdSchema.safeParse(actorId), id = entityIdSchema.safeParse(folderId);
    const parsed = folderUpdateInputSchema.safeParse(input);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success || !parsed.success) return INVALID_INPUT;
    if (parsed.data.parentId === id.data) return { code: "FOLDER_CYCLE", status: "error" };
    try {
      if (parsed.data.parentId) {
        const descendant = await this.repository.isDescendantOwned(actor.data, id.data, parsed.data.parentId);
        if (descendant.errorCode) return repositoryError(descendant.errorCode, "write");
        if (descendant.data) return { code: "FOLDER_CYCLE", status: "error" };
      }
      const result = await this.repository.updateOwned(actor.data, id.data, parsed.data);
      if (result.errorCode) return repositoryError(result.errorCode, "write");
      return result.data ? { data: result.data, status: "success" } : NOT_FOUND;
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async delete(actorId: unknown, folderId: unknown): Promise<FolderResult<null>> {
    const actor = actorIdSchema.safeParse(actorId), id = entityIdSchema.safeParse(folderId);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success) return INVALID_INPUT;
    try {
      const result = await this.repository.deleteOwned(actor.data, id.data);
      if (result.errorCode) return repositoryError(result.errorCode, "delete");
      return result.data ? { data: null, status: "success" } : NOT_FOUND;
    } catch { return STORAGE_UNAVAILABLE; }
  }
}
