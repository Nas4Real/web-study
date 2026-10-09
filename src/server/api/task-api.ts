import { z } from "zod";

import type { TaskDetailDTO, SubjectSummaryDTO } from "@/domain/dto";
import type { SubjectService } from "@/server/study/subject-service";
import type { Task, TaskSubtask } from "@/server/study/task-domain";
import type { TaskDetailService } from "@/server/study/task-detail-service";
import type { TaskService } from "@/server/study/task-service";

import { publicApiErrorResponse } from "./public-api-contract";
import type { PublicApiRequestContext } from "./public-api-handler";
import { encodeCursor, parsePageRequest } from "./public-api-pagination";

type Dependencies = Readonly<{ details: TaskDetailService; subjects: SubjectService; tasks: TaskService }>;
const id = z.string().uuid();
const dateTime = z.iso.datetime({ offset: true });
const createSchema = z.object({
  description: z.string().max(10_000).nullable().default(null),
  due_at: dateTime.nullable().default(null),
  priority: z.enum(["normal", "high"]).default("normal"),
  status: z.literal("pending").default("pending"),
  subject_id: id,
  subtasks: z.array(z.object({ title: z.string().min(1).max(300) }).strict()).max(100).default([]),
  title: z.string().min(1).max(240),
}).strict();
const patchSchema = z.object({
  description: z.string().max(10_000).nullable().optional(), due_at: dateTime.nullable().optional(),
  priority: z.enum(["normal", "high"]).optional(), status: z.enum(["pending", "someday"]).optional(),
  subject_id: id.optional(), title: z.string().min(1).max(240).optional(),
}).strict().refine(value => Object.keys(value).length > 0);
const subtaskCreateSchema = z.object({
  completed: z.boolean().default(false), position: z.number().int().min(0).max(1_000_000).default(0),
  title: z.string().min(1).max(300),
}).strict();
const subtaskPatchSchema = z.object({
  completed: z.boolean().optional(), position: z.number().int().min(0).max(1_000_000).optional(),
  title: z.string().min(1).max(300).optional(),
}).strict().refine(value => Object.keys(value).length > 0);

function failure(code: string, requestId: string) {
  if (code === "INVALID_ACTOR") return publicApiErrorResponse({ code: "UNAUTHENTICATED", requestId, status: 401 });
  if (code === "INVALID_INPUT") return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId, status: 422 });
  if (code === "NOT_FOUND") return publicApiErrorResponse({ code: "NOT_FOUND", requestId, status: 404 });
  if (code === "DUPLICATE_NAME" || code === "CONFLICT") return publicApiErrorResponse({ code: "CONFLICT", requestId, status: 409 });
  return publicApiErrorResponse({ code: "PROVIDER_UNAVAILABLE", requestId, status: 503 });
}
async function json(request: Request) { try { return await request.json(); } catch { return undefined; } }
function projectSubject(subject: SubjectSummaryDTO) {
  return { color: subject.color, icon: null, id: subject.id, name: subject.name };
}
function projectSummary(task: Task, subject: SubjectSummaryDTO) {
  return { completed_at: task.completedAt, due_at: task.dueAt, id: task.id,
    priority: task.priority, status: task.status, subject: projectSubject(subject), title: task.title };
}
function projectSubtask(subtask: TaskSubtask | TaskDetailDTO["subtasks"][number]) {
  return { completed: subtask.completedAt !== null, completed_at: subtask.completedAt,
    id: subtask.id, position: subtask.position, title: subtask.title };
}
function projectDetail(detail: TaskDetailDTO) {
  return { completed_at: detail.completedAt, description: detail.description, due_at: detail.dueAt,
    id: detail.id, priority: detail.priority, status: detail.status, subject: projectSubject(detail.subject),
    subtasks: detail.subtasks.map(projectSubtask), title: detail.title };
}

