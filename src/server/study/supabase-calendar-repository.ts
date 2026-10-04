import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CalendarException,
  CalendarSeries,
  CalendarSeriesCreate,
  CalendarSeriesWriteUpdate,
} from "./calendar-domain";
import {
  calendarExceptionRecordSchema,
  calendarSeriesRecordSchema,
} from "./calendar-domain";
import type { CalendarRepository } from "./calendar-service";

const CALENDAR_SERIES_COLUMNS =
  "id, subject_id, kind, title, starts_at, duration_minutes, timezone, recurrence_rule, location, professor, focus_text, notes_items, created_at, updated_at";
const CALENDAR_EXCEPTION_COLUMNS =
  "id, series_id, original_start, action, override_payload, created_at, updated_at";

const overrideNames = [["startsAt", "starts_at"], ["durationMinutes", "duration_minutes"],
  ["focusText", "focus_text"], ["notesItems", "notes_items"]] as const;

function translateOverride(value: unknown, toDatabase: boolean): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  // Preserve unknown keys so strict domain/database validation rejects them.
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const pair = overrideNames.find(names => names[toDatabase ? 0 : 1] === key);
    return [pair?.[toDatabase ? 1 : 0] ?? key, item];
  }));
}

type CalendarSeriesRow = Readonly<{
  created_at: string;
  duration_minutes: number | null;
  focus_text: string | null;
  id: string;
  kind: CalendarSeries["kind"];
  location: string | null;
  notes_items: unknown;
  professor: string | null;
  recurrence_rule: string | null;
  starts_at: string;
  subject_id: string;
  timezone: string;
  title: string;
  updated_at: string;
}>;

type CalendarExceptionRow = Readonly<{
  action: string;
  created_at: string;
  id: string;
  original_start: string;
  override_payload: unknown;
  series_id: string;
  updated_at: string;
}>;

function errorCode(error: unknown) {
  if (!error || typeof error !== "object") return error ? "provider_error" : null;
  const code = Reflect.get(error, "code");
  return typeof code === "string" && code.length > 0 ? code : "provider_error";
}

function toCalendarSeries(row: CalendarSeriesRow): CalendarSeries | null {
  const parsed = calendarSeriesRecordSchema.safeParse({
    createdAt: row.created_at,
    durationMinutes: row.duration_minutes,
    focusText: row.focus_text,
    id: row.id,
    kind: row.kind,
    location: row.location,
    notesItems: row.notes_items,
    professor: row.professor,
    recurrenceRule: row.recurrence_rule,
    startsAt: row.starts_at,
    subjectId: row.subject_id,
    timezone: row.timezone,
    title: row.title,
    updatedAt: row.updated_at,
  });
  return parsed.success ? parsed.data : null;
}

function toCalendarException(row: CalendarExceptionRow): CalendarException | null {
  const parsed = calendarExceptionRecordSchema.safeParse({
    action: row.action,
    createdAt: row.created_at,
    id: row.id,
    originalStart: row.original_start,
    overridePayload: translateOverride(row.override_payload, false),
    seriesId: row.series_id,
    updatedAt: row.updated_at,
  });
  return parsed.success ? parsed.data : null;
}

function calendarWrite(input: CalendarSeriesCreate | CalendarSeriesWriteUpdate) {
  return {
    duration_minutes: input.durationMinutes,
    focus_text: input.focusText,
    location: input.location,
    notes_items: input.notesItems,
    professor: input.professor,
    recurrence_rule: input.recurrenceRule,
    starts_at: input.startsAt,
    subject_id: input.subjectId,
    timezone: input.timezone,
    title: input.title,
  };
}

function mapped(row: CalendarSeriesRow | null, error: unknown) {
  const data = row ? toCalendarSeries(row) : null;
  return {
    data,
    errorCode: errorCode(error) ?? (row && !data ? "provider_error" : null),
  };
}

