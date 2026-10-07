import { describe, expect, it } from "vitest";

import { morningGreeting } from "./calendar-header";

describe("morningGreeting", () => {
  it("includes a non-empty display name", () => {
    expect(morningGreeting(" Nas ")).toBe("Good Morning, Nas!");
  });

  it("does not render dangling punctuation for a blank display name", () => {
    expect(morningGreeting("   ")).toBe("Good Morning!");
  });
});
