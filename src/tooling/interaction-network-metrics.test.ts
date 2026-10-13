import { describe, expect, it } from "vitest";
import { projectClickTiming } from "../../scripts/performance/interaction-network-metrics";

describe("click-relative response timing", () => {
  it("maps browser request timing to the actual click, not harness setup", () => {
    expect(projectClickTiming({ startTime: 1100, responseStart: 70, responseEnd: 120 }, 1000)).toEqual({
      clickStartMs: 100, clickHeadersMs: 170, clickCompleteMs: 220,
    });
  });
  it("retains negative offsets for requests that began before the click", () => {
    expect(projectClickTiming({ startTime: 990, responseStart: 5, responseEnd: -1 }, 1000)).toEqual({
      clickStartMs: -10, clickHeadersMs: -5, clickCompleteMs: null,
    });
  });
  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("leaves unavailable response milestones unknown (%s)", value => {
    expect(projectClickTiming({ startTime: 1100, responseStart: value, responseEnd: value }, 1000)).toEqual({
      clickStartMs: 100, clickHeadersMs: null, clickCompleteMs: null,
    });
  });
  it("does not map unknown request or click clocks", () => {
    expect(projectClickTiming({ startTime: 0, responseStart: 10, responseEnd: 20 }, 1000)).toEqual({
      clickStartMs: null, clickHeadersMs: null, clickCompleteMs: null,
    });
    expect(projectClickTiming({ startTime: 1100, responseStart: 10, responseEnd: 20 }, Number.NaN).clickHeadersMs).toBeNull();
  });
});
