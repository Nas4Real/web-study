import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => ({ headers: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: request.headers }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/server/auth/request-auth", () => ({ getVerifiedActor: vi.fn() }));
vi.mock("@/server/auth/auth-routing", async () => import("../auth/auth-routing"));

import { resolveE2eStudyScope } from "./task-request-context";

describe("shared authenticated development scope", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WEB_STUDY_E2E_AUTH_TOKEN", "scope-test-token");
    request.headers.mockResolvedValue(new Headers({ "x-web-study-e2e-auth": "scope-test-token" }));
  });
  afterEach(() => vi.unstubAllEnvs());
  it("cannot select the test repository in production even with the configured token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await resolveE2eStudyScope("requested")).toBeNull();
  });
  it.each(["missing", "wrong", "unconfigured"])("rejects %s test authentication", async mode => {
    if (mode === "unconfigured") vi.stubEnv("WEB_STUDY_E2E_AUTH_TOKEN", "");
    else request.headers.mockResolvedValue(new Headers(mode === "wrong" ? { "x-web-study-e2e-auth": "wrong" } : {}));
    expect(await resolveE2eStudyScope("requested")).toBeNull();
  });
  it("uses an explicit bounded scope only after authentication", async () => {
    expect(await resolveE2eStudyScope("a".repeat(200))).toBe("a".repeat(120));
  });
  it("derives a form-action scope from the referring page", async () => {
    request.headers.mockResolvedValue(new Headers({ "x-web-study-e2e-auth": "scope-test-token", referer: "http://localhost:3100/calendar?e2eScope=session-test" }));
    expect(await resolveE2eStudyScope()).toBe("session-test");
  });
  it.each([null, "not-a-url", "http://localhost:3100/calendar"])("uses the deterministic baseline for referer %s", async referer => {
    const headers = new Headers({ "x-web-study-e2e-auth": "scope-test-token" });
    if (referer) headers.set("referer", referer);
    request.headers.mockResolvedValue(headers);
    expect(await resolveE2eStudyScope()).toBe("visual-baseline");
  });
});
