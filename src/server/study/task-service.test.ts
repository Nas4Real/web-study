import { describe, expect, it, vi } from "vitest";

import { TaskService, type TaskRepository } from "./task-service";
import type { Task } from "./task-domain";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const TASK_ID = "33333333-3333-4333-8333-333333333333";
const SUBTASK_ID = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-10-02T12:00:00.000Z";

const TASK: Task = {
  completedAt: null,
  createdAt: NOW,
  description: null,
  dueAt: null,
  id: TASK_ID,
  priority: "normal",
  status: "pending",
  subjectId: SUBJECT_ID,
  subtasks: [
    {
      completedAt: null,
      createdAt: NOW,
      id: SUBTASK_ID,
      position: 0,
      title: "First",
      updatedAt: NOW,
    },
  ],
  title: "Study",
  updatedAt: NOW,
};

function createRepository(overrides: Partial<TaskRepository> = {}): TaskRepository {
  return {
    createOwned: vi.fn().mockResolvedValue({ data: TASK, errorCode: null }),
    deleteOwned: vi.fn().mockResolvedValue({ data: true, errorCode: null }),
    findOwned: vi.fn().mockResolvedValue({ data: TASK, errorCode: null }),
    listOwned: vi.fn().mockResolvedValue({ data: [TASK], errorCode: null }),
    setStatusOwned: vi.fn().mockResolvedValue({ data: TASK, errorCode: null }),
    toggleSubtaskOwned: vi.fn().mockResolvedValue({ data: TASK, errorCode: null }),
    updateOwned: vi.fn().mockResolvedValue({ data: TASK, errorCode: null }),
    ...overrides,
  };
}

describe("TaskService", () => {
  it("normalizes creation and preserves initial subtask order", async () => {
    const repository = createRepository();
    const result = await new TaskService(repository, () => new Date(NOW)).create(
      USER_ID,
      {
        subjectId: SUBJECT_ID,
        subtasks: [{ title: " First " }, { title: "  Second   step " }],
        title: "  Study   math ",
      },
    );

    expect(result.status).toBe("success");
    expect(repository.createOwned).toHaveBeenCalledWith(USER_ID, {
      description: null,
      dueAt: null,
      priority: "normal",
      status: "pending",
      subjectId: SUBJECT_ID,
      subtasks: [{ title: "First" }, { title: "Second step" }],
      title: "Study math",
    });
  });

  it("uses explicit parent transitions without rewriting subtasks", async () => {
    const repository = createRepository();
    const service = new TaskService(repository, () => new Date(NOW));

    await service.complete(USER_ID, TASK_ID);
    await service.reopen(USER_ID, TASK_ID);
    await service.setSomeday(USER_ID, TASK_ID);

    expect(repository.setStatusOwned).toHaveBeenNthCalledWith(
      1,
      USER_ID,
      TASK_ID,
      "completed",
      NOW,
    );
    expect(repository.setStatusOwned).toHaveBeenNthCalledWith(
      2,
      USER_ID,
      TASK_ID,
      "pending",
      null,
    );
    expect(repository.setStatusOwned).toHaveBeenNthCalledWith(
      3,
      USER_ID,
      TASK_ID,
      "someday",
      null,
    );
    expect(repository.toggleSubtaskOwned).not.toHaveBeenCalled();
  });

  it("targets one owned subtask without changing parent status", async () => {
    const repository = createRepository();
    const service = new TaskService(repository, () => new Date(NOW));

    await service.toggleSubtask(USER_ID, TASK_ID, SUBTASK_ID, true);

    expect(repository.toggleSubtaskOwned).toHaveBeenCalledWith(
      USER_ID,
      TASK_ID,
      SUBTASK_ID,
      NOW,
    );
    expect(repository.setStatusOwned).not.toHaveBeenCalled();
  });

  it("returns the same not-found result for missing and foreign-owned IDs", async () => {
    const repository = createRepository({
      findOwned: vi.fn().mockResolvedValue({ data: null, errorCode: null }),
      setStatusOwned: vi.fn().mockResolvedValue({ data: null, errorCode: null }),
    });
    const service = new TaskService(repository, () => new Date(NOW));

    await expect(service.find(USER_ID, TASK_ID)).resolves.toEqual({
      code: "NOT_FOUND",
      status: "error",
    });
    await expect(service.complete(USER_ID, TASK_ID)).resolves.toEqual({
      code: "NOT_FOUND",
      status: "error",
    });
  });

  it("rejects malformed input before any repository call", async () => {
    const repository = createRepository();
    const service = new TaskService(repository);

    expect(await service.create("not-a-user", {})).toEqual({
      code: "INVALID_ACTOR",
      status: "error",
    });
    expect(await service.update(USER_ID, TASK_ID, { status: "completed" })).toEqual({
      code: "INVALID_INPUT",
      status: "error",
    });
    expect(repository.createOwned).not.toHaveBeenCalled();
    expect(repository.updateOwned).not.toHaveBeenCalled();
  });

  it("maps owner-aware foreign-key and provider failures to stable codes", async () => {
    const foreignKeyRepository = createRepository({
      createOwned: vi.fn().mockResolvedValue({ data: null, errorCode: "23503" }),
    });
    const providerRepository = createRepository({
      listOwned: vi.fn().mockResolvedValue({
        data: null,
        errorCode: "database connection secret",
      }),
    });

    await expect(
      new TaskService(foreignKeyRepository).create(USER_ID, {
        subjectId: SUBJECT_ID,
        title: "Study",
      }),
    ).resolves.toEqual({ code: "NOT_FOUND", status: "error" });
    const result = await new TaskService(providerRepository).list(USER_ID);
    expect(result).toEqual({ code: "STORAGE_UNAVAILABLE", status: "error" });
    expect(JSON.stringify(result)).not.toContain("database connection secret");
  });

  it("treats an empty successful create response as unavailable storage", async () => {
    const repository = createRepository({
      createOwned: vi.fn().mockResolvedValue({ data: null, errorCode: null }),
    });

    await expect(
      new TaskService(repository).create(USER_ID, {
        subjectId: SUBJECT_ID,
        title: "Study",
      }),
    ).resolves.toEqual({ code: "STORAGE_UNAVAILABLE", status: "error" });
  });
});
