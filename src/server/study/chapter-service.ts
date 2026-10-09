import {
  chapterCreateInputSchema,
  chapterListFilterSchema,
  chapterUpdateInputSchema,
  type Chapter,
  type ChapterCreate,
  type ChapterListFilter,
  type ChapterUpdate,
} from "./document-domain";
import {
  actorIdSchema, entityIdSchema, INVALID_ACTOR, INVALID_INPUT, NOT_FOUND,
  type RepositoryResult, STORAGE_UNAVAILABLE, type StudyResult,
} from "./study-domain";

const STARTER_FOLDERS = ["Cours", "TD", "Resume"] as const;
type ChapterResult<T> = StudyResult<T, "CONFLICT">;

export type ChapterPageRequest = Readonly<{
  cursor: Readonly<{ createdAt: string; id: string; position: number }> | null;
  limit: number;
  subjectId?: string;
}>;

export type ChapterPage = Readonly<{
  items: readonly Chapter[];
  nextCursor: ChapterPageRequest["cursor"];
}>;

export type ChapterRepository = Readonly<{
  createOwnedWithStarters(userId: string, input: ChapterCreate, starterNames: readonly string[]): Promise<RepositoryResult<Chapter>>;
  deleteOwned(userId: string, chapterId: string): Promise<RepositoryResult<boolean>>;
  findOwned(userId: string, chapterId: string): Promise<RepositoryResult<Chapter>>;
  listOwned(userId: string, filter: ChapterListFilter): Promise<RepositoryResult<readonly Chapter[]>>;
  listPageOwned(userId: string, input: ChapterPageRequest): Promise<RepositoryResult<readonly Chapter[]>>;
  updateOwned(userId: string, chapterId: string, input: ChapterUpdate): Promise<RepositoryResult<Chapter>>;
}>;

function repositoryError(code: string | null, operation: "write" | "delete") {
  if (code === "23505" || code === "unique_violation") return { code: "DUPLICATE_NAME", status: "error" } as const;
  if (code === "23503" || code === "foreign_key_violation") {
    return operation === "delete"
      ? { code: "CONFLICT", status: "error" } as const
      : NOT_FOUND;
  }
  return STORAGE_UNAVAILABLE;
}

export class ChapterService {
  constructor(private readonly repository: ChapterRepository) {}

  async list(actorId: unknown, filter: unknown = {}): Promise<ChapterResult<readonly Chapter[]>> {
    const actor = actorIdSchema.safeParse(actorId), parsed = chapterListFilterSchema.safeParse(filter);
    if (!actor.success) return INVALID_ACTOR;
    if (!parsed.success) return INVALID_INPUT;
    try {
      const result = await this.repository.listOwned(actor.data, parsed.data);
      if (result.errorCode) return repositoryError(result.errorCode, "write");
      return { data: result.data ?? [], status: "success" };
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async listPage(actorId: unknown, input: ChapterPageRequest): Promise<ChapterResult<ChapterPage>> {
    const actor = actorIdSchema.safeParse(actorId);
    const subject = input.subjectId === undefined
      ? { success: true as const, data: undefined }
      : entityIdSchema.safeParse(input.subjectId);
    if (!actor.success) return INVALID_ACTOR;
    if (!subject.success || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) {
      return INVALID_INPUT;
    }
    try {
      const result = await this.repository.listPageOwned(actor.data, {
        cursor: input.cursor,
        limit: input.limit + 1,
        ...(subject.data ? { subjectId: subject.data } : {}),
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

  async find(actorId: unknown, chapterId: unknown): Promise<ChapterResult<Chapter>> {
    const actor = actorIdSchema.safeParse(actorId), id = entityIdSchema.safeParse(chapterId);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success) return INVALID_INPUT;
    try {
      const result = await this.repository.findOwned(actor.data, id.data);
      if (result.errorCode) return repositoryError(result.errorCode, "write");
      return result.data ? { data: result.data, status: "success" } : NOT_FOUND;
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async create(actorId: unknown, input: unknown): Promise<ChapterResult<Chapter>> {
    const actor = actorIdSchema.safeParse(actorId), parsed = chapterCreateInputSchema.safeParse(input);
    if (!actor.success) return INVALID_ACTOR;
    if (!parsed.success) return INVALID_INPUT;
    try {
      const result = await this.repository.createOwnedWithStarters(actor.data, parsed.data, STARTER_FOLDERS);
      if (result.errorCode) return repositoryError(result.errorCode, "write");
      return result.data ? { data: result.data, status: "success" } : STORAGE_UNAVAILABLE;
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async update(actorId: unknown, chapterId: unknown, input: unknown): Promise<ChapterResult<Chapter>> {
    const actor = actorIdSchema.safeParse(actorId), id = entityIdSchema.safeParse(chapterId);
    const parsed = chapterUpdateInputSchema.safeParse(input);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success || !parsed.success) return INVALID_INPUT;
    try {
      const result = await this.repository.updateOwned(actor.data, id.data, parsed.data);
      if (result.errorCode) return repositoryError(result.errorCode, "write");
      return result.data ? { data: result.data, status: "success" } : NOT_FOUND;
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async delete(actorId: unknown, chapterId: unknown): Promise<ChapterResult<null>> {
    const actor = actorIdSchema.safeParse(actorId), id = entityIdSchema.safeParse(chapterId);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success) return INVALID_INPUT;
    try {
      const result = await this.repository.deleteOwned(actor.data, id.data);
      if (result.errorCode) return repositoryError(result.errorCode, "delete");
      return result.data ? { data: null, status: "success" } : NOT_FOUND;
    } catch { return STORAGE_UNAVAILABLE; }
  }
}
