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
});
