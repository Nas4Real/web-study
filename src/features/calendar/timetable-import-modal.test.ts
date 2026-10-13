import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TimetableImportModal } from "./timetable-import-modal";
import { CalendarHeader } from "./calendar-header";

describe("Calendar import entry and initial state", () => {
  it("has a named Import button without removing existing Calendar controls", () => {
    const html = renderToStaticMarkup(createElement(CalendarHeader, { greetingName: "Yassine", periodLabel: "October", view: "week", onShift: vi.fn(), onViewChange: vi.fn(), onNewSession: vi.fn(), onImport: vi.fn() }));
    expect(html).toContain('id="calendar-import-button"');
    expect(html).toContain("Import");
    expect(html).toContain("New Session");
  });
  it("offers an accessible chooser, template and confirmation with no enabled empty import", () => {
    const html = renderToStaticMarkup(createElement(TimetableImportModal, { subjects: [], onClose: vi.fn(), onImported: vi.fn(), onViewCalendar: vi.fn() }));
    expect(html).toContain("Import timetable");
    expect(html).toContain('type="file"');
    expect(html).toContain('accept=".json,application/json"');
    expect(html).toContain("Download example JSON");
    expect(html).toContain("Nothing is saved until you confirm");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Import sessions<\/button>/);
  });
});
