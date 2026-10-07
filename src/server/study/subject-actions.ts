"use server";

import { revalidatePath } from "next/cache";

import {
  createSubjectMutationHandler,
  type SubjectActionState,
} from "./subject-action-handlers";
import { resolveSettingsRequestContext } from "./settings-request-context";

export async function createSubjectAction(
  _previousState: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  const result = await createSubjectMutationHandler(
    resolveSettingsRequestContext,
    formData,
  );
  if (result.status === "success") {
    for (const path of ["/settings", "/tasks", "/calendar", "/documents"]) {
      revalidatePath(path);
    }
  }
  return result;
}
