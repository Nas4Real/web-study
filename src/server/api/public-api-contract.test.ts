import { describe, expect, it, vi } from "vitest";

import {
  createRequestId,
  parseBearerToken,
  publicApiErrorResponse,
} from "./public-api-contract";

describe("public API boundary contract", () => {
  it("accepts one case-insensitive Bearer credential without exposing it", () => {
    expect(parseBearerToken("bearer wsk_abc123")).toEqual({
      status: "success",
      token: "wsk_abc123",
    });
  });

  it.each([
    null,
    "",
    "Basic wsk_abc123",
    "Bearer",
    "Bearer first second",
    `Bearer ${"x".repeat(513)}`,
  ])("rejects a missing or malformed authorization value", (authorization) => {
    expect(parseBearerToken(authorization)).toEqual({ status: "error" });
  });

  it("accepts a bounded safe request ID and replaces unsafe input", () => {
    const generate = vi.fn().mockReturnValue("generated-request-id");

    expect(createRequestId("client_01.trace-2", generate)).toBe("client_01.trace-2");
    expect(createRequestId("contains spaces", generate)).toBe("generated-request-id");
    expect(createRequestId("x".repeat(129), generate)).toBe("generated-request-id");
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("returns the stable OpenAPI error envelope without internal details", async () => {
    const response = publicApiErrorResponse({
      code: "UNAUTHENTICATED",
      requestId: "request-123",
      status: 401,
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("request-123");
    expect(await response.json()).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "A valid API key is required.",
        request_id: "request-123",
      },
    });
  });
});
