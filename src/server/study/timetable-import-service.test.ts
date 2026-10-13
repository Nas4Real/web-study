import { describe, expect, it, vi } from "vitest";
import { TimetableImportService } from "./timetable-import-service";

const actor = "11111111-1111-4111-8111-111111111111";
const wire = { version: 1, timezone: "Africa/Tunis", sessions: [{ kind: "university", subject: "Mathematics", title: "Calculus", date: "2026-10-19", start_time: "09:00", duration_minutes: 90 }] };
const summary = { importId: "22222222-2222-4222-8222-222222222222", sessionCount: 1, subjectsCreated: 1, alreadyImported: false, firstDate: "2026-10-19" };

describe("timetable import application service", () => {
  it("uses one atomic owned write after normalizing all sessions and subjects", async () => {
    const repository = { importOwned: vi.fn().mockResolvedValue({ data: summary, errorCode: null }) };
    expect(await new TimetableImportService(repository).import(actor, JSON.stringify(wire))).toEqual({ status: "success", data: summary });
    expect(repository.importOwned).toHaveBeenCalledOnce();
    expect(repository.importOwned).toHaveBeenCalledWith(actor, expect.stringMatching(/^[a-f0-9]{64}$/), expect.objectContaining({ subjects: [{ name: "Mathematics", color: "#06b6d4" }], sessions: [expect.objectContaining({ subjectName: "Mathematics", startsAt: "2026-10-19T08:00:00.000Z" })] }));
  });
  it("generates identical fingerprints for formatting and equivalent time representations", async () => {
    const repository = { importOwned: vi.fn().mockResolvedValue({ data: summary, errorCode: null }) };
    const service = new TimetableImportService(repository);
    await service.import(actor, JSON.stringify(wire, null, 2));
    await service.import(actor, JSON.stringify({ ...wire, sessions: [{ kind: "university", subject: "Mathematics", title: "Calculus", starts_at: "2026-10-19T09:00:00+01:00", duration_minutes: 90 }] }));
    expect(repository.importOwned.mock.calls[0][1]).toBe(repository.importOwned.mock.calls[1][1]);
  });
  it("rejects any invalid row before writing even valid rows", async () => {
    const repository = { importOwned: vi.fn() };
    const result = await new TimetableImportService(repository).import(actor, JSON.stringify({ ...wire, sessions: [wire.sessions[0], { ...wire.sessions[0], title: "Bad", duration_minutes: -2 }] }));
    expect(result).toMatchObject({ status: "error", code: "INVALID_INPUT" });
    expect(repository.importOwned).not.toHaveBeenCalled();
  });
  it("rejects untrusted actors before even validating payloads", async () => {
    const repository = { importOwned: vi.fn() };
    expect(await new TimetableImportService(repository).import("bad", JSON.stringify(wire))).toEqual({ status: "error", code: "INVALID_ACTOR" });
    expect(repository.importOwned).not.toHaveBeenCalled();
  });
  it("passes idempotent replay results without hiding their meaning", async () => {
    const repository = { importOwned: vi.fn().mockResolvedValue({ data: { ...summary, alreadyImported: true, subjectsCreated: 0 }, errorCode: null }) };
    expect(await new TimetableImportService(repository).import(actor, JSON.stringify(wire))).toMatchObject({ status: "success", data: { alreadyImported: true, subjectsCreated: 0 } });
  });
  it.each(["23503", "23514", "provider_error"])("sanitizes database failure %s", async code => {
    const repository = { importOwned: vi.fn().mockResolvedValue({ data: null, errorCode: code }) };
    expect(await new TimetableImportService(repository).import(actor, JSON.stringify(wire))).toMatchObject({ status: "error", code: code === "23503" ? "NOT_FOUND" : code === "23514" ? "INVALID_INPUT" : "STORAGE_UNAVAILABLE" });
  });
  it("sanitizes thrown provider failures", async () => {
    const repository = { importOwned: vi.fn().mockRejectedValue(new Error("secret details")) };
    expect(await new TimetableImportService(repository).import(actor, JSON.stringify(wire))).toEqual({ status: "error", code: "STORAGE_UNAVAILABLE" });
  });
});
