import { describe, expect, it, vi } from "vitest";

import { readTaskDetailHandler, mutateTaskDetailHandler, type TaskDetailContext } from "./task-detail-handlers";
import type { Task } from "./task-domain";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const TASK_ID = "22222222-2222-4222-8222-222222222222";
const SUBJECT_ID = "33333333-3333-4333-8333-333333333333";
const NOW = "2026-10-03T10:00:00.000Z";
const TASK: Task = {
  id: TASK_ID, subjectId: SUBJECT_ID, title: "Study", description: null, dueAt: null,
  status: "pending", priority: "normal", completedAt: null, subtasks: [], createdAt: NOW, updatedAt: NOW,
};

function context(): TaskDetailContext {
  return {
    actorId: ACTOR, now: () => new Date(NOW), timeZone: "Africa/Tunis",
    taskService: {
      find: vi.fn().mockResolvedValue({ status: "success", data: TASK }),
      complete: vi.fn().mockResolvedValue({ status: "success", data: { ...TASK, status: "completed", completedAt: NOW } }),
      reopen: vi.fn().mockResolvedValue({ status: "success", data: TASK }),
      toggleSubtask: vi.fn().mockResolvedValue({ status: "success", data: TASK }),
      delete: vi.fn().mockResolvedValue({ status: "success", data: null }),
    },
    subjectService: { list: vi.fn().mockResolvedValue({ status: "success", data: [{
      id: SUBJECT_ID, name: "Math", color: "#ec4899", icon: null, position: 0, createdAt: NOW, updatedAt: NOW,
    }] }) },
  };
}

describe("task detail request handlers", () => {
  it("reads minimal detail using the verified request actor and profile timezone", async () => {
    const request = context();
    const result = await readTaskDetailHandler(async () => request, TASK_ID);
    expect(result).toMatchObject({ status: "success", data: { now: NOW, timeZone: "Africa/Tunis", detail: { id: TASK_ID, title: "Study" } } });
    expect(request.taskService.find).toHaveBeenCalledWith(ACTOR, TASK_ID);
    expect(JSON.stringify(result)).not.toContain("createdAt");
  });

  it("fails closed for unauthenticated reads and mutations", async () => {
    const resolve = async () => null;
    expect(await readTaskDetailHandler(resolve, TASK_ID)).toMatchObject({ status: "error", code: "UNAUTHENTICATED" });
    expect(await mutateTaskDetailHandler(resolve, TASK_ID, { type: "delete" })).toMatchObject({ status: "error", code: "UNAUTHENTICATED" });
  });

  it("keeps malformed commands and actor spoofing out of service mutations", async () => {
    const request = context();
    const result = await mutateTaskDetailHandler(async () => request, TASK_ID, { type: "delete", actorId: ACTOR });
    expect(result).toMatchObject({ status: "error", code: "INVALID_INPUT" });
    expect(request.taskService.delete).not.toHaveBeenCalled();
  });

  it("returns canonical mutation state and an explicit null detail after deletion", async () => {
    const request = context();
    expect(await mutateTaskDetailHandler(async () => request, TASK_ID, { type: "complete" }))
      .toMatchObject({ status: "success", data: { detail: { status: "completed", completedAt: NOW } } });
    expect(await mutateTaskDetailHandler(async () => request, TASK_ID, { type: "delete" }))
      .toEqual({ status: "success", data: { now: NOW, timeZone: "Africa/Tunis", detail: null } });
  });

  it("maps missing/foreign IDs to the same safe public error", async () => {
    const request = context();
    vi.mocked(request.taskService.find).mockResolvedValue({ status: "error", code: "NOT_FOUND" });
    expect(await readTaskDetailHandler(async () => request, TASK_ID)).toEqual({ status: "error", code: "NOT_FOUND", message: "That task is no longer available." });
    expect(await mutateTaskDetailHandler(async () => request, TASK_ID, { type: "delete" }))
      .toEqual({ status: "error", code: "NOT_FOUND", message: "That task is no longer available." });
  });

  it("normalizes context and provider exceptions without exposing diagnostics", async () => {
    const unavailable = { status: "error", code: "STORAGE_UNAVAILABLE", message: "Tasks are temporarily unavailable. Please try again." };
    const resolve = async () => { throw new Error("provider secret"); };
    expect(await readTaskDetailHandler(resolve, TASK_ID)).toEqual(unavailable);
    expect(await mutateTaskDetailHandler(resolve, TASK_ID, { type: "delete" })).toEqual(unavailable);
    const request = context();
    vi.mocked(request.taskService.complete).mockRejectedValue(new Error("provider secret"));
    expect(await mutateTaskDetailHandler(async () => request, TASK_ID, { type: "complete" })).toEqual(unavailable);
  });
});
