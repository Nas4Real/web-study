import "server-only";

import { randomUUID } from "node:crypto";

import type { CalendarRepository } from "./calendar-service";
import type { CalendarSeries } from "./calendar-domain";
import { createE2eStudyRepositories } from "./e2e-task-repositories";

const stores = new Map<string, Map<string, CalendarSeries[]>>();

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
  return {
    async listOwned(userId) { return { data: structuredClone(storeFor(userId)), errorCode: null }; },
    async listExceptionsOwned(userId, seriesIds) { return { data: seriesIds.includes(base.id) && storeFor(userId).some(series => series.id === base.id) ? [{
      id: "40000000-0000-4000-8000-000000000001", action: "modified",
      seriesId: base.id, originalStart: base.startsAt, overridePayload: { location: "Room 401" },
      createdAt: base.createdAt, updatedAt: base.updatedAt,
    }] : [], errorCode: null }; },
    async findOwned(userId, seriesId) { return { data: structuredClone(storeFor(userId).find(series => series.id === seriesId) ?? null), errorCode: null }; },
    async createOwned(userId, input) {
      const subjects = await createE2eStudyRepositories(scope).subjectRepository.listOwned(userId);
      if (!subjects.data?.some(subject => subject.id === input.subjectId)) return { data: null, errorCode: "23503" };
      const now = new Date().toISOString();
      const created: CalendarSeries = { ...structuredClone(input), id: randomUUID(), createdAt: now, updatedAt: now };
      storeFor(userId).push(created);
      return { data: structuredClone(created), errorCode: null };
    },
    async updateOwned() { return { data: null, errorCode: "provider_error" }; },
    async deleteOwned() { return { data: false, errorCode: "provider_error" }; },
  };
}
