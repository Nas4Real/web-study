import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDetailProbe } from "../../scripts/performance/interaction-probe";

describe("frame-sampled detail readiness", () => {
  let now: number;
  let click: (() => void) | undefined;
  let frame: (() => void) | undefined;
  let visible: boolean;
  let enabled: boolean;
  const advance = (time: number) => { now = time; const callback = frame; frame = undefined; callback?.(); };
  const result = () => (window as unknown as { detailProbe: { status: string; readyMs: number | null; nextFrameMs: number | null } }).detailProbe;

  beforeEach(() => {
    now = 100;
    visible = true;
    enabled = false;
    click = undefined;
    frame = undefined;
    vi.stubGlobal("window", {});
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { frame = callback; return 1; });
    vi.stubGlobal("cancelAnimationFrame", () => { frame = undefined; });
    vi.stubGlobal("getComputedStyle", () => ({ visibility: "visible", display: "block" }));
    vi.stubGlobal("document", {
      addEventListener: (_: string, callback: () => void) => { click = callback; },
      removeEventListener: (_: string, callback: () => void) => { if (click === callback) click = undefined; },
      querySelector: () => visible ? {
        getClientRects: () => [1],
        querySelectorAll: () => [{ textContent: "Edit", get disabled() { return !enabled; } }],
      } : null,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("waits for the click, enabled control and following frame", () => {
    installDetailProbe({ selector: '[role="dialog"]', buttonText: "Edit" });
    expect(result().status).toBe("armed");
    click?.();
    advance(116);
    expect(result().readyMs).toBeNull();
    enabled = true;
    advance(148);
    expect(result().readyMs).toBe(48);
    expect(result().status).toBe("pending");
    advance(164);
    expect(result()).toMatchObject({ status: "complete", readyMs: 48, nextFrameMs: 64 });
  });

  it("does not treat an existing dialog as closed", () => {
    installDetailProbe({ selector: '[role="dialog"]', absent: true });
    click?.();
    advance(116);
    expect(result().readyMs).toBeNull();
    visible = false;
    advance(132);
    advance(148);
    expect(result()).toMatchObject({ status: "complete", readyMs: 32, nextFrameMs: 48 });
  });

  it("leaves missing readiness unknown and stops after the budget", () => {
    installDetailProbe({ selector: '[role="dialog"]', buttonText: "Edit" });
    click?.();
    advance(30101);
    expect(result()).toMatchObject({ status: "timeout", readyMs: null, nextFrameMs: null });
    expect(frame).toBeUndefined();
  });

  it("replacing an armed probe removes its old listener", () => {
    installDetailProbe({ selector: "old" });
    const oldClick = click;
    installDetailProbe({ selector: "new" });
    expect(click).not.toBe(oldClick);
    expect(result().status).toBe("armed");
  });
});
