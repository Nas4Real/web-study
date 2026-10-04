"use server";

import { revalidatePath } from "next/cache";

import { createSessionMutationHandler, type CalendarActionState } from "./calendar-action-handlers";
import { resolveCalendarRequestContext } from "./calendar-request-context";

export async function createSessionAction(_previousState: CalendarActionState, formData: FormData) {
  const result = await createSessionMutationHandler(resolveCalendarRequestContext, formData);
  if (result.status === "success") {
    revalidatePath("/calendar");
    revalidatePath("/");
  }
  return result;
}
