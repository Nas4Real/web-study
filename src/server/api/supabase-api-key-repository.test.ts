import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSupabaseApiKeyRepository } from "./supabase-api-key-repository";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const KEY_ID = "33333333-3333-4333-8333-333333333333";
const ROW = {
  created_at: "2026-10-08T17:30:00.000Z",
  expires_at: null,
  id: KEY_ID,
  key_prefix: "abcdefghijkl",
  last_used_at: null,
  name: "CLI",
  revoked_at: null,
  secret_digest: "a".repeat(64),
  user_id: USER_ID,
};

function singleClient(reply: { data: unknown; error: unknown }) {
  const builder = {
    eq: vi.fn(),
    insert: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(reply),
    select: vi.fn(),
    update: vi.fn(),
  };
  for (const method of [builder.eq, builder.insert, builder.is, builder.select, builder.update]) {
    method.mockReturnValue(builder);
  }
  return { builder, client: { from: vi.fn().mockReturnValue(builder) } };
}

describe("Supabase API key repository", () => {
  it("creates a server-managed key row without accepting a raw token", async () => {
    const { builder, client } = singleClient({ data: ROW, error: null });
    const repository = createSupabaseApiKeyRepository(client as never);

    const result = await repository.createOwned(USER_ID, {
      digest: ROW.secret_digest,
      expiresAt: null,
      name: ROW.name,
      prefix: ROW.key_prefix,
    });

    expect(result).toMatchObject({ data: { id: KEY_ID, userId: USER_ID }, errorCode: null });
    expect(builder.insert).toHaveBeenCalledWith({
      expires_at: null,
      key_prefix: ROW.key_prefix,
      name: ROW.name,
      secret_digest: ROW.secret_digest,
      user_id: USER_ID,
    });
    expect(JSON.stringify(builder.insert.mock.calls)).not.toContain("wsk_");
  });

  it("looks up only a non-revoked prefix and scopes management mutations to the owner", async () => {
    const { builder, client } = singleClient({ data: ROW, error: null });
    const repository = createSupabaseApiKeyRepository(client as never);

    await repository.findActiveByPrefix(ROW.key_prefix);
    expect(builder.eq).toHaveBeenCalledWith("key_prefix", ROW.key_prefix);
    expect(builder.is).toHaveBeenCalledWith("revoked_at", null);

    vi.clearAllMocks();
    builder.eq.mockReturnValue(builder);
    builder.is.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    builder.update.mockReturnValue(builder);
    await repository.revokeOwned(USER_ID, KEY_ID, "2026-10-08T18:00:00.000Z");
    expect(builder.eq.mock.calls).toEqual([["id", KEY_ID], ["user_id", USER_ID]]);
    expect(builder.is).toHaveBeenCalledWith("revoked_at", null);
  });

  it("fails closed on malformed provider rows", async () => {
    const { client } = singleClient({ data: { ...ROW, user_id: "not-a-uuid" }, error: null });
    await expect(
      createSupabaseApiKeyRepository(client as never).findActiveByPrefix(ROW.key_prefix),
    ).resolves.toEqual({ data: null, errorCode: "provider_error" });
  });
});
