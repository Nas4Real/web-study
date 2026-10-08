import { describe, expect, it, vi } from "vitest";

import {
  ApiKeyService,
  type ApiKeyRepository,
  type ApiKeyTokenCodec,
} from "./api-key-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const KEY_ID = "33333333-3333-4333-8333-333333333333";
const NOW = new Date("2026-10-08T17:30:00.000Z");
const TOKEN = "wsk_abcdefghijkl_abcdefghijklmnopqrstuvwxyzABCDEFGHijk";

const STORED_KEY = {
  createdAt: NOW.toISOString(),
  digest: "a".repeat(64),
  expiresAt: "2026-11-08T17:30:00.000Z",
  id: KEY_ID,
  lastUsedAt: null,
  name: "My integration",
  prefix: "abcdefghijkl",
  revokedAt: null,
  userId: USER_ID,
} as const;

function repository(overrides: Partial<ApiKeyRepository> = {}): ApiKeyRepository {
  return {
    createOwned: vi.fn().mockResolvedValue({ data: STORED_KEY, errorCode: null }),
    findActiveByPrefix: vi.fn().mockResolvedValue({ data: STORED_KEY, errorCode: null }),
    listOwned: vi.fn().mockResolvedValue({ data: [STORED_KEY], errorCode: null }),
    revokeOwned: vi.fn().mockResolvedValue({ data: STORED_KEY, errorCode: null }),
    touchLastUsed: vi.fn().mockResolvedValue({ data: true, errorCode: null }),
    ...overrides,
  };
}

function codec(overrides: Partial<ApiKeyTokenCodec> = {}): ApiKeyTokenCodec {
  return {
    extractPrefix: vi.fn().mockReturnValue("abcdefghijkl"),
    generate: vi.fn().mockReturnValue({
      digest: STORED_KEY.digest,
      prefix: STORED_KEY.prefix,
      token: TOKEN,
    }),
    verify: vi.fn().mockReturnValue(true),
    ...overrides,
  };
}

describe("ApiKeyService", () => {
  it("normalizes input, persists no raw token, and returns the secret exactly once", async () => {
    const store = repository();
    const result = await new ApiKeyService(store, codec(), () => NOW).create(USER_ID, {
      expiresAt: "2026-11-08T17:30:00.000Z",
      name: "  My   integration  ",
    });

    expect(result).toEqual({
      data: {
        apiKey: expect.objectContaining({ id: KEY_ID, name: "My integration" }),
        token: TOKEN,
      },
      status: "success",
    });
    expect(store.createOwned).toHaveBeenCalledWith(USER_ID, {
      digest: STORED_KEY.digest,
      expiresAt: STORED_KEY.expiresAt,
      name: "My integration",
      prefix: STORED_KEY.prefix,
    });
    expect(JSON.stringify(vi.mocked(store.createOwned).mock.calls)).not.toContain(TOKEN);
  });

  it("rejects invalid actors, names, and non-future expiries before writing", async () => {
    const store = repository();
    const service = new ApiKeyService(store, codec(), () => NOW);

    await expect(service.create("not-a-user", { name: "Key" })).resolves.toMatchObject({ code: "INVALID_ACTOR" });
    await expect(service.create(USER_ID, { name: " " })).resolves.toMatchObject({ code: "INVALID_INPUT" });
    await expect(service.create(USER_ID, { expiresAt: NOW.toISOString(), name: "Key" })).resolves.toMatchObject({ code: "INVALID_INPUT" });
    expect(store.createOwned).not.toHaveBeenCalled();
  });

  it("lists and revokes only keys owned by the authenticated account", async () => {
    const store = repository();
    const service = new ApiKeyService(store, codec(), () => NOW);

    const listed = await service.list(USER_ID);
    const revoked = await service.revoke(USER_ID, KEY_ID);

    expect(listed).toEqual({ data: [expect.not.objectContaining({ digest: expect.anything() })], status: "success" });
    expect(store.listOwned).toHaveBeenCalledWith(USER_ID);
    expect(store.revokeOwned).toHaveBeenCalledWith(USER_ID, KEY_ID, NOW.toISOString());
    expect(revoked).toMatchObject({ status: "success" });
  });

  it("authenticates only active unexpired keys and updates usage after verification", async () => {
    const store = repository();
    const result = await new ApiKeyService(store, codec(), () => NOW).verify(TOKEN);

    expect(result).toEqual({ data: { apiKeyId: KEY_ID, userId: USER_ID }, status: "success" });
    expect(store.touchLastUsed).toHaveBeenCalledWith(KEY_ID, NOW.toISOString());
  });

  it("fails authentication when revocation wins the last-used update race", async () => {
    const store = repository({
      touchLastUsed: vi.fn().mockResolvedValue({ data: false, errorCode: null }),
    });

    await expect(new ApiKeyService(store, codec(), () => NOW).verify(TOKEN)).resolves.toEqual({
      code: "INVALID_API_KEY",
      status: "error",
    });
  });

  it.each([
    ["revoked", { ...STORED_KEY, revokedAt: NOW.toISOString() }],
    ["expired", { ...STORED_KEY, expiresAt: "2026-10-08T17:29:59.000Z" }],
    ["foreign prefix collision", { ...STORED_KEY, userId: OTHER_USER_ID, prefix: "different123" }],
  ])("rejects a %s key without exposing the reason", async (_label, stored) => {
    const store = repository({
      findActiveByPrefix: vi.fn().mockResolvedValue({ data: stored, errorCode: null }),
    });
    const result = await new ApiKeyService(store, codec(), () => NOW).verify(TOKEN);

    expect(result).toEqual({ code: "INVALID_API_KEY", status: "error" });
    expect(store.touchLastUsed).not.toHaveBeenCalled();
  });

  it("maps provider failures to stable errors without leaking details", async () => {
    const store = repository({
      listOwned: vi.fn().mockResolvedValue({ data: null, errorCode: "password leaked in provider error" }),
    });
    const result = await new ApiKeyService(store, codec(), () => NOW).list(USER_ID);

    expect(result).toEqual({ code: "STORAGE_UNAVAILABLE", status: "error" });
    expect(JSON.stringify(result)).not.toContain("password leaked");
  });
});
