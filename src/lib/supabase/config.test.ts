import { describe, expect, it } from "vitest";

import { parseSupabaseAdminConfig, parseSupabasePublicConfig } from "./config";

describe("parseSupabasePublicConfig", () => {
  it("returns only the browser-safe Supabase connection values", () => {
    expect(
      parseSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        SUPABASE_SECRET_KEY: "must-not-be-returned",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "publishable-key",
    });
  });

  it("returns null when local development is fully unconfigured", () => {
    expect(parseSupabasePublicConfig({})).toBeNull();
  });

  it("rejects partial or malformed configuration", () => {
    expect(() =>
      parseSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow("Supabase public environment is incomplete");

    expect(() =>
      parseSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toThrow("Supabase public URL is invalid");
  });
});

describe("parseSupabaseAdminConfig", () => {
  it("requires and returns only the server-side URL and secret key", () => {
    expect(parseSupabaseAdminConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_server_only",
    })).toEqual({
      secretKey: "sb_secret_server_only",
      url: "https://example.supabase.co",
    });
  });

  it("fails closed when either server-side value is absent", () => {
    expect(() => parseSupabaseAdminConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    })).toThrow("Supabase admin environment is incomplete");
  });
});
