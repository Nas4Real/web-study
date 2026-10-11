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
  it("supplies actual assignment subject and priority for copied rows", () => {
    const subject = { id: "22222222-2222-4222-8222-222222222222", name: "Calculus", color: "#ec4899",
      icon: null, position: 0, createdAt: model.now, updatedAt: model.now };
    const task = { id: "11111111-1111-4111-8111-111111111111", subjectId: subject.id,
      title: "Review integrals", description: "Integration by parts", dueAt: "2026-10-03T10:00:00.000Z",
      priority: "high" as const, status: "pending" as const, completedAt: null, subtasks: [],
      createdAt: model.now, updatedAt: model.now };
    expect(toDashboardViewModel({ ...model, subjects: [subject], upcomingTasks: [task] }).assignments[0])
      .toMatchObject({ subjectLabel: "Calculus", priority: "high", dueLabel: "Due Today", dueTime: "11:00" });
  });
  it("builds the user's actual month and Monday-leading calendar", () => {
    const data = toDashboardViewModel(model);
    expect(data.calendar).toMatchObject({ monthDate: "2026-10-01", label: "October 2026", selectedDay: 3, leadingDays: [28, 29, 30] });
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

  it("keeps calendar links in the profile-local month across a year boundary", () => {
    const data = toDashboardViewModel({ ...model, now: "2026-12-31T23:30:00.000Z" });
    expect(data.calendar).toMatchObject({ monthDate: "2027-01-01", label: "January 2027", selectedDay: 1 });
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
