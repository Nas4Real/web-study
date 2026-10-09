import { describe, expect, it, vi } from "vitest";

import { TaskDetailService, type TaskDetailSources } from "./task-detail-service";
import { TaskService, type TaskRepository } from "./task-service";
import { SubjectService, type SubjectRepository } from "./subject-service";
import type { Task } from "./task-domain";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const OTHER = "99999999-9999-4999-8999-999999999999";
const TASK_ID = "22222222-2222-4222-8222-222222222222";
const SUBJECT_ID = "33333333-3333-4333-8333-333333333333";
const SUBTASK_ID = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-10-03T10:00:00.000Z";

function fixture() {
  let task: Task | null = {
    id: TASK_ID, title: "Study integrals", description: "Review the proofs.",
    priority: "high", status: "pending", dueAt: "2026-10-04T22:59:00.000Z", completedAt: null,
    subjectId: SUBJECT_ID, createdAt: NOW, updatedAt: NOW,
    subtasks: [
      { id: SUBTASK_ID, title: "Solve exercises", position: 1, completedAt: null, createdAt: NOW, updatedAt: NOW },
      { id: "55555555-5555-4555-8555-555555555555", title: "Read notes", position: 0, completedAt: NOW, createdAt: NOW, updatedAt: NOW },
    ],
  };
  const owned = (actor: string, id: string) => actor === ACTOR && id === task?.id;
  const repository: TaskRepository = {
    async addSubtaskOwned() { return { data: null, errorCode: "provider_error" }; },
    async findOwned(actor, id) { return { data: owned(actor, id) ? task : null, errorCode: null }; },
    async setStatusOwned(actor, id, status, completedAt) {
      if (!owned(actor, id) || !task) return { data: null, errorCode: null };
      task = { ...task, status, completedAt };
      return { data: task, errorCode: null };
    },
    async toggleSubtaskOwned(actor, id, subtaskId, completedAt) {
      if (!owned(actor, id) || !task?.subtasks.some(s => s.id === subtaskId)) return { data: null, errorCode: null };
      task = { ...task, subtasks: task.subtasks.map(s => s.id === subtaskId ? { ...s, completedAt } : s) };
      return { data: task, errorCode: null };
    },
    async deleteOwned(actor, id) {
      if (!owned(actor, id)) return { data: false, errorCode: null };
      task = null;
      return { data: true, errorCode: null };
    },
    async listOwned() { return { data: [], errorCode: null }; },
    async listPageOwned() { return { data: [], errorCode: null }; },
    async updateSubtaskOwned() { return { data: null, errorCode: "provider_error" }; },
    async deleteSubtaskOwned() { return { data: false, errorCode: "provider_error" }; },
    async createOwned() { return { data: null, errorCode: "provider_error" }; },
    async updateOwned() { return { data: null, errorCode: "provider_error" }; },
  };
  const subjectRepository: SubjectRepository = {
    async listOwned(actor) {
      return { data: actor === ACTOR ? [{ id: SUBJECT_ID, name: "Math", color: "#ec4899", icon: null, position: 0, createdAt: NOW, updatedAt: NOW }] : [], errorCode: null };
    },
    async listPageOwned() { return { data: [], errorCode: null }; },
    async findOwned(actor, id) {
      return { data: actor === ACTOR && id === SUBJECT_ID
        ? { id: SUBJECT_ID, name: "Math", color: "#ec4899", icon: null, position: 0, createdAt: NOW, updatedAt: NOW }
        : null, errorCode: null };
    },
    async findManyOwned() { return { data: [], errorCode: null }; },
    async createOwned() { return { data: null, errorCode: "provider_error" }; },
    async updateOwned() { return { data: null, errorCode: "provider_error" }; },
    async deleteOwned() { return { data: false, errorCode: "provider_error" }; },
  };
  const sources: TaskDetailSources = {
    tasks: new TaskService(repository, () => new Date(NOW)),
    subjects: new SubjectService(subjectRepository),
  };
  return { service: new TaskDetailService(sources), sources, repository, subjectRepository };
}

