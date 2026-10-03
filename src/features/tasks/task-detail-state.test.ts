import { describe, expect, it } from "vitest";
import type { TaskDetailDTO } from "@/domain/dto";
import { optimisticTaskDetail, formatTaskDetailDue } from "./task-detail-state";

const detail: TaskDetailDTO = {
  id: "task", title: "Study", description: null, priority: "normal", status: "pending",
  dueAt: "2026-10-03T22:59:00.000Z", completedAt: null,
  subject: { id: "subject", name: "Math", color: "#ec4899" },
  subtasks: [{ id: "subtask", title: "Read", position: 0, completedAt: null }],
};
const now = "2026-10-02T10:00:00.000Z";

describe("task detail optimistic projection", () => {
  it("changes only the requested subtask and leaves its source snapshot intact", () => {
    const next = optimisticTaskDetail(detail, { type: "subtask", subtaskId: "subtask", completed: true }, now);
    expect(next.subtasks[0].completedAt).toBe(now);
    expect(next.status).toBe("pending");
    expect(detail.subtasks[0].completedAt).toBeNull();
    expect(optimisticTaskDetail(next, { type: "subtask", subtaskId: "subtask", completed: false }, now).subtasks[0].completedAt).toBeNull();
  });
  it("completes/reopens the parent without rewriting subtasks", () => {
    const completed = optimisticTaskDetail(detail, { type: "complete" }, now);
    expect(completed.status).toBe("completed");
    expect(completed.subtasks).toEqual(detail.subtasks);
    expect(optimisticTaskDetail(completed, { type: "reopen" }, now)).toMatchObject({ status: "pending", completedAt: null, subtasks: detail.subtasks });
  });
  it("does not optimistically delete before server confirmation", () => {
    expect(optimisticTaskDetail(detail, { type: "delete" }, now)).toBe(detail);
  });
  it("formats canonical due time in the profile timezone, including missing dates", () => {
    expect(formatTaskDetailDue(detail.dueAt, "Africa/Tunis", now)).toBe("Due Tomorrow, 11:59 PM");
    expect(formatTaskDetailDue(null, "Africa/Tunis", now)).toBe("No due date");
  });
});
