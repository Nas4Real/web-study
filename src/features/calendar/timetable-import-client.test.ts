import { describe, expect, it, vi } from "vitest";
import { MAX_TIMETABLE_BYTES } from "@/domain/timetable-import";
import { readTimetableFile, submitTimetable } from "./timetable-import-client";

const text = JSON.stringify({ version: 1, timezone: "Africa/Tunis", sessions: [{ kind: "university", title: "Maths", subject: "Maths", date: "2026-10-19", start_time: "09:00", duration_minutes: 60 }] });
describe("Calendar import client", () => {
  it("reads and previews a valid file without making any request", async () => {
    const file = { name: "timetable.json", size: text.length, text: vi.fn().mockResolvedValue(text) };
    expect(await readTimetableFile(file)).toMatchObject({ success: true, data: { text, fileName: file.name, document: { sessions: [expect.objectContaining({ title: "Maths" })] } } });
  });
  it("rejects oversized or non-JSON files before reading", async () => {
    const read = vi.fn();
    for (const file of [{ name: "timetable.txt", size: 10 }, { name: "timetable.json", size: MAX_TIMETABLE_BYTES + 1 }]) {
      expect(await readTimetableFile({ ...file, text: read })).toMatchObject({ success: false });
    }
    expect(read).not.toHaveBeenCalled();
  });
  it("keeps malformed JSON as an actionable preview error", async () => {
    expect(await readTimetableFile({ name: "bad.json", size: 4, text: async () => "{bad" })).toMatchObject({ success: false, issues: [expect.objectContaining({ message: expect.stringContaining("JSON") })] });
  });
  it("handles unreadable files without exposing system details", async () => {
    expect(await readTimetableFile({ name: "bad.json", size: 10, text: async () => { throw new Error("private filename path"); } })).toMatchObject({ success: false, issues: [{ path: [], message: "Unable to read this file. Choose it again." }] });
  });
  it("posts through the cookie-authenticated API and validates the result", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ import_id: "11111111-1111-4111-8111-111111111111", session_count: 1, subjects_created: 0, already_imported: false, first_date: "2026-10-19" }, { status: 201 }));
    expect(await submitTimetable(text, fetcher)).toMatchObject({ sessionCount: 1, firstDate: "2026-10-19" });
    expect(fetcher).toHaveBeenCalledWith("/api/v1/calendar/imports", expect.objectContaining({ method: "POST", body: text, credentials: "same-origin", headers: { "content-type": "application/json" } }));
  });
  it("handles an expired session without losing the retry file", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 }));
    await expect(submitTimetable(text, fetcher)).rejects.toThrow("Sign in");
  });
  it("surfaces bounded validation issues rather than provider internals", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ error: { code: "VALIDATION_FAILED", details: [{ path: ["sessions", 0, "subject_id"], message: "Subject is unavailable." }] } }, { status: 422 }));
    await expect(submitTimetable(text, fetcher)).rejects.toThrow("sessions.0.subject_id: Subject is unavailable.");
  });
  it("makes uncertain/network outcomes explicitly safe to retry", async () => {
    for (const reply of [vi.fn().mockRejectedValue(new Error("private network")), vi.fn().mockResolvedValue(Response.json({ unexpected: true }, { status: 201 }))]) {
      await expect(submitTimetable(text, reply)).rejects.toThrow("Retry the same file safely");
    }
  });
});
