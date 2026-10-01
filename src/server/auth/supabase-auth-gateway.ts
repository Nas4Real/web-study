import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthGateway, AuthIdentity } from "./auth-service";

function errorCode(error: unknown) {
  if (!error || typeof error !== "object") return error ? "provider_error" : null;
  const code = Reflect.get(error, "code");
  return typeof code === "string" && code.length > 0 ? code : "provider_error";
}

function displayNameFromClaims(claims: Record<string, unknown>) {
  const metadata = claims.user_metadata;
  if (!metadata || typeof metadata !== "object") return "";

  for (const key of ["full_name", "name"]) {
    const value = Reflect.get(metadata, key);
    if (typeof value === "string") return value.trim().replace(/\s+/g, " ").slice(0, 120);
  }
  return "";
}

export function createSupabaseAuthGateway(
  supabase: SupabaseClient,
  appOrigin: string,
): AuthGateway {
  const callbackUrl = new URL("/api/auth/callback", appOrigin);

  return {
    async signUp({ email, fullName, password }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: callbackUrl.toString(),
        },
      });
      if (error) return { errorCode: errorCode(error) };

      // Signup must never carry an account directly into the workspace. This
      // also fails closed if a development Supabase project disables email
      // confirmations and unexpectedly returns a session.
      if (data.session) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
        return { errorCode: errorCode(signOutError) };
      }
      return { errorCode: null };
    },

    async signInWithPassword({ email, password }) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return {
        errorCode: errorCode(error),
        user: data.user
          ? { emailConfirmedAt: data.user.email_confirmed_at ?? null }
          : null,
      };
    },

    async createGoogleAuthorization({ next }) {
      callbackUrl.searchParams.set("next", next);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          skipBrowserRedirect: true,
        },
      });
      return { errorCode: errorCode(error), url: data.url };
    },

    async exchangeCodeForSession(code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { errorCode: errorCode(error) };
    },

    async getVerifiedIdentity() {
      const { data, error } = await supabase.auth.getClaims();
      const claims = data?.claims;
      const subject = claims?.sub;
      if (error || typeof subject !== "string" || subject.length === 0) {
        return { errorCode: errorCode(error) ?? "invalid_claims", identity: null };
      }

      const identity: AuthIdentity = {
        id: subject,
        displayName: displayNameFromClaims(claims as Record<string, unknown>),
      };
      return { errorCode: null, identity };
    },

    async ensureProfile(identity) {
      const { error } = await supabase.from("profiles").upsert(
        { id: identity.id, display_name: identity.displayName },
        { ignoreDuplicates: true, onConflict: "id" },
      );
      return { errorCode: errorCode(error) };
    },

    async signOut() {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      return { errorCode: errorCode(error) };
    },
  };
}
