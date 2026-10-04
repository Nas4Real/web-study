import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ handler: vi.fn(), resolve: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("./calendar-request-context", () => ({ resolveCalendarRequestContext: mocks.resolve }));
vi.mock("./calendar-edit-handlers", () => ({ editSessionMutationHandler: mocks.handler }));
import { editSessionAction } from "./calendar-actions";

describe("session edit Server Action", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["series", "occurrence"])("delegates %s edits and refreshes both consumers after success", async scope => {
    const input = { scope, seriesId: "33333333-3333-4333-8333-333333333333", changes: { title: "Updated" }, ...(scope === "occurrence" ? { originalStart: "2026-10-12T08:00:00Z" } : {}) };
    const result = { status: "success", code: "SESSION_UPDATED" };
    mocks.handler.mockResolvedValue(result);
    expect(await editSessionAction(input)).toEqual(result);
    expect(mocks.handler).toHaveBeenCalledWith(mocks.resolve, input);
    expect(mocks.revalidate.mock.calls).toEqual([["/calendar"], ["/"]]);
  });
  it.each(["UNAUTHENTICATED", "INVALID_INPUT", "NOT_FOUND", "STORAGE_UNAVAILABLE"])("does not refresh after %s", async code => {
    const result = { status: "error", code, message: "Safe message" };
    mocks.handler.mockResolvedValue(result);
    expect(await editSessionAction(null)).toEqual(result);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
