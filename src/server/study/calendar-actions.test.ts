import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ handler: vi.fn(), resolve: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("./calendar-request-context", () => ({ resolveCalendarRequestContext: mocks.resolve }));
vi.mock("./calendar-action-handlers", () => ({ createSessionMutationHandler: mocks.handler }));

import { createSessionAction } from "./calendar-actions";

describe("session server action", () => {
  beforeEach(() => vi.clearAllMocks());
  it("delegates to the authenticated handler and refreshes both session consumers only after success", async () => {
    const form = new FormData();
    form.set("title", "Lecture");
    const result = { code: "SESSION_CREATED", status: "success" };
    mocks.handler.mockResolvedValue(result);
    expect(await createSessionAction({ code: "IDLE", status: "idle" }, form)).toEqual(result);
    expect(mocks.handler).toHaveBeenCalledWith(mocks.resolve, form);
    expect(mocks.revalidate.mock.calls).toEqual([["/calendar"], ["/"]]);
  });
  it.each(["UNAUTHENTICATED", "INVALID_INPUT", "NOT_FOUND", "STORAGE_UNAVAILABLE"])("does not invalidate after %s", async code => {
    const result = { code, message: "Safe message", status: "error" };
    mocks.handler.mockResolvedValue(result);
    expect(await createSessionAction({ code: "IDLE", status: "idle" }, new FormData())).toEqual(result);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
