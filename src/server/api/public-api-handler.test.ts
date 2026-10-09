import { describe, expect, it, vi } from "vitest";

import {
  createPublicApiHandler,
  type ApiKeyVerifier,
  type RateLimiter,
} from "./public-api-handler";

const ACTOR = {
  apiKeyId: "33333333-3333-4333-8333-333333333333",
  userId: "11111111-1111-4111-8111-111111111111",
} as const;

function verifier(result: Awaited<ReturnType<ApiKeyVerifier["verify"]>>): ApiKeyVerifier {
  return { verify: vi.fn().mockResolvedValue(result) };
}

function rateLimiter(result: Awaited<ReturnType<RateLimiter["consume"]>>): RateLimiter {
  return { consume: vi.fn().mockResolvedValue(result) };
}

function request(authorization?: string) {
  return new Request("https://example.test/api/v1/tasks", {
    headers: {
      ...(authorization ? { authorization } : {}),
      "x-request-id": "client-request-1",
    },
  });
}

describe("public API authentication pipeline", () => {
  it("rejects missing credentials before key lookup or rate limiting", async () => {
    const apiKeys = verifier({ code: "INVALID_API_KEY", status: "error" });
    const limiter = rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" });
    const next = vi.fn();
    const handle = createPublicApiHandler({ apiKeys, limiter, next });

    const response = await handle(request());

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
    expect(apiKeys.verify).not.toHaveBeenCalled();
    expect(limiter.consume).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("maps invalid keys to one non-enumerating response", async () => {
    const apiKeys = verifier({ code: "INVALID_API_KEY", status: "error" });
    const limiter = rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" });
    const next = vi.fn();
    const handle = createPublicApiHandler({ apiKeys, limiter, next });

    const response = await handle(request("Bearer invalid-key"));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("API_KEY_INVALID");
    expect(limiter.consume).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("fails closed when key verification storage is unavailable", async () => {
    const apiKeys = verifier({ code: "STORAGE_UNAVAILABLE", status: "error" });
    const limiter = rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" });
    const handle = createPublicApiHandler({ apiKeys, limiter, next: vi.fn() });

    const response = await handle(request("Bearer valid-looking-key"));

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("PROVIDER_UNAVAILABLE");
    expect(limiter.consume).not.toHaveBeenCalled();
  });

  it("rate limits a verified key before calling the resource adapter", async () => {
    const apiKeys = verifier({ data: ACTOR, status: "success" });
    const limiter = rateLimiter({
      data: { allowed: false, retryAfterSeconds: 17 },
      status: "success",
    });
    const next = vi.fn();
    const handle = createPublicApiHandler({ apiKeys, limiter, next });

    const response = await handle(request("Bearer valid-key"));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("17");
    expect((await response.json()).error.code).toBe("RATE_LIMITED");
    expect(limiter.consume).toHaveBeenCalledWith(ACTOR.apiKeyId);
    expect(next).not.toHaveBeenCalled();
  });

  it("passes the verified actor and request ID to the resource adapter", async () => {
    const apiKeys = verifier({ data: ACTOR, status: "success" });
    const limiter = rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" });
    const next = vi.fn().mockResolvedValue(Response.json({ data: [] }));
    const handle = createPublicApiHandler({ apiKeys, limiter, next });

    const response = await handle(request("Bearer valid-key"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("client-request-1");
    expect(next).toHaveBeenCalledWith(expect.any(Request), {
      actor: ACTOR,
      requestId: "client-request-1",
    });
  });

  it("sanitizes unexpected errors from the resource adapter", async () => {
    const apiKeys = verifier({ data: ACTOR, status: "success" });
    const limiter = rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" });
    const next = vi.fn().mockRejectedValue(new Error("database host and credentials"));
    const handle = createPublicApiHandler({ apiKeys, limiter, next });

    const response = await handle(request("Bearer valid-key"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("database host");
  });
});