export function createTasksCollectionAdapter(deps: Dependencies) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "GET") {
      const search = new URL(request.url).searchParams, page = parsePageRequest(search);
      const filters = z.object({ dueFrom: dateTime.optional(), dueTo: dateTime.optional(),
        status: z.enum(["pending", "completed", "someday"]).optional(), subjectId: id.optional() }).safeParse({
        dueFrom: search.get("due_from") ?? undefined, dueTo: search.get("due_to") ?? undefined,
        status: search.get("status") ?? undefined, subjectId: search.get("subject_id") ?? undefined,
      });
      if (page.status === "error" || !filters.success) return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
      const result = await deps.tasks.listPage(context.actor.userId, { ...page.data, ...filters.data });
      if (result.status === "error") return failure(result.code, context.requestId);
      const subjects = await deps.subjects.findMany(context.actor.userId, [
        ...new Set(result.data.items.map(task => task.subjectId)),
      ]);
      if (subjects.status === "error") return failure(subjects.code, context.requestId);
      const byId = new Map(subjects.data.map(subject => [subject.id, subject]));
      if (result.data.items.some(task => !byId.has(task.subjectId))) return failure("STORAGE_UNAVAILABLE", context.requestId);
      return Response.json({ data: result.data.items.map(task => projectSummary(task, byId.get(task.subjectId)!)),
        pagination: { next_cursor: result.data.nextCursor ? encodeCursor(result.data.nextCursor) : null } });
    }
    const parsed = createSchema.safeParse(await json(request));
    if (!parsed.success) return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
    const result = await deps.tasks.create(context.actor.userId, {
      description: parsed.data.description, dueAt: parsed.data.due_at, priority: parsed.data.priority,
      subjectId: parsed.data.subject_id, subtasks: parsed.data.subtasks, title: parsed.data.title,
    });
    if (result.status === "error") return failure(result.code, context.requestId);
    const detail = await deps.details.read(context.actor.userId, result.data.id);
    return detail.status === "error" ? failure(detail.code, context.requestId)
      : Response.json(projectDetail(detail.data), { status: 201 });
  };
}

export function createTaskItemAdapter(deps: Dependencies, taskId: string) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "GET") {
      const result = await deps.details.read(context.actor.userId, taskId);
      return result.status === "error" ? failure(result.code, context.requestId) : Response.json(projectDetail(result.data));
    }
    if (request.method === "DELETE") {
      const result = await deps.tasks.delete(context.actor.userId, taskId);
      return result.status === "error" ? failure(result.code, context.requestId) : new Response(null, { status: 204 });
    }
    const parsed = patchSchema.safeParse(await json(request));
    if (!parsed.success) return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
    const result = await deps.tasks.update(context.actor.userId, taskId, {
      ...(parsed.data.description === undefined ? {} : { description: parsed.data.description }),
      ...(parsed.data.due_at === undefined ? {} : { dueAt: parsed.data.due_at }),
      ...(parsed.data.priority === undefined ? {} : { priority: parsed.data.priority }),
      ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
      ...(parsed.data.subject_id === undefined ? {} : { subjectId: parsed.data.subject_id }),
      ...(parsed.data.title === undefined ? {} : { title: parsed.data.title }),
    });
    if (result.status === "error") return failure(result.code, context.requestId);
    const detail = await deps.details.read(context.actor.userId, taskId);
    return detail.status === "error" ? failure(detail.code, context.requestId) : Response.json(projectDetail(detail.data));
  };
}

export function createTaskTransitionAdapter(details: TaskDetailService, taskId: string, type: "complete" | "reopen") {
  return async (_request: Request, context: PublicApiRequestContext) => {
    const result = await details.mutate(context.actor.userId, taskId, { type });
    return result.status === "error" ? failure(result.code, context.requestId)
      : Response.json(result.data ? projectDetail(result.data) : null);
  };
}

export function createTaskSubtaskCollectionAdapter(tasks: TaskService, taskId: string) {
  return async (request: Request, context: PublicApiRequestContext) => {
    const parsed = subtaskCreateSchema.safeParse(await json(request));
    if (!parsed.success) return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
    const result = await tasks.addSubtask(context.actor.userId, taskId, parsed.data);
    return result.status === "error" ? failure(result.code, context.requestId)
      : Response.json(projectSubtask(result.data), { status: 201 });
  };
}

export function createTaskSubtaskItemAdapter(tasks: TaskService, taskId: string, subtaskId: string) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "DELETE") {
      const result = await tasks.deleteSubtask(context.actor.userId, taskId, subtaskId);
      return result.status === "error" ? failure(result.code, context.requestId) : new Response(null, { status: 204 });
    }
    const parsed = subtaskPatchSchema.safeParse(await json(request));
    if (!parsed.success) return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
    const result = await tasks.updateSubtask(context.actor.userId, taskId, subtaskId, parsed.data);
    return result.status === "error" ? failure(result.code, context.requestId) : Response.json(projectSubtask(result.data));
  };
}
