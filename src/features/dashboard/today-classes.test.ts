import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { DashboardClassDTO } from "@/domain/dto";
import { TodayClasses } from "./today-classes";

describe("TodayClasses", () => {
  it("renders each session as an accessible detail button without opaque hash navigation", () => {
    const session: DashboardClassDTO = {
      id: "display-id",
      seriesId: "33333333-3333-4333-8333-333333333333",
      originalStart: "2026-10-05T08:00:00.000Z",
      timeLabel: "09:00",
      title: "Physics",
      location: "Room 401",
    };

    const html = renderToStaticMarkup(createElement(TodayClasses, { classes: [session], onOpen: vi.fn() }));

    expect(html).toContain('<button aria-label="Open Physics"');
    expect(html).not.toContain('href="#display-id"');
  });
});
