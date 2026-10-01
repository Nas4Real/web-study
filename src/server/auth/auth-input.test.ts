import { describe, expect, it } from "vitest";

import { normalizeInternalPath } from "./auth-input";

describe("normalizeInternalPath", () => {
  it.each([
    [undefined, "/"],
    ["", "/"],
    ["/tasks?filter=high", "/tasks?filter=high"],
    ["https://evil.example/steal", "/"],
    ["//evil.example/steal", "/"],
    ["/\\evil.example/steal", "/"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeInternalPath(input)).toBe(expected);
  });
});
