import { z } from "zod";

import {
  actorIdSchema,
  entityIdSchema,
  INVALID_ACTOR,
  INVALID_INPUT,
  NOT_FOUND,
  type RepositoryResult,
  STORAGE_UNAVAILABLE,
  type StudyResult,
} from "./study-domain";
import {
  type CalendarException,
  type CalendarExceptionInput,
  calendarExceptionInputSchema,
  type CalendarSeries,
  type CalendarSeriesCreate,
  calendarSeriesCreateInputSchema,
  calendarSeriesUpdateInputSchema,
  type CalendarSeriesWriteUpdate,
} from "./calendar-domain";
import {
  CalendarExpansionLimitError,
  type CalendarOccurrence,
  expandCalendarOccurrences,
} from "./calendar-recurrence";

export type CalendarSchedule = Pick<CalendarSeries, "startsAt" | "timezone" | "recurrenceRule">;
export type CalendarSeriesMasterRecord = Pick<CalendarSeries,
  "startsAt" | "title" | "durationMinutes" | "location" | "professor" | "focusText" | "notesItems" | "recurrenceRule"
>;
export type CalendarOccurrenceDetailRecord = CalendarOccurrence & Pick<CalendarSeries, "recurrenceRule"> & {
  seriesMaster: CalendarSeriesMasterRecord;
};

export type CalendarRepository = Readonly<{
  saveExceptionOwned(userId: string, input: CalendarExceptionInput, expectedSchedule: CalendarSchedule): Promise<RepositoryResult<CalendarException>>;
  createOwned(
    userId: string,
    input: CalendarSeriesCreate,
  ): Promise<RepositoryResult<CalendarSeries>>;
  deleteOwned(userId: string, seriesId: string): Promise<RepositoryResult<boolean>>;
  findOwned(
    userId: string,
    seriesId: string,
  ): Promise<RepositoryResult<CalendarSeries>>;
  listOwned(userId: string): Promise<RepositoryResult<readonly CalendarSeries[]>>;
  listExceptionsOwned(
    userId: string,
    seriesIds: readonly string[],
  ): Promise<RepositoryResult<readonly CalendarException[]>>;
  updateOwned(
    userId: string,
    seriesId: string,
    input: CalendarSeriesWriteUpdate,
    expectedSchedule?: CalendarSchedule,
  ): Promise<RepositoryResult<CalendarSeries>>;
}>;

function repositoryError(errorCode: string | null) {
  if (errorCode === "23514") return INVALID_INPUT;
  if (
    errorCode === "23503" ||
    errorCode === "foreign_key_violation" ||
    errorCode === "42501"
  ) {
    return NOT_FOUND;
  }
  return STORAGE_UNAVAILABLE;
}

function scheduleMatches(current: CalendarSchedule, expected: CalendarSchedule) {
  return new Date(current.startsAt).getTime() === new Date(expected.startsAt).getTime()
    && current.timezone === expected.timezone && current.recurrenceRule === expected.recurrenceRule;
}

function writeUpdate(series: CalendarSeriesCreate): CalendarSeriesWriteUpdate {
  return {
    durationMinutes: series.durationMinutes,
    focusText: series.focusText,
    location: series.location,
    notesItems: series.notesItems,
    professor: series.professor,
    recurrenceRule: series.recurrenceRule,
    startsAt: series.startsAt,
    subjectId: series.subjectId,
    timezone: series.timezone,
    title: series.title,
  };
}

function createShape(series: CalendarSeries): CalendarSeriesCreate {
  return { kind: series.kind, ...writeUpdate(series) };
}

function seriesMasterShape(series: CalendarSeries): CalendarSeriesMasterRecord {
  return {
    durationMinutes: series.durationMinutes,
    focusText: series.focusText,
    location: series.location,
    notesItems: series.notesItems,
    professor: series.professor,
    recurrenceRule: series.recurrenceRule,
    startsAt: series.startsAt,
    title: series.title,
  };
}

