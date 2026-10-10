import { describe, expect, it } from "vitest";
import { summarize, classifyResource, classifyProvider } from "../../scripts/performance/metrics";

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
});
