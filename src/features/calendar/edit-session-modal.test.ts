import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { sessionDetailFixture } from "@/fixtures";
import { EditSessionModal } from "./edit-session-modal";

vi.mock("@/server/study/calendar-actions", () => ({ editSessionAction: vi.fn() }));

describe("EditSessionModal timezone", () => {
  it.each(["series", "occurrence"] as const)("uses the owned session timezone for %s edits, not the profile timezone", scope => {
    const session = {
      ...sessionDetailFixture,
      startsAt: "2026-10-11T23:30:00.000Z",
      endsAt: "2026-10-12T00:30:00.000Z",
      seriesMaster: { ...sessionDetailFixture.seriesMaster, startsAt: "2026-10-11T23:30:00.000Z" },
    };
    const html = renderToStaticMarkup(createElement(EditSessionModal, {
      onCancel: vi.fn(), onSaved: vi.fn(), scope, session, subjects: [], timeZone: "UTC",
    }));
    expect(html.match(/<input[^>]*name="date"[^>]*>/)?.[0]).toContain('value="2026-10-12"');
    expect(html.match(/<input[^>]*name="startTime"[^>]*>/)?.[0]).toContain('value="00:30"');
  });

  it("parses recurrence end dates in the same timezone used to save them", () => {
    const session = {
      ...sessionDetailFixture,
      seriesMaster: { ...sessionDetailFixture.seriesMaster, recurrenceRule: "FREQ=DAILY;UNTIL=20261011T233000Z" },
    };
    const html = renderToStaticMarkup(createElement(EditSessionModal, {
      onCancel: vi.fn(), onSaved: vi.fn(), scope: "series", session, subjects: [], timeZone: "UTC",
    }));
    expect(html.match(/<input[^>]*name="repeatUntil"[^>]*>/)?.[0]).toContain('value="2026-10-12"');
    expect(html).toContain("Times follow your session timezone: Africa/Tunis.");
  });
});
