import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { createE2eCalendarRepository } from "./e2e-calendar-repository";
import { CalendarService } from "./calendar-service";
import type { CalendarSeriesCreate } from "./calendar-domain";

const ACTOR = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const input: CalendarSeriesCreate = {
  subjectId: "10000000-0000-4000-8000-000000000003", kind: "revision", title: "Saved revision",
  startsAt: "2026-10-05T08:30:00.000Z", timezone: "Africa/Tunis", durationMinutes: 60,
  recurrenceRule: null, location: null, professor: null, focusText: "Chapter 4", notesItems: [],
};

describe("scoped calendar test repository", () => {
  it("persists service writes across repository instances and expands them on readback", async () => {
    const scope = randomUUID();
    const service = new CalendarService(createE2eCalendarRepository(scope));
    const created = await service.create(ACTOR, input);
    expect(created.status).toBe("success");
    if (created.status !== "success") return;
    const reader = new CalendarService(createE2eCalendarRepository(scope));
    const read = await reader.listOccurrences(ACTOR, "2026-10-05T00:00:00Z", "2026-10-06T00:00:00Z");
    expect(read).toMatchObject({ status: "success", data: [{ seriesId: created.data.id, title: "Saved revision", durationMinutes: 60 }] });
    expect(await createE2eCalendarRepository(scope).findOwned(ACTOR, created.data.id)).toMatchObject({ data: created.data, errorCode: null });
  });
  it("isolates scope and actor reads", async () => {
    const scope = randomUUID();
    const repository = createE2eCalendarRepository(scope);
    const result = await repository.createOwned(ACTOR, input);
    expect(result.data).not.toBeNull();
    const id = result.data!.id;
    expect(await repository.findOwned(OTHER, id)).toEqual({ data: null, errorCode: null });
    expect(await createE2eCalendarRepository(randomUUID()).findOwned(ACTOR, id)).toEqual({ data: null, errorCode: null });
    expect((await repository.listOwned(OTHER)).data?.some(series => series.id === id)).toBe(false);
  });
  it("rejects missing subjects through the shared service contract", async () => {
    const service = new CalendarService(createE2eCalendarRepository(randomUUID()));
    expect(await service.create(ACTOR, { ...input, subjectId: randomUUID() })).toEqual({ status: "error", code: "NOT_FOUND" });
  });
  it("returns detached snapshots rather than exposing mutable stored notes", async () => {
    const repository = createE2eCalendarRepository(randomUUID());
    const result = await repository.createOwned(ACTOR, { ...input, notesItems: ["Original note"] });
    result.data!.notesItems[0] = "Mutated";
    const read = await repository.findOwned(ACTOR, result.data!.id);
    expect(read.data?.notesItems).toEqual(["Original note"]);
  });
  it("retains dashboard seeds and filters effective overrides by requested series", async () => {
    const repository = createE2eCalendarRepository(randomUUID());
    expect((await repository.listOwned(ACTOR)).data?.map(series => series.title)).toEqual(["Physics lecture", "Physics midterm"]);
    expect((await repository.listExceptionsOwned(ACTOR, ["30000000-0000-4000-8000-000000000001"])).data?.[0].overridePayload).toEqual({ location: "Room 401" });
    expect(await repository.listExceptionsOwned(ACTOR, [])).toEqual({ data: [], errorCode: null });
  });
});
