import { z } from "zod";

import {
  actorIdSchema,
  entityIdSchema,
  INVALID_ACTOR,
  INVALID_INPUT,
  NOT_FOUND,
  type RepositoryResult,
  STORAGE_UNAVAILABLE,
  type StudyResult,
} from "./study-domain";
import {
  groupTasks,
  subtaskCreateInputSchema,
  subtaskUpdateInputSchema,
  type Task,
  type TaskCreate,
  taskCreateInputSchema,
  type TaskGroups,
  type TaskStatus,
  type TaskSubtask,
  taskStatusSchema,
  type TaskUpdate,
  taskUpdateInputSchema,
} from "./task-domain";

export type TaskPageRequest = Readonly<{
  cursor: Readonly<{ createdAt: string; id: string; position: number }> | null;
  dueFrom?: string;
  dueTo?: string;
  limit: number;
  status?: TaskStatus;
  subjectId?: string;
}>;
export type TaskPage = Readonly<{
  items: readonly Task[];
  nextCursor: TaskPageRequest["cursor"];
}>;

export type SubtaskWrite = Readonly<{
  completedAt?: string | null;
  position?: number;
  title?: string;
}>;

export type TaskRepository = Readonly<{
  addSubtaskOwned(userId: string, taskId: string, input: Required<SubtaskWrite>): Promise<RepositoryResult<TaskSubtask>>;
  createOwned(userId: string, input: TaskCreate): Promise<RepositoryResult<Task>>;
  deleteOwned(userId: string, taskId: string): Promise<RepositoryResult<boolean>>;
  findOwned(userId: string, taskId: string): Promise<RepositoryResult<Task>>;
  listOwned(userId: string): Promise<RepositoryResult<readonly Task[]>>;
  listPageOwned(userId: string, input: TaskPageRequest): Promise<RepositoryResult<readonly Task[]>>;
  setStatusOwned(
    userId: string,
    taskId: string,
    status: TaskStatus,
    completedAt: string | null,
  ): Promise<RepositoryResult<Task>>;
  toggleSubtaskOwned(
    userId: string,
    taskId: string,
    subtaskId: string,
    completedAt: string | null,
  ): Promise<RepositoryResult<Task>>;
  updateSubtaskOwned(userId: string, taskId: string, subtaskId: string, input: SubtaskWrite): Promise<RepositoryResult<TaskSubtask>>;
  deleteSubtaskOwned(userId: string, taskId: string, subtaskId: string): Promise<RepositoryResult<boolean>>;
  updateOwned(
    userId: string,
    taskId: string,
    input: TaskUpdate,
  ): Promise<RepositoryResult<Task>>;
}>;

function repositoryError(errorCode: string | null) {
  if (errorCode === "23503" || errorCode === "foreign_key_violation" || errorCode === "42501") {
    return NOT_FOUND;
  }
  return STORAGE_UNAVAILABLE;
}

