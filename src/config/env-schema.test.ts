import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env-schema";

const productionEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  NEXT_PUBLIC_APP_ORIGIN: "https://study.example.com",
};

describe("parseServerEnv", () => {
  it("accepts the minimal private-beta production environment", () => {
    const parsed = parseServerEnv(productionEnv);

    expect(parsed.NEXT_PUBLIC_APP_ORIGIN).toBe("https://study.example.com");
    expect(parsed.R2_BUCKET).toBeUndefined();
  });

  it("accepts R2 only when the complete optional credential group is present", () => {
    const parsed = parseServerEnv({
      ...productionEnv,
      R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      R2_ACCESS_KEY_ID: "access-key-id",
      R2_SECRET_ACCESS_KEY: "r2-secret",
      R2_BUCKET: "study-files",
    });

    expect(parsed.R2_BUCKET).toBe("study-files");
  });

  it("rejects a production environment with missing Supabase values", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow();
  });

  it("rejects a partial R2 credential group", () => {
    expect(() =>
      parseServerEnv({
        ...productionEnv,
        R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      }),
    ).toThrow();
  });

  it("allows an unconfigured development environment", () => {
    expect(parseServerEnv({ NODE_ENV: "development" })).toEqual({
      NODE_ENV: "development",
    });
  });

  it("rejects malformed optional values in development", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_ORIGIN: "not-a-url",
      }),
    ).toThrow();
  });

  it("requires a strong API-key pepper when public API infrastructure is configured", () => {
    expect(() => parseServerEnv({
      NODE_ENV: "development",
      API_KEY_HASH_PEPPER: "too-short",
    })).toThrow();

    expect(() => parseServerEnv({
      NODE_ENV: "development",
      API_KEY_HASH_PEPPER: "p".repeat(32),
    })).toThrow("API key infrastructure requires a Supabase secret key");

    expect(parseServerEnv({
      NODE_ENV: "development",
      API_KEY_HASH_PEPPER: "p".repeat(32),
      SUPABASE_SECRET_KEY: "sb_secret_server_only",
    })).toMatchObject({ API_KEY_HASH_PEPPER: "p".repeat(32) });
  });

  it("rejects malformed R2 endpoint and bucket identifiers before startup", () => {
    expect(() => parseServerEnv({
      NODE_ENV: "development",
      R2_ACCOUNT_ID: "https://attacker.example",
    })).toThrow();
    expect(() => parseServerEnv({
      NODE_ENV: "development",
      R2_BUCKET: "Invalid/Bucket",
    })).toThrow();
  });
});
