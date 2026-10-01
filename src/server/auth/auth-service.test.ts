import { describe, expect, it, vi } from "vitest";

import {
  AuthService,
  type AuthGateway,
  type AuthIdentity,
} from "./auth-service";

function createGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    signUp: vi.fn().mockResolvedValue({ errorCode: null }),
    signInWithPassword: vi.fn().mockResolvedValue({
      errorCode: null,
      user: { emailConfirmedAt: "2026-10-01T10:00:00.000Z" },
    }),
    createGoogleAuthorization: vi.fn().mockResolvedValue({
      errorCode: null,
      url: "https://accounts.google.com/o/oauth2/v2/auth",
    }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ errorCode: null }),
    getVerifiedIdentity: vi.fn().mockResolvedValue({
      errorCode: null,
      identity: { id: "user-123", displayName: "Jane Doe" } satisfies AuthIdentity,
    }),
    ensureProfile: vi.fn().mockResolvedValue({ errorCode: null }),
    signOut: vi.fn().mockResolvedValue({ errorCode: null }),
    ...overrides,
  };
}

describe("AuthService", () => {
  it("rejects malformed signup input before calling the provider", async () => {
    const gateway = createGateway();
    const service = new AuthService(gateway);

    const result = await service.signUp({
      fullName: "J",
      email: "not-an-email",
      password: "short",
    });

    expect(result.code).toBe("INVALID_INPUT");
    expect(gateway.signUp).not.toHaveBeenCalled();
  });

  it("normalizes signup values and requests the fixed verification callback", async () => {
    const gateway = createGateway();
    const service = new AuthService(gateway);

    const result = await service.signUp({
      fullName: "  Jane   Doe  ",
      email: "  JANE@Example.COM ",
      password: "correct horse battery staple",
    });

    expect(result).toMatchObject({
      code: "VERIFICATION_REQUIRED",
      status: "success",
    });
    expect(gateway.signUp).toHaveBeenCalledWith({
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "correct horse battery staple",
    });
  });

  it("maps password provider failures to one non-enumerating public error", async () => {
    const gateway = createGateway({
      signInWithPassword: vi.fn().mockResolvedValue({
        errorCode: "invalid_credentials",
        user: null,
      }),
    });
    const service = new AuthService(gateway);

    const result = await service.signIn({
      email: "jane@example.com",
      password: "correct horse battery staple",
    });

    expect(result).toEqual({
      code: "AUTHENTICATION_FAILED",
      message: "Email or password is incorrect, or the account is not verified.",
      status: "error",
    });
  });

  it("does not allow an unverified password account into the workspace", async () => {
    const gateway = createGateway({
      signInWithPassword: vi.fn().mockResolvedValue({
        errorCode: null,
        user: { emailConfirmedAt: null },
      }),
    });
    const service = new AuthService(gateway);

    const result = await service.signIn({
      email: "jane@example.com",
      password: "correct horse battery staple",
    });

    expect(result.code).toBe("AUTHENTICATION_FAILED");
  });

  it("starts Google OAuth with only a normalized internal destination", async () => {
    const gateway = createGateway();
    const service = new AuthService(gateway);

    const result = await service.startGoogle("//evil.example/steal");

    expect(result).toEqual({
      code: "OAUTH_REDIRECT",
      redirectTo: "https://accounts.google.com/o/oauth2/v2/auth",
      status: "success",
    });
    expect(gateway.createGoogleAuthorization).toHaveBeenCalledWith({ next: "/" });
  });

  it("exchanges callback codes and provisions the verified actor profile", async () => {
    const gateway = createGateway();
    const service = new AuthService(gateway);

    const result = await service.completeCallback("valid-code", "/tasks?filter=high");

    expect(gateway.exchangeCodeForSession).toHaveBeenCalledWith("valid-code");
    expect(gateway.ensureProfile).toHaveBeenCalledWith({
      id: "user-123",
      displayName: "Jane Doe",
    });
    expect(result).toEqual({
      code: "CALLBACK_COMPLETE",
      redirectTo: "/tasks?filter=high",
      status: "success",
    });
  });

  it("clears a partial session when profile bootstrap fails", async () => {
    const gateway = createGateway({
      ensureProfile: vi.fn().mockResolvedValue({ errorCode: "database_failure" }),
    });
    const service = new AuthService(gateway);

    const result = await service.completeCallback("valid-code", "/");

    expect(result.code).toBe("CALLBACK_FAILED");
    expect(gateway.signOut).toHaveBeenCalledOnce();
  });

  it("clears a partial session when the callback exchange reports an error", async () => {
    const gateway = createGateway({
      exchangeCodeForSession: vi.fn().mockResolvedValue({ errorCode: "bad_code" }),
    });
    const service = new AuthService(gateway);

    const result = await service.completeCallback("stale-code", "/");

    expect(result.code).toBe("CALLBACK_FAILED");
    expect(gateway.signOut).toHaveBeenCalledOnce();
    expect(gateway.ensureProfile).not.toHaveBeenCalled();
  });

  it("returns stable errors without leaking thrown provider details", async () => {
    const gateway = createGateway({
      signUp: vi.fn().mockRejectedValue(new Error("secret provider response")),
    });
    const service = new AuthService(gateway);

    const result = await service.signUp({
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "correct horse battery staple",
    });

    expect(result).toEqual({
      code: "PROVIDER_UNAVAILABLE",
      message: "Authentication is temporarily unavailable. Please try again.",
      status: "error",
    });
    expect(JSON.stringify(result)).not.toContain("secret provider response");
  });
});
