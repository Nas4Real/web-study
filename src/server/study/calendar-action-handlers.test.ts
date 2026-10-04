import { describe, expect, it, vi } from "vitest";
import { createSessionMutationHandler, type CalendarActionContext } from "./calendar-action-handlers";
import type { CalendarSeries } from "./calendar-domain";
import { CalendarService, type CalendarRepository } from "./calendar-service";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const SUBJECT = "22222222-2222-4222-8222-222222222222";
const NOW = "2026-10-04T12:00:00.000Z";

function setup() {
  const saved: CalendarSeries[] = [];
  const repository: CalendarRepository = {
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
  it.each(["university", "exam", "revision"])("creates %s through the shared service with only approved fields", async kind => {
    const { context, form, saved, repository } = setup();
    form.set("kind", kind);
    if (kind === "exam") { form.delete("durationMinutes"); form.set("location", " Hall A "); }
    if (kind === "university") form.set("professor", " Dr. Smith ");
    if (kind === "revision") form.set("focusText", " Chapter 4 ");
    // Hidden client values cannot change the verified actor, profile timezone or add recurrence/content.
    form.set("userId", "untrusted-actor"); form.set("timezone", "America/New_York");
    form.set("recurrenceRule", "FREQ=DAILY"); form.append("notesItems", "Unapproved authoring");
    expect(await createSessionMutationHandler(async () => context, form)).toEqual({ code: "SESSION_CREATED", status: "success" });
    expect(saved[0]).toMatchObject({ kind, title: "Physics lecture", startsAt: "2026-10-05T08:30:00.000Z",
      timezone: "Africa/Tunis", recurrenceRule: null, notesItems: [],
      durationMinutes: kind === "exam" ? null : 45, location: kind === "exam" ? "Hall A" : null,
      professor: kind === "university" ? "Dr. Smith" : null, focusText: kind === "revision" ? "Chapter 4" : null });
    expect(repository.createOwned).toHaveBeenCalledWith(ACTOR, expect.anything());
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
