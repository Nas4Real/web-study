import { describe, expect, it, vi } from "vitest";

import { createSupabaseRateLimiter } from "./supabase-rate-limiter";

const KEY_ID = "33333333-3333-4333-8333-333333333333";

describe("Supabase public API rate limiter", () => {
  it("returns the atomic database decision", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: true, request_count: 1, retry_after_seconds: 42 }],
      error: null,
    });
    const limiter = createSupabaseRateLimiter({ rpc }, {
      limit: 120,
      windowSeconds: 60,
    });

    await expect(limiter.consume(KEY_ID)).resolves.toEqual({
      data: { allowed: true, retryAfterSeconds: 42 },
      status: "success",
    });
    expect(rpc).toHaveBeenCalledWith("consume_api_rate_limit", {
      p_api_key_id: KEY_ID,
      p_limit: 120,
      p_window_seconds: 60,
    });
  });

  it("fails closed on provider errors or malformed provider data", async () => {
    const providerError = createSupabaseRateLimiter({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "XX000" } }),
    });
    const malformed = createSupabaseRateLimiter({
      rpc: vi.fn().mockResolvedValue({ data: [{ allowed: "yes" }], error: null }),
    });

    await expect(providerError.consume(KEY_ID)).resolves.toEqual({
      code: "STORAGE_UNAVAILABLE",
      status: "error",
    });
    await expect(malformed.consume(KEY_ID)).resolves.toEqual({
      code: "STORAGE_UNAVAILABLE",
      status: "error",
    });
  });
});