export class CalendarService {
  constructor(
    private readonly repository: CalendarRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(actorId: unknown): Promise<StudyResult<readonly CalendarSeries[]>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    try {
      const result = await this.repository.listOwned(actor.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      return { data: result.data ?? [], status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async find(actorId: unknown, seriesId: unknown): Promise<StudyResult<CalendarSeries>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(seriesId);
    if (!id.success) return INVALID_INPUT;
    return this.readOne(() => this.repository.findOwned(actor.data, id.data));
  }

  async listOccurrences(
    actorId: unknown,
    from: unknown,
    to: unknown,
  ): Promise<StudyResult<readonly CalendarOccurrence[]>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const dateTime = z.iso.datetime({ offset: true });
    const parsedFrom = dateTime.safeParse(from);
    const parsedTo = dateTime.safeParse(to);
    if (!parsedFrom.success || !parsedTo.success) return INVALID_INPUT;
    const range = { from: new Date(parsedFrom.data), to: new Date(parsedTo.data) };
    const maximumRange = 366 * 24 * 60 * 60 * 1_000;
    if (
      !Number.isFinite(range.from.getTime()) ||
      !Number.isFinite(range.to.getTime()) ||
      range.from >= range.to ||
      range.to.getTime() - range.from.getTime() > maximumRange
    ) {
      return INVALID_INPUT;
    }

    try {
      const seriesResult = await this.repository.listOwned(actor.data);
      if (seriesResult.errorCode) return repositoryError(seriesResult.errorCode);
      const series = seriesResult.data ?? [];
      const exceptionResult = await this.repository.listExceptionsOwned(
        actor.data,
        series.map(({ id }) => id),
      );
      if (exceptionResult.errorCode) return repositoryError(exceptionResult.errorCode);
      const exceptions = exceptionResult.data ?? [];
      const now = this.now();
      const occurrences = series
        .flatMap((item) =>
          expandCalendarOccurrences(item, exceptions, range, now),
        )
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
      if (occurrences.length > 500) return INVALID_INPUT;
      return { data: occurrences, status: "success" };
    } catch (error) {
      return error instanceof CalendarExpansionLimitError
        ? INVALID_INPUT
        : STORAGE_UNAVAILABLE;
    }
  }

  async findOccurrence(
    actorId: unknown,
    seriesId: unknown,
    originalStart: unknown,
  ): Promise<StudyResult<CalendarOccurrenceDetailRecord>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(seriesId);
    const instant = z.iso.datetime({ offset: true }).safeParse(originalStart);
    if (!id.success || !instant.success) return INVALID_INPUT;

    const series = await this.find(actor.data, id.data);
    if (series.status === "error") return series;
    try {
      const exceptionResult = await this.repository.listExceptionsOwned(actor.data, [id.data]);
      if (exceptionResult.errorCode) return repositoryError(exceptionResult.errorCode);
      const canonicalStart = new Date(instant.data).toISOString();
      const original = new Date(canonicalStart);
      const membership = expandCalendarOccurrences(
        series.data,
        [],
        { from: original, to: new Date(original.getTime() + 1) },
        this.now(),
      ).find(occurrence => occurrence.originalStart === canonicalStart);
      if (!membership) return NOT_FOUND;

      const exception = exceptionResult.data?.find(
        item => new Date(item.originalStart).toISOString() === canonicalStart,
      );
      if (exception?.action === "cancelled") return NOT_FOUND;
      if (!exception) return { data: {
        ...membership,
        recurrenceRule: series.data.recurrenceRule,
        seriesMaster: seriesMasterShape(series.data),
      }, status: "success" };

      const effectiveStart = new Date(exception.overridePayload.startsAt ?? canonicalStart);
      const effective = expandCalendarOccurrences(
        series.data,
        [exception],
        { from: effectiveStart, to: new Date(effectiveStart.getTime() + 1) },
        this.now(),
      ).find(occurrence => occurrence.originalStart === canonicalStart);
      return effective
      ? { data: {
          ...effective,
          recurrenceRule: series.data.recurrenceRule,
          seriesMaster: seriesMasterShape(series.data),
        }, status: "success" }
        : NOT_FOUND;
    } catch (cause) {
      return cause instanceof CalendarExpansionLimitError ? INVALID_INPUT : STORAGE_UNAVAILABLE;
    }
  }

  async create(actorId: unknown, input: unknown): Promise<StudyResult<CalendarSeries>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const parsed = calendarSeriesCreateInputSchema.safeParse(input);
    if (!parsed.success) return INVALID_INPUT;
    return this.readOne(
      () => this.repository.createOwned(actor.data, parsed.data),
      STORAGE_UNAVAILABLE,
    );
  }

