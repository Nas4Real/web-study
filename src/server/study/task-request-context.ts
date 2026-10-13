import "server-only";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { isE2eAuthenticatedRequest } from "@/server/auth/auth-routing";
import { getVerifiedActor } from "@/server/auth/request-auth";

import { createE2eStudyRepositories } from "./e2e-task-repositories";
import { ProfileService } from "./profile-service";
import { SubjectService } from "./subject-service";
import {
  createSupabaseProfileRepository,
  createSupabaseSubjectRepository,
  createSupabaseTaskRepository,
} from "./supabase-study-repositories";
import { TaskService } from "./task-service";

export type TaskRequestContext = Readonly<{
  actorId: string;
  displayName: string;
  now: () => Date;
  subjectService: SubjectService;
  taskService: TaskService;
  timeZone: string;
}>;

export async function resolveE2eStudyScope(requestedScope?: string) {
  const requestHeaders = await headers();
  const authenticated = isE2eAuthenticatedRequest({
    configuredToken: process.env.WEB_STUDY_E2E_AUTH_TOKEN,
    nodeEnv: process.env.NODE_ENV,
    requestToken: requestHeaders.get("x-web-study-e2e-auth"),
  });
  if (!authenticated) return null;
  if (requestedScope) return requestedScope.slice(0, 120);
  const referer = requestHeaders.get("referer");
  if (!referer) return "visual-baseline";
  try {
    return (
      new URL(referer).searchParams.get("e2eScope") ?? "visual-baseline"
    ).slice(0, 120);
  } catch {
    return "visual-baseline";
  }
}

async function resolveTaskServices(requestedScope?: string) {
  const actor = await getVerifiedActor();
  if (!actor) return null;

  const scope = await resolveE2eStudyScope(requestedScope);
  let profileService: ProfileService;
  let subjectService: SubjectService;
  let taskService: TaskService;

  if (scope) {
    const repositories = createE2eStudyRepositories(scope);
    const now = () => new Date("2026-10-02T10:00:00.000Z");
    profileService = new ProfileService(repositories.profileRepository);
    subjectService = new SubjectService(repositories.subjectRepository);
    taskService = new TaskService(repositories.taskRepository, now);
  } else {
    const client = await createClient();
    profileService = new ProfileService(createSupabaseProfileRepository(client));
    subjectService = new SubjectService(createSupabaseSubjectRepository(client));
    taskService = new TaskService(createSupabaseTaskRepository(client));
  }

  return {
    actorId: actor.userId,
    now: scope
      ? () => new Date("2026-10-02T10:00:00.000Z")
      : () => new Date(),
    subjectService,
    taskService,
    profileService,
  };
}

export async function resolveTaskRequestContext(requestedScope?: string): Promise<TaskRequestContext | null> {
  const context = await resolveTaskServices(requestedScope);
  if (!context) return null;
  const profile = await context.profileService.get(context.actorId);
  if (profile.status === "error") throw new Error(profile.code);
  return {
    actorId: context.actorId, displayName: profile.data.displayName,
    now: context.now, subjectService: context.subjectService,
    taskService: context.taskService, timeZone: profile.data.timezone,
  };
}

// Read-only details may overlap profile and task reads. Mutations still use
// the eager context above; both reads must succeed before returning detail.
export async function resolveTaskDetailRequestContext() {
  const context = await resolveTaskServices();
  if (!context) return null;
  const timeZone = context.profileService.get(context.actorId).then(profile => {
    if (profile.status === "error") throw new Error(profile.code);
    return profile.data.timezone;
  });
  return { actorId: context.actorId, now: context.now, subjectService: context.subjectService, taskService: context.taskService, timeZone };
}
