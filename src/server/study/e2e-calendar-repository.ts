import "server-only";

import { randomUUID } from "node:crypto";

import type { CalendarRepository } from "./calendar-service";
import type { CalendarException, CalendarSeries } from "./calendar-domain";
import { createE2eStudyRepositories } from "./e2e-task-repositories";

const stores = new Map<string, Map<string, CalendarSeries[]>>();
const exceptionStores = new Map<string, Map<string, CalendarException[]>>();

export function createE2eCalendarRepository(scope = "visual-baseline"): CalendarRepository {
  const base: CalendarSeries = {
    id: "30000000-0000-4000-8000-000000000001",
    subjectId: "10000000-0000-4000-8000-000000000003",
    kind: "university", title: "Physics lecture", durationMinutes: 90,
    startsAt: "2026-10-02T10:30:00.000Z", timezone: "Africa/Tunis",
    recurrenceRule: "FREQ=WEEKLY;COUNT=3", location: "Room 304", professor: "Dr. Smith",
    focusText: null, notesItems: [], createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const storeFor = (userId: string) => {
    let actors = stores.get(scope);
    if (!actors) { actors = new Map(); stores.set(scope, actors); }
    let series = actors.get(userId);
    if (!series) {
      series = [structuredClone(base), { ...structuredClone(base),
      id: "30000000-0000-4000-8000-000000000002", kind: "exam", title: "Physics midterm",
      startsAt: "2026-10-04T08:00:00.000Z", recurrenceRule: null, professor: null,
      }];
      actors.set(userId, series);
    }
    return series;
  };
  const exceptionsFor = (userId: string) => {
    let actors = exceptionStores.get(scope);
    if (!actors) { actors = new Map(); exceptionStores.set(scope, actors); }
    let exceptions = actors.get(userId);
    if (!exceptions) {
      exceptions = [{ id: "40000000-0000-4000-8000-000000000001", action: "modified", seriesId: base.id,
        originalStart: base.startsAt, overridePayload: { location: "Room 401" }, createdAt: base.createdAt, updatedAt: base.updatedAt }];
      actors.set(userId, exceptions);
    }
    return exceptions;
  };
  return {
    async listOwned(userId) { return { data: structuredClone(storeFor(userId)), errorCode: null }; },
    async listExceptionsOwned(userId, seriesIds) { return { data: structuredClone(exceptionsFor(userId).filter(item => seriesIds.includes(item.seriesId) && storeFor(userId).some(series => series.id === item.seriesId))), errorCode: null }; },
    async saveExceptionOwned(userId, input, expectedSchedule) {
      const master = storeFor(userId).find(series => series.id === input.seriesId);
      if (!master) return { data: null, errorCode: "23503" };
      if (!master.recurrenceRule || new Date(master.startsAt).getTime() !== new Date(expectedSchedule.startsAt).getTime()
        || master.timezone !== expectedSchedule.timezone || master.recurrenceRule !== expectedSchedule.recurrenceRule) {
        return { data: null, errorCode: "23514" };
      }
      const exceptions = exceptionsFor(userId);
      const index = exceptions.findIndex(item => item.seriesId === input.seriesId && item.originalStart === input.originalStart);
      const previous = exceptions[index];
      if (previous?.action === "cancelled" && input.action === "modified") return { data: null, errorCode: null };
      const now = new Date().toISOString();
      const saved: CalendarException = { ...structuredClone(input), id: previous?.id ?? randomUUID(), createdAt: previous?.createdAt ?? now, updatedAt: now };
      if (index < 0) exceptions.push(saved); else exceptions[index] = saved;
      return { data: structuredClone(saved), errorCode: null };
    },
    async findOwned(userId, seriesId) { return { data: structuredClone(storeFor(userId).find(series => series.id === seriesId) ?? null), errorCode: null }; },
    async createOwned(userId, input) {
      const subjects = await createE2eStudyRepositories(scope).subjectRepository.listOwned(userId);
      if (!subjects.data?.some(subject => subject.id === input.subjectId)) return { data: null, errorCode: "23503" };
      const now = new Date().toISOString();
      const created: CalendarSeries = { ...structuredClone(input), id: randomUUID(), createdAt: now, updatedAt: now };
      storeFor(userId).push(created);
      return { data: structuredClone(created), errorCode: null };
    },
    async updateOwned(userId, seriesId, input) {
      const series = storeFor(userId);
      const index = series.findIndex(item => item.id === seriesId);
      if (index < 0) return { data: null, errorCode: null };
      const existing = series[index];
      const scheduleChanged = (input.startsAt !== undefined && new Date(input.startsAt).getTime() !== new Date(existing.startsAt).getTime())
        || (input.timezone !== undefined && input.timezone !== existing.timezone)
        || (input.recurrenceRule !== undefined && input.recurrenceRule !== existing.recurrenceRule);
      if (scheduleChanged && exceptionsFor(userId).some(item => item.seriesId === seriesId)) {
        return { data: null, errorCode: "23514" };
      }
      const subjects = await createE2eStudyRepositories(scope).subjectRepository.listOwned(userId);
      if (!subjects.data?.some(subject => subject.id === input.subjectId)) return { data: null, errorCode: "23503" };
      series[index] = { ...series[index], ...structuredClone(input), updatedAt: new Date().toISOString() };
      return { data: structuredClone(series[index]), errorCode: null };
    },
    async deleteOwned() { return { data: false, errorCode: "provider_error" }; },
  };
}
