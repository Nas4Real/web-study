import { describe, expect, it } from "vitest";

import {
  buildSignInUrl,
  isE2eAuthenticatedRequest,
  isProtectedWorkspacePath,
} from "./auth-routing";

describe("isProtectedWorkspacePath", () => {
  it.each(["/", "/tasks", "/tasks/123", "/calendar", "/documents", "/settings"])(
    "protects the workspace route %s",
    (pathname) => {
      expect(isProtectedWorkspacePath(pathname)).toBe(true);
    },
  );

  it.each(["/sign-in", "/sign-up", "/forgot-password", "/api/auth/callback"])(
    "keeps the public route %s accessible",
    (pathname) => {
      expect(isProtectedWorkspacePath(pathname)).toBe(false);
    },
  );
});

describe("buildSignInUrl", () => {
  it("preserves only the requested internal path and query", () => {
    const requestUrl = new URL("https://study.example.com/tasks?filter=high");

    expect(buildSignInUrl(requestUrl).toString()).toBe(
      "https://study.example.com/sign-in?next=%2Ftasks%3Ffilter%3Dhigh",
    );
  });
});

describe("isE2eAuthenticatedRequest", () => {
  it("allows the matching test token only outside production", () => {
    expect(
      isE2eAuthenticatedRequest({
        nodeEnv: "development",
        configuredToken: "test-token",
        requestToken: "test-token",
      }),
    ).toBe(true);

    expect(
      isE2eAuthenticatedRequest({
        nodeEnv: "production",
        configuredToken: "test-token",
        requestToken: "test-token",
      }),
    ).toBe(false);
  });

  it("rejects missing and mismatched test tokens", () => {
    expect(
      isE2eAuthenticatedRequest({
        nodeEnv: "test",
        configuredToken: "test-token",
        requestToken: "wrong-token",
      }),
    ).toBe(false);

    expect(
      isE2eAuthenticatedRequest({
        nodeEnv: "test",
        configuredToken: undefined,
        requestToken: undefined,
      }),
    ).toBe(false);
  });
});
