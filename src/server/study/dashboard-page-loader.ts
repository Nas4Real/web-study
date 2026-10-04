import "server-only";

import { headers } from "next/headers";
import { dashboardFixture } from "@/fixtures";
import { isE2eAuthenticatedRequest } from "@/server/auth/auth-routing";
import { toDashboardViewModel } from "@/features/dashboard/dashboard-view-model";

import { resolveCalendarRequestContext } from "./calendar-request-context";
import { DashboardService } from "./dashboard-service";

export async function loadDashboardPageData(scope?: string) {
  const requestHeaders = await headers();
  const e2e = isE2eAuthenticatedRequest({ configuredToken: process.env.WEB_STUDY_E2E_AUTH_TOKEN,
    nodeEnv: process.env.NODE_ENV, requestToken: requestHeaders.get("x-web-study-e2e-auth") });
  // Preserve the approved deterministic screenshot fixture only inside authenticated development tests.
  if (e2e && !scope) return dashboardFixture;
  const context = await resolveCalendarRequestContext(e2e ? scope : undefined);
  if (!context) throw new Error("Unable to load dashboard");
  const result = await new DashboardService({ tasks: context.taskService,
    subjects: context.subjectService, calendar: context.calendarService }, context.now).read(context.actorId, context.timeZone);
  if (result.status === "error") throw new Error("Unable to load dashboard");
  return toDashboardViewModel(result.data);
}
