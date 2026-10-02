import type { StudyResult } from "./study-domain";
import { dateInputToEndOfDayIso } from "./task-date";
import type { Task } from "./task-domain";

export type TaskActionState =
  | Readonly<{ code: "IDLE"; status: "idle" }>
  | Readonly<{
      code: "TASK_CREATED" | "TASK_UPDATED";
      status: "success";
    }>
  | Readonly<{
      code:
        | "UNAUTHENTICATED"
        | "INVALID_INPUT"
        | "NOT_FOUND"
        | "STORAGE_UNAVAILABLE";
      message: string;
      status: "error";
    }>;

type TaskMutationService = Readonly<{
  complete(actorId: unknown, taskId: unknown): Promise<StudyResult<Task>>;
  create(actorId: unknown, input: unknown): Promise<StudyResult<Task>>;
  reopen(actorId: unknown, taskId: unknown): Promise<StudyResult<Task>>;
  setSomeday(actorId: unknown, taskId: unknown): Promise<StudyResult<Task>>;
}>;

export type TaskActionContext = Readonly<{
  actorId: string;
  taskService: TaskMutationService;
  timeZone: string;
}>;

type ResolveContext = () => Promise<TaskActionContext | null>;

const messages = {
  INVALID_INPUT: "Check the task details and try again.",
  NOT_FOUND: "That task is no longer available.",
  STORAGE_UNAVAILABLE: "Tasks are temporarily unavailable. Please try again.",
  UNAUTHENTICATED: "Your session has expired. Sign in and try again.",
} as const;

function errorState(
  code: keyof typeof messages,
): Extract<TaskActionState, { status: "error" }> {
  return { code, message: messages[code], status: "error" };
}

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function normalizedError(result: StudyResult<Task>): TaskActionState {
  if (result.status === "success") return { code: "TASK_UPDATED", status: "success" };
  const code = result.code === "INVALID_ACTOR" ? "UNAUTHENTICATED" : result.code;
  return errorState(code === "DUPLICATE_NAME" ? "INVALID_INPUT" : code);
}

export async function createTaskMutationHandler(
  resolveContext: ResolveContext,
  formData: FormData,
): Promise<TaskActionState> {
  let context: TaskActionContext | null;
  try {
    context = await resolveContext();
  } catch {
    return errorState("STORAGE_UNAVAILABLE");
  }
  if (!context) return errorState("UNAUTHENTICATED");
  const dueDate = textField(formData, "dueDate");
  const dueAt = dueDate
    ? dateInputToEndOfDayIso(dueDate, context.timeZone)
    : null;
  if (dueDate && !dueAt) return errorState("INVALID_INPUT");
  let result: StudyResult<Task>;
  try {
    result = await context.taskService.create(context.actorId, {
      description: textField(formData, "description"),
      dueAt,
      priority: "normal",
      status: "pending",
      subjectId: textField(formData, "subjectId"),
      subtasks: [],
      title: textField(formData, "title"),
    });
  } catch {
    return errorState("STORAGE_UNAVAILABLE");
  }
  const state = normalizedError(result);
  return state.status === "success"
    ? { code: "TASK_CREATED", status: "success" }
    : state;
}

export async function transitionTaskMutationHandler(
  resolveContext: ResolveContext,
  taskId: string,
  transition: "complete" | "reopen" | "someday",
): Promise<TaskActionState> {
  let context: TaskActionContext | null;
  try {
    context = await resolveContext();
  } catch {
    return errorState("STORAGE_UNAVAILABLE");
  }
  if (!context) return errorState("UNAUTHENTICATED");
  const operation =
    transition === "complete"
      ? context.taskService.complete(context.actorId, taskId)
      : transition === "reopen"
        ? context.taskService.reopen(context.actorId, taskId)
        : context.taskService.setSomeday(context.actorId, taskId);
  try {
    return normalizedError(await operation);
  } catch {
    return errorState("STORAGE_UNAVAILABLE");
  }
}
