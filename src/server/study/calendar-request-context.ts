import "server-only";

import { createClient } from "@/lib/supabase/server";

import { CalendarService } from "./calendar-service";
import { createE2eCalendarRepository } from "./e2e-calendar-repository";
import { createSupabaseCalendarRepository } from "./supabase-calendar-repository";
import { resolveE2eStudyScope, resolveTaskRequestContext } from "./task-request-context";

export async function resolveCalendarRequestContext(requestedScope?: string) {
  const context = await resolveTaskRequestContext(requestedScope);
  if (!context) return null;
  const scope = await resolveE2eStudyScope(requestedScope);
  const repository = scope
    ? createE2eCalendarRepository(scope)
    : createSupabaseCalendarRepository(await createClient());
  return {
    actorId: context.actorId, now: context.now,
    displayName: context.displayName,
    taskService: context.taskService,
    subjectService: context.subjectService, timeZone: context.timeZone,
    calendarService: new CalendarService(repository, context.now),
  };
}
