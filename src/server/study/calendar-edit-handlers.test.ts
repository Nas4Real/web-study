import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { editSessionMutationHandler } from "./calendar-edit-handlers";
import { CalendarService } from "./calendar-service";
import { createE2eCalendarRepository } from "./e2e-calendar-repository";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const OTHER = "99999999-9999-4999-8999-999999999999";
const SUBJECT = "10000000-0000-4000-8000-000000000003";
const ORIGINAL = "2026-10-12T08:00:00.000Z";

async function setup(recurrenceRule: string | null = "FREQ=WEEKLY;COUNT=3", timezone = "Africa/Tunis") {
  const scope = randomUUID(), repository = createE2eCalendarRepository(scope);
  const service = new CalendarService(repository);
  const created = await service.create(ACTOR, { kind: "university", title: "Lecture", subjectId: SUBJECT,
    startsAt: "2026-10-05T08:00:00Z", timezone, recurrenceRule, durationMinutes: 45,
    focusText: null, location: "Room A", professor: "Professor A", notesItems: ["Bring notes"] });
  if (created.status !== "success") throw new Error("Test creation failed");
  const resolve = async () => ({ actorId: ACTOR, calendarService: service, timeZone: "Asia/Tokyo" });
  const read = async () => {
    const reader = new CalendarService(createE2eCalendarRepository(scope));
    const result = await reader.listOccurrences(ACTOR, "2026-10-01T00:00:00Z", "2026-12-01T00:00:00Z");
    if (result.status !== "success") throw new Error("Test read failed");
    return result.data.filter(item => item.seriesId === created.data.id);
  };
  return { repository, service, resolve, read, id: created.data.id };
}

