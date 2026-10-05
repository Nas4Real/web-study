import { describe, expect, it, vi } from "vitest";
import { createSessionMutationHandler, type CalendarActionContext } from "./calendar-action-handlers";
import type { CalendarSeries } from "./calendar-domain";
import { CalendarService, type CalendarRepository } from "./calendar-service";
import { expandCalendarOccurrences } from "./calendar-recurrence";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const SUBJECT = "22222222-2222-4222-8222-222222222222";
const NOW = "2026-10-04T12:00:00.000Z";

function setup() {
  const saved: CalendarSeries[] = [];
  const repository: CalendarRepository = {
    saveExceptionOwned: vi.fn().mockResolvedValue({ data: null, errorCode: null }),
    createOwned: vi.fn(async (_actor, input) => {
      const series = { ...input, id: "33333333-3333-4333-8333-333333333333", createdAt: NOW, updatedAt: NOW };
      saved.push(series);
      return { data: series, errorCode: null };
    }),
    deleteOwned: vi.fn(), findOwned: vi.fn(), listExceptionsOwned: vi.fn(),
    listOwned: vi.fn(), updateOwned: vi.fn(),
  };
  const context: CalendarActionContext = { actorId: ACTOR,
    calendarService: new CalendarService(repository), timeZone: "Africa/Tunis" };
  const form = new FormData();
  for (const [key, value] of Object.entries({ kind: "university", title: " Physics   lecture ", subjectId: SUBJECT,
    date: "2026-10-05", startTime: "09:30", durationMinutes: "45" })) form.set(key, value);
  return { context, form, repository, saved };
}

