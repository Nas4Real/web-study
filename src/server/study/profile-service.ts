import {
  actorIdSchema,
  INVALID_ACTOR,
  INVALID_INPUT,
  NOT_FOUND,
  ownedAvatarKey,
  type Profile,
  type ProfileUpdate,
  profileUpdateInputSchema,
  type RepositoryResult,
  STORAGE_UNAVAILABLE,
  type StudyResult,
} from "./study-domain";

export type ProfileRepository = Readonly<{
  findByUserId(userId: string): Promise<RepositoryResult<Profile>>;
  updateOwned(
    userId: string,
    update: ProfileUpdate,
  ): Promise<RepositoryResult<Profile>>;
}>;

export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  async get(actorId: unknown): Promise<StudyResult<Profile>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;

    try {
      const result = await this.repository.findByUserId(actor.data);
      if (result.errorCode) return STORAGE_UNAVAILABLE;
      if (!result.data) return NOT_FOUND;
      return { data: result.data, status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async update(actorId: unknown, input: unknown): Promise<StudyResult<Profile>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const parsed = profileUpdateInputSchema.safeParse(input);
    if (
      !parsed.success ||
      !ownedAvatarKey(actor.data, parsed.data.avatarObjectKey)
    ) {
      return INVALID_INPUT;
    }

    try {
      const result = await this.repository.updateOwned(actor.data, parsed.data);
      if (result.errorCode) return STORAGE_UNAVAILABLE;
      if (!result.data) return NOT_FOUND;
      return { data: result.data, status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }
}