describe("TaskDetailService", () => {
  it("returns the minimal canonical detail with subject metadata and ordered subtasks", async () => {
    const { service } = fixture();
    const result = await service.read(ACTOR, TASK_ID);
    if (result.status !== "success") throw new Error(result.code);
    expect(result.data).toMatchObject({ id: TASK_ID, description: "Review the proofs.", priority: "high", status: "pending", subject: { id: SUBJECT_ID, name: "Math", color: "#ec4899" } });
    expect(result.data.subtasks.map(s => s.title)).toEqual(["Read notes", "Solve exercises"]);
    expect(result.data).not.toHaveProperty("createdAt");
    expect(result.data.subtasks[0]).not.toHaveProperty("updatedAt");
  });

  it("toggles one subtask explicitly and tolerates retry without changing the parent", async () => {
    const { service } = fixture();
    await service.mutate(ACTOR, TASK_ID, { type: "subtask", subtaskId: SUBTASK_ID, completed: true });
    await service.mutate(ACTOR, TASK_ID, { type: "subtask", subtaskId: SUBTASK_ID, completed: true });
    const result = await service.read(ACTOR, TASK_ID);
    if (result.status !== "success") throw new Error(result.code);
    expect(result.data.status).toBe("pending");
    expect(result.data.completedAt).toBeNull();
    expect(result.data.subtasks[1].completedAt).toBe(NOW);
    expect(result.data.subtasks[0].completedAt).toBe(NOW);
  });

  it("completes and reopens the parent while preserving incomplete subtasks", async () => {
    const { service } = fixture();
    const complete = await service.mutate(ACTOR, TASK_ID, { type: "complete" });
    expect(complete).toMatchObject({ status: "success", data: { status: "completed", completedAt: NOW } });
    const reopen = await service.mutate(ACTOR, TASK_ID, { type: "reopen" });
    expect(reopen).toMatchObject({ status: "success", data: { status: "pending", completedAt: null } });
    if (reopen.status !== "success" || !reopen.data) throw new Error("Expected task");
    expect(reopen.data.subtasks.map(s => s.completedAt)).toEqual([NOW, null]);
  });

  it("deletes an owned task and makes subsequent reads unavailable", async () => {
    const { service } = fixture();
    expect(await service.mutate(ACTOR, TASK_ID, { type: "delete" })).toEqual({ status: "success", data: null });
    expect(await service.read(ACTOR, TASK_ID)).toEqual({ status: "error", code: "NOT_FOUND" });
  });

  it("does not disclose or mutate guessed foreign task/subtask IDs", async () => {
    const { service } = fixture();
    expect(await service.read(OTHER, TASK_ID)).toEqual({ status: "error", code: "NOT_FOUND" });
    for (const type of ["complete", "reopen", "delete"] as const) {
      expect(await service.mutate(OTHER, TASK_ID, { type })).toEqual({ status: "error", code: "NOT_FOUND" });
    }
    expect(await service.mutate(ACTOR, TASK_ID, { type: "subtask", subtaskId: OTHER, completed: true }))
      .toEqual({ status: "error", code: "NOT_FOUND" });
    expect(await service.read(ACTOR, TASK_ID)).toMatchObject({ status: "success", data: { status: "pending" } });
  });

  it("rejects malformed actors, IDs and commands before accessing sources", async () => {
    const { service, repository } = fixture();
    const find = vi.spyOn(repository, "findOwned");
    expect(await service.read("bad", TASK_ID)).toEqual({ status: "error", code: "INVALID_ACTOR" });
    expect(await service.read(ACTOR, "bad")).toEqual({ status: "error", code: "INVALID_INPUT" });
    for (const command of [{ type: "complete", userId: OTHER }, { type: "subtask", subtaskId: SUBTASK_ID, completed: "true" }, { type: "edit" }]) {
      expect(await service.mutate(ACTOR, TASK_ID, command)).toEqual({ status: "error", code: "INVALID_INPUT" });
    }
    expect(find).not.toHaveBeenCalled();
  });

  it("fails closed for missing subject metadata before applying a mutation", async () => {
    const { service, subjectRepository, repository } = fixture();
    vi.spyOn(subjectRepository, "findOwned").mockResolvedValue({ data: null, errorCode: null });
    const update = vi.spyOn(repository, "setStatusOwned");
    expect(await service.mutate(ACTOR, TASK_ID, { type: "complete" })).toEqual({ status: "error", code: "NOT_FOUND" });
    expect(update).not.toHaveBeenCalled();
  });

  it("normalizes thrown read/mutation errors without exposing provider details", async () => {
    const { service, sources, repository } = fixture();
    vi.spyOn(repository, "toggleSubtaskOwned").mockRejectedValue(new Error("provider secret"));
    expect(await service.mutate(ACTOR, TASK_ID, { type: "subtask", subtaskId: SUBTASK_ID, completed: true }))
      .toEqual({ status: "error", code: "STORAGE_UNAVAILABLE" });
    vi.spyOn(sources.subjects, "find").mockRejectedValue(new Error("provider secret"));
    expect(await service.read(ACTOR, TASK_ID)).toEqual({ status: "error", code: "STORAGE_UNAVAILABLE" });
  });
});
