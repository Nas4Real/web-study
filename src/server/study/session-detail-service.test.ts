import { describe, expect, it, vi } from "vitest";

import type { CalendarOccurrenceDetailRecord } from "./calendar-service";
import { SessionDetailService } from "./session-detail-service";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const SERIES = "33333333-3333-4333-8333-333333333333";
const SUBJECT = "22222222-2222-4222-8222-222222222222";
const ORIGINAL = "2026-10-12T08:00:00.000Z";

const occurrence: CalendarOccurrenceDetailRecord = {
  durationMinutes: 90,
  endsAt: "2026-10-13T11:30:00.000Z",
  focusText: null,
  isCurrent: false,
  kind: "university",
  location: "Room 401",
  notesItems: ["Bring the lab report", "Ask about chapter 4"],
  originalStart: ORIGINAL,
  professor: "Dr. Smith",
  recurrenceRule: "FREQ=WEEKLY;COUNT=3",
  seriesMaster: {
    durationMinutes: 90,
    focusText: null,
    location: "Room 304",
    notesItems: ["Bring lab report"],
    professor: "Dr. Smith",
    recurrenceRule: "FREQ=WEEKLY;COUNT=3",
    startsAt: "2026-10-12T08:00:00.000Z",
    title: "Physics lecture",
  },
  seriesId: SERIES,
  startsAt: "2026-10-13T10:00:00.000Z",
  subjectId: SUBJECT,
  timezone: "Africa/Tunis",
  title: "Moved physics lecture",
};

function sources(overrides: Record<string, unknown> = {}) {
  return {
    calendar: { findOccurrence: vi.fn().mockResolvedValue({ data: occurrence, status: "success" }) },
    subjects: { find: vi.fn().mockResolvedValue({ data: { id: SUBJECT, name: "Physics", color: "#10b981" }, status: "success" }) },
    ...overrides,
  };
}

describe("SessionDetailService", () => {
  it("projects the effective occurrence and ordered notes into the canonical DTO", async () => {
    const input = sources();
    const result = await new SessionDetailService(input).read(ACTOR, { seriesId: SERIES, originalStart: ORIGINAL });

    expect(result).toEqual({
      status: "success",
      data: {
        durationMinutes: occurrence.durationMinutes,
        endsAt: occurrence.endsAt,
        focusText: null,
        isRecurring: true,
        kind: "university",
        location: "Room 401",
        notesItems: [
          { id: `${SERIES}:${ORIGINAL}:note:0`, position: 0, text: "Bring the lab report" },
          { id: `${SERIES}:${ORIGINAL}:note:1`, position: 1, text: "Ask about chapter 4" },
        ],
        originalStart: ORIGINAL,
        professor: "Dr. Smith",
        recurrenceRule: occurrence.recurrenceRule,
        seriesMaster: occurrence.seriesMaster,
        seriesId: SERIES,
        startsAt: occurrence.startsAt,
        subject: { id: SUBJECT, name: "Physics", color: "#10b981" },
        timezone: occurrence.timezone,
        title: "Moved physics lecture",
      },
    });
    expect(input.calendar.findOccurrence).toHaveBeenCalledWith(ACTOR, SERIES, ORIGINAL);
    expect(input.subjects.find).toHaveBeenCalledWith(ACTOR, SUBJECT);
  });

  it("returns one-time recurrence metadata without inventing a series", async () => {
    const input = sources({
      calendar: { findOccurrence: vi.fn().mockResolvedValue({ data: { ...occurrence, recurrenceRule: null }, status: "success" }) },
    });
    await expect(new SessionDetailService(input).read(ACTOR, { seriesId: SERIES, originalStart: ORIGINAL }))
      .resolves.toMatchObject({ status: "success", data: { isRecurring: false, recurrenceRule: null } });
  });

  it("fails closed when the occurrence or its owned subject is unavailable", async () => {
    const missing = sources({ calendar: { findOccurrence: vi.fn().mockResolvedValue({ code: "NOT_FOUND", status: "error" }) } });
    await expect(new SessionDetailService(missing).read(ACTOR, { seriesId: SERIES, originalStart: ORIGINAL }))
      .resolves.toEqual({ code: "NOT_FOUND", status: "error" });
    expect(missing.subjects.find).not.toHaveBeenCalled();

    const foreignSubject = sources({ subjects: { find: vi.fn().mockResolvedValue({ code: "NOT_FOUND", status: "error" }) } });
    await expect(new SessionDetailService(foreignSubject).read(ACTOR, { seriesId: SERIES, originalStart: ORIGINAL }))
      .resolves.toEqual({ code: "NOT_FOUND", status: "error" });
  });
});
