import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSupabaseAuthGateway } from "./supabase-auth-gateway";

function createSupabaseDouble() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const auth = {
    signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: { email_confirmed_at: "2026-10-01T10:00:00.000Z" } },
      error: null,
    }),
    signInWithOAuth: vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/oauth" },
      error: null,
    }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    getClaims: vi.fn().mockResolvedValue({
      data: {
        claims: {
          sub: "user-123",
          user_metadata: { full_name: "  Jane   Doe  " },
        },
      },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
  };
  const client = {
    auth,
    from: vi.fn(() => ({ upsert })),
  } as unknown as SupabaseClient;
  return { auth, client, upsert };
}

describe("createSupabaseAuthGateway", () => {
  it("uses the fixed app origin for signup verification callbacks", async () => {
    const { auth, client } = createSupabaseDouble();
    const gateway = createSupabaseAuthGateway(client, "https://study.example.com");

    await gateway.signUp({
      email: "jane@example.com",
      fullName: "Jane Doe",
      password: "correct horse battery staple",
    });

    expect(auth.signUp).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "correct horse battery staple",
      options: {
        data: { full_name: "Jane Doe" },
        emailRedirectTo: "https://study.example.com/api/auth/callback",
      },
    });
  });

  it("clears any session unexpectedly returned by signup", async () => {
    const { auth, client } = createSupabaseDouble();
    auth.signUp.mockResolvedValueOnce({ data: { session: { access_token: "token" } }, error: null });
    const gateway = createSupabaseAuthGateway(client, "https://study.example.com");

    await gateway.signUp({
      email: "jane@example.com",
      fullName: "Jane Doe",
      password: "correct horse battery staple",
    });

    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("starts Google with PKCE callback data and no browser-side redirect", async () => {
    const { auth, client } = createSupabaseDouble();
    const gateway = createSupabaseAuthGateway(client, "https://study.example.com");

    await gateway.createGoogleAuthorization({ next: "/tasks?filter=high" });

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://study.example.com/api/auth/callback?next=%2Ftasks%3Ffilter%3Dhigh",
        skipBrowserRedirect: true,
      },
    });
  });

  it("uses the fixed recovery callback and new-password destination", async () => {
    const { auth, client } = createSupabaseDouble();
    const gateway = createSupabaseAuthGateway(client, "https://study.example.com");

    await gateway.requestPasswordReset({ email: "jane@example.com" });

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("jane@example.com", {
      redirectTo:
        "https://study.example.com/api/auth/callback?next=%2Fset-new-password",
    });
  });

  it("updates only the current recovery-session user's password", async () => {
    const { auth, client } = createSupabaseDouble();
    const gateway = createSupabaseAuthGateway(client, "https://study.example.com");

    await gateway.updatePassword({ password: "new secure password" });

    expect(auth.updateUser).toHaveBeenCalledWith({
      password: "new secure password",
    });
  });

  it("uses verified claims for ownership and metadata only for display", async () => {
    const { client, upsert } = createSupabaseDouble();
    const gateway = createSupabaseAuthGateway(client, "https://study.example.com");

    const identity = await gateway.getVerifiedIdentity();
    expect(identity).toEqual({
      errorCode: null,
      identity: { id: "user-123", displayName: "Jane Doe" },
    });

    await gateway.ensureProfile(identity.identity!);
    expect(upsert).toHaveBeenCalledWith(
      { id: "user-123", display_name: "Jane Doe" },
      { ignoreDuplicates: true, onConflict: "id" },
    );
  });
});
