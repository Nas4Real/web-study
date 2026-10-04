import { sessionDateTimeToIso } from "./calendar-date";
import type { CalendarSeries } from "./calendar-domain";
import type { StudyResult } from "./study-domain";

export type CalendarActionState =
  | Readonly<{ code: "IDLE"; status: "idle" }>
  | Readonly<{ code: "SESSION_CREATED"; status: "success" }>
  | Readonly<{ code: "UNAUTHENTICATED" | "INVALID_INPUT" | "NOT_FOUND" | "STORAGE_UNAVAILABLE";
      message: string; status: "error" }>;

export type CalendarActionContext = Readonly<{
  actorId: string;
  calendarService: { create(actorId: unknown, input: unknown): Promise<StudyResult<CalendarSeries>> };
  timeZone: string;
}>;

const messages = {
  UNAUTHENTICATED: "Your session has expired. Sign in and try again.",
  INVALID_INPUT: "Check the session details and try again.",
  NOT_FOUND: "That subject is no longer available.",
  STORAGE_UNAVAILABLE: "Sessions are temporarily unavailable. Please try again.",
} as const;

function error(code: keyof typeof messages): CalendarActionState {
  return { code, message: messages[code], status: "error" };
}

export async function createSessionMutationHandler(
  resolveContext: () => Promise<CalendarActionContext | null>, formData: FormData,
): Promise<CalendarActionState> {
  try {
    const context = await resolveContext();
    if (!context) return error("UNAUTHENTICATED");
    const fields = ["kind", "title", "subjectId", "date", "startTime", "durationMinutes", "location", "professor", "focusText"] as const;
    const values: Partial<Record<typeof fields[number], string>> = {};
    for (const name of fields) {
      const entries = formData.getAll(name);
      if (entries.length > 1 || (entries.length === 1 && typeof entries[0] !== "string")) return error("INVALID_INPUT");
      if (typeof entries[0] === "string") values[name] = entries[0];
    }
    const startsAt = sessionDateTimeToIso(values.date ?? "", values.startTime ?? "", context.timeZone);
    if (!startsAt) return error("INVALID_INPUT");
    const result = await context.calendarService.create(context.actorId, {
      kind: values.kind, title: values.title, subjectId: values.subjectId, startsAt,
      timezone: context.timeZone,
      durationMinutes: values.kind === "exam" ? null : Number(values.durationMinutes),
      location: values.location ?? null,
      professor: values.professor ?? null,
      focusText: values.focusText ?? null,
      recurrenceRule: null, notesItems: [],
    });
    if (result.status === "success") return { code: "SESSION_CREATED", status: "success" };
    if (result.code === "INVALID_ACTOR") return error("UNAUTHENTICATED");
    return error(result.code === "DUPLICATE_NAME" ? "INVALID_INPUT" : result.code);
  } catch {
    return error("STORAGE_UNAVAILABLE");
  }
}
