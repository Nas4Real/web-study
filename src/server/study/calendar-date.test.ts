import { describe, expect, it } from "vitest";
import { sessionDateTimeToIso } from "./calendar-date";

describe("session date/time form conversion", () => {
  it.each([
    ["2026-10-05", "09:30", "Africa/Tunis", "2026-10-05T08:30:00.000Z"],
    ["2026-07-05", "09:30", "America/New_York", "2026-07-05T13:30:00.000Z"],
    ["2026-01-05", "09:30", "America/New_York", "2026-01-05T14:30:00.000Z"],
    ["2026-10-05", "00:15", "Asia/Kathmandu", "2026-10-04T18:30:00.000Z"],
    ["2028-02-29", "23:59", "UTC", "2028-02-29T23:59:00.000Z"],
    ["2026-03-08", "03:30", "America/New_York", "2026-03-08T07:30:00.000Z"],
    ["2026-11-01", "01:30", "America/New_York", "2026-11-01T05:30:00.000Z"],
    ["2026-04-05", "01:45", "Australia/Lord_Howe", "2026-04-04T14:45:00.000Z"],
  ])("converts %s %s in %s independently of host timezone", (date, time, zone, expected) => {
    expect(sessionDateTimeToIso(date, time, zone)).toBe(expected);
  });

  it.each([
    ["2026-02-29", "09:30", "Africa/Tunis"],
    ["2026-04-31", "09:30", "Africa/Tunis"],
    ["2026-13-01", "09:30", "Africa/Tunis"],
    ["2026-10-05", "24:00", "Africa/Tunis"],
    ["2026-10-05", "09:60", "Africa/Tunis"],
    ["2026-10-05", "9:30", "Africa/Tunis"],
    ["2026-10-05", "09:30:00", "Africa/Tunis"],
    ["October 5, 2026", "09:30", "Africa/Tunis"],
    ["2026-10-05", "09:30", "Not/AZone"],
    ["2026-03-08", "02:30", "America/New_York"],
    ["2026-03-29", "02:30", "Europe/Paris"],
    ["2026-10-04", "02:15", "Australia/Lord_Howe"],
    ["2011-12-30", "12:00", "Pacific/Apia"],
    ["", "09:30", "Africa/Tunis"],
    ["2026-10-05", "", "Africa/Tunis"],
  ])("rejects invalid or nonexistent local time %s %s in %s", (date, time, zone) => {
    expect(sessionDateTimeToIso(date, time, zone)).toBeNull();
  });
});
