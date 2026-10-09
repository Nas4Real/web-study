import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSupabaseSubjectRepository } from "./supabase-study-repositories";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const ROW = {
  color: "#ec4899",
  created_at: "2026-10-02T00:00:00.000Z",
  icon: null,
  id: SUBJECT_ID,
  name: "Math",
  position: 4,
  updated_at: "2026-10-02T00:00:00.000Z",
};

function query(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["eq", "or", "order", "select"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.limit = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  return chain;
}

describe("Supabase subject repository", () => {
  it("uses an owner-scoped deterministic keyset query", async () => {
    const builder = query({ data: [ROW], error: null });
    const client = { from: vi.fn(() => builder) };
    const cursor = {
      createdAt: ROW.created_at,
      id: SUBJECT_ID,
      position: ROW.position,
    };

    const result = await createSupabaseSubjectRepository(client as never)
      .listPageOwned(USER_ID, { cursor, limit: 26 });

    expect(client.from).toHaveBeenCalledWith("subjects");
    expect(builder.eq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(builder.or).toHaveBeenCalledWith(
      `position.gt.4,and(position.eq.4,created_at.gt.${ROW.created_at}),and(position.eq.4,created_at.eq.${ROW.created_at},id.gt.${SUBJECT_ID})`,
    );
    expect(builder.order).toHaveBeenNthCalledWith(1, "position", { ascending: true });
    expect(builder.order).toHaveBeenNthCalledWith(2, "created_at", { ascending: true });
    expect(builder.order).toHaveBeenNthCalledWith(3, "id", { ascending: true });
    expect(builder.limit).toHaveBeenCalledWith(26);
    expect(result.data?.[0]).toMatchObject({ id: SUBJECT_ID, name: "Math" });
  });

  it("conceals non-owned subject lookups as missing", async () => {
    const builder = query({ data: null, error: null });
    const client = { from: vi.fn(() => builder) };

    await expect(createSupabaseSubjectRepository(client as never)
      .findOwned(USER_ID, SUBJECT_ID)).resolves.toEqual({
      data: null,
      errorCode: null,
    });
    expect(builder.eq).toHaveBeenNthCalledWith(1, "id", SUBJECT_ID);
    expect(builder.eq).toHaveBeenNthCalledWith(2, "user_id", USER_ID);
  });
});
