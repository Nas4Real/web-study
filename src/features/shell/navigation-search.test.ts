import { describe, expect, it } from "vitest";

import { findNavigationDestinations } from "./navigation-search";

describe("findNavigationDestinations", () => {
  it("returns all available destinations for an empty query", () => {
    expect(findNavigationDestinations("").map((item) => item.href)).toEqual([
      "/",
      "/calendar",
      "/tasks",
      "/documents",
      "/settings",
    ]);
  });

  it("matches labels and aliases case-insensitively", () => {
    expect(findNavigationDestinations("PLAN")[0]?.href).toBe("/calendar");
    expect(findNavigationDestinations("files")[0]?.href).toBe("/documents");
  });

  it("does not return unavailable placeholder features", () => {
    expect(findNavigationDestinations("AI Tutor")).toEqual([]);
  });
});
