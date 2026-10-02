import { describe, expect, it } from "vitest";

import type { Subject } from "@/server/study/study-domain";
import type { Task, TaskGroups } from "@/server/study/task-domain";

import {
  dateInputToEndOfDayIso,
  toTaskListViewModel,
} from "./task-view-model";

const SUBJECT: Subject = {
  color: "#ec4899",
  createdAt: "2026-01-01T00:00:00.000Z",
  icon: null,
  id: "10000000-0000-4000-8000-000000000001",
  name: "Math",
  position: 0,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function task(overrides: Partial<Task> = {}): Task {
  return {
    completedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    description: "Practice the assigned problems.",
    dueAt: "2026-10-02T21:59:00.000Z",
    id: "20000000-0000-4000-8000-000000000001",
    priority: "normal",
    status: "pending",
    subjectId: SUBJECT.id,
    subtasks: [],
    title: "Review matrices",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function groups(overrides: Partial<TaskGroups> = {}): TaskGroups {
  return {
    completed: [],
    later: [],
    overdue: [],
    someday: [],
    today: [],
    ...overrides,
  };
}

describe("task list view model", () => {
  it("maps real grouped tasks and subject metadata into the approved list shape", () => {
    const overdue = task({ dueAt: "2026-10-01T21:59:00.000Z" });
    const today = task({
      dueAt: "2026-10-02T21:59:00.000Z",
      id: "20000000-0000-4000-8000-000000000002",
      title: "Read forces",
    });

    const result = toTaskListViewModel(
      groups({ overdue: [overdue], today: [today] }),
      [SUBJECT],
      "Africa/Tunis",
      new Date("2026-10-02T10:00:00.000Z"),
    );

    expect(result).toMatchObject([
      {
        dueLabel: "Yesterday",
        group: "overdue",
        status: "pending",
        subjectLabel: "Math",
        tone: "algebra",
      },
      {
        dueLabel: "Today",
        group: "today",
        status: "pending",
        title: "Read forces",
      },
    ]);
  });

  it("keeps completed and someday tasks available to their status tabs", () => {
    const completed = task({ status: "completed" });
    const someday = task({
      dueAt: null,
      id: "20000000-0000-4000-8000-000000000003",
      status: "someday",
    });

    const result = toTaskListViewModel(
      groups({ completed: [completed], someday: [someday] }),
      [SUBJECT],
      "Africa/Tunis",
      new Date("2026-10-02T10:00:00.000Z"),
    );

    expect(result.map(({ group, status }) => ({ group, status }))).toEqual([
      { group: "completed", status: "completed" },
      { group: "someday", status: "someday" },
    ]);
  });
});

describe("task due-date boundary", () => {
  it("stores an HTML date as the end of that day in the user's timezone", () => {
    expect(dateInputToEndOfDayIso("2026-10-02", "Africa/Tunis")).toBe(
      "2026-10-02T22:59:00.000Z",
    );
  });

  it("rejects malformed dates and invalid timezones", () => {
    expect(dateInputToEndOfDayIso("02/10/2026", "Africa/Tunis")).toBeNull();
    expect(dateInputToEndOfDayIso("2026-10-02", "Not/A_Zone")).toBeNull();
  });
});
