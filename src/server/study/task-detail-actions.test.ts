import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ read: vi.fn(), mutate: vi.fn(), readContext: vi.fn(), eagerContext: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("./task-request-context", () => ({ resolveTaskDetailRequestContext: mocks.readContext, resolveTaskRequestContext: mocks.eagerContext }));
vi.mock("./task-detail-handlers", () => ({ readTaskDetailHandler: mocks.read, mutateTaskDetailHandler: mocks.mutate }));

import { mutateTaskDetailAction, readTaskDetailAction } from "./task-detail-actions";

describe("task detail action context selection", () => {
  beforeEach(() => vi.resetAllMocks());
  it("uses overlapping reads only for read-only detail", async () => {
    const result = { status: "success", data: { detail: {} } };
    mocks.read.mockResolvedValue(result);
    await expect(readTaskDetailAction("task-id")).resolves.toEqual(result);
    expect(mocks.read).toHaveBeenCalledWith(mocks.readContext, "task-id");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("keeps mutations on the eager profile context and refreshes successful writes", async () => {
    const command = { type: "complete" };
    mocks.mutate.mockResolvedValue({ status: "success", data: { detail: {} } });
    await mutateTaskDetailAction("task-id", command);
    expect(mocks.mutate).toHaveBeenCalledWith(mocks.eagerContext, "task-id", command);
    expect(mocks.revalidate.mock.calls).toEqual([["/tasks"], ["/"]]);
  });
});
