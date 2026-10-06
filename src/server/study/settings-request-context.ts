import "server-only";

import { profileFixture } from "@/fixtures";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedActor } from "@/server/auth/request-auth";

import { createE2eStudyRepositories } from "./e2e-task-repositories";
import { ProfileService } from "./profile-service";
import type { SettingsActionContext } from "./settings-action-handlers";
import { createSupabaseProfileRepository } from "./supabase-study-repositories";
import { resolveE2eStudyScope } from "./task-request-context";

export type SettingsRequestContext = SettingsActionContext &
  Readonly<{ email: string }>;

export async function resolveSettingsRequestContext(
  requestedScope?: string,
): Promise<SettingsRequestContext | null> {
  const actor = await getVerifiedActor();
  if (!actor) return null;

  const scope = await resolveE2eStudyScope(requestedScope);
  if (scope) {
    const profileService = new ProfileService(
      createE2eStudyRepositories(scope).profileRepository,
    );
    const profile = await profileService.get(actor.userId);
    if (profile.status === "error") throw new Error(profile.code);
    return {
      actorId: actor.userId,
      email: profileFixture.email,
      profile: profile.data,
      profileService,
    };
  }

  const client = await createClient();
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
  };
}
