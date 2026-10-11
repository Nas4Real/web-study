import { describe, expect, it, vi } from "vitest";
import { sessionMutationMode, sessionProviderMode, withRestoredSessionLocation } from "../../scripts/performance/session-mutation-profile";

describe("session mutation profiling safeguards", () => {
  const mode = { origin: "http://localhost:3100", detailsOnly: false, reopenDetails: false, correlateDetails: false };
  it("opts into provider attribution only for local session mutations", () => {
    const safe = { origin: mode.origin, sessionMutations: true };
    expect(sessionProviderMode(undefined, safe)).toBe(false);
    expect(sessionProviderMode("false", safe)).toBe(false);
    expect(sessionProviderMode("true", safe)).toBe(true);
    expect(() => sessionProviderMode("1", safe)).toThrow();
    expect(() => sessionProviderMode("true", { ...safe, sessionMutations: false })).toThrow();
    expect(() => sessionProviderMode("true", { ...safe, origin: "https://web-study-pearl.vercel.app" })).toThrow();
  });
  it("is opt-in and accepts only the isolated local mutation mode", () => {
    expect(sessionMutationMode(undefined, mode)).toBe(false);
    expect(sessionMutationMode("0", mode)).toBe(false);
    expect(sessionMutationMode("1", mode)).toBe(true);
  });
  it.each(["true", "", "2"])("rejects malformed flag %j", value => {
    expect(() => sessionMutationMode(value, mode)).toThrow("Invalid session-mutation mode");
  });
  it.each([
    { origin: "https://web-study-pearl.vercel.app" },
    { detailsOnly: true }, { reopenDetails: true }, { correlateDetails: true },
  ])("rejects unsafe or misleading mode %j", override => {
    expect(() => sessionMutationMode("1", { ...mode, ...override })).toThrow("isolated local");
  });
  it("restores the original after a successful write and verification", async () => {
    const writes: string[] = [];
    const verify = vi.fn();
    await withRestoredSessionLocation("", async location => { writes.push(location); }, verify);
    expect(writes).toEqual(["Synthetic profiling room", ""]);
    expect(verify).toHaveBeenLastCalledWith("");
  });
  it.each(["write", "verify"])("restores after an uncertain %s failure and preserves the failure", async stage => {
    const writes: string[] = [];
    const write = async (location: string) => { writes.push(location); if (stage === "write" && writes.length === 1) throw new Error("synthetic failure"); };
    const verify = vi.fn().mockImplementation(async location => { if (stage === "verify" && location !== "Original") throw new Error("synthetic failure"); });
    await expect(withRestoredSessionLocation("Original", write, verify)).rejects.toThrow("synthetic failure");
    expect(writes.at(-1)).toBe("Original");
    expect(verify).toHaveBeenLastCalledWith("Original");
  });
  it("does not swallow a restoration failure", async () => {
    const write = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("restore failed"));
    await expect(withRestoredSessionLocation("Original", write, vi.fn())).rejects.toThrow("restore failed");
  });
  it("uses a distinct temporary value when the original matches the marker", async () => {
    const write = vi.fn();
    await withRestoredSessionLocation("Synthetic profiling room", write, vi.fn());
    expect(write.mock.calls[0][0]).not.toBe("Synthetic profiling room");
    expect(write).toHaveBeenLastCalledWith("Synthetic profiling room", "session-restore-confirmed");
  });
});
