import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  logAuthCallbackFailure,
  resolveRequestId,
} from "./auth-callback";

describe("auth callback observability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reuses a safe incoming request ID", () => {
    const headers = new Headers({ "x-request-id": "edge_req-123.abc" });

    expect(resolveRequestId(headers)).toBe("edge_req-123.abc");
  });

  it("replaces an unsafe incoming request ID", () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000000",
    );
    const headers = new Headers({
      "x-request-id": "bad request id with spaces and private@example.com",
    });

    expect(resolveRequestId(headers)).toBe(
      "00000000-0000-4000-8000-000000000000",
    );
  });

  it("writes one allowlisted structured failure event", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logAuthCallbackFailure("request-123");

    expect(error).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith(
      JSON.stringify({
        level: "error",
        event: "auth_callback_failed",
        requestId: "request-123",
        route: "/api/auth/callback",
      }),
    );
    expect(error.mock.calls.flat().join(" ")).not.toContain("code=");
    expect(error.mock.calls.flat().join(" ")).not.toContain("email");
  });
});
