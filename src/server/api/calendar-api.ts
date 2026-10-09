import { z } from "zod";

import type { CalendarOccurrenceDetailDTO, SubjectSummaryDTO } from "@/domain/dto";
import type { CalendarOccurrence } from "@/server/study/calendar-recurrence";
import type { CalendarSeries } from "@/server/study/calendar-domain";
import type { CalendarService } from "@/server/study/calendar-service";
import type { SessionDetailService } from "@/server/study/session-detail-service";
import type { SubjectService } from "@/server/study/subject-service";

import { publicApiErrorResponse } from "./public-api-contract";
import type { PublicApiRequestContext } from "./public-api-handler";

type Dependencies = Readonly<{
  calendar: CalendarService;
  details: SessionDetailService;
  subjects: SubjectService;
}>;

const id = z.string().uuid();
const dateTime = z.iso.datetime({ offset: true });
const nullableText = (maximum: number) => z.string().max(maximum).nullable().default(null);
const notes = z.array(z.string().min(1).max(500)).max(50).default([]);
const createSchema = z.object({
  duration_minutes: z.number().int().min(1).max(1440).nullable().default(null),
  focus_text: nullableText(1000),
  kind: z.enum(["exam", "university", "revision"]),
  location: nullableText(500),
  notes_items: notes,
  professor: nullableText(500),
  recurrence_rule: z.string().max(2048).nullable().default(null),
  starts_at: dateTime,
  subject_id: id,
  timezone: z.string().min(1).max(64),
  title: z.string().min(1).max(240),
}).strict();
const patchObjectSchema = z.object({
  duration_minutes: z.number().int().min(1).max(1440).nullable().optional(),
  focus_text: z.string().max(1000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  notes_items: z.array(z.string().min(1).max(500)).max(50).optional(),
  professor: z.string().max(500).nullable().optional(),
  recurrence_rule: z.string().max(2048).nullable().optional(),
  starts_at: dateTime.optional(),
  subject_id: id.optional(),
  timezone: z.string().min(1).max(64).optional(),
  title: z.string().min(1).max(240).optional(),
}).strict();
const patchSchema = patchObjectSchema.refine(value => Object.keys(value).length > 0);
const occurrencePatchSchema = patchObjectSchema.omit({
  recurrence_rule: true,
  subject_id: true,
  timezone: true,
}).refine(value => Object.keys(value).length > 0);

function failure(code: string, requestId: string) {
  if (code === "INVALID_ACTOR") return publicApiErrorResponse({ code: "UNAUTHENTICATED", requestId, status: 401 });
  if (code === "INVALID_INPUT") return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId, status: 422 });
  if (code === "NOT_FOUND") return publicApiErrorResponse({ code: "NOT_FOUND", requestId, status: 404 });
  if (code === "CONFLICT") return publicApiErrorResponse({ code: "CONFLICT", requestId, status: 409 });
  return publicApiErrorResponse({ code: "PROVIDER_UNAVAILABLE", requestId, status: 503 });
}

async function json(request: Request) {
  try { return await request.json(); } catch { return undefined; }
}

function projectSubject(subject: SubjectSummaryDTO) {
  return { color: subject.color, icon: null, id: subject.id, name: subject.name };
}

function projectSeries(series: CalendarSeries) {
  return {
    duration_minutes: series.durationMinutes,
    focus_text: series.focusText,
    id: series.id,
    kind: series.kind,
    location: series.location,
    notes_items: series.notesItems,
    professor: series.professor,
    recurrence_rule: series.recurrenceRule,
    starts_at: series.startsAt,
    subject_id: series.subjectId,
    timezone: series.timezone,
    title: series.title,
  };
}

function projectOccurrence(occurrence: CalendarOccurrence, subject: SubjectSummaryDTO) {
  return {
    duration_minutes: occurrence.durationMinutes,
    ends_at: occurrence.endsAt,
    focus_text: occurrence.focusText,
    kind: occurrence.kind,
    location: occurrence.location,
    notes_items: occurrence.notesItems,
    original_start: occurrence.originalStart,
    professor: occurrence.professor,
    series_id: occurrence.seriesId,
    starts_at: occurrence.startsAt,
    subject: projectSubject(subject),
    timezone: occurrence.timezone,
    title: occurrence.title,
  };
}

function projectDetail(detail: CalendarOccurrenceDetailDTO) {
  const master = detail.seriesMaster;
  const overridden = detail.startsAt !== detail.originalStart || detail.title !== master.title
    || detail.durationMinutes !== master.durationMinutes || detail.location !== master.location
    || detail.professor !== master.professor || detail.focusText !== master.focusText
    || JSON.stringify(detail.notesItems.map(({ text }) => text)) !== JSON.stringify(master.notesItems);
  return {
    duration_minutes: detail.durationMinutes,
    ends_at: detail.endsAt,
    focus_text: detail.focusText,
    kind: detail.kind,
    location: detail.location,
    notes_items: detail.notesItems.map(({ text }) => text),
    original_start: detail.originalStart,
    overridden,
    professor: detail.professor,
    recurring: detail.isRecurring,
    series_id: detail.seriesId,
    starts_at: detail.startsAt,
    subject: projectSubject(detail.subject),
    timezone: detail.timezone,
    title: detail.title,
  };
}

