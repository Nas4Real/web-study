import { describe, expect, it } from "vitest";

import {
  decodeCursor,
  encodeCursor,
  parsePageRequest,
} from "./public-api-pagination";

describe("public API cursor pagination", () => {
  it("round-trips an opaque validated cursor", () => {
    const value = {
      createdAt: "2026-10-02T00:00:00.000Z",
      id: "22222222-2222-4222-8222-222222222222",
      position: 4,
    };

    expect(decodeCursor(encodeCursor(value))).toEqual(value);
  });

  it("rejects malformed cursors and bounds page size", () => {
    expect(parsePageRequest(new URLSearchParams("limit=0"))).toEqual({
      code: "INVALID_INPUT",
      status: "error",
    });
    expect(parsePageRequest(new URLSearchParams("limit=101"))).toEqual({
      code: "INVALID_INPUT",
      status: "error",
    });
    expect(parsePageRequest(new URLSearchParams("cursor=not-base64"))).toEqual({
      code: "INVALID_INPUT",
      status: "error",
    });
    expect(parsePageRequest(new URLSearchParams({ cursor: "x".repeat(1025) })))
      .toEqual({ code: "INVALID_INPUT", status: "error" });
  });
});
