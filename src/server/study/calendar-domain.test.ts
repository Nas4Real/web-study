import { describe, expect, it } from "vitest";

import {
  calendarExceptionInputSchema,
  calendarExceptionRecordSchema,
  calendarSeriesCreateInputSchema,
  calendarSeriesRecordSchema,
} from "./calendar-domain";

const BASE = {
  durationMinutes: 90,
  focusText: null,
  kind: "university" as const,
  location: "Room 304",
  notesItems: [" Bring notes ", " Ask about chapter 4 "],
  professor: " Dr. Smith ",
  recurrenceRule: null,
  startsAt: "2026-10-05T08:00:00.000Z",
  subjectId: "22222222-2222-4222-8222-222222222222",
  timezone: "Africa/Tunis",
  title: " Physics   lecture ",
};

describe("calendar session contracts", () => {
  it("normalizes ordered notes and typed session text", () => {
    expect(calendarSeriesCreateInputSchema.parse(BASE)).toMatchObject({
      location: "Room 304",
      notesItems: ["Bring notes", "Ask about chapter 4"],
      professor: "Dr. Smith",
      title: "Physics lecture",
    });
  });

  it("allows nullable exam duration but requires duration for university and revision", () => {
    expect(
      calendarSeriesCreateInputSchema.safeParse({
        ...BASE,
        durationMinutes: null,
        kind: "exam",
        professor: null,
      }).success,
    ).toBe(true);
    expect(
      calendarSeriesCreateInputSchema.safeParse({
        ...BASE,
        durationMinutes: null,
      }).success,
    ).toBe(false);
    expect(
      calendarSeriesCreateInputSchema.safeParse({
        ...BASE,
        durationMinutes: null,
        focusText: "Chapter 4",
        kind: "revision",
        location: null,
        professor: null,
      }).success,
    ).toBe(false);
  });

  it("rejects fields that do not apply to the selected session kind", () => {
    expect(
      calendarSeriesCreateInputSchema.safeParse({
        ...BASE,
        focusText: "Chapter 4",
      }).success,
    ).toBe(false);
    expect(
      calendarSeriesCreateInputSchema.safeParse({
        ...BASE,
        kind: "revision",
        location: "Room 1",
        professor: null,
      }).success,
    ).toBe(false);
  });

  it("bounds ordered notes and rejects malformed exception payloads", () => {
    expect(
      calendarSeriesCreateInputSchema.safeParse({
        ...BASE,
        notesItems: Array.from({ length: 51 }, (_, index) => `Note ${index}`),
      }).success,
    ).toBe(false);
    expect(
      calendarExceptionInputSchema.safeParse({
        action: "modified",
        originalStart: BASE.startsAt,
        overridePayload: { arbitrary: "value" },
        seriesId: "33333333-3333-4333-8333-333333333333",
      }).success,
    ).toBe(false);
    expect(
      calendarExceptionInputSchema.safeParse({
        action: "cancelled",
        originalStart: BASE.startsAt,
        overridePayload: { title: "Changed" },
        seriesId: "33333333-3333-4333-8333-333333333333",
      }).success,
    ).toBe(false);
  });

  it("accepts RFC 5545 recurrence values and rejects malformed rules", () => {
    expect(
      calendarSeriesCreateInputSchema.safeParse({
        ...BASE,
        recurrenceRule: "FREQ=WEEKLY;COUNT=3;BYDAY=MO",
      }).success,
    ).toBe(true);
    expect(
      calendarSeriesCreateInputSchema.safeParse({
        ...BASE,
        recurrenceRule: "FREQ=NEVER;COUNT=three",
      }).success,
    ).toBe(false);
    for (const recurrenceRule of ["FREQ=DAILY;INTERVAL=0", "FREQ=DAILY;COUNT=-1", "FREQ=DAILY;DTSTART=20261001T000000Z", "FREQ=DAILY;COUNT=2;UNTIL=20261001T000000Z"]) {
      expect(calendarSeriesCreateInputSchema.safeParse({ ...BASE, recurrenceRule }).success).toBe(false);
    }
  });

  it("rejects malformed repository records at the provider boundary", () => {
    const record = {
      ...BASE,
      createdAt: "2026-10-02T12:00:00.000Z",
      id: "33333333-3333-4333-8333-333333333333",
      updatedAt: "2026-10-02T12:00:00.000Z",
    };
    expect(calendarSeriesRecordSchema.safeParse({ ...record, kind: "unknown" }).success).toBe(false);
    const withoutNotes = Object.fromEntries(
      Object.entries(record).filter(([key]) => key !== "notesItems"),
    );
    expect(calendarSeriesRecordSchema.safeParse(withoutNotes).success).toBe(false);
    expect(
      calendarExceptionRecordSchema.safeParse({
        action: "modified",
        createdAt: record.createdAt,
        id: "44444444-4444-4444-8444-444444444444",
        originalStart: BASE.startsAt,
        overridePayload: { location: "Room 401" },
        seriesId: record.id,
        updatedAt: record.updatedAt,
      }).success,
    ).toBe(true);
    expect(
      calendarExceptionRecordSchema.safeParse({
        action: "cancelled",
        createdAt: record.createdAt,
        id: "not-an-id",
        originalStart: BASE.startsAt,
        overridePayload: {},
        seriesId: record.id,
        updatedAt: record.updatedAt,
      }).success,
    ).toBe(false);
  });
});
