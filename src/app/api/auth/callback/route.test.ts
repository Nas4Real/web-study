import { beforeEach, describe, expect, it, vi } from "vitest";

const { completeCallback, logAuthCallbackFailure } = vi.hoisted(() => ({
  completeCallback: vi.fn(),
  logAuthCallbackFailure: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/server/auth/app-origin", () => ({
  getAppOrigin: () => "https://study.example",
}));
vi.mock("@/server/auth/auth-service", () => ({
  AuthService: class {
    completeCallback = completeCallback;
  },
}));
vi.mock("@/server/auth/supabase-auth-gateway", () => ({
  createSupabaseAuthGateway: vi.fn().mockReturnValue({}),
}));
vi.mock("@/server/observability/auth-callback", () => ({
  resolveRequestId: (headers: Headers) =>
    headers.get("x-request-id") ?? "generated-request-id",
  logAuthCallbackFailure,
}));

import { GET } from "./route";

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the request ID on a successful callback", async () => {
    completeCallback.mockResolvedValue({
      status: "success",
      code: "CALLBACK_COMPLETE",
      redirectTo: "/tasks",
    });

    const response = await GET(
      new Request(
        "https://study.example/api/auth/callback?code=secret-code&next=%2Ftasks",
        { headers: { "x-request-id": "request-success" } },
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://study.example/tasks");
    expect(response.headers.get("x-request-id")).toBe("request-success");
    expect(logAuthCallbackFailure).not.toHaveBeenCalled();
  });

  it("logs a safe event and preserves the public failure redirect", async () => {
    completeCallback.mockRejectedValue(
      new Error("provider leaked secret-code for private@example.com"),
    );

    const response = await GET(
      new Request(
        "https://study.example/api/auth/callback?code=secret-code&next=%2Ftasks",
        { headers: { "x-request-id": "request-failure" } },
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://study.example/sign-in?error=CALLBACK_FAILED",
    );
    expect(response.headers.get("x-request-id")).toBe("request-failure");
    expect(logAuthCallbackFailure).toHaveBeenCalledOnce();
    expect(logAuthCallbackFailure).toHaveBeenCalledWith("request-failure");
  });
});
