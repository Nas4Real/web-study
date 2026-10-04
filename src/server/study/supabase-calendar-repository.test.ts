import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSupabaseCalendarRepository } from "./supabase-calendar-repository";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SERIES_ID = "33333333-3333-4333-8333-333333333333";
const SCHEDULE = { startsAt: "2026-10-05T08:00:00Z", timezone: "Africa/Tunis", recurrenceRule: "FREQ=WEEKLY;COUNT=3" };

function rpcWith(reply: { data: unknown; error: unknown }) {
  const builder = { select: vi.fn(), maybeSingle: vi.fn().mockResolvedValue(reply) };
  builder.select.mockReturnValue(builder);
  return { builder, client: { rpc: vi.fn().mockReturnValue(builder) } };
}

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
  it("translates allowlisted SQL JSON keys in both directions without dropping unknown keys", async () => {
    const sqlPayload = { starts_at: "2026-10-13T08:00:00Z", duration_minutes: 60, focus_text: null, notes_items: ["Bring lab sheet"] };
    const row = { id: "44444444-4444-4444-8444-444444444444", series_id: SERIES_ID, original_start: "2026-10-12T08:00:00Z", action: "modified", override_payload: sqlPayload, created_at: "2026-10-04T12:00:00Z", updated_at: "2026-10-04T12:00:00Z" };
    const { client } = rpcWith({ data: row, error: null });
    const payload = { startsAt: sqlPayload.starts_at, durationMinutes: 60, focusText: null, notesItems: ["Bring lab sheet"] };
    const result = await createSupabaseCalendarRepository(client as never).saveExceptionOwned(USER_ID, { action: "modified", seriesId: SERIES_ID, originalStart: row.original_start, overridePayload: payload }, SCHEDULE);
    expect(result).toMatchObject({ data: { overridePayload: payload }, errorCode: null });
    expect(client.rpc.mock.calls[0][1].p_override_payload).toEqual(sqlPayload);
  });

  it("passes trusted ownership and the validated schedule to the invoker RPC", async () => {
    const row = { id: "44444444-4444-4444-8444-444444444444", series_id: SERIES_ID, original_start: "2026-10-12T08:00:00Z", action: "cancelled", override_payload: {}, created_at: "2026-10-04T12:00:00Z", updated_at: "2026-10-04T12:00:00Z" };
    const { client } = rpcWith({ data: row, error: null });
    const result = await createSupabaseCalendarRepository(client as never).saveExceptionOwned(USER_ID, { seriesId: SERIES_ID, originalStart: row.original_start, action: "cancelled", overridePayload: {} }, SCHEDULE);
    expect(result).toMatchObject({ data: { action: "cancelled", seriesId: SERIES_ID }, errorCode: null });
    expect(client.rpc).toHaveBeenCalledWith("save_calendar_exception", { p_user_id: USER_ID, p_series_id: SERIES_ID, p_original_start: row.original_start, p_action: "cancelled", p_override_payload: {}, p_expected_starts_at: SCHEDULE.startsAt, p_expected_timezone: SCHEDULE.timezone, p_expected_recurrence_rule: SCHEDULE.recurrenceRule });
  });

  it("returns no row when the RPC rejects a stale edit of a cancelled occurrence", async () => {
    const { client } = rpcWith({ data: null, error: null });
    expect(await createSupabaseCalendarRepository(client as never).saveExceptionOwned(USER_ID, { seriesId: SERIES_ID, originalStart: "2026-10-12T08:00:00Z", action: "modified", overridePayload: { location: "Room B" } }, SCHEDULE)).toEqual({ data: null, errorCode: null });
  });

  it("does not retry non-conflict failures or expose malformed saved rows", async () => {
    for (const reply of [{ data: null, error: { code: "42501" } }, { data: { action: "wrong" }, error: null }]) {
      const { client } = rpcWith(reply);
      const result = await createSupabaseCalendarRepository(client as never).saveExceptionOwned(USER_ID, { action: "cancelled", seriesId: SERIES_ID, originalStart: "2026-10-12T08:00:00Z", overridePayload: {} }, SCHEDULE);
      expect(result).toEqual({ data: null, errorCode: reply.error?.code ?? "provider_error" });
      expect(client.rpc).toHaveBeenCalledTimes(1);
    }
  });

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
