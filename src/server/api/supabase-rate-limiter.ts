import { z } from "zod";

import type { RateLimiter } from "./public-api-handler";

type RateLimitRpcClient = Readonly<{
  rpc(
    name: "consume_api_rate_limit",
    parameters: Readonly<{
      p_api_key_id: string;
      p_limit: number;
      p_window_seconds: number;
    }>,
  ): PromiseLike<Readonly<{ data: unknown; error: unknown }>>;
}>;

const optionsSchema = z.object({
  limit: z.number().int().min(1).max(100000).default(120),
  windowSeconds: z.number().int().min(1).max(86400).default(60),
});

const rateLimitRowsSchema = z.array(z.object({
  allowed: z.boolean(),
  request_count: z.number().int().nonnegative(),
  retry_after_seconds: z.number().int().positive(),
})).length(1);

const STORAGE_UNAVAILABLE = {
  code: "STORAGE_UNAVAILABLE",
  status: "error",
} as const;

export function createSupabaseRateLimiter(
  supabase: RateLimitRpcClient,
  options: Readonly<{ limit?: number; windowSeconds?: number }> = {},
): RateLimiter {
  const configuration = optionsSchema.parse(options);

  return {
    async consume(apiKeyId) {
      try {
        const { data, error } = await supabase.rpc("consume_api_rate_limit", {
          p_api_key_id: apiKeyId,
          p_limit: configuration.limit,
          p_window_seconds: configuration.windowSeconds,
        });
        if (error) return STORAGE_UNAVAILABLE;

        const parsed = rateLimitRowsSchema.safeParse(data);
        if (!parsed.success) return STORAGE_UNAVAILABLE;
        return {
          data: {
            allowed: parsed.data[0].allowed,
            retryAfterSeconds: parsed.data[0].retry_after_seconds,
          },
          status: "success",
        };
      } catch {
        return STORAGE_UNAVAILABLE;
      }
    },
  };
}
