export type DetailProbeCriteria = { selector: string; buttonText?: string; absent?: boolean };
export type DetailProbeResult = { status: "armed" | "pending" | "complete" | "timeout" | "cancelled"; readyMs: number | null; nextFrameMs: number | null };

// Serialized into the test page. Keep self-contained; no application imports.
// This is frame-sampled DOM readiness, not React commit, paint or hydration.
export function installDetailProbe(criteria: DetailProbeCriteria) {
  const target = window as Window & { detailProbe?: DetailProbeResult & { cancel: () => void }; interactionClick?: number };
  target.detailProbe?.cancel();
  let frame = 0;
  let clickedAt = 0;
  const probe: DetailProbeResult & { cancel: () => void } = {
    status: "armed", readyMs: null, nextFrameMs: null,
    cancel: () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick, true);
      if (probe.status === "armed" || probe.status === "pending") probe.status = "cancelled";
    },
  };
  const sample = () => {
    const elapsed = performance.now() - clickedAt;
    if (elapsed > 30000) { probe.status = "timeout"; return; }
    const dialog = document.querySelector<HTMLElement>(criteria.selector);
    const visible = Boolean(dialog && dialog.getClientRects().length && getComputedStyle(dialog).visibility !== "hidden" && getComputedStyle(dialog).display !== "none");
    const ready = criteria.absent ? !visible : visible && (!criteria.buttonText ||
      [...dialog!.querySelectorAll<HTMLButtonElement>("button")].some(button => button.textContent?.trim() === criteria.buttonText && !button.disabled));
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
