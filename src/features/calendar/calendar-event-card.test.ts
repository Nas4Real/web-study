import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CalendarVisualEventDTO } from "@/domain/dto";
import { DayEventCard, WeekEventCard } from "./calendar-event-card";

const event: CalendarVisualEventDTO = {
  id: "session", seriesId: "series", originalStart: "2026-10-11T08:00:00.000Z",
  title: "Binary search practice", subjectLabel: "Algorithms", tone: "mechanics",
  startLabel: "09:00", endLabel: "10:00", durationLabel: "60m", location: null,
  inProgress: false, progressLabel: null,
};

describe("Calendar subject colors", () => {
  for (const Card of [DayEventCard, WeekEventCard]) {
    it.each([false, true])(`${Card.name} uses the actual subject color (in progress: %s)`, inProgress => {
      const html = renderToStaticMarkup(createElement(Card, { event: { ...event, inProgress, subjectColor: "#4ade80" } }));
      expect(html).toContain('style="background-color:#4ade80"');
      expect(html).toContain('style="color:#4ade80"');
      expect(html).toContain("Algorithms");
      expect(html).toContain(inProgress ? "bg-[#001f29]" : "bg-card");
    });

    it(`${Card.name} retains approved fixture colors when no stored color is present`, () => {
      const html = renderToStaticMarkup(createElement(Card, { event }));
      expect(html).toContain("bg-mechanics");
      expect(html).toContain("text-mechanics");
      expect(html).not.toContain('style=');
    });

    it(`${Card.name} does not render invalid stored colors as CSS`, () => {
      const html = renderToStaticMarkup(createElement(Card, { event: { ...event, subjectColor: "url(https://invalid.example)" } }));
      expect(html).not.toContain("invalid.example");
      expect(html).not.toContain('style=');
    });
  }
});
