import { describe, expect, it, vi } from "vitest";

import type { SubjectService } from "@/server/study/subject-service";
import type { TaskDetailService } from "@/server/study/task-detail-service";
import type { TaskService } from "@/server/study/task-service";

import type { PublicApiRequestContext } from "./public-api-handler";
import {
  createTaskItemAdapter,
  createTaskSubtaskCollectionAdapter,
  createTaskSubtaskItemAdapter,
  createTaskTransitionAdapter,
  createTasksCollectionAdapter,
} from "./task-api";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const TASK_ID = "33333333-3333-4333-8333-333333333333";
const NOW = "2026-10-09T10:00:00.000Z";
const SUBJECT = { color: "#ec4899", createdAt: NOW, icon: null, id: SUBJECT_ID,
  name: "Math", position: 0, updatedAt: NOW };
const TASK = { completedAt: null, createdAt: NOW, description: null, dueAt: null,
  id: TASK_ID, priority: "normal" as const, status: "pending" as const,
  subjectId: SUBJECT_ID, subtasks: [], title: "Study", updatedAt: NOW };
const DETAIL = { completedAt: null, description: null, dueAt: null, id: TASK_ID,
  priority: "normal" as const, status: "pending" as const,
  subject: { color: SUBJECT.color, id: SUBJECT_ID, name: SUBJECT.name },
  subtasks: [], title: "Study" };
const CONTEXT: PublicApiRequestContext = {
  actor: { apiKeyId: "44444444-4444-4444-8444-444444444444", userId: USER_ID },
  requestId: "task-request-1",
};

function dependencies() {
  return {
    details: { read: vi.fn(), mutate: vi.fn() } as unknown as TaskDetailService,
    subjects: { findMany: vi.fn().mockResolvedValue({ data: [SUBJECT], status: "success" }) } as unknown as SubjectService,
    tasks: {
      addSubtask: vi.fn(), complete: vi.fn(), create: vi.fn(), delete: vi.fn(),
      deleteSubtask: vi.fn(), listPage: vi.fn(), reopen: vi.fn(), update: vi.fn(),
      updateSubtask: vi.fn(),
    } as unknown as TaskService,
  };
}

