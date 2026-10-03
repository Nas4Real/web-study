"use server";

import { revalidatePath } from "next/cache";

import { readTaskDetailHandler, mutateTaskDetailHandler } from "./task-detail-handlers";
import { resolveTaskRequestContext } from "./task-request-context";

export async function readTaskDetailAction(taskId: string) {
  return readTaskDetailHandler(resolveTaskRequestContext, taskId);
}

export async function mutateTaskDetailAction(taskId: string, input: unknown) {
  const result = await mutateTaskDetailHandler(resolveTaskRequestContext, taskId, input);
  if (result.status === "success") {
    revalidatePath("/tasks");
    revalidatePath("/");
  }
  return result;
}
