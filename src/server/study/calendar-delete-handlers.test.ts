import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { deleteSessionMutationHandler } from "./calendar-delete-handlers";
import { CalendarService } from "./calendar-service";
import { createE2eCalendarRepository } from "./e2e-calendar-repository";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const OTHER = "99999999-9999-4999-8999-999999999999";
const ORIGINAL = "2026-10-12T08:00:00.000Z";

async function setup(recurrenceRule: string | null = "FREQ=WEEKLY;COUNT=3") {
  const scope = randomUUID();
  const repository = createE2eCalendarRepository(scope);
  const service = new CalendarService(repository);
  const created = await service.create(ACTOR, {
    kind: "university", title: "Delete target", subjectId: "10000000-0000-4000-8000-000000000003",
    startsAt: "2026-10-05T08:00:00Z", timezone: "Africa/Tunis", recurrenceRule,
    durationMinutes: 45, focusText: null, location: null, professor: null, notesItems: [],
  });
  if (created.status !== "success") throw new Error("Test creation failed");
  const resolve = async () => ({ actorId: ACTOR, calendarService: service });
  const read = async () => {
    const result = await new CalendarService(createE2eCalendarRepository(scope)).listOccurrences(ACTOR, "2026-10-01T00:00:00Z", "2026-11-01T00:00:00Z");
    if (result.status !== "success") throw new Error("Test read failed");
    return result.data.filter(item => item.seriesId === created.data.id);
  };
  return { repository, service, scope, resolve, read, id: created.data.id };
}

