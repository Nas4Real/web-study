import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  gateway: {
    createGoogleAuthorization: vi.fn().mockResolvedValue({ errorCode: null, url: null }),
    ensureProfile: vi.fn().mockResolvedValue({ errorCode: null }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ errorCode: null }),
    getVerifiedIdentity: vi.fn().mockResolvedValue({
      errorCode: null,
      identity: { displayName: "Jane Doe", id: "user-123" },
    }),
    requestPasswordReset: vi.fn().mockResolvedValue({ errorCode: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ errorCode: null, user: null }),
    signOut: vi.fn().mockResolvedValue({ errorCode: null }),
    signUp: vi.fn().mockResolvedValue({ errorCode: null }),
    updatePassword: vi.fn().mockResolvedValue({ errorCode: null }),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));
vi.mock("./app-origin", () => ({
  getAppOrigin: () => "https://study.example.com",
}));
vi.mock("./supabase-auth-gateway", () => ({
  createSupabaseAuthGateway: () => mocks.gateway,
}));

import {
  requestPasswordResetAction,
  updatePasswordAction,
} from "./auth-actions";
import { INITIAL_AUTH_STATE } from "./auth-service";

describe("password recovery actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes and submits a reset-link request", async () => {
    const formData = new FormData();
    formData.set("email", "  JANE@Example.COM ");

    const result = await requestPasswordResetAction(INITIAL_AUTH_STATE, formData);

    expect(result.code).toBe("PASSWORD_RESET_REQUESTED");
    expect(mocks.gateway.requestPasswordReset).toHaveBeenCalledWith({
      email: "jane@example.com",
    });
  });

  it("submits matching new-password fields", async () => {
    const formData = new FormData();
    formData.set("password", "new secure password");
    formData.set("confirmPassword", "new secure password");

    const result = await updatePasswordAction(INITIAL_AUTH_STATE, formData);

    expect(result.code).toBe("PASSWORD_UPDATED");
    expect(mocks.gateway.updatePassword).toHaveBeenCalledWith({
      password: "new secure password",
    });
  });
});
