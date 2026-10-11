import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { dashboardFixture } from "@/fixtures";
import { DashboardHeader } from "./dashboard-header";
import { SummaryCards } from "./summary-cards";
import { UpcomingAssignments } from "./upcoming-assignments";
import { TaskProgress } from "./task-progress";
import { MiniCalendar } from "./mini-calendar";

describe("copied localhost Dashboard", () => {
  it("uses the source summary card typography, radius and colored icon containers", () => {
    const html = renderToStaticMarkup(createElement(SummaryCards, { dashboard: dashboardFixture }));
    expect(html).toContain("rounded-[24px]");
    expect(html).toContain("text-[26px]");
    expect(html).toContain("text-[15px]");
    expect(html).toContain("bg-red-500/10");
    expect(html).not.toContain("font-mono");
  });

  it("binds actual assignment subjects and priority and links View All to Tasks", () => {
    const html = renderToStaticMarkup(createElement(UpcomingAssignments, {
      assignments: [{ ...dashboardFixture.assignments[0], subjectLabel: "Calculus", priority: "high" }],
      onOpen: vi.fn(),
    }));
    expect(html).toContain("Calculus");
    expect(html).toContain("High");
    expect(html).toContain('href="/tasks"');
    expect(html).toContain("w-[52px]");
    expect(html).toContain("rounded-[24px]");
    expect(html).toContain("dashboard-assignment-open-assignment-mathematics");
  });

  it("keeps task completion a separate control and renders actual progress", () => {
    const html = renderToStaticMarkup(createElement(TaskProgress, {
      completed: 1, tasks: dashboardFixture.tasks, onOpen: vi.fn(), onToggle: vi.fn(), pending: false,
    }));
    expect(html).toContain("1 of 3 completed");
    expect(html).toContain('role="checkbox"');
    expect(html).toContain("dashboard-task-open-dashboard-task-mathematics");
    expect(html).toContain('href="/tasks"');
    expect(html).toContain("bg-[#38bdf8]");
  });

  it("does not invent notifications or demo calendar dates", () => {
    const header = renderToStaticMarkup(createElement(DashboardHeader, { onOpenNewTask: vi.fn() }));
    expect(header).toContain("New Task");
    expect(header).toContain('disabled=""');
    expect(header).not.toContain("bg-red-500");
    const calendar = renderToStaticMarkup(createElement(MiniCalendar, { calendar: dashboardFixture.calendar }));
    expect(calendar).toContain(dashboardFixture.calendar.label);
    expect(calendar).toContain("rounded-[24px]");
    expect(calendar).toContain("text-[18px]");
    expect(calendar).toContain('aria-current="date"');
    expect(calendar).toContain('/calendar?view=month&amp;date=2026-07-01');
    expect(calendar).toContain('/calendar?view=month&amp;date=2026-09-01');
    expect(calendar).toContain('/calendar?view=day&amp;date=2026-08-10');
  });
});
