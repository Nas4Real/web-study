import type { TaskDetailDTO } from "@/domain/dto";

import { TaskDetailService, type TaskDetailSources } from "./task-detail-service";
import type { StudyResult } from "./study-domain";

export type TaskDetailContext = Readonly<{
  actorId: string;
  now: () => Date;
  taskService: TaskDetailSources["tasks"];
  subjectService: TaskDetailSources["subjects"];
  timeZone: string;
}>;

const messages = {
  INVALID_INPUT: "Check the task details and try again.",
  NOT_FOUND: "That task is no longer available.",
  STORAGE_UNAVAILABLE: "Tasks are temporarily unavailable. Please try again.",
  UNAUTHENTICATED: "Your session has expired. Sign in and try again.",
} as const;

export type TaskDetailActionResult<T extends TaskDetailDTO | null = TaskDetailDTO | null> =
  | Readonly<{ status: "success"; data: Readonly<{ detail: T; now: string; timeZone: string }> }>
  | Readonly<{ status: "error"; code: keyof typeof messages; message: string }>;

type ResolveContext = () => Promise<TaskDetailContext | null>;

function error(code: keyof typeof messages): Extract<TaskDetailActionResult, { status: "error" }> {
  return { status: "error", code, message: messages[code] };
}

async function execute<T extends TaskDetailDTO | null>(
  resolveContext: ResolveContext,
  operation: (service: TaskDetailService, actorId: string) => Promise<StudyResult<T>>,
): Promise<TaskDetailActionResult<T>> {
  try {
    const context = await resolveContext();
    if (!context) return error("UNAUTHENTICATED");
    const now = context.now().toISOString();
    const result = await operation(new TaskDetailService({
      tasks: context.taskService, subjects: context.subjectService,
    }), context.actorId);
    if (result.status === "error") {
      const code = result.code === "INVALID_ACTOR" ? "UNAUTHENTICATED" :
        result.code === "DUPLICATE_NAME" ? "INVALID_INPUT" : result.code;
      return error(code);
    }
    return { status: "success", data: { detail: result.data, now, timeZone: context.timeZone } };
  } catch { return error("STORAGE_UNAVAILABLE"); }
}

export function readTaskDetailHandler(resolveContext: ResolveContext, taskId: unknown) {
  return execute(resolveContext, (service, actor) => service.read(actor, taskId));
}

export function mutateTaskDetailHandler(resolveContext: ResolveContext, taskId: unknown, input: unknown) {
  return execute(resolveContext, (service, actor) => service.mutate(actor, taskId, input));
}
