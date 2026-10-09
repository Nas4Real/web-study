import "server-only";

import { z } from "zod";

import type { SessionVerifier } from "./public-api-handler";

type ClaimsResult = Readonly<{
  data: Readonly<{ claims?: unknown }> | null;
  error: unknown;
}>;

type ClaimsClient = Readonly<{
  auth: Readonly<{
    getClaims(token?: string): Promise<ClaimsResult>;
  }>;
}>;

const authenticatedClaimsSchema = z.object({
  is_anonymous: z.literal(false).optional(),
  role: z.literal("authenticated"),
  sub: z.string().uuid(),
}).passthrough();

export function createSupabaseSessionVerifier(input: Readonly<{
  bearerClient: ClaimsClient;
  cookieClient(): Promise<ClaimsClient>;
}>): SessionVerifier {
  return {
    async verify(token) {
      const client = token ? input.bearerClient : await input.cookieClient();
      const result = token
        ? await client.auth.getClaims(token)
        : await client.auth.getClaims();
      const claims = result.error
        ? { success: false } as const
        : authenticatedClaimsSchema.safeParse(result.data?.claims);
      return claims.success
        ? { data: { apiKeyId: null, userId: claims.data.sub }, status: "success" }
        : { code: "INVALID_SESSION", status: "error" };
    },
  };
}
