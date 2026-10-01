import { describe, expect, it } from "vitest";

import {
  normalizeInternalPath,
  passwordResetRequestInputSchema,
  passwordUpdateInputSchema,
} from "./auth-input";

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

describe("password recovery input", () => {
  it("normalizes a reset-request email", () => {
    expect(
      passwordResetRequestInputSchema.parse({ email: "  JANE@Example.COM " }),
    ).toEqual({ email: "jane@example.com" });
  });

  it("requires matching passwords", () => {
    expect(
      passwordUpdateInputSchema.safeParse({
        confirmPassword: "different secure password",
        password: "new secure password",
      }).success,
    ).toBe(false);
  });
});
