export type DetailProbeCriteria = { selector: string; buttonText?: string; absent?: boolean; feedbackSelector?: string; readyControlSelector?: string };
export type DetailProbeResult = { status: "armed" | "pending" | "complete" | "timeout" | "cancelled"; feedbackMs: number | null; readyMs: number | null; nextFrameMs: number | null };

// Serialized into the test page. Keep self-contained; no application imports.
// This is frame-sampled DOM readiness, not React commit, paint or hydration.
export function installDetailProbe(criteria: DetailProbeCriteria) {
  const target = window as Window & { detailProbe?: DetailProbeResult & { cancel: () => void }; interactionClick?: number };
  target.detailProbe?.cancel();
  let frame = 0;
  let clickedAt = 0;
  const probe: DetailProbeResult & { cancel: () => void } = {
    status: "armed", feedbackMs: null, readyMs: null, nextFrameMs: null,
    cancel: () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick, true);
      if (probe.status === "armed" || probe.status === "pending") probe.status = "cancelled";
    },
  };
  const isVisible = (element: HTMLElement | null) => Boolean(element && element.getClientRects().length
    && getComputedStyle(element).visibility !== "hidden" && getComputedStyle(element).display !== "none");
  const sample = () => {
    const elapsed = performance.now() - clickedAt;
    if (elapsed > 30000) { probe.status = "timeout"; return; }
    const dialog = document.querySelector<HTMLElement>(criteria.selector);
    const visible = isVisible(dialog);
    if (criteria.feedbackSelector && probe.feedbackMs === null && isVisible(document.querySelector(criteria.feedbackSelector))) {
      probe.feedbackMs = elapsed;
    }
    const control = criteria.readyControlSelector ? document.querySelector<HTMLButtonElement>(criteria.readyControlSelector) : null;
    const controlReady = !criteria.readyControlSelector || (isVisible(control) && !control!.disabled);
    const ready = controlReady && (criteria.absent ? !visible : visible && (!criteria.buttonText ||
      [...dialog!.querySelectorAll<HTMLButtonElement>("button")].some(button => button.textContent?.trim() === criteria.buttonText && !button.disabled)));
    if (!ready) { frame = requestAnimationFrame(sample); return; }
    probe.readyMs = elapsed;
    frame = requestAnimationFrame(() => {
      probe.nextFrameMs = performance.now() - clickedAt;
      probe.status = "complete";
    });
  };
  function onClick() {
    document.removeEventListener("click", onClick, true);
    clickedAt = performance.now();
    target.interactionClick = clickedAt;
    probe.status = "pending";
    frame = requestAnimationFrame(sample);
  }
  target.detailProbe = probe;
  target.interactionClick = 0;
  document.addEventListener("click", onClick, true);
}
