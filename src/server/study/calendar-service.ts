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

export type CalendarRepository = Readonly<{
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
  ): Promise<RepositoryResult<CalendarSeries>>;
}>;

function repositoryError(errorCode: string | null) {
  if (
    errorCode === "23503" ||
    errorCode === "foreign_key_violation" ||
    errorCode === "42501"
  ) {
    return NOT_FOUND;
  }
  return STORAGE_UNAVAILABLE;
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
    return this.readOne(() =>
      this.repository.updateOwned(actor.data, id.data, writeUpdate(merged.data)),
    );
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
