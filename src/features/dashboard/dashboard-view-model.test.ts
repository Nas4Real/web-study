import { describe, expect, it } from "vitest";
import { toDashboardViewModel } from "./dashboard-view-model";
import type { DashboardReadModel } from "@/server/study/dashboard-service";

const model: DashboardReadModel = {
  now: "2026-10-02T23:30:00.000Z", timeZone: "Africa/Tunis", subjects: [],
  taskSummary: { total: 0, dueToday: 0, completedToday: 0, todayTotal: 0 },
  upcomingTasks: [], todayTasks: [], upcomingExam: null, nextSession: null,
  todayClasses: [], monthTasks: [], monthExams: [],
};

describe("dashboard presentation projection", () => {
  it("builds the user's actual month and Monday-leading calendar", () => {
    const data = toDashboardViewModel(model);
    expect(data.calendar).toMatchObject({ label: "October 2026", selectedDay: 3, leadingDays: [28, 29, 30] });
    expect(data.calendar.days).toHaveLength(31);
    expect(data.calendar.events).toEqual({});
  });
  it("keeps empty selections honest rather than inserting demo data", () => {
    const data = toDashboardViewModel(model);
    expect(data.upcomingExam).toEqual({ title: "—", dueLabel: "—" });
    expect(data.tasks).toEqual([]);
    expect(data.assignments).toEqual([]);
    expect(data.todayClasses).toEqual([]);
  });

  it("preserves explicit occurrence identity for session detail reads", () => {
    const session = {
      seriesId: "33333333-3333-4333-8333-333333333333",
      originalStart: "2026-10-03T08:00:00.000Z",
      startsAt: "2026-10-03T09:00:00.000Z",
      endsAt: "2026-10-03T10:30:00.000Z",
      subjectId: "22222222-2222-4222-8222-222222222222",
      timezone: "Africa/Tunis",
      kind: "university" as const,
      title: "Physics",
      durationMinutes: 90,
      location: "Room 401",
      professor: null,
      focusText: null,
      notesItems: [],
      isCurrent: false,
    };

    expect(toDashboardViewModel({ ...model, todayClasses: [session] }).todayClasses[0]).toMatchObject({
      seriesId: session.seriesId,
      originalStart: session.originalStart,
    });
  });
});
