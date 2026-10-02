"use server";

import { revalidatePath } from "next/cache";

import {
  createTaskMutationHandler,
  transitionTaskMutationHandler,
  type TaskActionState,
} from "./task-action-handlers";
import { resolveTaskRequestContext } from "./task-request-context";

export async function createTaskAction(
  _previousState: TaskActionState,
  formData: FormData,
) {
  const result = await createTaskMutationHandler(resolveTaskRequestContext, formData);
  if (result.status === "success") revalidatePath("/tasks");
  return result;
}

export async function transitionTaskAction(
  taskId: string,
  transition: "complete" | "reopen" | "someday",
) {
  const result = await transitionTaskMutationHandler(
    resolveTaskRequestContext,
    taskId,
    transition,
  );
  if (result.status === "success") revalidatePath("/tasks");
  return result;
}