describe("authenticated calendar deletion", () => {
  it("cancels the explicit original occurrence, preserves siblings and accepts retry", async () => {
    const f = await setup();
    const input = { scope: "occurrence", seriesId: f.id, originalStart: ORIGINAL };
    expect(await deleteSessionMutationHandler(f.resolve, input)).toEqual({ status: "success", code: "SESSION_DELETED" });
    expect(await deleteSessionMutationHandler(f.resolve, input)).toEqual({ status: "success", code: "SESSION_DELETED" });
    expect((await f.read()).map(item => item.originalStart)).toEqual(["2026-10-05T08:00:00.000Z", "2026-10-19T08:00:00.000Z"]);
    expect((await f.service.find(ACTOR, f.id)).status).toBe("success");
    expect((await f.repository.listExceptionsOwned(ACTOR, [f.id])).data).toHaveLength(1);
  });

  it("deletes the explicit whole series and cascades its stored exceptions", async () => {
    const f = await setup();
    await deleteSessionMutationHandler(f.resolve, { scope: "occurrence", seriesId: f.id, originalStart: ORIGINAL });
    const before = (await f.repository.listOwned(ACTOR)).data!;
    expect(await deleteSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id })).toEqual({ status: "success", code: "SESSION_DELETED" });
    expect(await f.read()).toEqual([]);
    expect((await f.repository.listExceptionsOwned(ACTOR, [f.id])).data).toEqual([]);
    expect((await f.repository.listOwned(ACTOR)).data?.map(item => item.id)).toEqual(before.filter(item => item.id !== f.id).map(item => item.id));
    expect(await deleteSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id })).toMatchObject({ status: "error", code: "NOT_FOUND" });
  });

  it("cancels a moved occurrence by original identity, never its effective start", async () => {
    const f = await setup();
    await f.service.saveException(ACTOR, { action: "modified", seriesId: f.id, originalStart: ORIGINAL, overridePayload: { startsAt: "2026-10-13T10:00:00Z" } });
    expect(await deleteSessionMutationHandler(f.resolve, { scope: "occurrence", seriesId: f.id, originalStart: "2026-10-13T10:00:00Z" })).toMatchObject({ status: "error", code: "NOT_FOUND" });
    expect(await f.read()).toHaveLength(3);
    expect(await deleteSessionMutationHandler(f.resolve, { scope: "occurrence", seriesId: f.id, originalStart: ORIGINAL })).toMatchObject({ status: "success" });
    expect(await f.read()).toHaveLength(2);
  });

  it("deletes a one-time session only through the series path", async () => {
    const f = await setup(null);
    expect(await deleteSessionMutationHandler(f.resolve, { scope: "occurrence", seriesId: f.id, originalStart: "2026-10-05T08:00:00Z" })).toMatchObject({ status: "error", code: "INVALID_INPUT" });
    expect(await deleteSessionMutationHandler(f.resolve, { scope: "series", seriesId: f.id })).toMatchObject({ status: "success" });
    expect(await f.read()).toEqual([]);
  });

  it.each(["series", "occurrence"])("rejects a foreign-owned %s target without mutation", async scope => {
    const f = await setup();
    const resolve = async () => ({ actorId: OTHER, calendarService: f.service });
    expect(await deleteSessionMutationHandler(resolve, scope === "series" ? { scope, seriesId: f.id } : { scope, seriesId: f.id, originalStart: ORIGINAL })).toMatchObject({ status: "error", code: "NOT_FOUND" });
    expect(await f.read()).toHaveLength(3);
    expect((await f.repository.listExceptionsOwned(ACTOR, [f.id])).data).toEqual([]);
  });

  it("does not mutate another test scope", async () => {
    const f = await setup();
    const other = new CalendarService(createE2eCalendarRepository(randomUUID()));
    expect(await deleteSessionMutationHandler(async () => ({ actorId: ACTOR, calendarService: other }), { scope: "series", seriesId: f.id })).toMatchObject({ status: "error", code: "NOT_FOUND" });
    expect(await f.read()).toHaveLength(3);
  });

  it.each([
    null, {}, { scope: "all" }, { scope: "series", seriesId: "invalid" },
    { scope: "occurrence", seriesId: ACTOR },
    { scope: "occurrence", seriesId: ACTOR, originalStart: "not-a-date" },
    { scope: "series", seriesId: ACTOR, originalStart: ORIGINAL },
    { scope: "series", seriesId: ACTOR, actorId: OTHER },
    { scope: "series", seriesId: ACTOR, confirmed: true },
  ])("rejects malformed or extra target fields: %j", async input => {
    const service = { delete: vi.fn(), saveException: vi.fn() };
    expect(await deleteSessionMutationHandler(async () => ({ actorId: ACTOR, calendarService: service }), input)).toMatchObject({ status: "error", code: "INVALID_INPUT" });
    expect(service.delete).not.toHaveBeenCalled(); expect(service.saveException).not.toHaveBeenCalled();
  });

  it("authenticates before parsing even a malformed request", async () => {
    expect(await deleteSessionMutationHandler(async () => null, null)).toMatchObject({ status: "error", code: "UNAUTHENTICATED" });
  });

  it("rejects invented original identities without falling back to series deletion", async () => {
    const f = await setup();
    expect(await deleteSessionMutationHandler(f.resolve, { scope: "occurrence", seriesId: f.id, originalStart: "2026-10-13T08:00:00Z" })).toMatchObject({ status: "error", code: "NOT_FOUND" });
    expect(await f.read()).toHaveLength(3);
  });

  it.each(["INVALID_ACTOR", "INVALID_INPUT", "NOT_FOUND", "STORAGE_UNAVAILABLE"])("normalizes %s service errors", async code => {
    const service = { delete: vi.fn().mockResolvedValue({ status: "error", code }), saveException: vi.fn() };
    expect(await deleteSessionMutationHandler(async () => ({ actorId: ACTOR, calendarService: service }), { scope: "series", seriesId: ACTOR })).toMatchObject({ status: "error", code: code === "INVALID_ACTOR" ? "UNAUTHENTICATED" : code });
  });

  it("does not disclose context/provider exception details", async () => {
    const result = await deleteSessionMutationHandler(async () => { throw new Error("private connection detail"); }, { scope: "series", seriesId: ACTOR });
    expect(result).toMatchObject({ status: "error", code: "STORAGE_UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("private connection");
  });

  it.each(["series", "occurrence"])("normalizes a thrown %s service failure", async scope => {
    const fail = vi.fn().mockRejectedValue(new Error("private provider message"));
    const resolve = async () => ({ actorId: ACTOR, calendarService: { delete: fail, saveException: fail } });
    const result = await deleteSessionMutationHandler(resolve, scope === "series" ? { scope, seriesId: ACTOR } : { scope, seriesId: ACTOR, originalStart: ORIGINAL });
    expect(result).toMatchObject({ status: "error", code: "STORAGE_UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("private provider");
  });
});
