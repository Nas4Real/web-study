import { z } from "zod";

import type { SubjectSummaryDTO, TaskDetailDTO } from "@/domain/dto";

import type { SubjectService } from "./subject-service";
import type { Task } from "./task-domain";
import type { TaskService } from "./task-service";
import { actorIdSchema, entityIdSchema, INVALID_ACTOR, INVALID_INPUT, NOT_FOUND,
  STORAGE_UNAVAILABLE, type StudyResult } from "./study-domain";

export const taskDetailMutationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("complete") }).strict(),
  z.object({ type: z.literal("reopen") }).strict(),
  z.object({ type: z.literal("delete") }).strict(),
  z.object({ type: z.literal("subtask"), subtaskId: entityIdSchema, completed: z.boolean() }).strict(),
]);
export type TaskDetailMutation = z.infer<typeof taskDetailMutationSchema>;
export type TaskDetailSources = Readonly<{
  tasks: Pick<TaskService, "find" | "complete" | "reopen" | "toggleSubtask" | "delete">;
  subjects: Pick<SubjectService, "list">;
}>;

function project(task: Task, subject: SubjectSummaryDTO): TaskDetailDTO {
  return {
    id: task.id, title: task.title, description: task.description, priority: task.priority,
    status: task.status, dueAt: task.dueAt, completedAt: task.completedAt, subject,
    subtasks: [...task.subtasks].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
      .map(({ id, title, position, completedAt }) => ({ id, title, position, completedAt })),
  };
}

// The web modal and future public detail API share this projection and the canonical task rules.
export class TaskDetailService {
  constructor(private readonly sources: TaskDetailSources) {}

  async read(actorId: unknown, taskId: unknown): Promise<StudyResult<TaskDetailDTO>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(taskId);
    if (!id.success) return INVALID_INPUT;
    try {
      const task = await this.sources.tasks.find(actor.data, id.data);
      if (task.status === "error") return task;
      const subjects = await this.sources.subjects.list(actor.data);
      if (subjects.status === "error") return subjects;
      const subject = subjects.data.find(s => s.id === task.data.subjectId);
      if (!subject) return NOT_FOUND;
      return { status: "success", data: project(task.data, {
        id: subject.id, name: subject.name, color: subject.color,
      }) };
    } catch { return STORAGE_UNAVAILABLE; }
  }

  async mutate(actorId: unknown, taskId: unknown, input: unknown): Promise<StudyResult<TaskDetailDTO | null>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const id = entityIdSchema.safeParse(taskId);
    const command = taskDetailMutationSchema.safeParse(input);
    if (!id.success || !command.success) return INVALID_INPUT;
    // Resolve metadata before writing: a failed subject read must not report a committed
    // task mutation as a failure and cause the client to roll back to incorrect state.
    const detail = await this.read(actor.data, id.data);
    if (detail.status === "error") return detail;
    try {
      if (command.data.type === "delete") return await this.sources.tasks.delete(actor.data, id.data);
      let result: StudyResult<Task>;
      switch (command.data.type) {
        case "complete": result = await this.sources.tasks.complete(actor.data, id.data); break;
        case "reopen": result = await this.sources.tasks.reopen(actor.data, id.data); break;
        case "subtask": result = await this.sources.tasks.toggleSubtask(actor.data, id.data,
          command.data.subtaskId, command.data.completed); break;
      }
      if (result.status === "error") return result;
      return { status: "success", data: project(result.data, detail.data.subject) };
    } catch { return STORAGE_UNAVAILABLE; }
  }
}