export function createSupabaseCalendarRepository(
  supabase: SupabaseClient,
): CalendarRepository {
  return {
    async saveExceptionOwned(userId, input) {
      // ON CONFLICT upsert would also UPDATE immutable identity columns, which
      // intentionally lack UPDATE grants. Retry only the mutable fields instead.
      let result = await supabase.from("calendar_exceptions").insert({
        user_id: userId, series_id: input.seriesId, original_start: input.originalStart,
        action: input.action, override_payload: translateOverride(input.overridePayload, true),
      }).select(CALENDAR_EXCEPTION_COLUMNS).maybeSingle();
      if (errorCode(result.error) === "23505") {
        let update = supabase.from("calendar_exceptions")
          .update({ action: input.action, override_payload: translateOverride(input.overridePayload, true) })
          .eq("user_id", userId).eq("series_id", input.seriesId).eq("original_start", input.originalStart);
        // Cancellation wins over a stale edit, including a concurrent insert race.
        if (input.action === "modified") update = update.neq("action", "cancelled");
        result = await update.select(CALENDAR_EXCEPTION_COLUMNS).maybeSingle();
      }
      const row = result.data as unknown as CalendarExceptionRow | null;
      const data = row ? toCalendarException(row) : null;
      return { data, errorCode: errorCode(result.error) ?? (row && !data ? "provider_error" : null) };
    },

    async listOwned(userId) {
      const { data, error } = await supabase
        .from("calendar_series")
        .select(CALENDAR_SERIES_COLUMNS)
        .eq("user_id", userId)
        .order("starts_at", { ascending: true })
        .order("created_at", { ascending: true });
      if (!data) return { data: null, errorCode: errorCode(error) };
      const series = (data as unknown as CalendarSeriesRow[]).map(toCalendarSeries);
      return series.some((item) => item === null)
        ? { data: null, errorCode: "provider_error" }
        : {
            data: series as CalendarSeries[],
            errorCode: errorCode(error),
          };
    },

    async listExceptionsOwned(userId, seriesIds) {
      if (seriesIds.length === 0) return { data: [], errorCode: null };
      const { data, error } = await supabase
        .from("calendar_exceptions")
        .select(CALENDAR_EXCEPTION_COLUMNS)
        .eq("user_id", userId)
        .in("series_id", [...seriesIds])
        .order("original_start", { ascending: true });
      if (!data) return { data: null, errorCode: errorCode(error) };
      const exceptions = (data as unknown as CalendarExceptionRow[]).map(
        toCalendarException,
      );
      return exceptions.some((item) => item === null)
        ? { data: null, errorCode: "provider_error" }
        : {
            data: exceptions as CalendarException[],
            errorCode: errorCode(error),
          };
    },

    async findOwned(userId, seriesId) {
      const { data, error } = await supabase
        .from("calendar_series")
        .select(CALENDAR_SERIES_COLUMNS)
        .eq("id", seriesId)
        .eq("user_id", userId)
        .maybeSingle();
      return mapped(data as unknown as CalendarSeriesRow | null, error);
    },

    async createOwned(userId, input) {
      const { data, error } = await supabase
        .from("calendar_series")
        .insert({
          ...calendarWrite(input),
          kind: input.kind,
          user_id: userId,
        })
        .select(CALENDAR_SERIES_COLUMNS)
        .single();
      return mapped(data as unknown as CalendarSeriesRow | null, error);
    },

    async updateOwned(userId, seriesId, input) {
      const { data, error } = await supabase
        .from("calendar_series")
        .update(calendarWrite(input))
        .eq("id", seriesId)
        .eq("user_id", userId)
        .select(CALENDAR_SERIES_COLUMNS)
        .maybeSingle();
      return mapped(data as unknown as CalendarSeriesRow | null, error);
    },

    async deleteOwned(userId, seriesId) {
      const { data, error } = await supabase
        .from("calendar_series")
        .delete()
        .eq("id", seriesId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      return { data: data !== null, errorCode: errorCode(error) };
    },
  };
}
