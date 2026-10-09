import { describe, expect, it, vi } from "vitest";

import {
  createApiKeyManagementHandler,
  listApiKeysManagementHandler,
  revokeApiKeyManagementHandler,
  type ApiKeyManagementContext,
} from "./api-key-action-handlers";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const KEY_ID = "33333333-3333-4333-8333-333333333333";

function context(): ApiKeyManagementContext {
  return {
    actorId: USER_ID,
    apiKeyService: {
      create: vi.fn().mockResolvedValue({
        data: {
          apiKey: { id: KEY_ID, name: "CLI", prefix: "abcdefghijkl" },
          token: "wsk_abcdefghijkl_abcdefghijklmnopqrstuvwxyzABCDEFGHijk",
        },
        status: "success",
      }),
      list: vi.fn().mockResolvedValue({ data: [], status: "success" }),
      revoke: vi.fn().mockResolvedValue({ data: { id: KEY_ID }, status: "success" }),
    },
  };
}

describe("session-only API key management handlers", () => {
  it("creates a key for the verified session actor and returns the secret once", async () => {
    const current = context();
    const form = new FormData();
    form.set("name", "CLI");
    form.set("expiresAt", "");

    const result = await createApiKeyManagementHandler(async () => current, form);

    expect(result).toMatchObject({ code: "API_KEY_CREATED", status: "success" });
    expect(result).toHaveProperty("token");
    expect(current.apiKeyService.create).toHaveBeenCalledWith(USER_ID, {
      expiresAt: null,
      name: "CLI",
    });
  });

  it("lists and revokes only through a verified session context", async () => {
    const current = context();
    await listApiKeysManagementHandler(async () => current);
    await revokeApiKeyManagementHandler(async () => current, KEY_ID);

    expect(current.apiKeyService.list).toHaveBeenCalledWith(USER_ID);
    expect(current.apiKeyService.revoke).toHaveBeenCalledWith(USER_ID, KEY_ID);
  });

  it("rejects absent sessions before reaching key services", async () => {
    await expect(
      listApiKeysManagementHandler(async () => null),
    ).resolves.toEqual({ code: "UNAUTHENTICATED", status: "error" });
  });

  it("normalizes failures without exposing provider details or a stale token", async () => {
    const result = await createApiKeyManagementHandler(async () => {
      throw new Error("database password and raw token");
    }, new FormData());

    expect(result).toEqual({ code: "STORAGE_UNAVAILABLE", status: "error" });
    expect(JSON.stringify(result)).not.toContain("database password");
    expect(result).not.toHaveProperty("token");
  });
});
