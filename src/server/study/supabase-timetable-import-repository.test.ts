import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createSupabaseTimetableImportRepository } from "./supabase-timetable-import-repository";

const actor = "11111111-1111-4111-8111-111111111111";
const row = { import_id: "22222222-2222-4222-8222-222222222222", session_count: 2, subjects_created: 1, already_imported: false, first_date: "2026-10-19" };

describe("atomic import repository", () => {
  it("passes explicit ownership and fingerprint to only the import RPC", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: row, error: null }) };
    const payload = { version: 1, timezone: "Africa/Tunis", subjects: [], sessions: [] } as never;
    const result = await createSupabaseTimetableImportRepository(client as never).importOwned(actor, "a".repeat(64), payload);
    expect(client.rpc).toHaveBeenCalledWith("import_calendar_timetable", { p_user_id: actor, p_fingerprint: "a".repeat(64), p_payload: payload });
    expect(result.data).toEqual({ importId: row.import_id, sessionCount: 2, subjectsCreated: 1, alreadyImported: false, firstDate: "2026-10-19" });
  });
  it.each([null, { ...row, session_count: "2" }, { ...row, first_date: "bad" }, { ...row, import_id: "bad" }])("fails closed on malformed provider output: %j", async data => {
    const client = { rpc: vi.fn().mockResolvedValue({ data, error: null }) };
    expect(await createSupabaseTimetableImportRepository(client as never).importOwned(actor, "a".repeat(64), {} as never)).toEqual({ data: null, errorCode: "provider_error" });
  });
  it("preserves only the provider error code", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "23503", message: "private SQL" } }) };
    expect(await createSupabaseTimetableImportRepository(client as never).importOwned(actor, "a".repeat(64), {} as never)).toEqual({ data: null, errorCode: "23503" });
  });
});
