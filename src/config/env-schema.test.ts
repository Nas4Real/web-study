import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env-schema";

const productionEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  NEXT_PUBLIC_APP_ORIGIN: "https://study.example.com",
  SUPABASE_SECRET_KEY: "secret-key",
  R2_ACCOUNT_ID: "account-id",
  R2_ACCESS_KEY_ID: "access-key-id",
  R2_SECRET_ACCESS_KEY: "r2-secret",
  R2_BUCKET: "study-files",
  API_KEY_HASH_PEPPER: "pepper",
  CRON_SECRET: "cron-secret",
};

describe("parseServerEnv", () => {
  it("accepts the complete production environment contract", () => {
    const parsed = parseServerEnv(productionEnv);

    expect(parsed.NEXT_PUBLIC_APP_ORIGIN).toBe("https://study.example.com");
    expect(parsed.R2_BUCKET).toBe("study-files");
  });

  it("rejects a production environment with missing secrets", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
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
});
