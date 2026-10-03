import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSupabaseCalendarRepository } from "./supabase-calendar-repository";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SERIES_ID = "33333333-3333-4333-8333-333333333333";

function clientWith(data: unknown) {
  const builder = {
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
    select: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  return {
    builder,
    client: { from: vi.fn().mockReturnValue(builder) },
  };
}

describe("Supabase calendar exception repository", () => {
  it("maps owned exception rows through the domain boundary", async () => {
    const { builder, client } = clientWith([
      {
        action: "modified",
        created_at: "2026-10-02T12:00:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        original_start: "2026-10-12T08:00:00.000Z",
        override_payload: { location: "Room 401" },
        series_id: SERIES_ID,
        updated_at: "2026-10-02T12:00:00.000Z",
      },
    ]);

    const result = await createSupabaseCalendarRepository(
      client as never,
    ).listExceptionsOwned(USER_ID, [SERIES_ID]);

    expect(result).toMatchObject({
      data: [{ originalStart: "2026-10-12T08:00:00.000Z", seriesId: SERIES_ID }],
      errorCode: null,
    });
    expect(builder.eq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(builder.in).toHaveBeenCalledWith("series_id", [SERIES_ID]);
  });

  it("fails closed when the provider returns malformed exception data", async () => {
    const { client } = clientWith([
      {
        action: "modified",
        created_at: "2026-10-02T12:00:00.000Z",
        id: "44444444-4444-4444-8444-444444444444",
        original_start: "2026-10-12T08:00:00.000Z",
        override_payload: { arbitrary: "value" },
        series_id: SERIES_ID,
        updated_at: "2026-10-02T12:00:00.000Z",
      },
    ]);

    await expect(
      createSupabaseCalendarRepository(client as never).listExceptionsOwned(USER_ID, [
        SERIES_ID,
      ]),
    ).resolves.toEqual({ data: null, errorCode: "provider_error" });
  });
});
