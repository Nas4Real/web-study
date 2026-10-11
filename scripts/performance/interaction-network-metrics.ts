// Playwright request.timing() uses epoch startTime plus relative response offsets.
// Project only numeric milestones; missing/cancelled bodies stay unknown.
export function projectClickTiming(timing: { startTime: number; responseStart: number; responseEnd: number }, clickEpochMs: number) {
  const clocksKnown = Number.isFinite(timing.startTime) && timing.startTime > 0
    && Number.isFinite(clickEpochMs) && clickEpochMs > 0;
  const offset = timing.startTime - clickEpochMs;
  const relative = (value: number) => clocksKnown && Number.isFinite(value) && value >= 0 ? offset + value : null;
  return {
    clickStartMs: clocksKnown ? offset : null,
    clickHeadersMs: relative(timing.responseStart),
    clickCompleteMs: relative(timing.responseEnd),
  };
}
