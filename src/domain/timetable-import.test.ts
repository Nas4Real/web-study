import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MAX_TIMETABLE_BYTES, parseTimetableFile, timetableImportSchema } from "./timetable-import";

const session = { kind: "university", title: "  Calculus   lecture ", subject: "Mathematics", date: "2026-10-19", start_time: "09:00", duration_minutes: 90 };
const document = { version: 1, timezone: "Africa/Tunis", sessions: [session] };

describe("JSON timetable contract", () => {
  it("keeps the downloadable example compatible with the published contract", () => {
    expect(parseTimetableFile(readFileSync("public/examples/timetable.json", "utf8"))).toMatchObject({ success: true });
  });
  it("normalizes named subjects and profile-local dates using canonical rules", () => {
    const result = timetableImportSchema.parse(document);
    expect(result.sessions[0]).toMatchObject({ title: "Calculus lecture", subjectName: "Mathematics", startsAt: "2026-10-19T08:00:00.000Z", timezone: "Africa/Tunis", notesItems: [], recurrenceRule: null });
  });
  it("accepts existing subject IDs and offset timestamps", () => {
    const result = timetableImportSchema.parse({ ...document, sessions: [{ kind: "revision", title: "Practice", subject_id: "11111111-1111-4111-8111-111111111111", starts_at: "2026-10-19T09:00:00+01:00", duration_minutes: 45, focus_text: "Chapter 2", notes_items: [" Bring notes "], recurrence_rule: "FREQ=WEEKLY;COUNT=12" }] });
    expect(result.sessions[0]).toMatchObject({ subjectId: "11111111-1111-4111-8111-111111111111", notesItems: ["Bring notes"], startsAt: "2026-10-19T08:00:00.000Z" });
  });
  it("supports exam sessions with no duration", () => {
    expect(timetableImportSchema.parse({ ...document, sessions: [{ kind: "exam", title: "Midterm", subject: "Maths", date: "2026-10-19", start_time: "09:00" }] }).sessions[0].durationMinutes).toBeNull();
  });
  it.each([
    { ...document, sessions: [] },
    { ...document, sessions: Array.from({ length: 201 }, (_, i) => ({ ...session, title: `Class ${i}` })) },
    { ...document, timezone: "Not/AZone" },
    { ...document, user_id: "actor-injection" },
    { ...document, sessions: [{ ...session, subject_id: "11111111-1111-4111-8111-111111111111" }] },
    { ...document, sessions: [{ ...session, starts_at: "2026-10-19T09:00:00Z" }] },
    { ...document, sessions: [{ ...session, duration_minutes: null }] },
    { ...document, sessions: [{ ...session, focus_text: "Not allowed for a class" }] },
    { ...document, sessions: [{ ...session, recurrence_rule: "invalid" }] },
    { ...document, sessions: [{ ...session, recurrence_rule: "FREQ=SECONDLY;COUNT=1000000" }] },
    { ...document, sessions: [{ ...session, recurrence_rule: "FREQ=DAILY;BYSECOND=0,1,2" }] },
    { ...document, sessions: [{ ...session, date: "2026-02-30" }] },
    { ...document, sessions: [{ ...session, start_time: "25:00" }] },
    { ...document, sessions: [{ ...session, subject: " " }] },
    { ...document, sessions: [session, session] },
    { ...document, subjects: [{ name: "Maths", color: "red" }] },
    { ...document, subjects: [{ name: "Maths" }, { name: "MATHS" }] },
  ])("rejects invalid/unsafe input before any write: %j", input => {
    expect(timetableImportSchema.safeParse(input).success).toBe(false);
  });
  it("rejects nonexistent DST wall-clock times", () => {
    expect(timetableImportSchema.safeParse({ ...document, timezone: "America/New_York", sessions: [{ ...session, date: "2026-03-08", start_time: "02:30" }] }).success).toBe(false);
  });
  it("points local date/time errors at the fields present in the file", () => {
    const result = parseTimetableFile(JSON.stringify({ ...document, sessions: [{ ...session, date: "2026-02-30" }] }));
    expect(result).toMatchObject({ success: false, issues: [expect.objectContaining({ path: ["sessions", 0, "date"], message: expect.stringContaining("local time") })] });
  });
  it("rejects malformed and oversized file text with useful issues", () => {
    expect(parseTimetableFile("{bad")).toMatchObject({ success: false, issues: [expect.objectContaining({ message: expect.stringContaining("JSON") })] });
    expect(parseTimetableFile(" ".repeat(MAX_TIMETABLE_BYTES + 1))).toMatchObject({ success: false });
  });
  it("accepts a UTF-8 BOM and preserves validation row paths", () => {
    expect(parseTimetableFile("\uFEFF" + JSON.stringify(document)).success).toBe(true);
    const result = parseTimetableFile(JSON.stringify({ ...document, sessions: [{ ...session, duration_minutes: -1 }] }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues[0].path).toContain("sessions");
  });
});
