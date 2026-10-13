import { describe, expect, it } from "vitest";
import { correlateDetailProviders } from "../../scripts/performance/detail-provider-metrics";

const call = { requestId: "7", route: "/tasks", kind: "task", start: 10, end: 30, status: 200, failed: false };
describe("detail provider attribution", () => {
  it("attributes only one exact action and excludes earlier ID collisions", () => {
    const oldLog = JSON.stringify({ ...call, end: 1000 }) + "\n";
    const log = oldLog + JSON.stringify({ ...call, privateValue: "not-output" });
    const result = correlateDetailProviders(log, oldLog.length, ["7"], "/tasks");
    expect(result.counts).toEqual({ task: 1 });
    expect(result.spanMs).toBe(20);
    expect(JSON.stringify(result)).not.toContain("not-output");
    expect(JSON.stringify(result)).not.toContain("requestId");
  });
  it.each([{ ids: [] }, { ids: ["7", "8"] }, { ids: [null] }, { ids: ["private-value"] }])("rejects missing or ambiguous action IDs: $ids", ({ ids }) => {
    expect(() => correlateDetailProviders(JSON.stringify(call), 0, ids, "/tasks")).toThrow("Detail provider attribution incomplete");
  });
  it("does not call missing or other-route provider events zero work", () => {
    expect(() => correlateDetailProviders("", 0, ["7"], "/tasks")).toThrow();
    expect(() => correlateDetailProviders(JSON.stringify(call), 0, ["7"], "/calendar")).toThrow();
  });
  it("retains only allowlisted methods when correlating a mutation and its server rerender", () => {
    const calls = [
      { ...call, route: "/calendar", kind: "calendar", method: "PATCH", privateBody: "never-output" },
      { ...call, route: "/calendar", kind: "profile", method: "GET", start: 35, end: 50 },
    ];
    const result = correlateDetailProviders(calls.map(item => JSON.stringify(item)).join("\n"), 0, ["7"], "/calendar");
    expect(result.calls.map(item => item.method)).toEqual(["PATCH", "GET"]);
    expect(JSON.stringify(result)).not.toContain("never-output");
    expect(() => correlateDetailProviders(JSON.stringify({ ...calls[0], method: "private-value" }), 0, ["7"], "/calendar")).toThrow();
  });
});