describe("session creation form adapter", () => {
  it.each(["university", "exam", "revision"])("creates weekly %s with structured recurrence and trusted context", async kind => {
    const { context, form, saved } = setup();
    form.set("kind", kind);
    form.set("repeatFrequency", "weekly"); form.set("repeatInterval", "2");
    form.append("repeatWeekday", "WE"); form.append("repeatWeekday", "MO");
    form.set("repeatEnd", "count"); form.set("repeatCount", "6");
    form.set("timezone", "untrusted-zone"); form.set("recurrenceRule", "FREQ=SECONDLY");
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ status: "success" });
    expect(saved[0]).toMatchObject({ timezone: "Africa/Tunis", recurrenceRule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=6" });
  });

  it.each(["daily", "monthly"])("creates %s recurrence without trusting inactive weekday/count values", async frequency => {
    const { context, form, saved } = setup();
    form.set("repeatFrequency", frequency); form.set("repeatInterval", "1"); form.set("repeatEnd", "never");
    form.set("repeatCount", "invalid stale value"); form.append("repeatWeekday", "not-a-day");
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ status: "success" });
    expect(saved[0].recurrenceRule).toBe(`FREQ=${frequency.toUpperCase()};INTERVAL=1`);
  });

  it("serializes an inclusive profile-local end date across DST", async () => {
    const { context, form, saved } = setup();
    form.set("date", "2026-10-24"); form.set("repeatFrequency", "daily");
    form.set("repeatInterval", "1"); form.set("repeatEnd", "date"); form.set("repeatUntil", "2026-10-26");
    expect(await createSessionMutationHandler(async () => ({ ...context, timeZone: "Europe/Paris" }), form)).toMatchObject({ status: "success" });
    expect(saved[0].recurrenceRule).toBe("FREQ=DAILY;INTERVAL=1;UNTIL=20261026T225900Z");
    expect(expandCalendarOccurrences(saved[0], [], {
      from: new Date("2026-10-24T00:00:00Z"), to: new Date("2026-10-28T00:00:00Z"),
    }, new Date(NOW)).map(event => event.startsAt)).toEqual([
      "2026-10-24T07:30:00.000Z", "2026-10-25T08:30:00.000Z", "2026-10-26T08:30:00.000Z",
    ]);
  });

  it("counts actual monthly occurrences and skips months without the starting date", async () => {
    const { context, form, saved } = setup();
    form.set("date", "2026-01-31"); form.set("repeatFrequency", "monthly");
    form.set("repeatInterval", "1"); form.set("repeatEnd", "count"); form.set("repeatCount", "3");
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ status: "success" });
    expect(expandCalendarOccurrences(saved[0], [], {
      from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-07-01T00:00:00Z"),
    }, new Date(NOW)).map(event => event.startsAt)).toEqual([
      "2026-01-31T08:30:00.000Z", "2026-03-31T08:30:00.000Z", "2026-05-31T08:30:00.000Z",
    ]);
  });

  it("preserves the earliest fold instant and stable identity from creation through recurrence readback", async () => {
    const { context, form, saved } = setup();
    form.set("date", "2026-11-01"); form.set("startTime", "01:30");
    form.set("repeatFrequency", "weekly"); form.set("repeatInterval", "1"); form.set("repeatWeekday", "SU");
    form.set("repeatEnd", "count"); form.set("repeatCount", "2");
    expect(await createSessionMutationHandler(async () => ({ ...context, timeZone: "America/New_York" }), form)).toMatchObject({ status: "success" });
    expect(saved[0].startsAt).toBe("2026-11-01T05:30:00.000Z");
    const occurrences = expandCalendarOccurrences(saved[0], [], {
      from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-11-10T00:00:00Z"),
    }, new Date(NOW));
    expect(occurrences.map(event => event.startsAt)).toEqual(["2026-11-01T05:30:00.000Z", "2026-11-08T06:30:00.000Z"]);
    expect(occurrences[0].originalStart).toBe(saved[0].startsAt);
  });

  it("keeps explicit one-time sessions non-recurring despite stale settings", async () => {
    const { context, form, saved } = setup();
    form.set("repeatFrequency", "none"); form.set("repeatInterval", "junk"); form.set("repeatEnd", "date");
    form.set("repeatUntil", "not-a-date");
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ status: "success" });
    expect(saved[0].recurrenceRule).toBeNull();
  });

  it.each([
    ["repeatFrequency", "yearly"], ["repeatInterval", "0"], ["repeatInterval", "100"],
    ["repeatInterval", "1.5"], ["repeatInterval", "1e1"], ["repeatInterval", ""],
    ["repeatEnd", "other"], ["repeatCount", "0"], ["repeatCount", "501"], ["repeatCount", "3junk"],
    ["repeatCount", ""], ["repeatWeekday", "XX"],
  ])("rejects malformed structured recurrence %s before writing", async (key, value) => {
    const { context, form, saved } = setup();
    form.set("repeatFrequency", "weekly"); form.set("repeatInterval", "1"); form.set("repeatEnd", "count");
    form.set("repeatCount", "3"); form.set("repeatWeekday", "MO"); form.set(key, value);
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it.each(["2026-10-04", "2026-02-30", "not-a-date"])("rejects an invalid or earlier end date %s", async until => {
    const { context, form, saved } = setup();
    form.set("repeatFrequency", "daily"); form.set("repeatInterval", "1");
    form.set("repeatEnd", "date"); form.set("repeatUntil", until);
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it.each(["repeatFrequency", "repeatInterval", "repeatEnd", "repeatCount", "repeatUntil"])("rejects duplicate recurrence scalar %s", async key => {
    const { context, form, saved } = setup();
    form.set(key, "1"); form.append(key, "2");
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it.each(["repeatFrequency", "repeatInterval", "repeatWeekday", "repeatEnd", "repeatCount", "repeatUntil"])("rejects File recurrence input %s", async key => {
    const { context, form, saved } = setup();
    form.set(key, new Blob(["value"]), "upload.txt");
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it.each([[], ["MO", "MO"], ["MO", "TU", "WE", "TH", "FR", "SA", "SU", "MO"]].map(days => ({ days })))("rejects empty, duplicate or excessive weekly weekdays $days", async ({ days }) => {
    const { context, form, saved } = setup();
    form.set("repeatFrequency", "weekly"); form.set("repeatInterval", "1"); form.set("repeatEnd", "never");
    for (const day of days) form.append("repeatWeekday", day);
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it.each(["university", "exam", "revision"])("creates %s through the shared service with only approved fields", async kind => {
    const { context, form, saved, repository } = setup();
    form.set("kind", kind);
    if (kind === "exam") { form.delete("durationMinutes"); form.set("location", " Hall A "); }
    if (kind === "university") { form.set("location", " Room 304 "); form.set("professor", " Dr. Smith "); }
    if (kind === "revision") form.set("focusText", " Chapter 4 ");
    // Hidden client values cannot change the verified actor, profile timezone or add recurrence/content.
    form.set("userId", "untrusted-actor"); form.set("timezone", "America/New_York");
    form.set("recurrenceRule", "FREQ=DAILY"); form.append("notesItems", "Unapproved authoring");
    expect(await createSessionMutationHandler(async () => context, form)).toEqual({ code: "SESSION_CREATED", status: "success" });
    expect(saved[0]).toMatchObject({ kind, title: "Physics lecture", startsAt: "2026-10-05T08:30:00.000Z",
      timezone: "Africa/Tunis", recurrenceRule: null, notesItems: [],
      durationMinutes: kind === "exam" ? null : 45, location: kind === "exam" ? "Hall A" : kind === "university" ? "Room 304" : null,
      professor: kind === "university" ? "Dr. Smith" : null, focusText: kind === "revision" ? "Chapter 4" : null });
    expect(repository.createOwned).toHaveBeenCalledWith(ACTOR, expect.anything());
  });

  it("creates ordered Notes & Reminders after normalizing each item", async () => {
    const { context, form, saved } = setup();
    form.append("notesItem", "  Bring   the lab report  ");
    form.append("notesItem", "Ask about chapter 4");

    expect(await createSessionMutationHandler(async () => context, form)).toEqual({ code: "SESSION_CREATED", status: "success" });
    expect(saved[0].notesItems).toEqual(["Bring the lab report", "Ask about chapter 4"]);
  });

  it("rejects non-text Notes & Reminders before writing", async () => {
    const { context, form, saved } = setup();
    form.append("notesItem", new Blob(["untrusted"]), "note.txt");

    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it.each(["45", "60", "90", "120"])("accepts approved duration %s", async duration => {
    const { context, form, saved } = setup();
    form.set("durationMinutes", duration);
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ status: "success" });
    expect(saved[0].durationMinutes).toBe(Number(duration));
  });

  it.each([
    ["kind", "other"], ["title", "   "], ["title", "x".repeat(241)],
    ["subjectId", "not-a-uuid"], ["date", "2026-02-29"], ["startTime", "24:00"],
    ["durationMinutes", ""], ["durationMinutes", "0"], ["durationMinutes", "45.5"],
    ["durationMinutes", "90junk"], ["durationMinutes", "1441"], ["professor", "x".repeat(501)],
  ])("rejects invalid %s before writing", async (key, value) => {
    const { context, form, saved } = setup();
    form.set(key, value);
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it.each(["kind", "title", "subjectId", "date", "startTime", "durationMinutes", "professor"])("rejects File-valued %s", async key => {
    const { context, form, saved } = setup();
    form.set(key, new Blob(["value"]), "upload.txt");
    expect(await createSessionMutationHandler(async () => context, form)).toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it("fails closed for absent authentication", async () => {
    const { form } = setup();
    expect(await createSessionMutationHandler(async () => null, form)).toMatchObject({ code: "UNAUTHENTICATED", status: "error" });
  });

  it("rejects duplicate form fields rather than trusting an arbitrary value", async () => {
    const { context, form, saved } = setup();
    form.append("subjectId", "44444444-4444-4444-8444-444444444444");
    expect(await createSessionMutationHandler(async () => context, form))
      .toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it.each([
    ["exam", "professor"], ["exam", "focusText"],
    ["university", "focusText"], ["revision", "location"], ["revision", "professor"],
  ])("rejects fields incompatible with %s: %s", async (kind, field) => {
    const { context, form, saved } = setup();
    form.set("kind", kind); form.set(field, "Not applicable");
    expect(await createSessionMutationHandler(async () => context, form))
      .toMatchObject({ code: "INVALID_INPUT", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it("maps thrown mutation failures to a stable public error", async () => {
    const { context, form } = setup();
    const calendarService = { create: async () => { throw new Error("private credential"); } };
    const result = await createSessionMutationHandler(async () => ({ ...context, calendarService }), form);
    expect(result).toMatchObject({ code: "STORAGE_UNAVAILABLE", status: "error" });
    expect(JSON.stringify(result)).not.toContain("private credential");
  });

  it("normalizes a malformed verified actor without writing", async () => {
    const { context, form, saved } = setup();
    expect(await createSessionMutationHandler(async () => ({ ...context, actorId: "invalid" }), form))
      .toMatchObject({ code: "UNAUTHENTICATED", status: "error" });
    expect(saved).toHaveLength(0);
  });

  it.each(["23503", "private database error"])("sanitizes reference/provider errors", async errorCode => {
    const { context, form, repository } = setup();
    vi.mocked(repository.createOwned).mockResolvedValue({ data: null, errorCode });
    const result = await createSessionMutationHandler(async () => context, form);
    expect(result).toMatchObject({ code: errorCode === "23503" ? "NOT_FOUND" : "STORAGE_UNAVAILABLE", status: "error" });
    expect(JSON.stringify(result)).not.toContain(errorCode);
  });

  it("sanitizes context resolution failures", async () => {
    const { form } = setup();
    const result = await createSessionMutationHandler(async () => { throw new Error("secret token"); }, form);
    expect(result).toMatchObject({ code: "STORAGE_UNAVAILABLE", status: "error" });
    expect(JSON.stringify(result)).not.toContain("secret token");
  });
});