describe("tasks public API adapter", () => {
  it("returns a filtered cursor page with subject summaries", async () => {
    const deps = dependencies();
    vi.mocked(deps.tasks.listPage).mockResolvedValue({
      data: { items: [TASK], nextCursor: null }, status: "success",
    });
    const response = await createTasksCollectionAdapter(deps)(new Request(
      `https://example.test/api/v1/tasks?limit=25&status=pending&subject_id=${SUBJECT_ID}`,
    ), CONTEXT);
    expect(deps.tasks.listPage).toHaveBeenCalledWith(USER_ID, {
      cursor: null, limit: 25, status: "pending", subjectId: SUBJECT_ID,
    });
    expect((await response.json()).data[0]).toMatchObject({
      id: TASK_ID, status: "pending", subject: { id: SUBJECT_ID, name: "Math" },
    });
  });

  it("creates a pending task with ordered initial subtasks and returns full detail", async () => {
    const deps = dependencies();
    vi.mocked(deps.tasks.create).mockResolvedValue({ data: TASK, status: "success" });
    vi.mocked(deps.details.read).mockResolvedValue({ data: DETAIL, status: "success" });

    const response = await createTasksCollectionAdapter(deps)(new Request(
      "https://example.test/api/v1/tasks", {
        body: JSON.stringify({
          description: "Review chapter 4",
          priority: "high",
          subject_id: SUBJECT_ID,
          subtasks: [{ title: "Read" }, { title: "Practice" }],
          title: "Study",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    ), CONTEXT);

    expect(deps.tasks.create).toHaveBeenCalledWith(USER_ID, {
      description: "Review chapter 4",
      dueAt: null,
      priority: "high",
      subjectId: SUBJECT_ID,
      subtasks: [{ title: "Read" }, { title: "Practice" }],
      title: "Study",
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: TASK_ID, subtasks: [] });
  });

  it("rejects non-canonical create status before calling the service", async () => {
    const deps = dependencies();
    const response = await createTasksCollectionAdapter(deps)(new Request(
      "https://example.test/api/v1/tasks", {
        body: JSON.stringify({ status: "someday", subject_id: SUBJECT_ID, title: "Later" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    ), CONTEXT);

    expect(response.status).toBe(422);
    expect(deps.tasks.create).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: {
      code: "VALIDATION_FAILED", message: "The request is invalid.", request_id: CONTEXT.requestId,
    } });
  });

  it("updates a parent task to someday through the shared task service", async () => {
    const deps = dependencies();
    vi.mocked(deps.tasks.update).mockResolvedValue({ data: { ...TASK, status: "someday" }, status: "success" });
    vi.mocked(deps.details.read).mockResolvedValue({ data: { ...DETAIL, status: "someday" }, status: "success" });

    const response = await createTaskItemAdapter(deps, TASK_ID)(new Request(
      `https://example.test/api/v1/tasks/${TASK_ID}`, {
        body: JSON.stringify({ status: "someday" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    ), CONTEXT);

    expect(deps.tasks.update).toHaveBeenCalledWith(USER_ID, TASK_ID, { status: "someday" });
    expect(await response.json()).toMatchObject({ id: TASK_ID, status: "someday" });
  });

  it("conceals missing or foreign-owned task deletion", async () => {
    const deps = dependencies();
    vi.mocked(deps.tasks.delete).mockResolvedValue({ code: "NOT_FOUND", status: "error" });

    const response = await createTaskItemAdapter(deps, TASK_ID)(new Request(
      `https://example.test/api/v1/tasks/${TASK_ID}`, { method: "DELETE" }), CONTEXT,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("completes the parent through the canonical transition service", async () => {
    const deps = dependencies();
    vi.mocked(deps.details.mutate).mockResolvedValue({ data: null, status: "success" });
    const response = await createTaskTransitionAdapter(deps.details, TASK_ID, "complete")(
      new Request(`https://example.test/api/v1/tasks/${TASK_ID}/complete`, { method: "POST" }), CONTEXT,
    );
    expect(deps.details.mutate).toHaveBeenCalledWith(USER_ID, TASK_ID, { type: "complete" });
    expect(response.status).toBe(200);
  });

  it("creates an ordered subtask without mutating the parent transition", async () => {
    const deps = dependencies();
    vi.mocked(deps.tasks.addSubtask).mockResolvedValue({
      data: { completedAt: null, createdAt: NOW, id: "55555555-5555-4555-8555-555555555555",
        position: 2, title: "Read notes", updatedAt: NOW }, status: "success",
    });
    const response = await createTaskSubtaskCollectionAdapter(deps.tasks, TASK_ID)(new Request(
      `https://example.test/api/v1/tasks/${TASK_ID}/subtasks`, {
        body: JSON.stringify({ position: 2, title: "Read notes" }),
        headers: { "content-type": "application/json" }, method: "POST",
      },
    ), CONTEXT);
    expect(deps.tasks.addSubtask).toHaveBeenCalledWith(USER_ID, TASK_ID, {
      completed: false, position: 2, title: "Read notes",
    });
    expect(response.status).toBe(201);
  });

  it("updates one nested subtask using owner and parent identifiers", async () => {
    const deps = dependencies();
    const subtaskId = "55555555-5555-4555-8555-555555555555";
    vi.mocked(deps.tasks.updateSubtask).mockResolvedValue({
      data: { completedAt: NOW, createdAt: NOW, id: subtaskId,
        position: 1, title: "Review", updatedAt: NOW }, status: "success",
    });
    const response = await createTaskSubtaskItemAdapter(deps.tasks, TASK_ID, subtaskId)(new Request(
      `https://example.test/api/v1/tasks/${TASK_ID}/subtasks/${subtaskId}`, {
        body: JSON.stringify({ completed: true, position: 1, title: "Review" }),
        headers: { "content-type": "application/json" }, method: "PATCH",
      },
    ), CONTEXT);

    expect(deps.tasks.updateSubtask).toHaveBeenCalledWith(USER_ID, TASK_ID, subtaskId, {
      completed: true, position: 1, title: "Review",
    });
    expect(await response.json()).toMatchObject({ completed: true, id: subtaskId });
  });
});
