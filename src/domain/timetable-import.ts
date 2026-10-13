import { z } from "zod";
import { RRule } from "rrule";
import { calendarSeriesCreateInputSchema, type CalendarSeriesCreate } from "@/server/study/calendar-domain";
import { sessionDateTimeToIso } from "@/server/study/calendar-date";
import { subjectCreateInputSchema } from "@/server/study/study-domain";

export const MAX_TIMETABLE_BYTES = 1024 * 1024;
export const MAX_TIMETABLE_SESSIONS = 200;
export const MAX_TIMETABLE_SUBJECTS = 100;
export const DEFAULT_IMPORT_COLOR = "#06b6d4";
const PLACEHOLDER_SUBJECT_ID = "00000000-0000-4000-8000-000000000001";
const text = (max: number) => z.string().max(max).nullable().default(null);
const subjectSchema = z.object({
  name: subjectCreateInputSchema.shape.name,
  color: subjectCreateInputSchema.shape.color.default(DEFAULT_IMPORT_COLOR),
}).strict();
const sessionSchema = z.object({
  kind: z.enum(["university", "revision", "exam"]),
  title: z.string().min(1).max(240),
  subject: subjectCreateInputSchema.shape.name.optional(),
  subject_id: z.string().uuid().optional(),
  starts_at: z.iso.datetime({ offset: true }).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration_minutes: z.number().int().min(1).max(1440).nullable().default(null),
  location: text(500), professor: text(500), focus_text: text(1000),
  notes_items: z.array(z.string().min(1).max(500)).max(50).default([]),
  recurrence_rule: text(2048),
}).strict().superRefine((value, context) => {
  if (Boolean(value.subject) === Boolean(value.subject_id)) {
    context.addIssue({ code: "custom", path: ["subject"], message: "Provide exactly one of subject or subject_id." });
  }
  if (value.starts_at ? value.date !== undefined || value.start_time !== undefined : !value.date || !value.start_time) {
    context.addIssue({ code: "custom", path: ["starts_at"], message: "Use starts_at OR both date and start_time." });
  }
});

type WireSession = z.infer<typeof sessionSchema>;
export type ImportedSession = Omit<CalendarSeriesCreate, "subjectId"> & { subjectId?: string; subjectName?: string };
function sessionInput(value: WireSession, timezone: string) {
  const start = value.starts_at ?? sessionDateTimeToIso(value.date ?? "", value.start_time ?? "", timezone);
  return {
    kind: value.kind, title: value.title, subjectId: value.subject_id ?? PLACEHOLDER_SUBJECT_ID,
    startsAt: start ?? "", timezone, durationMinutes: value.duration_minutes,
    location: value.location, professor: value.professor, focusText: value.focus_text,
    notesItems: value.notes_items, recurrenceRule: value.recurrence_rule,
  };
}

const wireNames: Record<string, string> = {
  durationMinutes: "duration_minutes", startsAt: "starts_at", subjectId: "subject_id",
  focusText: "focus_text", notesItems: "notes_items", recurrenceRule: "recurrence_rule",
};
const documentSchema = z.object({
  version: z.literal(1),
  timezone: calendarSeriesCreateInputSchema.shape.timezone,
  subjects: z.array(subjectSchema).max(MAX_TIMETABLE_SUBJECTS).default([]),
  sessions: z.array(sessionSchema).min(1).max(MAX_TIMETABLE_SESSIONS),
}).strict();

