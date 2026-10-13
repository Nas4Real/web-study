import { describe, expect, it } from "vitest";
import { getShellScenario } from "../../scripts/performance/shell-scenarios";

describe("production shell scenario selection", () => {
  it.each([
    ["Dashboard", "/", "/tasks", "/documents"],
    ["Tasks", "/tasks", "/", "/documents"],
    ["Calendar", "/calendar", "/tasks", "/documents"],
    ["Documents", "/documents", "/tasks", "/tasks"],
    ["Settings", "/settings", "/tasks", "/documents"],
  ])("uses distinct safe source and interruption routes for %s", (label, path, sourcePath, interruptionPath) => {
    const { target, source, interruption } = getShellScenario(label);
    expect(target.label).toBe(label);
    expect(target.path).toBe(path);
    expect(source.path).toBe(sourcePath);
    expect(interruption.path).toBe(interruptionPath);
    expect(target.path).not.toBe(source.path);
    expect(target.path).not.toBe(interruption.path);
    expect(target.ready).toMatch(/^main /);
    expect(source.ready).toMatch(/^main /);
    expect(interruption.ready).toMatch(/^main /);
  });

  it("rejects unknown destinations rather than navigating or echoing private input", () => {
    expect(() => getShellScenario("../../private-value")).toThrow("Unknown profiling destination");
  });
});
