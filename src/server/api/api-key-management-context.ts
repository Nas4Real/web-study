import "server-only";

import { env } from "@/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getVerifiedActor } from "@/server/auth/request-auth";

import type { ApiKeyManagementContext } from "./api-key-action-handlers";
import { createApiKeyTokenCodec } from "./api-key-crypto";
import { ApiKeyService } from "./api-key-service";
import { createSupabaseApiKeyRepository } from "./supabase-api-key-repository";

export async function resolveApiKeyManagementContext(): Promise<ApiKeyManagementContext | null> {
  const actor = await getVerifiedActor();
  if (!actor) return null;
  if (!env.API_KEY_HASH_PEPPER) {
    throw new Error("Personal API key infrastructure is not configured");
  }
  const admin = createSupabaseAdminClient();
  return {
    actorId: actor.userId,
    apiKeyService: new ApiKeyService(
      createSupabaseApiKeyRepository(admin),
      createApiKeyTokenCodec(env.API_KEY_HASH_PEPPER),
    ),
  };
}