function createInput(value: z.infer<typeof createSchema>) {
  return {
    durationMinutes: value.duration_minutes,
    focusText: value.focus_text,
    kind: value.kind,
    location: value.location,
    notesItems: value.notes_items,
    professor: value.professor,
    recurrenceRule: value.recurrence_rule,
    startsAt: value.starts_at,
    subjectId: value.subject_id,
    timezone: value.timezone,
    title: value.title,
  };
}

function patchInput(value: z.infer<typeof patchSchema>) {
  return {
    ...(value.duration_minutes === undefined ? {} : { durationMinutes: value.duration_minutes }),
    ...(value.focus_text === undefined ? {} : { focusText: value.focus_text }),
    ...(value.location === undefined ? {} : { location: value.location }),
    ...(value.notes_items === undefined ? {} : { notesItems: value.notes_items }),
    ...(value.professor === undefined ? {} : { professor: value.professor }),
    ...(value.recurrence_rule === undefined ? {} : { recurrenceRule: value.recurrence_rule }),
    ...(value.starts_at === undefined ? {} : { startsAt: value.starts_at }),
    ...(value.subject_id === undefined ? {} : { subjectId: value.subject_id }),
    ...(value.timezone === undefined ? {} : { timezone: value.timezone }),
    ...(value.title === undefined ? {} : { title: value.title }),
  };
}

export function createSessionsCollectionAdapter(deps: Dependencies) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "GET") {
      const search = new URL(request.url).searchParams;
      const filters = z.object({
        from: dateTime,
        subjectId: id.optional(),
        to: dateTime,
      }).strict().safeParse({
        from: search.get("from") ?? undefined,
        subjectId: search.get("subject_id") ?? undefined,
        to: search.get("to") ?? undefined,
      });
      if (!filters.success) return failure("INVALID_INPUT", context.requestId);
      const result = await deps.calendar.listOccurrences(
        context.actor.userId, filters.data.from, filters.data.to,
      );
      if (result.status === "error") return failure(result.code, context.requestId);
      const items = filters.data.subjectId
        ? result.data.filter(item => item.subjectId === filters.data.subjectId)
        : result.data;
      const subjects = await deps.subjects.findMany(context.actor.userId, [
        ...new Set(items.map(item => item.subjectId)),
      ]);
      if (subjects.status === "error") return failure(subjects.code, context.requestId);
      const byId = new Map(subjects.data.map(subject => [subject.id, subject]));
      if (items.some(item => !byId.has(item.subjectId))) return failure("STORAGE_UNAVAILABLE", context.requestId);
      return Response.json(items.map(item => projectOccurrence(item, byId.get(item.subjectId)!)));
    }

    const parsed = createSchema.safeParse(await json(request));
    if (!parsed.success) return failure("INVALID_INPUT", context.requestId);
    const result = await deps.calendar.create(context.actor.userId, createInput(parsed.data));
    if (result.status === "error") return failure(result.code, context.requestId);
    return Response.json(projectSeries(result.data), { status: 201 });
  };
}

export function createSessionSeriesItemAdapter(deps: Dependencies, seriesId: string) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "DELETE") {
      const result = await deps.calendar.delete(context.actor.userId, seriesId);
      return result.status === "error" ? failure(result.code, context.requestId)
        : new Response(null, { status: 204 });
    }
    if (request.method === "GET") {
      const result = await deps.calendar.find(context.actor.userId, seriesId);
      return result.status === "error" ? failure(result.code, context.requestId)
        : Response.json(projectSeries(result.data));
    }
    const parsed = patchSchema.safeParse(await json(request));
    if (!parsed.success) return failure("INVALID_INPUT", context.requestId);
    const result = await deps.calendar.update(
      context.actor.userId, seriesId, patchInput(parsed.data),
    );
    if (result.status === "error") return failure(result.code, context.requestId);
    return Response.json(projectSeries(result.data));
  };
}

export function createSessionOccurrenceItemAdapter(
  deps: Dependencies,
  seriesId: string,
  originalStart: string,
) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "GET") {
      const result = await deps.details.read(context.actor.userId, { originalStart, seriesId });
      return result.status === "error" ? failure(result.code, context.requestId)
        : Response.json(projectDetail(result.data));
    }
    if (request.method === "DELETE") {
      const result = await deps.calendar.saveException(context.actor.userId, {
        action: "cancelled", originalStart, overridePayload: {}, seriesId,
      });
      return result.status === "error" ? failure(result.code, context.requestId)
        : new Response(null, { status: 204 });
    }
    const parsed = occurrencePatchSchema.safeParse(await json(request));
    if (!parsed.success) return failure("INVALID_INPUT", context.requestId);
    const result = await deps.calendar.saveException(context.actor.userId, {
      action: "modified",
      originalStart,
      overridePayload: patchInput(parsed.data),
      seriesId,
    });
    if (result.status === "error") return failure(result.code, context.requestId);
    const detail = await deps.details.read(context.actor.userId, { originalStart, seriesId });
    return detail.status === "error" ? failure(detail.code, context.requestId)
      : Response.json(projectDetail(detail.data));
  };
}
