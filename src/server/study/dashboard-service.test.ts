import { describe, expect, it, vi } from "vitest";

import { DashboardService, type DashboardSources } from "./dashboard-service";
import type { Task } from "./task-domain";
import type { CalendarOccurrence } from "./calendar-recurrence";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const SUBJECT = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-10-02T23:30:00Z");
function task(id: string, overrides: Partial<Task> = {}): Task {
  return { id, subjectId: SUBJECT, title: id, description: null, dueAt: "2026-10-03T08:00:00Z",
    status: "pending", completedAt: null, priority: "normal", subtasks: [],
    createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", ...overrides };
}
function occurrence(id: string, overrides: Partial<CalendarOccurrence> = {}): CalendarOccurrence {
  return { seriesId: id, originalStart: "2026-10-03T08:00:00Z", startsAt: "2026-10-03T08:00:00Z",
    endsAt: "2026-10-03T09:00:00Z", durationMinutes: 60, title: id, kind: "university",
    subjectId: SUBJECT, timezone: "Africa/Tunis", location: "Room 1", professor: null,
    focusText: null, notesItems: [], isCurrent: false, ...overrides };
}
function sources(tasks: Task[] = [], occurrences: CalendarOccurrence[] = []): DashboardSources {
  return {
    tasks: { list: vi.fn().mockResolvedValue({ status: "success", data: tasks }) },
    calendar: { listOccurrences: vi.fn().mockResolvedValue({ status: "success", data: occurrences }) },
    subjects: { list: vi.fn().mockResolvedValue({ status: "success", data: [{
      id: SUBJECT, name: "Physics", color: "#10b981", icon: null, position: 0,
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    }] }) },
  };
}

describe("DashboardService", () => {
  it("orders offset timestamps by instant rather than their text", async () => {
    const result = await new DashboardService(sources([
      task("later", { dueAt: "2026-10-03T08:00:00Z" }),
      task("earlier", { dueAt: "2026-10-03T09:00:00+02:00" }),
    ], [
      occurrence("later", { startsAt: "2026-10-03T08:00:00Z" }),
      occurrence("earlier", { startsAt: "2026-10-03T09:00:00+02:00" }),
    ]), () => NOW).read(ACTOR, "UTC");
    if (result.status !== "success") throw new Error(result.code);
    expect(result.data.upcomingTasks.map(t => t.id)).toEqual(["earlier", "later"]);
    expect(result.data.nextSession?.seriesId).toBe("earlier");
  });

  it("preserves normalized service errors without producing a partial dashboard", async () => {
    const data = sources();
    vi.mocked(data.tasks.list).mockResolvedValue({ status: "error", code: "STORAGE_UNAVAILABLE" });
    expect(await new DashboardService(data, () => NOW).read(ACTOR, "UTC"))
      .toEqual({ status: "error", code: "STORAGE_UNAVAILABLE" });
  });

  it("derives timezone-correct counts and progress without counting Someday", async () => {
    const data = sources([
      task("today"), task("overdue", { dueAt: "2026-10-02T10:00:00Z" }),
      task("someday", { status: "someday" }),
      task("done", { status: "completed", completedAt: "2026-10-02T23:00:00Z" }),
      task("older", { status: "completed", dueAt: null, completedAt: "2026-10-01T12:00:00Z" }),
    ]);
    const result = await new DashboardService(data, () => NOW).read(ACTOR, "Africa/Tunis");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.taskSummary).toEqual({ total: 2, dueToday: 1, completedToday: 1, todayTotal: 2 });
      expect(result.data.todayTasks.map(t => t.id)).toEqual(["today", "done"]);
      expect(result.data.upcomingTasks.map(t => t.id)).toEqual(["overdue", "today"]);
    }
  });

  it("selects effective future exams/sessions and today's university occurrences", async () => {
    const data = sources([], [occurrence("later"), occurrence("exam", { kind: "exam" }),
      occurrence("moved", { startsAt: "2026-10-02T23:45:00Z", endsAt: "2026-10-03T00:45:00Z", location: "Changed room" }),
      occurrence("past", { startsAt: "2026-10-02T20:00:00Z", endsAt: "2026-10-02T21:00:00Z" }),
    ]);
    const result = await new DashboardService(data, () => NOW).read(ACTOR, "Africa/Tunis");
    if (result.status !== "success") throw new Error(result.code);
    expect(result.data.upcomingExam?.seriesId).toBe("exam");
    expect(result.data.nextSession?.seriesId).toBe("moved");
    expect(result.data.todayClasses.map(s => s.seriesId)).toEqual(["moved", "later"]);
    expect(result.data.nextSession?.location).toBe("Changed room");
    expect(data.tasks.list).toHaveBeenCalledTimes(1);
    expect(data.subjects.list).toHaveBeenCalledTimes(1);
    expect(data.calendar.listOccurrences).toHaveBeenCalledTimes(1);
    expect(data.tasks.list).toHaveBeenCalledWith(ACTOR);
  });

  it("returns explicit empty results", async () => {
    const result = await new DashboardService(sources(), () => NOW).read(ACTOR, "UTC");
    expect(result).toMatchObject({ status: "success", data: {
      upcomingExam: null, nextSession: null, todayClasses: [], todayTasks: [], upcomingTasks: [],
      taskSummary: { total: 0, dueToday: 0, completedToday: 0, todayTotal: 0 },
    } });
  });

  it("rejects invalid actors/timezones before accessing data", async () => {
    const data = sources();
    const service = new DashboardService(data, () => NOW);
    expect(await service.read("bad", "UTC")).toEqual({ status: "error", code: "INVALID_ACTOR" });
    expect(await service.read(ACTOR, "bad-zone")).toEqual({ status: "error", code: "INVALID_INPUT" });
    expect(data.tasks.list).not.toHaveBeenCalled();
    expect(data.calendar.listOccurrences).not.toHaveBeenCalled();
  });

  it("fails closed on provider failures without returning partial data", async () => {
    const data = sources([task("private")]);
    vi.mocked(data.calendar.listOccurrences).mockRejectedValue(new Error("provider secret"));
    expect(await new DashboardService(data, () => NOW).read(ACTOR, "UTC"))
      .toEqual({ status: "error", code: "STORAGE_UNAVAILABLE" });
  });
});
