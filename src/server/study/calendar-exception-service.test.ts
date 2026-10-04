import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CalendarService } from "./calendar-service";
import { createE2eCalendarRepository } from "./e2e-calendar-repository";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const OTHER = "99999999-9999-4999-8999-999999999999";
const SUBJECT = "10000000-0000-4000-8000-000000000003";
const ORIGINAL = "2026-10-12T08:00:00.000Z";

async function setup() {
  const scope = randomUUID();
  const repository = createE2eCalendarRepository(scope);
  const service = new CalendarService(repository);
  const created = await service.create(ACTOR, {
    kind: "university", title: "Owned series", subjectId: SUBJECT,
    startsAt: "2026-10-05T08:00:00.000Z", timezone: "Africa/Tunis",
    recurrenceRule: "FREQ=WEEKLY;COUNT=3", durationMinutes: 45,
    focusText: null, professor: null, location: "Room A", notesItems: ["Bring notes"],
  });
  if (created.status !== "success") throw new Error("Test series creation failed");
  return { scope, repository, service, id: created.data.id };
}

async function occurrences(service: CalendarService, id: string) {
  const result = await service.listOccurrences(ACTOR, "2026-10-01T00:00:00Z", "2026-11-01T00:00:00Z");
  if (result.status !== "success") throw new Error("Test occurrence read failed");
  return result.data.filter(item => item.seriesId === id);
}

