import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ handler: vi.fn(), resolve: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("./calendar-request-context", () => ({ resolveCalendarRequestContext: mocks.resolve }));
vi.mock("./calendar-delete-handlers", () => ({ deleteSessionMutationHandler: mocks.handler }));

import { deleteSessionAction } from "./calendar-actions";

describe("calendar deletion Server Action", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    { scope: "series", seriesId: "33333333-3333-4333-8333-333333333333" },
    { scope: "occurrence", seriesId: "33333333-3333-4333-8333-333333333333", originalStart: "2026-10-12T08:00:00Z" },
  ])("delegates explicit %s target and invalidates both consumers on success", async input => {
    const result = { status: "success", code: "SESSION_DELETED" };
    mocks.handler.mockResolvedValue(result);
    expect(await deleteSessionAction(input)).toEqual(result);
    expect(mocks.handler).toHaveBeenCalledWith(mocks.resolve, input);
    expect(mocks.revalidate.mock.calls).toEqual([["/calendar"], ["/"]]);
  });
  it.each(["UNAUTHENTICATED", "INVALID_INPUT", "NOT_FOUND", "STORAGE_UNAVAILABLE"])("does not invalidate after %s", async code => {
    const result = { status: "error", code, message: "Safe message" };
    mocks.handler.mockResolvedValue(result);
    expect(await deleteSessionAction(null)).toEqual(result);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
