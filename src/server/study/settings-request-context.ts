import "server-only";

import { profileFixture } from "@/fixtures";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedActor } from "@/server/auth/request-auth";

import { createE2eStudyRepositories } from "./e2e-task-repositories";
import { ProfileService } from "./profile-service";
import { SubjectService } from "./subject-service";
import type { SettingsActionContext } from "./settings-action-handlers";
import {
  createSupabaseProfileRepository,
  createSupabaseSubjectRepository,
} from "./supabase-study-repositories";
import { resolveE2eStudyScope } from "./task-request-context";

export type SettingsRequestContext = SettingsActionContext &
  Readonly<{
    email: string;
    subjectService: SubjectService;
  }>;

export async function resolveSettingsRequestContext(
  requestedScope?: string,
): Promise<SettingsRequestContext | null> {
  const actor = await getVerifiedActor();
  if (!actor) return null;

  const scope = await resolveE2eStudyScope(requestedScope);
  if (scope) {
    const repositories = createE2eStudyRepositories(scope);
    const profileService = new ProfileService(repositories.profileRepository);
    const subjectService = new SubjectService(repositories.subjectRepository);
    const profile = await profileService.get(actor.userId);
    if (profile.status === "error") throw new Error(profile.code);
    return {
      actorId: actor.userId,
      email: profileFixture.email,
      profile: profile.data,
      profileService,
      subjectService,
    };
  }

  const client = await createClient();
  const subjectService = new SubjectService(
    createSupabaseSubjectRepository(client),
  );
  const [{ data: userData, error }, profile] = await Promise.all([
    client.auth.getUser(),
    new ProfileService(createSupabaseProfileRepository(client)).get(actor.userId),
  ]);
  if (
    error ||
    !userData.user ||
    userData.user.id !== actor.userId ||
    profile.status === "error"
  ) {
    throw new Error("Unable to load settings");
  }

  return {
    actorId: actor.userId,
    email: userData.user.email ?? "",
    profile: profile.data,
    profileService: new ProfileService(createSupabaseProfileRepository(client)),
    subjectService,
  };
}
