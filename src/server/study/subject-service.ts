import {
  actorIdSchema,
  entityIdSchema,
  INVALID_ACTOR,
  INVALID_INPUT,
  NOT_FOUND,
  type RepositoryResult,
  STORAGE_UNAVAILABLE,
  type StudyResult,
  type Subject,
  type SubjectCreate,
  subjectCreateInputSchema,
  type SubjectUpdate,
  subjectUpdateInputSchema,
} from "./study-domain";

export type SubjectRepository = Readonly<{
  listOwned(userId: string): Promise<RepositoryResult<readonly Subject[]>>;
  createOwned(
    userId: string,
    input: SubjectCreate,
  ): Promise<RepositoryResult<Subject>>;
  updateOwned(
    userId: string,
    subjectId: string,
    input: SubjectUpdate,
  ): Promise<RepositoryResult<Subject>>;
  deleteOwned(
    userId: string,
    subjectId: string,
  ): Promise<RepositoryResult<boolean>>;
}>;

function repositoryError(errorCode: string | null) {
  if (errorCode === "23505" || errorCode === "unique_violation") {
    return { code: "DUPLICATE_NAME", status: "error" } as const;
  }
  return STORAGE_UNAVAILABLE;
}

export class SubjectService {
  constructor(private readonly repository: SubjectRepository) {}

  async list(actorId: unknown): Promise<StudyResult<readonly Subject[]>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    try {
      const result = await this.repository.listOwned(actor.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      return { data: result.data ?? [], status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async create(actorId: unknown, input: unknown): Promise<StudyResult<Subject>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const parsed = subjectCreateInputSchema.safeParse(input);
    if (!parsed.success) return INVALID_INPUT;
    try {
      const result = await this.repository.createOwned(actor.data, parsed.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      if (!result.data) return STORAGE_UNAVAILABLE;
      return { data: result.data, status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async update(
    actorId: unknown,
    subjectId: unknown,
    input: unknown,
  ): Promise<StudyResult<Subject>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(subjectId);
    const parsed = subjectUpdateInputSchema.safeParse(input);
    if (!id.success || !parsed.success) return INVALID_INPUT;
    try {
      const result = await this.repository.updateOwned(
        actor.data,
        id.data,
        parsed.data,
      );
      if (result.errorCode) return repositoryError(result.errorCode);
      if (!result.data) return NOT_FOUND;
      return { data: result.data, status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async delete(
    actorId: unknown,
    subjectId: unknown,
  ): Promise<StudyResult<null>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(subjectId);
    if (!id.success) return INVALID_INPUT;
    try {
      const result = await this.repository.deleteOwned(actor.data, id.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      if (!result.data) return NOT_FOUND;
      return { data: null, status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }
}
