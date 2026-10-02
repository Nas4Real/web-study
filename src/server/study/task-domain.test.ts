import { describe, expect, it } from "vitest";

import {
  groupTasks,
  taskCreateInputSchema,
  taskUpdateInputSchema,
  type Task,
} from "./task-domain";

const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";

function task(overrides: Partial<Task>): Task {
  return {
    completedAt: null,
    createdAt: "2026-10-02T08:00:00.000Z",
    description: null,
    dueAt: null,
    id: crypto.randomUUID(),
    priority: "normal",
    status: "pending",
    subjectId: SUBJECT_ID,
    subtasks: [],
    title: "Task",
    updatedAt: "2026-10-02T08:00:00.000Z",
    ...overrides,
  };
}

describe("task input contracts", () => {
  it("normalizes create input and applies safe defaults", () => {
    const result = taskCreateInputSchema.parse({
      description: "  Read   chapters 1–3  ",
      subjectId: SUBJECT_ID,
      subtasks: [{ title: "  Review   notes " }, { title: "Quiz" }],
      title: "  Study   calculus ",
    });

    expect(result).toEqual({
      description: "Read chapters 1–3",
      dueAt: null,
      priority: "normal",
      status: "pending",
      subjectId: SUBJECT_ID,
      subtasks: [{ title: "Review notes" }, { title: "Quiz" }],
      title: "Study calculus",
    });
  });

  it("rejects invalid fields and more than 100 initial subtasks", () => {
    const invalid = taskCreateInputSchema.safeParse({
      description: "x".repeat(10_001),
      priority: "urgent",
      subjectId: SUBJECT_ID,
      subtasks: Array.from({ length: 101 }, (_, index) => ({
        title: `Subtask ${index}`,
      })),
      title: " ",
    });

    expect(invalid.success).toBe(false);
    expect(
      taskCreateInputSchema.safeParse({
        subjectId: SUBJECT_ID,
        subtasks: [{ title: "x".repeat(301) }],
        title: "Valid",
      }).success,
    ).toBe(false);
  });

  it("keeps status transitions out of ordinary updates", () => {
    expect(taskUpdateInputSchema.safeParse({ status: "completed" }).success).toBe(
      false,
    );
    expect(taskUpdateInputSchema.safeParse({ title: "  Revised   title " }).data).toEqual(
      { title: "Revised title" },
    );
  });
});

describe("task grouping", () => {
  it("groups by user-local calendar day and terminal status", () => {
    const tasks = [
      task({ dueAt: "2026-10-01T23:30:00.000Z", title: "Today in Tunis" }),
      task({ dueAt: "2026-10-01T22:30:00.000Z", title: "Overdue in Tunis" }),
      task({ dueAt: "2026-10-03T12:00:00.000Z", title: "Later" }),
      task({ title: "No due date" }),
      task({
        completedAt: "2026-10-01T10:00:00.000Z",
        status: "completed",
        title: "Completed",
      }),
      task({ status: "someday", title: "Someday" }),
    ];

    const grouped = groupTasks(tasks, "Africa/Tunis", new Date("2026-10-02T08:00:00Z"));

    expect(grouped.overdue.map(({ title }) => title)).toEqual(["Overdue in Tunis"]);
    expect(grouped.today.map(({ title }) => title)).toEqual(["Today in Tunis"]);
    expect(grouped.later.map(({ title }) => title)).toEqual(["Later", "No due date"]);
    expect(grouped.completed.map(({ title }) => title)).toEqual(["Completed"]);
    expect(grouped.someday.map(({ title }) => title)).toEqual(["Someday"]);
  });
});