export const timetableImportSchema = documentSchema.superRefine((document, context) => {
  const subjectNames = new Set<string>();
  document.subjects.forEach((subject, index) => {
    const key = subject.name.toLowerCase();
    if (subjectNames.has(key)) context.addIssue({ code: "custom", path: ["subjects", index, "name"], message: "Subject names must be unique (case-insensitive)." });
    subjectNames.add(key);
  });
  const sessionKeys = new Set<string>();
  document.sessions.forEach((session, index) => {
    if (session.subject) subjectNames.add(session.subject.toLowerCase());
    const input = sessionInput(session, document.timezone);
    if (!input.startsAt) {
      context.addIssue({ code: "custom", path: ["sessions", index, "date"], message: "Invalid date or local time in this timezone. Check date/start_time; nonexistent daylight-saving times are not allowed." });
      return;
    }
    const parsed = calendarSeriesCreateInputSchema.safeParse(input);
    if (!parsed.success) {
      parsed.error.issues.forEach(issue => context.addIssue({ code: "custom", message: issue.message, path: ["sessions", index, ...issue.path.map(part => typeof part === "string" ? wireNames[part] ?? part : part)] }));
      return;
    }
    if (parsed.data.recurrenceRule) {
      const options = RRule.parseString(parsed.data.recurrenceRule);
      if (![RRule.DAILY, RRule.WEEKLY, RRule.MONTHLY, RRule.YEARLY].includes(options.freq!) || options.byhour || options.byminute || options.bysecond || (options.count ?? 0) > 10000) {
        context.addIssue({ code: "custom", path: ["sessions", index, "recurrence_rule"], message: "Use daily, weekly, monthly or yearly recurrence without sub-day expansion (COUNT ≤ 10000)." });
      }
    }
    const key = JSON.stringify({ ...parsed.data, subjectId: session.subject_id ?? session.subject?.toLowerCase(), startsAt: new Date(parsed.data.startsAt).toISOString() });
    if (sessionKeys.has(key)) context.addIssue({ code: "custom", path: ["sessions", index], message: "Duplicate session in this file." });
    sessionKeys.add(key);
  });
  if (subjectNames.size > MAX_TIMETABLE_SUBJECTS) context.addIssue({ code: "custom", path: ["subjects"], message: `Use at most ${MAX_TIMETABLE_SUBJECTS} distinct named subjects.` });
}).transform(document => ({
  version: document.version,
  timezone: document.timezone,
  subjects: document.subjects,
  sessions: document.sessions.map((session): ImportedSession => {
    const { subjectId: ignored, ...data } = calendarSeriesCreateInputSchema.parse(sessionInput(session, document.timezone));
    void ignored;
    return { ...data, startsAt: new Date(data.startsAt).toISOString(), ...(session.subject_id ? { subjectId: session.subject_id } : { subjectName: session.subject! }) };
  }),
}));

export type TimetableImportDocument = z.infer<typeof timetableImportSchema>;
export const timetableImportResultSchema = z.object({
  importId: z.string().uuid(), sessionCount: z.number().int().min(1).max(MAX_TIMETABLE_SESSIONS),
  subjectsCreated: z.number().int().min(0).max(MAX_TIMETABLE_SUBJECTS),
  alreadyImported: z.boolean(), firstDate: z.iso.date(),
}).strict();
export type TimetableImportResult = z.infer<typeof timetableImportResultSchema>;
export type TimetableIssue = { message: string; path: (string | number)[] };
export function parseTimetableFile(raw: string):
  | { success: true; data: TimetableImportDocument }
  | { success: false; issues: TimetableIssue[] } {
  if (new TextEncoder().encode(raw).byteLength > MAX_TIMETABLE_BYTES) return { success: false, issues: [{ message: "JSON files must be 1 MiB or smaller.", path: [] }] };
  let json: unknown;
  try { json = JSON.parse(raw.replace(/^\uFEFF/, "")); }
  catch { return { success: false, issues: [{ message: "This file is not valid JSON.", path: [] }] }; }
  const parsed = timetableImportSchema.safeParse(json);
  if (parsed.success) return { success: true, data: parsed.data };
  const issues = new Map<string, TimetableIssue>();
  for (const issue of parsed.error.issues) {
    const item = { message: issue.message, path: issue.path.map(part => typeof part === "number" ? part : String(part)) };
    issues.set(JSON.stringify(item), item);
  }
  return { success: false, issues: [...issues.values()].slice(0, 20) };
}
