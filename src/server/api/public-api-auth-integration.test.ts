import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createApiKeyTokenCodec } from "./api-key-crypto";
import { ApiKeyService, type ApiKeyRepository } from "./api-key-service";
import { createPublicApiHandler, type RateLimiter, type SessionVerifier } from "./public-api-handler";

const NOW = new Date("2026-10-09T09:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const KEY_ID = "33333333-3333-4333-8333-333333333333";

function repository(
  key: Awaited<ReturnType<ApiKeyRepository["findActiveByPrefix"]>>["data"],
): ApiKeyRepository {
  return {
    createOwned: vi.fn(),
    findActiveByPrefix: vi.fn().mockResolvedValue({ data: key, errorCode: null }),
    listOwned: vi.fn(),
    revokeOwned: vi.fn(),
    touchLastUsed: vi.fn().mockResolvedValue({ data: true, errorCode: null }),
  };
}

const limiter: RateLimiter = {
  consume: vi.fn().mockResolvedValue({
    data: { allowed: true, retryAfterSeconds: 0 },
    status: "success",
  }),
};
const sessions: SessionVerifier = {
  verify: vi.fn().mockResolvedValue({ code: "INVALID_SESSION", status: "error" }),
};

describe("public API authentication integration", () => {
  it.each([
    { expiresAt: null, revokedAt: NOW.toISOString() },
    { expiresAt: NOW.toISOString(), revokedAt: null },
  ])("rejects revoked and expired keys before domain handlers", async (state) => {
    const codec = createApiKeyTokenCodec("p".repeat(32), (size) => Buffer.alloc(size, 7));
    const generated = codec.generate();
    const keys = new ApiKeyService(repository({
      createdAt: "2026-10-08T09:00:00.000Z",
      digest: generated.digest,
      expiresAt: state.expiresAt,
      id: KEY_ID,
      lastUsedAt: null,
      name: "Integration",
      prefix: generated.prefix,
      revokedAt: state.revokedAt,
      userId: USER_ID,
    }), codec, () => NOW);
    const next = vi.fn();
    const handle = createPublicApiHandler({ apiKeys: keys, limiter, next, sessions });

    const response = await handle(new Request("https://example.test/api/v1/tasks", {
      headers: { authorization: `Bearer ${generated.token}` },
    }));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("API_KEY_INVALID");
    expect(next).not.toHaveBeenCalled();
  });
});
