"use server";

import { revalidatePath } from "next/cache";

import { createSessionMutationHandler, type CalendarActionState } from "./calendar-action-handlers";
import { deleteSessionMutationHandler } from "./calendar-delete-handlers";
import { editSessionMutationHandler } from "./calendar-edit-handlers";
import { resolveCalendarRequestContext } from "./calendar-request-context";

export async function createSessionAction(_previousState: CalendarActionState, formData: FormData) {
  const result = await createSessionMutationHandler(resolveCalendarRequestContext, formData);
  if (result.status === "success") {
    revalidatePath("/calendar");
    revalidatePath("/");
  }
  return result;
}

export async function deleteSessionAction(input: unknown) {
  const result = await deleteSessionMutationHandler(resolveCalendarRequestContext, input);
  if (result.status === "success") {
    revalidatePath("/calendar");
    revalidatePath("/");
  }
  return result;
}

export async function editSessionAction(input: unknown) {
  const result = await editSessionMutationHandler(resolveCalendarRequestContext, input);
  if (result.status === "success") {
    revalidatePath("/calendar");
    revalidatePath("/");
  }
  return result;
}
