import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handler: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock("./calendar-request-context", () => ({
  resolveCalendarRequestContext: mocks.resolve,
}));

vi.mock("./session-detail-handlers", () => ({
  readSessionDetailHandler: mocks.handler,
}));

import { readSessionDetailAction } from "./session-detail-actions";

describe("session detail Server Action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates the occurrence target through the authenticated request context", async () => {
    const target = {
      originalStart: "2026-10-12T08:00:00.000Z",
      seriesId: "33333333-3333-4333-8333-333333333333",
    };
    const result = {
      status: "success",
      data: { detail: { title: "Physics" }, timeZone: "Africa/Tunis" },
    };
    mocks.handler.mockResolvedValue(result);

    await expect(readSessionDetailAction(target)).resolves.toEqual(result);
    expect(mocks.handler).toHaveBeenCalledWith(mocks.resolve, target);
  });
});