describe("authenticated scoped session edits", () => {
  it.each([
    null, {}, { scope: "all", seriesId: ACTOR, changes: { title: "Changed" } },
    { scope: "series", seriesId: ACTOR, originalStart: ORIGINAL, changes: { title: "Changed" } },
    { scope: "series", seriesId: ACTOR, actorId: OTHER, changes: { title: "Changed" } },
    { scope: "series", seriesId: ACTOR, expectedSchedule: {}, changes: { title: "Changed" } },
    { scope: "occurrence", seriesId: ACTOR, originalStart: ORIGINAL, changes: { subjectId: SUBJECT } },
    { scope: "occurrence", seriesId: ACTOR, originalStart: ORIGINAL, changes: { recurrence: { frequency: "none" } } },
  ])("rejects ambiguous or forged targets: %j", async input => {
    const service = { find: vi.fn(), update: vi.fn(), saveException: vi.fn() };
    expect(await editSessionMutationHandler(async () => ({ actorId: ACTOR, calendarService: service }), input)).toMatchObject({ code: "INVALID_INPUT" });
    expect(service.find).not.toHaveBeenCalled(); expect(service.update).not.toHaveBeenCalled(); expect(service.saveException).not.toHaveBeenCalled();
  });

  it("checks recurrence end date against the master-local date rather than the UTC date", async () => {
    const f = await setup(null, "Asia/Tokyo");
    await f.service.update(ACTOR, f.id, { startsAt: "2026-10-05T23:00:00Z" });
    expect(await editSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id,
      changes: { recurrence: { frequency: "daily", interval: 1, end: "date", until: "2026-10-05" } } })).toMatchObject({ code: "INVALID_INPUT" });
    expect(await f.service.find(ACTOR, f.id)).toMatchObject({ data: { recurrenceRule: null } });
  });

  it("rejects foreign subject references on series edits and leaves content unchanged", async () => {
    const f = await setup();
    expect(await editSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id,
      changes: { subjectId: OTHER } })).toMatchObject({ code: "NOT_FOUND" });
    expect(await f.service.find(ACTOR, f.id)).toMatchObject({ data: { subjectId: SUBJECT, title: "Lecture" } });
  });
  it("guards a series write if the schedule changes after the service precheck", async () => {
    const f = await setup();
    const update = f.repository.updateOwned.bind(f.repository);
    vi.spyOn(f.repository, "updateOwned").mockImplementationOnce(async (actor, id, input, expected) => {
      expect((await f.service.update(actor, id, { timezone: "Asia/Tokyo" })).status).toBe("success");
      return update(actor, id, input, expected);
    });
    expect(await editSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id,
      changes: { date: "2026-10-13", startTime: "10:00" } })).toMatchObject({ status: "error", code: "INVALID_INPUT" });
    expect(await f.service.find(ACTOR, f.id)).toMatchObject({ data: { startsAt: "2026-10-05T08:00:00Z", timezone: "Asia/Tokyo" } });
  });

  it("authenticates before parsing malformed input and sanitizes resolver failures", async () => {
    expect(await editSessionMutationHandler(async () => null, null)).toMatchObject({ code: "UNAUTHENTICATED" });
    const result = await editSessionMutationHandler(async () => { throw new Error("private resolver detail"); }, null);
    expect(result).toMatchObject({ code: "STORAGE_UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("private resolver");
  });

  it("rejects one-time occurrence edits, kind-invalid content and cancelled occurrences", async () => {
    const single = await setup(null);
    expect(await editSessionMutationHandler(single.resolve, { scope: "occurrence", seriesId: single.id, originalStart: "2026-10-05T08:00:00Z", changes: { title: "Wrong path" } })).toMatchObject({ code: "INVALID_INPUT" });
    const f = await setup();
    expect(await editSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id, changes: { focusText: "Not a revision" } })).toMatchObject({ code: "INVALID_INPUT" });
    await f.service.saveException(ACTOR, { action: "cancelled", seriesId: f.id, originalStart: ORIGINAL });
    expect(await editSessionMutationHandler(f.resolve, { scope: "occurrence", seriesId: f.id, originalStart: ORIGINAL, changes: { title: "Restore" } })).toMatchObject({ code: "NOT_FOUND" });
    expect(await f.read()).toHaveLength(2);
  });

  it.each(["find", "update", "saveException"])("normalizes thrown %s errors", async method => {
    const f = await setup();
    vi.spyOn(f.service, method as "find" | "update" | "saveException").mockRejectedValueOnce(new Error("private provider detail"));
    const scope = method === "saveException" ? "occurrence" : "series";
    const result = await editSessionMutationHandler(f.resolve, { scope, seriesId: f.id, changes: { title: "Changed" }, ...(scope === "occurrence" ? { originalStart: ORIGINAL } : {}) });
    expect(result).toMatchObject({ code: "STORAGE_UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("private provider");
  });

  it.each(["series", "occurrence"])("rejects a %s edit if the timezone used for conversion becomes stale", async scope => {
    const f = await setup();
    const find = f.service.find.bind(f.service);
    vi.spyOn(f.service, "find").mockImplementationOnce(async (actor, id) => {
      const original = await find(actor, id);
      expect((await f.service.update(actor, id, { timezone: "Asia/Tokyo" })).status).toBe("success");
      return original;
    });
    expect(await editSessionMutationHandler(f.resolve, { scope, seriesId: f.id,
      ...(scope === "occurrence" ? { originalStart: "2026-10-05T08:00:00Z" } : {}),
      changes: { date: "2026-10-13", startTime: "10:00" } })).toMatchObject({ status: "error", code: "INVALID_INPUT" });
    expect(await find(ACTOR, f.id)).toMatchObject({ data: { startsAt: "2026-10-05T08:00:00Z", timezone: "Asia/Tokyo" } });
    expect((await f.repository.listExceptionsOwned(ACTOR, [f.id])).data).toEqual([]);
  });
  it("moves one occurrence using stored timezone and preserves original identity and siblings", async () => {
    const f = await setup();
    expect(await editSessionMutationHandler(f.resolve, { scope: "occurrence", seriesId: f.id, originalStart: ORIGINAL,
      changes: { date: "2026-10-13", startTime: "10:00", location: " Room B " } })).toEqual({ status: "success", code: "SESSION_UPDATED" });
    expect(await f.read()).toMatchObject([
      { originalStart: "2026-10-05T08:00:00.000Z", location: "Room A" },
      { originalStart: ORIGINAL, startsAt: "2026-10-13T09:00:00.000Z", location: "Room B", notesItems: ["Bring notes"] },
      { originalStart: "2026-10-19T08:00:00.000Z", location: "Room A" },
    ]);
  });

  it("merges partial occurrence edits without erasing prior overrides", async () => {
    const f = await setup();
    const target = { scope: "occurrence", seriesId: f.id, originalStart: ORIGINAL };
    await editSessionMutationHandler(f.resolve, { ...target, changes: { location: "Room B", notesItems: ["Lab sheet", "Bring pen"] } });
    await editSessionMutationHandler(f.resolve, { ...target, changes: { title: " Updated lecture " } });
    expect((await f.read())[1]).toMatchObject({ title: "Updated lecture", location: "Room B", notesItems: ["Lab sheet", "Bring pen"] });
  });

  it("updates shared metadata without rewriting recurrence or stored overrides", async () => {
    const f = await setup();
    await f.service.saveException(ACTOR, { action: "modified", seriesId: f.id, originalStart: ORIGINAL, overridePayload: { location: "Room B" } });
    expect(await editSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id, changes: { title: " Shared title ", notesItems: [] } })).toMatchObject({ status: "success" });
    expect((await f.read()).map(item => item.title)).toEqual(["Shared title", "Shared title", "Shared title"]);
    expect((await f.read())[1]).toMatchObject({ location: "Room B", notesItems: [] });
    expect((await f.service.find(ACTOR, f.id))).toMatchObject({ data: { recurrenceRule: "FREQ=WEEKLY;COUNT=3", timezone: "Africa/Tunis" } });
  });

  it("compiles explicit structured recurrence and preserves startsAt when omitted", async () => {
    const f = await setup(null);
    expect(await editSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id,
      changes: { recurrence: { frequency: "weekly", interval: 1, weekdays: ["MO"], end: "count", count: 2 } } })).toMatchObject({ status: "success" });
    expect(await f.read()).toHaveLength(2);
    expect((await f.service.find(ACTOR, f.id))).toMatchObject({ data: { startsAt: "2026-10-05T08:00:00Z", recurrenceRule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO;COUNT=2" } });
  });

  it("rejects schedule rewrites with existing exceptions but permits metadata retry", async () => {
    const f = await setup();
    await f.service.saveException(ACTOR, { action: "cancelled", seriesId: f.id, originalStart: ORIGINAL });
    expect(await editSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id, changes: { recurrence: { frequency: "none" } } })).toMatchObject({ status: "error", code: "INVALID_INPUT" });
    expect(await editSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id, changes: { title: "Retry title" } })).toMatchObject({ status: "success" });
    expect(await f.read()).toHaveLength(2);
  });

  it("rejects DST gaps and resolves folds consistently in the master timezone", async () => {
    const f = await setup(null, "America/New_York");
    const target = { scope: "series", seriesId: f.id };
    expect(await editSessionMutationHandler(f.resolve, { ...target, changes: { date: "2026-03-08", startTime: "02:30" } })).toMatchObject({ code: "INVALID_INPUT" });
    expect(await editSessionMutationHandler(f.resolve, { ...target, changes: { date: "2026-11-01", startTime: "01:30" } })).toMatchObject({ status: "success" });
    expect((await f.service.find(ACTOR, f.id))).toMatchObject({ data: { startsAt: "2026-11-01T05:30:00.000Z", timezone: "America/New_York" } });
  });

  it.each(["occurrence", "series"])("rejects foreign-owned %s edits", async scope => {
    const f = await setup();
    const input = { scope, seriesId: f.id, changes: { title: "Foreign" }, ...(scope === "occurrence" ? { originalStart: ORIGINAL } : {}) };
    expect(await editSessionMutationHandler(async () => ({ actorId: OTHER, calendarService: f.service }), input)).toMatchObject({ code: "NOT_FOUND" });
    expect((await f.read()).map(item => item.title)).toEqual(["Lecture", "Lecture", "Lecture"]);
  });

  it.each([
    {}, { title: undefined }, { date: "2026-10-13" }, { startTime: "10:00" },
    { startsAt: ORIGINAL }, { timezone: "Asia/Tokyo" }, { recurrenceRule: "FREQ=DAILY" },
    { kind: "exam" }, { userId: OTHER }, { durationMinutes: "60" }, { durationMinutes: -1 },
    { notesItems: Array(51).fill("Overflow") }, { recurrence: { frequency: "weekly", interval: 1, weekdays: ["MO", "MO"], end: "never" } },
    { recurrence: { frequency: "daily" } }, { recurrence: { frequency: "hourly", interval: 1, end: "never" } },
  ])("rejects malformed/forbidden changes before any service calls: %j", async changes => {
    const service = { find: vi.fn(), update: vi.fn(), saveException: vi.fn() };
    expect(await editSessionMutationHandler(async () => ({ actorId: ACTOR, calendarService: service }), { scope: "series", seriesId: ACTOR, changes })).toMatchObject({ code: "INVALID_INPUT" });
    expect(service.find).not.toHaveBeenCalled(); expect(service.update).not.toHaveBeenCalled(); expect(service.saveException).not.toHaveBeenCalled();
  });
});
