import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CalendarMonthCellDTO, CalendarVisualEventDTO } from "@/domain/dto";
import { MonthView } from "./month-view";

describe("Month calendar rendering", () => {
  const event: CalendarVisualEventDTO = { id: "first", title: "First session", subjectLabel: "Physics", tone: "physics",
    startLabel: "09:00", endLabel: "10:00", durationLabel: "60m", location: null, inProgress: false, progressLabel: null };
  const cell: CalendarMonthCellDTO = { id: "2026-10-05", day: 5, outsideMonth: false, isToday: false, event };
  const render = (cells: readonly CalendarMonthCellDTO[]) => renderToStaticMarkup(createElement(MonthView, { label: "October", cells }));
  it("renders every canonical event without adding clickable Month controls", () => {
    const html = render([{ ...cell, events: [event, { ...event, id: "second", title: "Second session", inProgress: true }] }]);
    expect(html).toContain("First session");
    expect(html).toContain("Second session");
    expect(html).toContain("animate-pulse");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<a ");
  });
  it("retains legacy fixture cards and lets an explicit empty canonical array win", () => {
    expect(render([cell])).toContain("First session");
    expect(render([{ ...cell, events: [] }])).not.toContain("First session");
  });
  it.each([28, 35, 42])("uses exactly %i cells with borders only above the final row", count => {
    const html = render(Array.from({ length: count }, (_, index) => ({ ...cell, id: `cell-${index}`, event: null })));
    expect(html).toContain(`grid-rows-${count / 7}`);
    expect(html.match(/role="gridcell"/g)).toHaveLength(count);
    // The weekday header contributes one border; final-row cells contribute none.
    expect(html.match(/border-b(?: |")/g)).toHaveLength(count - 7 + 1);
  });
});
