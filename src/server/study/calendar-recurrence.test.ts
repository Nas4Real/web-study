import { describe, expect, it } from "vitest";

import type { CalendarException, CalendarSeries } from "./calendar-domain";
import { calendarExceptionRecordSchema } from "./calendar-domain";
import {
  CalendarExpansionLimitError,
  expandCalendarOccurrences,
} from "./calendar-recurrence";

const SERIES: CalendarSeries = {
  createdAt: "2026-01-01T00:00:00.000Z",
  durationMinutes: 90,
  focusText: null,
  id: "33333333-3333-4333-8333-333333333333",
  kind: "university",
  location: "Room 304",
  notesItems: ["Bring notes"],
  professor: "Dr. Smith",
  recurrenceRule: "FREQ=WEEKLY;COUNT=3",
  startsAt: "2026-10-05T08:00:00.000Z",
  subjectId: "22222222-2222-4222-8222-222222222222",
  timezone: "Africa/Tunis",
  title: "Physics lecture",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function exception(
  overrides: Partial<CalendarException> = {},
): CalendarException {
  return calendarExceptionRecordSchema.parse({
    action: "modified",
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "44444444-4444-4444-8444-444444444444",
    originalStart: "2026-10-12T08:00:00.000Z",
    overridePayload: {
      location: "Room 401",
      notesItems: ["Replacement note"],
      startsAt: "2026-10-12T10:00:00.000Z",
    },
    seriesId: SERIES.id,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });
}

describe("calendar recurrence expansion", () => {
  it("skips nonexistent local times without consuming COUNT", () => {
    const occurrences = expandCalendarOccurrences({
      ...SERIES, startsAt: "2026-03-01T07:30:15.250Z", timezone: "America/New_York",
      recurrenceRule: "FREQ=WEEKLY;COUNT=3",
    }, [], { from: new Date("2026-03-01T00:00:00Z"), to: new Date("2026-04-01T00:00:00Z") }, new Date("2026-02-01T00:00:00Z"));
    expect(occurrences.map(event => event.startsAt)).toEqual([
      "2026-03-01T07:30:15.250Z", "2026-03-15T06:30:15.250Z", "2026-03-22T06:30:15.250Z",
    ]);
  });

  it("includes moved-in occurrences and leaves siblings and the master unchanged", () => {
    const occurrences = expandCalendarOccurrences(SERIES, [exception({
      originalStart: "2026-10-12T08:00:00+00:00",
      overridePayload: { startsAt: "2026-10-06T10:00:00.000Z", professor: "Dr. Jones" },
    })], {
      from: new Date("2026-10-05T00:00:00Z"),
      to: new Date("2026-10-07T00:00:00Z"),
    }, new Date("2026-10-06T10:30:00Z"));
    expect(occurrences).toHaveLength(2);
    expect(occurrences[0].professor).toBe("Dr. Smith");
    expect(occurrences[1]).toMatchObject({
      originalStart: "2026-10-12T08:00:00.000Z", professor: "Dr. Jones", isCurrent: true,
    });
    expect(SERIES.professor).toBe("Dr. Smith");
  });

  it("uses UTC UNTIL as an inclusive instant in the series timezone", () => {
    const occurrences = expandCalendarOccurrences({
      ...SERIES, recurrenceRule: "FREQ=DAILY;UNTIL=20261006T083000Z",
    }, [], {
      from: new Date("2026-10-05T00:00:00Z"), to: new Date("2026-10-09T00:00:00Z"),
    }, new Date("2026-10-01T00:00:00Z"));
    expect(occurrences.map(({ startsAt }) => startsAt)).toEqual([
      "2026-10-05T08:00:00.000Z", "2026-10-06T08:00:00.000Z",
    ]);
  });

  it("returns a one-time session once inside the requested range", () => {
    const occurrences = expandCalendarOccurrences(
      { ...SERIES, recurrenceRule: null },
      [],
      {
        from: new Date("2026-10-05T00:00:00.000Z"),
        to: new Date("2026-10-06T00:00:00.000Z"),
      },
      new Date("2026-10-05T07:00:00.000Z"),
    );

    expect(occurrences).toMatchObject([
      {
        endsAt: "2026-10-05T09:30:00.000Z",
        isCurrent: false,
        originalStart: "2026-10-05T08:00:00.000Z",
        startsAt: "2026-10-05T08:00:00.000Z",
      },
    ]);
  });

  it("applies modified and cancelled exceptions without changing occurrence identity", () => {
    const occurrences = expandCalendarOccurrences(
      SERIES,
      [
        exception(),
        exception({
          action: "cancelled",
          id: "55555555-5555-4555-8555-555555555555",
          originalStart: "2026-10-19T08:00:00.000Z",
          overridePayload: {},
        }),
      ],
      {
        from: new Date("2026-10-05T00:00:00.000Z"),
        to: new Date("2026-10-26T00:00:00.000Z"),
      },
      new Date("2026-10-12T10:30:00.000Z"),
    );

    expect(occurrences).toHaveLength(2);
    expect(occurrences[1]).toMatchObject({
      endsAt: "2026-10-12T11:30:00.000Z",
      isCurrent: true,
      location: "Room 401",
      notesItems: ["Replacement note"],
      originalStart: "2026-10-12T08:00:00.000Z",
      startsAt: "2026-10-12T10:00:00.000Z",
    });
  });

  it("preserves local wall time across a daylight-saving transition", () => {
    const occurrences = expandCalendarOccurrences(
      {
        ...SERIES,
        recurrenceRule: "FREQ=WEEKLY;COUNT=3",
        startsAt: "2026-03-01T14:00:00.000Z",
        timezone: "America/New_York",
      },
      [],
      {
        from: new Date("2026-03-01T00:00:00.000Z"),
        to: new Date("2026-03-20T00:00:00.000Z"),
      },
      new Date("2026-02-01T00:00:00.000Z"),
    );

    expect(occurrences.map(({ startsAt }) => startsAt)).toEqual([
      "2026-03-01T14:00:00.000Z",
      "2026-03-08T13:00:00.000Z",
      "2026-03-15T13:00:00.000Z",
    ]);
  });

  it("stops dense rules at the occurrence safety limit", () => {
    expect(() =>
      expandCalendarOccurrences(
        { ...SERIES, recurrenceRule: "FREQ=SECONDLY" },
        [],
        {
          from: new Date("2026-10-05T08:00:00.000Z"),
          to: new Date("2026-10-06T08:00:00.000Z"),
        },
        new Date("2026-10-01T00:00:00.000Z"),
      ),
    ).toThrow(CalendarExpansionLimitError);
  });

  it("bounds historical work before the requested range", () => {
    expect(() => expandCalendarOccurrences({ ...SERIES, recurrenceRule: "FREQ=SECONDLY" }, [], {
      from: new Date("2027-10-05T08:00:00Z"), to: new Date("2027-10-05T08:00:01Z"),
    }, new Date("2027-10-01T00:00:00Z"))).toThrow(CalendarExpansionLimitError);
  });
});
