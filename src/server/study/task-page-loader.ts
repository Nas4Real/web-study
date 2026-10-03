import "server-only";

import type { Subject } from "./study-domain";
import type { TaskGroups } from "./task-domain";
import { resolveTaskRequestContext } from "./task-request-context";

export type TaskPageData = Readonly<{
  errorCode: "UNAUTHENTICATED" | "STORAGE_UNAVAILABLE" | null;
  groups: TaskGroups;
  now: string;
  subjects: readonly Subject[];
  timeZone: string;
}>;

const emptyGroups: TaskGroups = {
  completed: [],
  later: [],
  overdue: [],
  someday: [],
  today: [],
};

export async function loadTaskPageData(requestedScope?: string): Promise<TaskPageData> {
  try {
    const context = await resolveTaskRequestContext(requestedScope);
    if (!context) {
      return {
        errorCode: "UNAUTHENTICATED",
        groups: emptyGroups,
        now: new Date().toISOString(),
        subjects: [],
        timeZone: "UTC",
      };
    }
    const [tasks, subjects] = await Promise.all([
      context.taskService.listGrouped(context.actorId, context.timeZone),
      context.subjectService.list(context.actorId),
    ]);
    if (tasks.status === "error" || subjects.status === "error") {
      return {
        errorCode: "STORAGE_UNAVAILABLE",
        groups: emptyGroups,
        now: context.now().toISOString(),
        subjects: [],
        timeZone: context.timeZone,
      };
    }
    return {
      errorCode: null,
      groups: tasks.data,
      now: context.now().toISOString(),
      subjects: subjects.data,
      timeZone: context.timeZone,
    };
  } catch {
    return {
      errorCode: "STORAGE_UNAVAILABLE",
      groups: emptyGroups,
      now: new Date().toISOString(),
      subjects: [],
      timeZone: "UTC",
    };
  }
}
