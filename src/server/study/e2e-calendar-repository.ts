import "server-only";

import type { CalendarRepository } from "./calendar-service";
import type { CalendarSeries } from "./calendar-domain";

export function createE2eCalendarRepository(): CalendarRepository {
  const base: CalendarSeries = {
    id: "30000000-0000-4000-8000-000000000001",
    subjectId: "10000000-0000-4000-8000-000000000003",
    kind: "university", title: "Physics lecture", durationMinutes: 90,
    startsAt: "2026-10-02T10:30:00.000Z", timezone: "Africa/Tunis",
    recurrenceRule: "FREQ=WEEKLY;COUNT=3", location: "Room 304", professor: "Dr. Smith",
    focusText: null, notesItems: [], createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  return {
    async listOwned() { return { data: [base, { ...base,
      id: "30000000-0000-4000-8000-000000000002", kind: "exam", title: "Physics midterm",
      startsAt: "2026-10-04T08:00:00.000Z", recurrenceRule: null, professor: null,
    }], errorCode: null }; },
    async listExceptionsOwned() { return { data: [{
      id: "40000000-0000-4000-8000-000000000001", action: "modified",
      seriesId: base.id, originalStart: base.startsAt, overridePayload: { location: "Room 401" },
      createdAt: base.createdAt, updatedAt: base.updatedAt,
    }], errorCode: null }; },
    async findOwned() { return { data: null, errorCode: null }; },
    async createOwned() { return { data: null, errorCode: "provider_error" }; },
    async updateOwned() { return { data: null, errorCode: "provider_error" }; },
    async deleteOwned() { return { data: false, errorCode: "provider_error" }; },
  };
}
