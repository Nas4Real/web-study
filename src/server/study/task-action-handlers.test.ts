import { describe, expect, it, vi } from "vitest";

import type { Task } from "./task-domain";
import {
  createTaskMutationHandler,
  transitionTaskMutationHandler,
  type TaskActionContext,
} from "./task-action-handlers";

const ACTOR_ID = "00000000-0000-4000-8000-000000000001";
const SUBJECT_ID = "10000000-0000-4000-8000-000000000001";
const TASK_ID = "20000000-0000-4000-8000-000000000001";
const CREATED_TASK: Task = {
  completedAt: null,
  createdAt: "2026-10-02T10:00:00.000Z",
  description: "Bring the formula sheet.",
  dueAt: "2026-10-02T22:59:00.000Z",
  id: TASK_ID,
  priority: "normal",
  status: "pending",
  subjectId: SUBJECT_ID,
  subtasks: [],
  title: "Finish TD3",
  updatedAt: "2026-10-02T10:00:00.000Z",
};

function context(): TaskActionContext {
  return {
    actorId: ACTOR_ID,
    taskService: {
      complete: vi.fn().mockResolvedValue({ data: CREATED_TASK, status: "success" }),
      create: vi.fn().mockResolvedValue({ data: CREATED_TASK, status: "success" }),
      reopen: vi.fn().mockResolvedValue({ data: CREATED_TASK, status: "success" }),
      setSomeday: vi.fn().mockResolvedValue({ data: CREATED_TASK, status: "success" }),
    },
    timeZone: "Africa/Tunis",
  };
}

describe("task mutation handlers", () => {
  it("passes high priority and ordered authoring subtasks to the shared service", async () => {
    const requestContext = context();
    const formData = new FormData();
    formData.set("title", "Prepare exam");
    formData.set("subjectId", SUBJECT_ID);
    formData.set("priority", "high");
    formData.append("subtaskTitle", " Review notes ");
    formData.append("subtaskTitle", "Solve exercises");

    expect(await createTaskMutationHandler(async () => requestContext, formData))
      .toMatchObject({ status: "success" });
    expect(requestContext.taskService.create).toHaveBeenCalledWith(ACTOR_ID,
      expect.objectContaining({ priority: "high", dueAt: null,
        subtasks: [{ title: " Review notes " }, { title: "Solve exercises" }] }));
  });

  it.each(["invalid priority", "file priority", "file subtask", "too many subtasks", "blank subtask", "long subtask"])(
    "rejects %s before calling the mutation service", async (invalid) => {
      const requestContext = context();
      const formData = new FormData();
      formData.set("title", "Prepare exam");
      formData.set("subjectId", SUBJECT_ID);
      if (invalid === "invalid priority") formData.set("priority", "urgent");
      if (invalid === "file priority") formData.set("priority", new Blob(["high"]), "priority.txt");
      if (invalid === "file subtask") formData.append("subtaskTitle", new Blob(["notes"]), "notes.txt");
      if (invalid === "too many subtasks") for (let i = 0; i < 101; i++) formData.append("subtaskTitle", "Notes");
      if (invalid === "blank subtask") formData.append("subtaskTitle", "   ");
      if (invalid === "long subtask") formData.append("subtaskTitle", "x".repeat(301));
      expect(await createTaskMutationHandler(async () => requestContext, formData))
        .toMatchObject({ code: "INVALID_INPUT", status: "error" });
      expect(requestContext.taskService.create).not.toHaveBeenCalled();
    },
  );

  it("authenticates, converts form input, and delegates creation to TaskService", async () => {
    const requestContext = context();
    const resolveContext = vi.fn().mockResolvedValue(requestContext);
    const formData = new FormData();
    formData.set("title", "  Finish   TD3 ");
    formData.set("subjectId", SUBJECT_ID);
    formData.set("dueDate", "2026-10-02");
    formData.set("description", " Bring the formula sheet. ");

    const result = await createTaskMutationHandler(resolveContext, formData);

    expect(requestContext.taskService.create).toHaveBeenCalledWith(ACTOR_ID, {
      description: " Bring the formula sheet. ",
      dueAt: "2026-10-02T22:59:00.000Z",
      priority: "normal",
      status: "pending",
      subjectId: SUBJECT_ID,
      subtasks: [],
      title: "  Finish   TD3 ",
    });
    expect(result).toEqual({ code: "TASK_CREATED", status: "success" });
  });

  it("fails closed when no verified actor is available", async () => {
    const formData = new FormData();
    formData.set("title", "Finish TD3");
    formData.set("subjectId", SUBJECT_ID);

    const result = await createTaskMutationHandler(
      vi.fn().mockResolvedValue(null),
      formData,
    );

    expect(result).toMatchObject({ code: "UNAUTHENTICATED", status: "error" });
  });

  it("returns a stable input error without exposing provider details", async () => {
    const requestContext = context();
    vi.mocked(requestContext.taskService.create).mockResolvedValue({
      code: "INVALID_INPUT",
      status: "error",
    });
    const formData = new FormData();
    formData.set("title", "");
    formData.set("subjectId", "foreign-or-malformed");

    const result = await createTaskMutationHandler(
      vi.fn().mockResolvedValue(requestContext),
      formData,
    );

    expect(result).toEqual({
      code: "INVALID_INPUT",
      message: "Check the task details and try again.",
      status: "error",
    });
  });

  it.each([
    ["complete", "complete"],
    ["reopen", "reopen"],
    ["someday", "setSomeday"],
  ] as const)("delegates the %s transition", async (transition, method) => {
    const requestContext = context();

    const result = await transitionTaskMutationHandler(
      vi.fn().mockResolvedValue(requestContext),
      TASK_ID,
      transition,
    );

    expect(requestContext.taskService[method]).toHaveBeenCalledWith(ACTOR_ID, TASK_ID);
    expect(result).toEqual({ code: "TASK_UPDATED", status: "success" });
  });
});
