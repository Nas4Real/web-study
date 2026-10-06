"use server";

import { revalidatePath } from "next/cache";

import {
  updateProfileMutationHandler,
  type SettingsActionState,
} from "./settings-action-handlers";
import { resolveSettingsRequestContext } from "./settings-request-context";

export async function updateProfileAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const result = await updateProfileMutationHandler(
    resolveSettingsRequestContext,
    formData,
  );
  if (result.status === "success") revalidatePath("/settings");
  return result;
}