  async update(
    actorId: unknown,
    seriesId: unknown,
    input: unknown,
    expectedSchedule?: CalendarSchedule,
  ): Promise<StudyResult<CalendarSeries>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(seriesId);
    const update = calendarSeriesUpdateInputSchema.safeParse(input);
    if (!id.success || !update.success) return INVALID_INPUT;
    const existing = await this.readOne(() =>
      this.repository.findOwned(actor.data, id.data),
    );
    if (existing.status === "error") return existing;
    if (expectedSchedule && !scheduleMatches(existing.data, expectedSchedule)) return INVALID_INPUT;
    const merged = calendarSeriesCreateInputSchema.safeParse({
      ...createShape(existing.data),
      ...update.data,
    });
    if (!merged.success) return INVALID_INPUT;
    const rewritesSchedule = (["recurrenceRule", "startsAt", "timezone"] as const).some(
      (field) => field in update.data && update.data[field] !== existing.data[field],
    );
    if (rewritesSchedule) {
      try {
        const exceptions = await this.repository.listExceptionsOwned(actor.data, [id.data]);
        if (exceptions.errorCode) return repositoryError(exceptions.errorCode);
        if ((exceptions.data?.length ?? 0) > 0) return INVALID_INPUT;
      } catch {
        return STORAGE_UNAVAILABLE;
      }
    }
    return this.readOne(() => this.repository.updateOwned(
      actor.data,
      id.data,
      writeUpdate(merged.data),
      {
        recurrenceRule: existing.data.recurrenceRule,
        startsAt: existing.data.startsAt,
        timezone: existing.data.timezone,
      },
    ));
  }

  async delete(actorId: unknown, seriesId: unknown): Promise<StudyResult<null>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(seriesId);
    if (!id.success) return INVALID_INPUT;
    try {
      const result = await this.repository.deleteOwned(actor.data, id.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      if (!result.data) return NOT_FOUND;
      return { data: null, status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  /** Patch one generated occurrence by original identity; never rewrite its series. */
  async saveException(actorId: unknown, input: unknown, expectedSchedule?: CalendarSchedule): Promise<StudyResult<CalendarException>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const parsed = calendarExceptionInputSchema.safeParse(input);
    if (!parsed.success) return INVALID_INPUT;
    const existing = await this.find(actor.data, parsed.data.seriesId);
    if (existing.status === "error") return existing;
    if (expectedSchedule && !scheduleMatches(existing.data, expectedSchedule)) return INVALID_INPUT;
    if (!existing.data.recurrenceRule) return INVALID_INPUT;
    const original = new Date(parsed.data.originalStart);
    const originalStart = original.toISOString();
    try {
      // Validate membership against the master, not a moved/cancelled effective start.
      const generated = expandCalendarOccurrences(existing.data, [], {
        from: original, to: new Date(original.getTime() + 1),
      }, this.now());
      if (!generated.some(item => item.originalStart === originalStart)) return NOT_FOUND;
      const exceptions = await this.repository.listExceptionsOwned(actor.data, [existing.data.id]);
      if (exceptions.errorCode) return repositoryError(exceptions.errorCode);
      const previous = exceptions.data?.find(item => new Date(item.originalStart).toISOString() === originalStart);
      if (previous?.action === "cancelled") {
        return parsed.data.action === "cancelled" ? { status: "success", data: previous } : NOT_FOUND;
      }
      let write: CalendarExceptionInput = { ...parsed.data, originalStart };
      if (write.action === "modified") {
        const overridePayload = { ...(previous?.action === "modified" ? previous.overridePayload : {}), ...write.overridePayload };
        const effective = calendarSeriesCreateInputSchema.safeParse({ ...createShape(existing.data), startsAt: originalStart, ...overridePayload });
        if (!effective.success) return INVALID_INPUT;
        write = { ...write, overridePayload };
      }
      const result = await this.repository.saveExceptionOwned(actor.data, write, existing.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      return result.data ? { status: "success", data: result.data } : NOT_FOUND;
    } catch (error) {
      return error instanceof CalendarExpansionLimitError ? INVALID_INPUT : STORAGE_UNAVAILABLE;
    }
  }

  private async readOne(
    operation: () => Promise<RepositoryResult<CalendarSeries>>,
    missingResult: typeof NOT_FOUND | typeof STORAGE_UNAVAILABLE = NOT_FOUND,
  ): Promise<StudyResult<CalendarSeries>> {
    try {
      const result = await operation();
      if (result.errorCode) return repositoryError(result.errorCode);
      if (!result.data) return missingResult;
      return { data: result.data, status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }
}
