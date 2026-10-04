import { z } from "zod";
import { entityIdSchema } from "./study-domain";

// A mutation must name exactly one scope; never infer destructive scope.
export const calendarMutationTargetSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("series"), seriesId: entityIdSchema }).strict(),
  z.object({ scope: z.literal("occurrence"), seriesId: entityIdSchema,
    originalStart: z.iso.datetime({ offset: true }) }).strict(),
]);
export type CalendarMutationTarget = z.infer<typeof calendarMutationTargetSchema>;
