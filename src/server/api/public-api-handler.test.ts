import { describe, expect, it, vi } from "vitest";

import {
  createPublicApiHandler,
  type ApiKeyVerifier,
  type RateLimiter,
  type SessionVerifier,
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

function sessionVerifier(
  result: Awaited<ReturnType<SessionVerifier["verify"]>> = {
    code: "INVALID_SESSION",
    status: "error",
  },
): SessionVerifier {
  return { verify: vi.fn().mockResolvedValue(result) };
}

function request(authorization?: string, init: RequestInit = {}) {
  return new Request("https://example.test/api/v1/tasks", {
    ...init,
    headers: {
      ...init.headers,
      ...(authorization ? { authorization } : {}),
      "x-request-id": "client-request-1",
    },
  });
}

describe("public API authentication pipeline", () => {
  it("rejects missing credentials before key lookup or rate limiting", async () => {
    const apiKeys = verifier({ code: "INVALID_API_KEY", status: "error" });
    const limiter = rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" });
    const sessions = sessionVerifier();
    const next = vi.fn();
    const handle = createPublicApiHandler({ apiKeys, limiter, next, sessions });

    const response = await handle(request());

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
    expect(apiKeys.verify).not.toHaveBeenCalled();
    expect(limiter.consume).not.toHaveBeenCalled();
    expect(sessions.verify).toHaveBeenCalledWith(undefined);
    expect(next).not.toHaveBeenCalled();
  });

  it("maps invalid keys to one non-enumerating response", async () => {
    const apiKeys = verifier({ code: "INVALID_API_KEY", status: "error" });
    const limiter = rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" });
    const next = vi.fn();
    const handle = createPublicApiHandler({ apiKeys, limiter, next, sessions: sessionVerifier() });

    const response = await handle(request("Bearer wsk_invalid-key"));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("API_KEY_INVALID");
    expect(limiter.consume).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("fails closed when key verification storage is unavailable", async () => {
    const apiKeys = verifier({ code: "STORAGE_UNAVAILABLE", status: "error" });
    const limiter = rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" });
    const handle = createPublicApiHandler({ apiKeys, limiter, next: vi.fn(), sessions: sessionVerifier() });

    const response = await handle(request("Bearer wsk_valid-looking-key"));

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
    const handle = createPublicApiHandler({ apiKeys, limiter, next, sessions: sessionVerifier() });

    const response = await handle(request("Bearer wsk_valid-key"));

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
    const handle = createPublicApiHandler({ apiKeys, limiter, next, sessions: sessionVerifier() });

    const response = await handle(request("Bearer wsk_valid-key"));

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
    const handle = createPublicApiHandler({ apiKeys, limiter, next, sessions: sessionVerifier() });

    const response = await handle(request("Bearer wsk_valid-key"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("database host");
  });

  it("accepts a verified Supabase bearer JWT without API-key rate limiting", async () => {
    const apiKeys = verifier({ code: "INVALID_API_KEY", status: "error" });
    const limiter = rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" });
    const sessions = sessionVerifier({
      data: { apiKeyId: null, userId: ACTOR.userId },
      status: "success",
    });
    const next = vi.fn().mockResolvedValue(Response.json({ data: [] }));
    const handle = createPublicApiHandler({ apiKeys, limiter, next, sessions });

    const response = await handle(request("Bearer header.payload.signature"));

    expect(response.status).toBe(200);
    expect(sessions.verify).toHaveBeenCalledWith("header.payload.signature");
    expect(apiKeys.verify).not.toHaveBeenCalled();
    expect(limiter.consume).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Request), {
      actor: { apiKeyId: null, userId: ACTOR.userId },
      requestId: "client-request-1",
    });
  });

  it("accepts same-origin cookie sessions for mutations", async () => {
    const sessions = sessionVerifier({
      data: { apiKeyId: null, userId: ACTOR.userId },
      status: "success",
    });
    const next = vi.fn().mockResolvedValue(Response.json({ id: "task-1" }, { status: 201 }));
    const handle = createPublicApiHandler({
      apiKeys: verifier({ code: "INVALID_API_KEY", status: "error" }),
      limiter: rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" }),
      next,
      sessions,
    });

    const response = await handle(request(undefined, {
      headers: { origin: "https://example.test" },
      method: "POST",
    }));

    expect(response.status).toBe(201);
    expect(sessions.verify).toHaveBeenCalledWith(undefined);
    expect(next).toHaveBeenCalledOnce();
  });

  it.each([undefined, "https://attacker.test"])(
    "rejects cookie-authenticated mutations with an unsafe origin: %s",
    async (origin) => {
      const sessions = sessionVerifier({
        data: { apiKeyId: null, userId: ACTOR.userId },
        status: "success",
      });
      const next = vi.fn();
      const handle = createPublicApiHandler({
        apiKeys: verifier({ code: "INVALID_API_KEY", status: "error" }),
        limiter: rateLimiter({ data: { allowed: true, retryAfterSeconds: 0 }, status: "success" }),
        next,
        sessions,
      });

      const response = await handle(request(undefined, {
        headers: origin ? { origin } : {},
        method: "POST",
      }));

      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
      expect(next).not.toHaveBeenCalled();
    },
  );
});
