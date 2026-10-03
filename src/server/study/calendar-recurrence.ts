import { TZDate } from "@date-fns/tz";
import { RRule } from "rrule";

import type {
  CalendarException,
  CalendarOverridePayload,
  CalendarSeries,
} from "./calendar-domain";

const MAX_OCCURRENCES = 500;
const MAX_EVALUATED_OCCURRENCES = 10_000;

export class CalendarExpansionLimitError extends Error {
  constructor() {
    super("Calendar expansion exceeds its safety limits");
    this.name = "CalendarExpansionLimitError";
  }
}

export type CalendarOccurrence = Readonly<
  Omit<CalendarSeries, "createdAt" | "id" | "recurrenceRule" | "updatedAt"> & {
    endsAt: string;
    isCurrent: boolean;
    originalStart: string;
    seriesId: string;
    startsAt: string;
  }
>;

type CalendarRange = Readonly<{ from: Date; to: Date }>;

function toFloating(date: Date, timezone: string) {
  const zoned = new TZDate(date, timezone);
  return new Date(
    Date.UTC(
      zoned.getFullYear(),
      zoned.getMonth(),
      zoned.getDate(),
      zoned.getHours(),
      zoned.getMinutes(),
      zoned.getSeconds(),
      zoned.getMilliseconds(),
    ),
  );
}

function fromFloating(date: Date, timezone: string) {
  const zoned = new TZDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
    timezone,
  );
  return new Date(zoned.getTime());
}

function createRule(series: CalendarSeries) {
  if (!series.recurrenceRule) return null;
  const options = RRule.parseString(series.recurrenceRule);
  // RRULE operates on floating wall-clock values; UTC UNTIL must use that same clock.
  if (options.until && /UNTIL=\d{8}T\d{6}Z/.test(series.recurrenceRule)) {
    options.until = toFloating(options.until, series.timezone);
  }
  return new RRule({
    ...options,
    dtstart: toFloating(new Date(series.startsAt), series.timezone),
  });
}

function effectiveOccurrence(
  series: CalendarSeries,
  originalStart: string,
  override: CalendarOverridePayload | undefined,
  now: Date,
): CalendarOccurrence {
  const effective = { ...series, startsAt: originalStart, ...override };
  const startsAt = new Date(effective.startsAt);
  const endsAt = new Date(startsAt.getTime() + (effective.durationMinutes ?? 0) * 60_000);

  return {
    durationMinutes: effective.durationMinutes,
    endsAt: endsAt.toISOString(),
    focusText: effective.focusText,
    isCurrent: startsAt <= now && now < endsAt,
    kind: effective.kind,
    location: effective.location,
    notesItems: effective.notesItems,
    originalStart,
    professor: effective.professor,
    seriesId: series.id,
    startsAt: startsAt.toISOString(),
    subjectId: effective.subjectId,
    timezone: effective.timezone,
    title: effective.title,
  };
}

export function expandCalendarOccurrences(
  series: CalendarSeries,
  exceptions: readonly CalendarException[],
  range: CalendarRange,
  now: Date,
): readonly CalendarOccurrence[] {
  const rule = createRule(series);
  const exceptionByStart = new Map(
    exceptions
      .filter((exception) => exception.seriesId === series.id)
      .map((exception) => [new Date(exception.originalStart).toISOString(), exception]),
  );
  const originalStarts = new Set<string>();
  if (rule) {
    // Include originals outside the window only when their effective start moves into it.
    const movedIn = [...exceptionByStart].filter(([, exception]) => {
      if (exception.action !== "modified" || !exception.overridePayload.startsAt) return false;
      const effectiveStart = new Date(exception.overridePayload.startsAt);
      return effectiveStart >= range.from && effectiveStart < range.to;
    });
    const latest = Math.max(range.to.getTime(), ...movedIn.map(([start]) => new Date(start).getTime()));
    const movedInStarts = new Set(movedIn.map(([start]) => start));
    rule.all((floating, evaluated) => {
      const start = fromFloating(floating, series.timezone);
      if (start.getTime() > latest) return false;
      if (evaluated >= MAX_EVALUATED_OCCURRENCES) throw new CalendarExpansionLimitError();
      const originalStart = start.toISOString();
      if ((start >= range.from && start < range.to) || movedInStarts.has(originalStart)) {
        originalStarts.add(originalStart);
        if (originalStarts.size > MAX_OCCURRENCES) throw new CalendarExpansionLimitError();
      }
      return true;
    });
  } else {
    originalStarts.add(new Date(series.startsAt).toISOString());
  }

  return [...originalStarts]
    .flatMap((originalStart) => {
      const exception = exceptionByStart.get(originalStart);
      if (exception?.action === "cancelled") return [];
      return [
        effectiveOccurrence(
          series,
          originalStart,
          exception?.action === "modified" ? exception.overridePayload : undefined,
          now,
        ),
      ];
    })
    .filter((occurrence) => {
      const start = new Date(occurrence.startsAt);
      return start >= range.from && start < range.to;
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}
