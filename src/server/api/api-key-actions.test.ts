import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  revalidate: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("./api-key-action-handlers", () => ({
  createApiKeyManagementHandler: mocks.create,
  listApiKeysManagementHandler: mocks.list,
  revokeApiKeyManagementHandler: mocks.revoke,
}));
vi.mock("./api-key-management-context", () => ({
  resolveApiKeyManagementContext: vi.fn(),
}));

import {
  createApiKeyAction,
  listApiKeysAction,
  revokeApiKeyAction,
} from "./api-key-actions";

describe("API key management Server Actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates session authentication and never caches a returned secret", async () => {
    const form = new FormData();
    const result = { code: "API_KEY_CREATED", status: "success", token: "one-time" };
    mocks.create.mockResolvedValue(result);

    await expect(createApiKeyAction(form)).resolves.toBe(result);
    expect(mocks.revalidate).toHaveBeenCalledWith("/settings");
  });

  it("lists without invalidation and revokes with settings invalidation", async () => {
    mocks.list.mockResolvedValue({ code: "API_KEYS_LISTED", data: [], status: "success" });
    mocks.revoke.mockResolvedValue({ code: "API_KEY_REVOKED", status: "success" });

    await listApiKeysAction();
    expect(mocks.revalidate).not.toHaveBeenCalled();
    await revokeApiKeyAction("33333333-3333-4333-8333-333333333333");
    expect(mocks.revalidate).toHaveBeenCalledWith("/settings");
  });
});
