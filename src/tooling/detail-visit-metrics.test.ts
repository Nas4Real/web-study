import { describe, expect, it } from "vitest";
import { detailVisitKinds } from "../../scripts/performance/detail-visit-metrics";

describe("detail profiling visit policy", () => {
  it("preserves the original single visit by default", () => {
    expect(detailVisitKinds(false, undefined)).toEqual(["initial"]);
    expect(detailVisitKinds(true, "0")).toEqual(["initial"]);
  });
  it("adds a same-page warm visit only to read-only mode", () => {
    expect(detailVisitKinds(true, "1")).toEqual(["initial", "warm"]);
    expect(() => detailVisitKinds(false, "1")).toThrow("read-only");
  });
  it.each(["", "true", "2"])("rejects invalid reopen mode %s", value => {
    expect(() => detailVisitKinds(true, value)).toThrow("Invalid detail-reopen mode");
  });
});
