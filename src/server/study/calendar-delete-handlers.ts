import { z } from "zod";
import { entityIdSchema } from "./study-domain";
import type { CalendarService } from "./calendar-service";

// Explicit scope is mandatory. Series requests cannot carry occurrence identity,
// and no client-provided ownership, schedule snapshot or override is accepted.
export const calendarDeleteTargetSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("series"), seriesId: entityIdSchema }).strict(),
  z.object({ scope: z.literal("occurrence"), seriesId: entityIdSchema,
    originalStart: z.iso.datetime({ offset: true }) }).strict(),
]);

export type CalendarDeleteTarget = z.infer<typeof calendarDeleteTargetSchema>;
export type CalendarDeleteState =
  | Readonly<{ status: "success"; code: "SESSION_DELETED" }>
  | Readonly<{ status: "error"; code: "UNAUTHENTICATED" | "INVALID_INPUT" | "NOT_FOUND" | "STORAGE_UNAVAILABLE"; message: string }>;
export type CalendarDeleteContext = Readonly<{
  actorId: string;
  calendarService: Pick<CalendarService, "delete" | "saveException">;
}>;

const messages = {
  UNAUTHENTICATED: "Your session has expired. Sign in and try again.",
  INVALID_INPUT: "Check the session selection and try again.",
  NOT_FOUND: "That session is no longer available.",
  STORAGE_UNAVAILABLE: "Sessions are temporarily unavailable. Please try again.",
} as const;
const error = (code: keyof typeof messages): CalendarDeleteState => ({ status: "error", code, message: messages[code] });

export async function deleteSessionMutationHandler(
  resolveContext: () => Promise<CalendarDeleteContext | null>, input: unknown,
): Promise<CalendarDeleteState> {
  try {
    const context = await resolveContext();
    if (!context) return error("UNAUTHENTICATED");
    const parsed = calendarDeleteTargetSchema.safeParse(input);
    if (!parsed.success) return error("INVALID_INPUT");
    const target = parsed.data;
    const result = target.scope === "series"
      ? await context.calendarService.delete(context.actorId, target.seriesId)
      : await context.calendarService.saveException(context.actorId, {
          action: "cancelled", seriesId: target.seriesId, originalStart: target.originalStart,
        });
    if (result.status === "success") return { status: "success", code: "SESSION_DELETED" };
    if (result.code === "INVALID_ACTOR") return error("UNAUTHENTICATED");
    return error(result.code === "DUPLICATE_NAME" ? "INVALID_INPUT" : result.code);
  } catch {
    return error("STORAGE_UNAVAILABLE");
  }
}
