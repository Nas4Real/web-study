import { describe, expect, it, vi } from "vitest";

import { readSessionDetailHandler } from "./session-detail-handlers";

const target = {
  seriesId: "33333333-3333-4333-8333-333333333333",
  originalStart: "2026-10-12T08:00:00.000Z",
};

function context() {
  return {
    actorId: "11111111-1111-4111-8111-111111111111",
    calendarService: { findOccurrence: vi.fn().mockResolvedValue({ code: "NOT_FOUND", status: "error" }) },
    subjectService: { list: vi.fn() },
    timeZone: "Africa/Tunis",
  };
}

describe("readSessionDetailHandler", () => {
  it("returns a safe not-found response without exposing ownership", async () => {
    const resolve = vi.fn().mockResolvedValue(context());
    await expect(readSessionDetailHandler(resolve, target)).resolves.toEqual({
      code: "NOT_FOUND",
      message: "That session is no longer available.",
      status: "error",
    });
  });

  it("rejects unauthenticated and malformed targets before provider access", async () => {
    await expect(readSessionDetailHandler(vi.fn().mockResolvedValue(null), target)).resolves.toEqual({
      code: "UNAUTHENTICATED",
      message: "Your session has expired. Sign in and try again.",
      status: "error",
    });
    const value = context();
    await expect(readSessionDetailHandler(vi.fn().mockResolvedValue(value), { ...target, actorId: "foreign" })).resolves.toEqual({
      code: "INVALID_INPUT",
      message: "Check the session details and try again.",
      status: "error",
    });
    expect(value.calendarService.findOccurrence).not.toHaveBeenCalled();
  });

  it("normalizes unexpected failures", async () => {
    await expect(readSessionDetailHandler(vi.fn().mockRejectedValue(new Error("private provider detail")), target)).resolves.toEqual({
      code: "STORAGE_UNAVAILABLE",
      message: "Sessions are temporarily unavailable. Please try again.",
      status: "error",
    });
  });
});
