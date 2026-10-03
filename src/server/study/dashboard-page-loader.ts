import "server-only";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { dashboardFixture } from "@/fixtures";
import { isE2eAuthenticatedRequest } from "@/server/auth/auth-routing";
import { toDashboardViewModel } from "@/features/dashboard/dashboard-view-model";

import { resolveTaskRequestContext } from "./task-request-context";
import { DashboardService } from "./dashboard-service";
import { CalendarService } from "./calendar-service";
import { createSupabaseCalendarRepository } from "./supabase-calendar-repository";
import { createE2eCalendarRepository } from "./e2e-calendar-repository";

export async function loadDashboardPageData(scope?: string) {
  const requestHeaders = await headers();
  const e2e = isE2eAuthenticatedRequest({ configuredToken: process.env.WEB_STUDY_E2E_AUTH_TOKEN,
    nodeEnv: process.env.NODE_ENV, requestToken: requestHeaders.get("x-web-study-e2e-auth") });
  // Preserve the approved deterministic screenshot fixture only inside authenticated development tests.
  if (e2e && !scope) return dashboardFixture;
  const context = await resolveTaskRequestContext(e2e ? scope : undefined);
  if (!context) throw new Error("Unable to load dashboard");
  const calendar = new CalendarService(e2e ? createE2eCalendarRepository() :
    createSupabaseCalendarRepository(await createClient()), context.now);
  const result = await new DashboardService({ tasks: context.taskService,
    subjects: context.subjectService, calendar }, context.now).read(context.actorId, context.timeZone);
  if (result.status === "error") throw new Error("Unable to load dashboard");
  return toDashboardViewModel(result.data);
}
