import { describe, expect, it } from "vitest";
import { summarize, classifyResource, classifyProvider, providerTimeline, correlateProviderTimeline } from "../../scripts/performance/metrics";

describe("navigation report boundaries", () => {
  it("uses nearest-rank p95 without mutating the input", () => {
    const samples = [10, 4, 2, 6, 8, 3, 9, 1, 5, 7];
    expect(summarize(samples)).toEqual({ count: 10, median: 5.5, p95: 10 });
    expect(samples[0]).toBe(10);
  });
  it("does not invent a metric when no samples exist", () => {
    expect(summarize([])).toEqual({ count: 0, median: null, p95: null });
  });
  it("classifies without retaining private URLs or query strings", () => {
    expect(classifyResource("https://app.test/tasks?_rsc=secret", "app.test", "Fetch")).toBe("rsc");
    expect(classifyResource("https://app.test/api/v1/tasks/private-id", "app.test", "Fetch")).toBe("api");
    expect(classifyResource("https://provider.test/auth?token=secret", "app.test", "Fetch")).toBe("external");
    expect(classifyResource("https://app.test/_next/static/chunks/private.js", "app.test", "Script")).toBe("js");
  });
  it("limits provider labels to fixed categories without retaining user filters", () => {
    expect(classifyProvider("/rest/v1/profiles?user_id=eq.private")).toBe("profile");
    expect(classifyProvider("/auth/v1/user")).toBe("auth-user");
    expect(classifyProvider("/rest/v1/unknown-private-table")).toBe("other");
  });
  it("counts overlapping provider calls without double-counting their busy time", () => {
    const result = providerTimeline([
      { kind: "profile", start: 100, end: 200, status: 200, failed: false },
      { kind: "auth-user", start: 120, end: 180, status: 200, failed: false },
      { kind: "profile", start: 250, end: 300, status: 503, failed: false },
    ]);
    expect(result.counts).toEqual({ profile: 2, "auth-user": 1 });
    expect(result.busyMs).toBe(150);
    expect(result.spanMs).toBe(200);
    expect(result.errors).toBe(1);
    expect(result.calls[0]).toEqual({ kind: "profile", startMs: 0, endMs: 100, status: 200, failed: false });
  });
  it("keeps empty provider timelines unknown and rejects malformed categories/times", () => {
    expect(providerTimeline([])).toEqual({ counts: {}, busyMs: null, spanMs: null, errors: 0, calls: [] });
    expect(() => providerTimeline([{ kind: "private-table", start: 0, end: 1, status: 200, failed: false }])).toThrow();
    expect(() => providerTimeline([{ kind: "profile", start: 2, end: 1, status: 200, failed: false }])).toThrow();
  });
  it("excludes old log rows with colliding request IDs and other route/request rows", () => {
    const row = { requestId: "7", route: "/calendar", kind: "profile", start: 10, end: 30, status: 200, failed: false };
    const oldLog = JSON.stringify({ ...row, end: 1000 }) + "\n";
    const freshLog = [row, { ...row, requestId: "8" }, { ...row, route: "/tasks" }].map(value => JSON.stringify(value)).join("\n");
    const result = correlateProviderTimeline(oldLog + freshLog, oldLog.length, "7", "/calendar");
    expect(result?.counts).toEqual({ profile: 1 });
    expect(result?.spanMs).toBe(20);
  });
  it("keeps absent correlation unknown instead of recording zero provider calls", () => {
    expect(correlateProviderTimeline("", 0, "7", "/calendar")).toBeNull();
    expect(correlateProviderTimeline("", 0, undefined, "/calendar")).toBeNull();
    expect(() => correlateProviderTimeline("", 1, "7", "/calendar")).toThrow();
  });
  it("projects correlation into sanitized timings without retaining extra log fields", () => {
    const log = JSON.stringify({ requestId: "7", route: "/calendar", kind: "subject", start: 10, end: 30, status: 200, failed: false, privateValue: "do-not-output" });
    const result = correlateProviderTimeline(log, 0, "7", "/calendar");
    expect(JSON.stringify(result)).not.toContain("do-not-output");
    expect(JSON.stringify(result)).not.toContain("requestId");
  });
});
