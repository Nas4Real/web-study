import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSupabaseSessionVerifier } from "./supabase-session-verifier";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function claimsClient(result: unknown) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue(result),
    },
  };
}

describe("Supabase public API session verification", () => {
  it("verifies an explicit bearer JWT and projects only the trusted subject", async () => {
    const bearerClient = claimsClient({
      data: {
        claims: {
          is_anonymous: false,
          role: "authenticated",
          sub: USER_ID,
          user_metadata: { role: "admin" },
        },
      },
      error: null,
    });
    const cookieClient = vi.fn();
    const verifier = createSupabaseSessionVerifier({ bearerClient, cookieClient });

    const result = await verifier.verify("header.payload.signature");

    expect(result).toEqual({ data: { apiKeyId: null, userId: USER_ID }, status: "success" });
    expect(bearerClient.auth.getClaims).toHaveBeenCalledWith("header.payload.signature");
    expect(cookieClient).not.toHaveBeenCalled();
  });

  it("verifies the current cookie session when no bearer token is supplied", async () => {
    const cookieClaims = claimsClient({
      data: { claims: { is_anonymous: false, role: "authenticated", sub: USER_ID } },
      error: null,
    });
    const verifier = createSupabaseSessionVerifier({
      bearerClient: claimsClient({ data: null, error: null }),
      cookieClient: vi.fn().mockResolvedValue(cookieClaims),
    });

    expect(await verifier.verify()).toEqual({
      data: { apiKeyId: null, userId: USER_ID },
      status: "success",
    });
    expect(cookieClaims.auth.getClaims).toHaveBeenCalledWith();
  });

  it.each([
    { is_anonymous: true, role: "authenticated", sub: USER_ID },
    { is_anonymous: false, role: "service_role", sub: USER_ID },
    { is_anonymous: false, role: "authenticated", sub: "not-a-uuid" },
  ])("rejects claims that do not represent a verified user session", async (claims) => {
    const verifier = createSupabaseSessionVerifier({
      bearerClient: claimsClient({ data: { claims }, error: null }),
      cookieClient: vi.fn(),
    });

    expect(await verifier.verify("header.payload.signature")).toEqual({
      code: "INVALID_SESSION",
      status: "error",
    });
  });

  it("rejects provider-declared token verification errors without exposing them", async () => {
    const verifier = createSupabaseSessionVerifier({
      bearerClient: claimsClient({ data: null, error: new Error("provider token detail") }),
      cookieClient: vi.fn(),
    });

    expect(await verifier.verify("header.payload.signature")).toEqual({
      code: "INVALID_SESSION",
      status: "error",
    });
  });
});
