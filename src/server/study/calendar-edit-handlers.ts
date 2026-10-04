import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { z } from "zod";
import { calendarSeriesUpdateInputSchema } from "./calendar-domain";
import { calendarMutationTargetSchema } from "./calendar-mutation-target";
import { sessionDateTimeToIso } from "./calendar-date";
import { parseRecurrenceForm } from "./calendar-recurrence-form";
import type { CalendarService } from "./calendar-service";
import type { StudyResult } from "./study-domain";

const fields = calendarSeriesUpdateInputSchema.shape;
const contentFields = {
  title: fields.title, durationMinutes: fields.durationMinutes, location: fields.location,
  professor: fields.professor, focusText: fields.focusText, notesItems: fields.notesItems,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
};
const recurrenceSchema = z.object({
  frequency: z.enum(["none", "daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).max(99).optional(),
  weekdays: z.array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]))
    .max(7).refine(days => new Set(days).size === days.length).optional(),
  end: z.enum(["never", "date", "count"]).optional(),
  count: z.number().int().min(1).max(500).optional(),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict().refine(value => value.frequency === "none" ||
  (value.interval !== undefined && value.end !== undefined &&
    (value.frequency !== "weekly" || !!value.weekdays?.length) &&
    (value.end !== "count" || value.count !== undefined) &&
    (value.end !== "date" || value.until !== undefined)));
const hasChanges = (value: Record<string, unknown>) => Object.values(value).some(item => item !== undefined);
const pairedTime = (value: { date?: string; startTime?: string }) => (value.date === undefined) === (value.startTime === undefined);
const occurrenceChanges = z.object(contentFields).strict().refine(hasChanges).refine(pairedTime);
const seriesChanges = z.object({ ...contentFields, subjectId: fields.subjectId,
  recurrence: recurrenceSchema.optional() }).strict().refine(hasChanges).refine(pairedTime);

// Extend the existing calendar scope/identity boundary; never accept master data.
export const calendarEditInputSchema = z.discriminatedUnion("scope", [
  calendarMutationTargetSchema.options[0].extend({ changes: seriesChanges }),
  calendarMutationTargetSchema.options[1].extend({ changes: occurrenceChanges }),
]);
export type CalendarEditInput = z.infer<typeof calendarEditInputSchema>;
export type CalendarEditState =
  | Readonly<{ status: "success"; code: "SESSION_UPDATED" }>
  | Readonly<{ status: "error"; code: "UNAUTHENTICATED" | "INVALID_INPUT" | "NOT_FOUND" | "STORAGE_UNAVAILABLE"; message: string }>;
export type CalendarEditContext = Readonly<{
  actorId: string;
  calendarService: Pick<CalendarService, "find" | "update" | "saveException">;
}>;
const messages = {
  UNAUTHENTICATED: "Your session has expired. Sign in and try again.",
  INVALID_INPUT: "Check the session details and try again.",
  NOT_FOUND: "That session is no longer available.",
  STORAGE_UNAVAILABLE: "Sessions are temporarily unavailable. Please try again.",
} as const;
const error = (code: keyof typeof messages): CalendarEditState => ({ status: "error", code, message: messages[code] });
const serviceError = (result: Extract<StudyResult<unknown>, { status: "error" }>) =>
  error(result.code === "INVALID_ACTOR" ? "UNAUTHENTICATED" : result.code === "DUPLICATE_NAME" ? "INVALID_INPUT" : result.code);

export async function editSessionMutationHandler(
  resolveContext: () => Promise<CalendarEditContext | null>, input: unknown,
): Promise<CalendarEditState> {
  try {
    const context = await resolveContext();
    if (!context) return error("UNAUTHENTICATED");
    const parsed = calendarEditInputSchema.safeParse(input);
    if (!parsed.success) return error("INVALID_INPUT");
    const request = parsed.data;
    const master = await context.calendarService.find(context.actorId, request.seriesId);
    if (master.status === "error") return serviceError(master);
    const { date, startTime } = request.changes;
    const changes: Record<string, unknown> = Object.fromEntries(Object.entries(request.changes)
      .filter(([key, value]) => !["date", "startTime", "recurrence"].includes(key) && value !== undefined));
    if (date !== undefined && startTime !== undefined) {
      const startsAt = sessionDateTimeToIso(date, startTime, master.data.timezone);
      if (!startsAt) return error("INVALID_INPUT");
      changes.startsAt = startsAt;
    }
    if (request.scope === "series" && request.changes.recurrence) {
      const repeat = request.changes.recurrence;
      const recurrence = parseRecurrenceForm({ repeatFrequency: repeat.frequency,
        repeatInterval: repeat.interval?.toString(), repeatEnd: repeat.end,
        repeatCount: repeat.count?.toString(), repeatUntil: repeat.until,
        date: date ?? format(new TZDate(master.data.startsAt, master.data.timezone), "yyyy-MM-dd"),
      }, repeat.weekdays ?? [], master.data.timezone);
      if (!recurrence.success) return error("INVALID_INPUT");
      changes.recurrenceRule = recurrence.rule;
    }
    const result = request.scope === "series"
      ? await context.calendarService.update(context.actorId, request.seriesId, changes, master.data)
      : await context.calendarService.saveException(context.actorId, {
          action: "modified", seriesId: request.seriesId,
          originalStart: request.originalStart, overridePayload: changes,
        }, master.data);
    return result.status === "success" ? { status: "success", code: "SESSION_UPDATED" } : serviceError(result);
  } catch {
    return error("STORAGE_UNAVAILABLE");
  }
}