describe("owned occurrence mutations", () => {
  it("rejects a stale occurrence write when a schedule change wins after validation", async () => {
    const { service, repository, id } = await setup();
    const save = repository.saveExceptionOwned.bind(repository);
    vi.spyOn(repository, "saveExceptionOwned").mockImplementation(async (actor, input, schedule) => {
      expect((await service.update(actor, id, { startsAt: "2026-10-06T08:00:00Z" })).status).toBe("success");
      return save(actor, input, schedule);
    });
    expect(await service.saveException(ACTOR, { action: "cancelled", seriesId: id, originalStart: ORIGINAL }))
      .toEqual({ status: "error", code: "INVALID_INPUT" });
    expect((await repository.listExceptionsOwned(ACTOR, [id])).data).toEqual([]);
  });

  it("blocks a schedule rewrite when an exception wins after the service precheck", async () => {
    const { service, repository, id } = await setup();
    const update = repository.updateOwned.bind(repository);
    const series = (await repository.findOwned(ACTOR, id)).data!;
    vi.spyOn(repository, "updateOwned").mockImplementation(async (actor, seriesId, input) => {
      await repository.saveExceptionOwned(actor, { action: "cancelled", seriesId, originalStart: ORIGINAL, overridePayload: {} }, series);
      return update(actor, seriesId, input);
    });
    expect(await service.update(ACTOR, id, { startsAt: "2026-10-06T08:00:00Z" }))
      .toEqual({ status: "error", code: "INVALID_INPUT" });
    expect((await repository.findOwned(ACTOR, id)).data?.startsAt).toEqual(series.startsAt);
  });

  it("moves one occurrence while preserving its identity and siblings after readback", async () => {
    const { service, id, scope } = await setup();
    const result = await service.saveException(ACTOR, {
      action: "modified", seriesId: id, originalStart: ORIGINAL,
      overridePayload: { startsAt: "2026-10-13T10:00:00Z", location: " Room B " },
    });
    expect(result).toMatchObject({ status: "success", data: { originalStart: ORIGINAL } });
    const reader = new CalendarService(createE2eCalendarRepository(scope));
    expect(await occurrences(reader, id)).toMatchObject([
      { originalStart: "2026-10-05T08:00:00.000Z", startsAt: "2026-10-05T08:00:00.000Z", location: "Room A" },
      { originalStart: ORIGINAL, startsAt: "2026-10-13T10:00:00.000Z", location: "Room B" },
      { originalStart: "2026-10-19T08:00:00.000Z", location: "Room A" },
    ]);
  });

  it("merges a later partial edit with the existing override", async () => {
    const { service, id } = await setup();
    await service.saveException(ACTOR, { action: "modified", seriesId: id, originalStart: ORIGINAL, overridePayload: { location: "Room B", notesItems: ["Lab sheet"] } });
    await service.saveException(ACTOR, { action: "modified", seriesId: id, originalStart: "2026-10-12T09:00:00+01:00", overridePayload: { title: " Updated lecture " } });
    expect((await occurrences(service, id))[1]).toMatchObject({ title: "Updated lecture", location: "Room B", notesItems: ["Lab sheet"], originalStart: ORIGINAL });
  });

  it("cancels only one occurrence and retry keeps one stable exception record", async () => {
    const { service, repository, id } = await setup();
    const input = { action: "cancelled", seriesId: id, originalStart: ORIGINAL };
    const first = await service.saveException(ACTOR, input);
    expect(first.status).toBe("success");
    expect(await service.saveException(ACTOR, input)).toMatchObject(first);
    expect(await occurrences(service, id)).toHaveLength(2);
    const stored = await repository.listExceptionsOwned(ACTOR, [id]);
    expect(stored.data).toHaveLength(1);
    expect(stored.data?.[0]).toMatchObject({ action: "cancelled", overridePayload: {} });
    expect(await service.saveException(ACTOR, { ...input, action: "modified", overridePayload: { title: "Resurrect" } })).toEqual({ status: "error", code: "NOT_FOUND" });
  });

  it("rejects foreign actors, invented occurrence identities and kind-invalid overrides", async () => {
    const { service, repository, id } = await setup();
    const input = { action: "modified", seriesId: id, originalStart: ORIGINAL, overridePayload: { title: "Changed" } };
    expect(await service.saveException(OTHER, input)).toEqual({ status: "error", code: "NOT_FOUND" });
    expect(await service.saveException("invalid", input)).toEqual({ status: "error", code: "INVALID_ACTOR" });
    for (const originalStart of ["2026-10-13T08:00:00Z", "2026-10-26T08:00:00Z"]) {
      expect(await service.saveException(ACTOR, { ...input, originalStart })).toEqual({ status: "error", code: "NOT_FOUND" });
    }
    for (const overridePayload of [{ focusText: "Wrong kind" }, { durationMinutes: null }, { subjectId: SUBJECT }, { recurrenceRule: "FREQ=DAILY" }]) {
      expect(await service.saveException(ACTOR, { ...input, overridePayload })).toEqual({ status: "error", code: "INVALID_INPUT" });
    }
    expect((await repository.listExceptionsOwned(ACTOR, [id])).data).toEqual([]);
  });

  it("does not create exceptions for a one-time session", async () => {
    const { service, id } = await setup();
    await service.update(ACTOR, id, { recurrenceRule: null });
    expect(await service.saveException(ACTOR, { action: "cancelled", seriesId: id, originalStart: "2026-10-05T08:00:00Z" })).toEqual({ status: "error", code: "INVALID_INPUT" });
  });

  it("normalizes read/write provider failures without leaking details", async () => {
    for (const mode of ["read", "write", "throw"] as const) {
      const { service, repository, id } = await setup();
      if (mode === "read") vi.spyOn(repository, "listExceptionsOwned").mockResolvedValue({ data: null, errorCode: "private connection" });
      if (mode === "write") vi.spyOn(repository, "saveExceptionOwned").mockResolvedValue({ data: null, errorCode: "private connection" });
      if (mode === "throw") vi.spyOn(repository, "saveExceptionOwned").mockRejectedValue(new Error("secret detail"));
      expect(await service.saveException(ACTOR, { action: "cancelled", seriesId: id, originalStart: ORIGINAL })).toEqual({ status: "error", code: "STORAGE_UNAVAILABLE" });
    }
  });

  it("does not resurrect an occurrence if cancellation wins a concurrent edit", async () => {
    const { service, repository, id } = await setup();
    const save = repository.saveExceptionOwned.bind(repository);
    vi.spyOn(repository, "saveExceptionOwned").mockImplementation(async (actor, input, schedule) => {
      await save(actor, { action: "cancelled", seriesId: id, originalStart: ORIGINAL, overridePayload: {} }, schedule);
      return save(actor, input, schedule);
    });
    expect(await service.saveException(ACTOR, { action: "modified", seriesId: id, originalStart: ORIGINAL, overridePayload: { title: "Racing edit" } })).toEqual({ status: "error", code: "NOT_FOUND" });
    expect(await occurrences(service, id)).toHaveLength(2);
  });
});
