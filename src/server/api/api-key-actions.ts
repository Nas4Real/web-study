"use server";

import { revalidatePath } from "next/cache";

import {
  createApiKeyManagementHandler,
  listApiKeysManagementHandler,
  revokeApiKeyManagementHandler,
} from "./api-key-action-handlers";
import { resolveApiKeyManagementContext } from "./api-key-management-context";

export async function createApiKeyAction(formData: FormData) {
  const result = await createApiKeyManagementHandler(
    resolveApiKeyManagementContext,
    formData,
  );
  if (result.status === "success") revalidatePath("/settings");
  return result;
}

export async function listApiKeysAction() {
  return listApiKeysManagementHandler(resolveApiKeyManagementContext);
}

export async function revokeApiKeyAction(apiKeyId: unknown) {
  const result = await revokeApiKeyManagementHandler(
    resolveApiKeyManagementContext,
    apiKeyId,
  );
  if (result.status === "success") revalidatePath("/settings");
  return result;
}
