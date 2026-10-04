import type { CalendarOccurrenceDetailDTO } from "@/domain/dto";

import { SessionDetailService, type SessionDetailSources } from "./session-detail-service";

export type SessionDetailContext = Readonly<{
  actorId: string;
  calendarService: SessionDetailSources["calendar"];
  subjectService: SessionDetailSources["subjects"];
  timeZone: string;
}>;

const messages = {
  INVALID_INPUT: "Check the session details and try again.",
  NOT_FOUND: "That session is no longer available.",
  STORAGE_UNAVAILABLE: "Sessions are temporarily unavailable. Please try again.",
  UNAUTHENTICATED: "Your session has expired. Sign in and try again.",
} as const;

export type SessionDetailActionResult =
  | Readonly<{ status: "success"; data: Readonly<{ detail: CalendarOccurrenceDetailDTO; timeZone: string }> }>
  | Readonly<{ status: "error"; code: keyof typeof messages; message: string }>;

type ResolveContext = () => Promise<SessionDetailContext | null>;

function error(code: keyof typeof messages): Extract<SessionDetailActionResult, { status: "error" }> {
  return { status: "error", code, message: messages[code] };
}

export async function readSessionDetailHandler(
  resolveContext: ResolveContext,
  target: unknown,
): Promise<SessionDetailActionResult> {
  try {
    const context = await resolveContext();
    if (!context) return error("UNAUTHENTICATED");
    const result = await new SessionDetailService({
      calendar: context.calendarService,
      subjects: context.subjectService,
    }).read(context.actorId, target);
    if (result.status === "error") {
      const code = result.code === "INVALID_ACTOR" ? "UNAUTHENTICATED"
        : result.code === "DUPLICATE_NAME" ? "INVALID_INPUT" : result.code;
      return error(code);
    }
    return { status: "success", data: { detail: result.data, timeZone: context.timeZone } };
  } catch {
    return error("STORAGE_UNAVAILABLE");
  }
}
