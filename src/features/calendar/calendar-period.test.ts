import { describe, expect, it } from "vitest";

import { formatCalendarPeriod, shiftCalendarPeriod } from "./calendar-period";

const anchor = new Date("2026-05-07T12:00:00.000Z");

describe("calendar period state", () => {
  it("formats the approved day, week, and month labels", () => {
    expect(formatCalendarPeriod(anchor, "day")).toBe("Jeudi, 7 Mai 2026");
    expect(formatCalendarPeriod(anchor, "week")).toBe("4 Mai - 10 Mai 2026");
    expect(formatCalendarPeriod(anchor, "month")).toBe("Mai 2026");
  });

  it("shifts by the active view without mutating the source date", () => {
    expect(shiftCalendarPeriod(anchor, "day", -1).toISOString()).toBe("2026-05-06T12:00:00.000Z");
    expect(shiftCalendarPeriod(anchor, "week", 1).toISOString()).toBe("2026-05-14T12:00:00.000Z");
    expect(shiftCalendarPeriod(anchor, "month", -1).toISOString()).toBe("2026-04-07T12:00:00.000Z");
    expect(anchor.toISOString()).toBe("2026-05-07T12:00:00.000Z");
  });
});
