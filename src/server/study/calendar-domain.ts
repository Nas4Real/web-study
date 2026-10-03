import { z } from "zod";
import { RRule } from "rrule";

const normalizedText = (maximum: number) =>
  z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(1).max(maximum));

const nullableText = (maximum: number) =>
  z
    .string()
    .transform((value) => {
      const normalized = value.trim().replace(/\s+/g, " ");
      return normalized.length === 0 ? null : normalized;
    })
    .pipe(z.string().max(maximum).nullable())
    .nullable();

const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  });

const nullableRecurrenceRule = z
  .string()
  .transform((value) => {
    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized;
  })
  .pipe(
    z
      .string()
      .max(2048)
      .refine((value) => {
        if (/[\r\n]/.test(value)) return false;
        try {
          const options = RRule.parseString(value);
          if (options.freq == null || options.dtstart || options.tzid) return false;
          if (options.count != null && options.until != null) return false;
          if (options.interval != null && (!Number.isInteger(options.interval) || options.interval < 1)) return false;
          if (options.count != null && (!Number.isInteger(options.count) || options.count < 1)) return false;
          new RRule({ ...options, dtstart: new Date(0) });
          return true;
        } catch {
          return false;
        }
      })
      .nullable(),
  )
  .nullable();

const notesItemsSchema = z.array(normalizedText(500)).max(50);
const dateTimeSchema = z.iso.datetime({ offset: true });
const nullableDurationSchema = z.number().int().min(1).max(1440).nullable();

export const calendarSessionKindSchema = z.enum([
  "exam",
  "university",
  "revision",
]);

const seriesFields = {
  durationMinutes: nullableDurationSchema,
  focusText: nullableText(1000),
  kind: calendarSessionKindSchema,
  location: nullableText(500),
  notesItems: notesItemsSchema.default([]),
  professor: nullableText(500),
  recurrenceRule: nullableRecurrenceRule,
  startsAt: dateTimeSchema,
  subjectId: z.string().uuid(),
  timezone: timezoneSchema,
  title: normalizedText(240),
};

function validateKindFields(
  value: {
    durationMinutes: number | null;
    focusText: string | null;
    kind: z.infer<typeof calendarSessionKindSchema>;
    location: string | null;
    professor: string | null;
  },
  context: z.RefinementCtx,
) {
  if (value.kind !== "exam" && value.durationMinutes === null) {
    context.addIssue({
      code: "custom",
      message: "Duration is required for this session kind",
      path: ["durationMinutes"],
    });
  }
  if (value.kind === "exam" && (value.professor !== null || value.focusText !== null)) {
    context.addIssue({ code: "custom", message: "Invalid exam fields" });
  }
  if (value.kind === "university" && value.focusText !== null) {
    context.addIssue({ code: "custom", message: "Invalid university fields" });
  }
  if (
    value.kind === "revision" &&
    (value.location !== null || value.professor !== null)
  ) {
    context.addIssue({ code: "custom", message: "Invalid revision fields" });
  }
}

const calendarSeriesCreateObjectSchema = z.object(seriesFields).strict();

export const calendarSeriesCreateInputSchema =
  calendarSeriesCreateObjectSchema.superRefine(validateKindFields);

export const calendarSeriesRecordSchema = z
  .object({
    ...seriesFields,
    createdAt: dateTimeSchema,
    id: z.string().uuid(),
    notesItems: notesItemsSchema,
    updatedAt: dateTimeSchema,
  })
  .strict()
  .superRefine(validateKindFields);

export const calendarSeriesUpdateInputSchema = z
  .object({
    durationMinutes: seriesFields.durationMinutes.optional(),
    focusText: seriesFields.focusText.optional(),
    location: seriesFields.location.optional(),
    notesItems: notesItemsSchema.optional(),
    professor: seriesFields.professor.optional(),
    recurrenceRule: seriesFields.recurrenceRule.optional(),
    startsAt: seriesFields.startsAt.optional(),
    subjectId: seriesFields.subjectId.optional(),
    timezone: seriesFields.timezone.optional(),
    title: seriesFields.title.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0);

export const calendarOverridePayloadSchema = z
  .object({
    durationMinutes: nullableDurationSchema.optional(),
    focusText: nullableText(1000).optional(),
    location: nullableText(500).optional(),
    notesItems: notesItemsSchema.optional(),
    professor: nullableText(500).optional(),
    startsAt: dateTimeSchema.optional(),
    title: normalizedText(240).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0);

const exceptionIdentity = {
  originalStart: dateTimeSchema,
  seriesId: z.string().uuid(),
};

export const calendarExceptionInputSchema = z.discriminatedUnion("action", [
  z
    .object({
      ...exceptionIdentity,
      action: z.literal("cancelled"),
      overridePayload: z.object({}).strict().default({}),
    })
    .strict(),
  z
    .object({
      ...exceptionIdentity,
      action: z.literal("modified"),
      overridePayload: calendarOverridePayloadSchema,
    })
    .strict(),
]);

const exceptionRecordFields = {
  createdAt: dateTimeSchema,
  id: z.string().uuid(),
  updatedAt: dateTimeSchema,
};

export const calendarExceptionRecordSchema = z.discriminatedUnion("action", [
  z
    .object({
      ...exceptionIdentity,
      ...exceptionRecordFields,
      action: z.literal("cancelled"),
      overridePayload: z.object({}).strict(),
    })
    .strict(),
  z
    .object({
      ...exceptionIdentity,
      ...exceptionRecordFields,
      action: z.literal("modified"),
      overridePayload: calendarOverridePayloadSchema,
    })
    .strict(),
]);

export type CalendarSessionKind = z.infer<typeof calendarSessionKindSchema>;
export type CalendarSeriesCreate = z.infer<typeof calendarSeriesCreateInputSchema>;
export type CalendarSeriesUpdate = z.infer<typeof calendarSeriesUpdateInputSchema>;
export type CalendarSeriesWriteUpdate = Omit<CalendarSeriesCreate, "kind">;
export type CalendarOverridePayload = z.infer<typeof calendarOverridePayloadSchema>;
export type CalendarExceptionInput = z.infer<typeof calendarExceptionInputSchema>;

export type CalendarSeries = Readonly<z.infer<typeof calendarSeriesRecordSchema>>;

export type CalendarException = Readonly<z.infer<typeof calendarExceptionRecordSchema>>;
