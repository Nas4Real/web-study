import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient as createSupabaseCookieClient } from "@/lib/supabase/server";

import { createApiKeyTokenCodec } from "./api-key-crypto";
import { ApiKeyService } from "./api-key-service";
import {
  createRequestId,
  parseBearerToken,
  publicApiErrorResponse,
} from "./public-api-contract";
import {
  createPublicApiHandler,
  type ApiKeyVerifier,
  type PublicApiRequestContext,
} from "./public-api-handler";
import { createSupabaseApiKeyRepository } from "./supabase-api-key-repository";
import { createSupabaseRateLimiter } from "./supabase-rate-limiter";
import { createSupabaseSessionVerifier } from "./supabase-session-verifier";

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
  const authorization = request.headers.get("authorization");
  if (
    (!authorization && !request.headers.get("cookie")) ||
    (authorization && parseBearerToken(authorization).status === "error")
  ) {
    return publicApiErrorResponse({
      code: "UNAUTHENTICATED",
      requestId,
      status: 401,
    });
  }
  try {
    const admin = createSupabaseAdminClient();
    const apiKeys: ApiKeyVerifier = {
      async verify(token) {
        const pepper = process.env.API_KEY_HASH_PEPPER;
        if (!pepper || pepper.length < 32) {
          return { code: "STORAGE_UNAVAILABLE", status: "error" };
        }
        return new ApiKeyService(
          createSupabaseApiKeyRepository(admin),
          createApiKeyTokenCodec(pepper),
        ).verify(token);
      },
    };
    return createPublicApiHandler({
      apiKeys,
      limiter: createSupabaseRateLimiter(admin),
      next: createResourceAdapter(admin),
      requestIdFactory: () => requestId,
      sessions: createSupabaseSessionVerifier({
        bearerClient: admin,
        cookieClient: createSupabaseCookieClient,
      }),
    })(request);
  } catch {
    return publicApiErrorResponse({
      code: "PROVIDER_UNAVAILABLE",
      requestId,
      status: 503,
    });
  }
}