export class TaskService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(actorId: unknown): Promise<StudyResult<readonly Task[]>> {
    return this.readMany(actorId);
  }

  async listPage(actorId: unknown, input: TaskPageRequest): Promise<StudyResult<TaskPage>> {
    const actor = actorIdSchema.safeParse(actorId);
    const filter = z.object({
      dueFrom: z.iso.datetime({ offset: true }).optional(),
      dueTo: z.iso.datetime({ offset: true }).optional(),
      status: taskStatusSchema.optional(),
      subjectId: entityIdSchema.optional(),
    }).strict().safeParse({
      ...(input.dueFrom === undefined ? {} : { dueFrom: input.dueFrom }),
      ...(input.dueTo === undefined ? {} : { dueTo: input.dueTo }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.subjectId === undefined ? {} : { subjectId: input.subjectId }),
    });
    if (!actor.success) return INVALID_ACTOR;
    if (!filter.success || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100
      || (filter.data.dueFrom && filter.data.dueTo
        && Date.parse(filter.data.dueFrom) > Date.parse(filter.data.dueTo))) return INVALID_INPUT;
    try {
      const result = await this.repository.listPageOwned(actor.data, {
        ...filter.data, cursor: input.cursor, limit: input.limit + 1,
      });
      if (result.errorCode) return repositoryError(result.errorCode);
      const rows = result.data ?? [], items = rows.slice(0, input.limit), last = items.at(-1);
      return { data: { items, nextCursor: rows.length > input.limit && last
        ? { createdAt: last.createdAt, id: last.id, position: 0 } : null }, status: "success" };
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async listGrouped(
    actorId: unknown,
    timeZone: string,
  ): Promise<StudyResult<TaskGroups>> {
    const tasks = await this.readMany(actorId);
    if (tasks.status === "error") return tasks;
    try {
      return {
        data: groupTasks(tasks.data, timeZone, this.now()),
        status: "success",
      };
    } catch {
      return INVALID_INPUT;
    }
  }

  async find(actorId: unknown, taskId: unknown): Promise<StudyResult<Task>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(taskId);
    if (!id.success) return INVALID_INPUT;
    return this.readOne(() => this.repository.findOwned(actor.data, id.data));
  }

  async create(actorId: unknown, input: unknown): Promise<StudyResult<Task>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const parsed = taskCreateInputSchema.safeParse(input);
    if (!parsed.success) return INVALID_INPUT;
    return this.readOne(
      () => this.repository.createOwned(actor.data, parsed.data),
      STORAGE_UNAVAILABLE,
    );
  }

  async update(
    actorId: unknown,
    taskId: unknown,
    input: unknown,
  ): Promise<StudyResult<Task>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(taskId);
    const parsed = taskUpdateInputSchema.safeParse(input);
    if (!id.success || !parsed.success) return INVALID_INPUT;
    return this.readOne(() =>
      this.repository.updateOwned(actor.data, id.data, parsed.data),
    );
  }

  async delete(actorId: unknown, taskId: unknown): Promise<StudyResult<null>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(taskId);
    if (!id.success) return INVALID_INPUT;
    try {
      const result = await this.repository.deleteOwned(actor.data, id.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      if (!result.data) return NOT_FOUND;
      return { data: null, status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  complete(actorId: unknown, taskId: unknown) {
    return this.transition(actorId, taskId, "completed", this.now().toISOString());
  }

  reopen(actorId: unknown, taskId: unknown) {
    return this.transition(actorId, taskId, "pending", null);
  }

  setSomeday(actorId: unknown, taskId: unknown) {
    return this.transition(actorId, taskId, "someday", null);
  }

  async toggleSubtask(
    actorId: unknown,
    taskId: unknown,
    subtaskId: unknown,
    completed: unknown,
  ): Promise<StudyResult<Task>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const task = entityIdSchema.safeParse(taskId);
    const subtask = entityIdSchema.safeParse(subtaskId);
    if (!task.success || !subtask.success || typeof completed !== "boolean") {
      return INVALID_INPUT;
    }
    return this.readOne(() =>
      this.repository.toggleSubtaskOwned(
        actor.data,
        task.data,
        subtask.data,
        completed ? this.now().toISOString() : null,
      ),
    );
  }

  async addSubtask(actorId: unknown, taskId: unknown, input: unknown): Promise<StudyResult<TaskSubtask>> {
    const actor = actorIdSchema.safeParse(actorId), task = entityIdSchema.safeParse(taskId);
    const parsed = subtaskCreateInputSchema.safeParse(input);
    if (!actor.success) return INVALID_ACTOR;
    if (!task.success || !parsed.success) return INVALID_INPUT;
    return this.readSubtask(() => this.repository.addSubtaskOwned(actor.data, task.data, {
      completedAt: parsed.data.completed ? this.now().toISOString() : null,
      position: parsed.data.position, title: parsed.data.title,
    }));
  }

  async updateSubtask(actorId: unknown, taskId: unknown, subtaskId: unknown, input: unknown): Promise<StudyResult<TaskSubtask>> {
    const actor = actorIdSchema.safeParse(actorId), task = entityIdSchema.safeParse(taskId);
    const subtask = entityIdSchema.safeParse(subtaskId), parsed = subtaskUpdateInputSchema.safeParse(input);
    if (!actor.success) return INVALID_ACTOR;
    if (!task.success || !subtask.success || !parsed.success) return INVALID_INPUT;
    const write: SubtaskWrite = {
      ...(parsed.data.completed === undefined ? {} : { completedAt: parsed.data.completed ? this.now().toISOString() : null }),
      ...(parsed.data.position === undefined ? {} : { position: parsed.data.position }),
      ...(parsed.data.title === undefined ? {} : { title: parsed.data.title }),
    };
    return this.readSubtask(() => this.repository.updateSubtaskOwned(actor.data, task.data, subtask.data, write));
  }

  async deleteSubtask(actorId: unknown, taskId: unknown, subtaskId: unknown): Promise<StudyResult<null>> {
    const actor = actorIdSchema.safeParse(actorId), task = entityIdSchema.safeParse(taskId);
    const subtask = entityIdSchema.safeParse(subtaskId);
    if (!actor.success) return INVALID_ACTOR;
    if (!task.success || !subtask.success) return INVALID_INPUT;
    try {
      const result = await this.repository.deleteSubtaskOwned(actor.data, task.data, subtask.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      return result.data ? { data: null, status: "success" } : NOT_FOUND;
    } catch { return STORAGE_UNAVAILABLE; }
  }

  private async transition(
    actorId: unknown,
    taskId: unknown,
    status: TaskStatus,
    completedAt: string | null,
  ): Promise<StudyResult<Task>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(taskId);
    if (!id.success) return INVALID_INPUT;
    return this.readOne(() =>
      this.repository.setStatusOwned(actor.data, id.data, status, completedAt),
    );
  }

  private async readMany(
    actorId: unknown,
  ): Promise<StudyResult<readonly Task[]>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    try {
      const result = await this.repository.listOwned(actor.data);
      if (result.errorCode) return repositoryError(result.errorCode);
      return { data: result.data ?? [], status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  private async readOne(
    operation: () => Promise<RepositoryResult<Task>>,
    missingResult: typeof NOT_FOUND | typeof STORAGE_UNAVAILABLE = NOT_FOUND,
  ): Promise<StudyResult<Task>> {
    try {
      const result = await operation();
      if (result.errorCode) return repositoryError(result.errorCode);
      if (!result.data) return missingResult;
      return { data: result.data, status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  private async readSubtask(operation: () => Promise<RepositoryResult<TaskSubtask>>): Promise<StudyResult<TaskSubtask>> {
    try {
      const result = await operation();
      if (result.errorCode) return repositoryError(result.errorCode);
      return result.data ? { data: result.data, status: "success" } : NOT_FOUND;
    } catch { return STORAGE_UNAVAILABLE; }
  }
}
