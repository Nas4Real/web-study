import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { createApiKeyTokenCodec } from "./api-key-crypto";
import { ApiKeyService } from "./api-key-service";
import {
  createRequestId,
  parseBearerToken,
  publicApiErrorResponse,
} from "./public-api-contract";
import {
  createPublicApiHandler,
  type PublicApiRequestContext,
} from "./public-api-handler";
import { createSupabaseApiKeyRepository } from "./supabase-api-key-repository";
import { createSupabaseRateLimiter } from "./supabase-rate-limiter";

type ResourceAdapter = (
  request: Request,
  context: PublicApiRequestContext,
) => Promise<Response>;

type ResourceAdapterFactory = (admin: SupabaseClient) => ResourceAdapter;

export async function handlePublicApiRequest(
  request: Request,
  createResourceAdapter: ResourceAdapterFactory,
) {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  if (parseBearerToken(request.headers.get("authorization")).status === "error") {
    return publicApiErrorResponse({
      code: "UNAUTHENTICATED",
      requestId,
      status: 401,
    });
  }
  try {
    const pepper = process.env.API_KEY_HASH_PEPPER;
    if (!pepper || pepper.length < 32) {
      return publicApiErrorResponse({
        code: "PROVIDER_UNAVAILABLE",
        requestId,
        status: 503,
      });
    }
    const admin = createSupabaseAdminClient();
    const apiKeys = new ApiKeyService(
      createSupabaseApiKeyRepository(admin),
      createApiKeyTokenCodec(pepper),
    );
    return createPublicApiHandler({
      apiKeys,
      limiter: createSupabaseRateLimiter(admin),
      next: createResourceAdapter(admin),
      requestIdFactory: () => requestId,
    })(request);
  } catch {
    return publicApiErrorResponse({
      code: "PROVIDER_UNAVAILABLE",
      requestId,
      status: 503,
    });
  }
}
