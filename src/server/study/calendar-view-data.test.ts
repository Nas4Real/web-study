import { describe, expect, it } from "vitest";

import { calendarViewWindow, projectCalendarDays } from "./calendar-view-data";
import type { CalendarOccurrence } from "./calendar-recurrence";

const subject = { id: "subject-1", name: "Physics", color: "#10b981" };
const occurrence: CalendarOccurrence = {
  seriesId: "series-1", originalStart: "2026-10-04T08:00:00.000Z",
  startsAt: "2026-10-05T08:30:00.000Z", endsAt: "2026-10-05T10:00:00.000Z",
  subjectId: subject.id, timezone: "Africa/Tunis", kind: "university",
  title: "Effective lecture", durationMinutes: 90, location: "Room 401",
  professor: "Dr. Smith", focusText: null, notesItems: [], isCurrent: true,
};

describe("calendar view windows", () => {
  it("uses the profile timezone for inclusive/exclusive day boundaries", () => {
    expect(calendarViewWindow("2026-10-05", "day", "Africa/Tunis")).toEqual({
      dates: ["2026-10-05"], from: "2026-10-04T23:00:00.000Z", to: "2026-10-05T23:00:00.000Z",
    });
  });

  it.each([
    ["2026-03-08", "2026-03-08T05:00:00.000Z", "2026-03-09T04:00:00.000Z"],
    ["2026-11-01", "2026-11-01T04:00:00.000Z", "2026-11-02T05:00:00.000Z"],
  ])("does not assume a 24-hour day across DST on %s", (date, from, to) => {
    expect(calendarViewWindow(date, "day", "America/New_York")).toMatchObject({ from, to });
  });

  it("starts weeks on Monday across a year boundary", () => {
    const window = calendarViewWindow("2027-01-03", "week", "Asia/Kathmandu");
    expect(window?.dates).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(window).toMatchObject({ from: "2026-12-27T18:15:00.000Z", to: "2027-01-03T18:15:00.000Z" });
  });

  it.each([
    ["2027-02-10", 28, "2027-02-01", "2027-02-28"],
    ["2026-02-10", 35, "2026-01-26", "2026-03-01"],
    ["2026-05-07", 35, "2026-04-27", "2026-05-31"],
    ["2026-08-01", 42, "2026-07-27", "2026-09-06"],
    ["2028-02-10", 35, "2028-01-31", "2028-03-05"],
  ])("includes every full month-grid week for %s", (date, length, first, last) => {
    const window = calendarViewWindow(date, "month", "UTC");
    expect(window?.dates).toHaveLength(length);
    expect(window?.dates[0]).toBe(first);
    expect(window?.dates.at(-1)).toBe(last);
  });

  it.each(["2026-02-30", "2026-13-01", "not-a-date", "2026-1-05"])("rejects invalid anchor %s", date => {
    expect(calendarViewWindow(date, "week", "UTC")).toBeNull();
  });
  it("rejects an invalid timezone", () => {
    expect(calendarViewWindow("2026-10-05", "day", "not/a-zone")).toBeNull();
  });
  it("does not silently shift a skipped civil-date boundary", () => {
    expect(calendarViewWindow("2011-12-30", "day", "Pacific/Apia")).toBeNull();
  });
  it("does not reinterpret early years as twentieth-century dates", () => {
    expect(calendarViewWindow("0099-02-05", "day", "UTC"))
      .toMatchObject({ from: "0099-02-05T00:00:00.000Z", to: "0099-02-06T00:00:00.000Z" });
  });
});

describe("effective-occurrence calendar projection", () => {
  const dates = ["2026-10-04", "2026-10-05", "2026-10-06"];
  const now = new Date("2026-10-05T09:38:00.000Z");

  it("places moved occurrences by effective date but preserves original identity", () => {
    const days = projectCalendarDays(dates, [occurrence], [subject], "Africa/Tunis", now);
    expect(days[0].events).toEqual([]);
    expect(days[1]).toMatchObject({ weekdayLabel: "Lun", day: 5, isToday: true });
    expect(days[1].events[0]).toEqual({
      id: "series-1:2026-10-04T08:00:00.000Z", title: "Effective lecture",
      subjectLabel: "Physics", tone: "physics", startLabel: "09:30", endLabel: "11:00",
      durationLabel: "90m", location: "Room 401", inProgress: true, progressLabel: "Ends in 22 mins",
    });
  });

  it("uses the viewing timezone, not the occurrence or machine timezone", () => {
    const late = { ...occurrence, startsAt: "2026-10-05T23:30:00.000Z", endsAt: "2026-10-06T01:00:00.000Z" };
    const days = projectCalendarDays(dates, [late], [subject], "Asia/Kathmandu", now);
    expect(days[1].events).toEqual([]);
    expect(days[2].events[0]).toMatchObject({ startLabel: "05:15", endLabel: "06:45", inProgress: false, progressLabel: null });
  });

  it("sorts sessions by instant without mutating service results", () => {
    const early = { ...occurrence, seriesId: "early", startsAt: "2026-10-05T06:00:00.000Z", endsAt: "2026-10-05T07:30:00.000Z" };
    const input = [occurrence, early];
    const days = projectCalendarDays(dates, input, [subject], "Africa/Tunis", now);
    expect(days[1].events.map(event => event.title)).toHaveLength(2);
    expect(days[1].events[0].id).toContain("early:");
    expect(input[0]).toBe(occurrence);
  });

  it("does not invent duration or progress for exams", () => {
    const exam = { ...occurrence, kind: "exam" as const, durationMinutes: null, endsAt: occurrence.startsAt };
    expect(projectCalendarDays(dates, [exam], [subject], "Africa/Tunis", now)[1].events[0])
      .toMatchObject({ durationLabel: "", inProgress: false, progressLabel: null });
  });

  it("keeps empty calendars empty and omits unresolved subjects", () => {
    expect(projectCalendarDays(dates, [occurrence], [], "Africa/Tunis", now).every(day => day.events.length === 0)).toBe(true);
    expect(projectCalendarDays(dates, [], [subject], "Africa/Tunis", now)).toHaveLength(3);
  });

  it("uses half-open progress bounds and computes remaining time from the instant", () => {
    for (const [instant, inProgress, progressLabel] of [
      [occurrence.startsAt, true, "Ends in 90 mins"],
      ["2026-10-05T09:59:59.000Z", true, "Ends in 1 mins"],
      [occurrence.endsAt, false, null],
    ] as const) {
      expect(projectCalendarDays(dates, [occurrence], [subject], "Africa/Tunis", new Date(instant))[1].events[0])
        .toMatchObject({ inProgress, progressLabel });
    }
  });
});
