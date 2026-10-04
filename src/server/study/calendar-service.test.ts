import { describe, expect, it, vi } from "vitest";

import type { CalendarException, CalendarSeries } from "./calendar-domain";
import { CalendarService, type CalendarRepository } from "./calendar-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const SERIES_ID = "33333333-3333-4333-8333-333333333333";
const NOW = "2026-10-02T12:00:00.000Z";

const SERIES: CalendarSeries = {
  createdAt: NOW,
  durationMinutes: 90,
  focusText: null,
  id: SERIES_ID,
  kind: "university",
  location: "Room 304",
  notesItems: ["Bring notes"],
  professor: "Dr. Smith",
  recurrenceRule: null,
  startsAt: "2026-10-05T08:00:00.000Z",
  subjectId: SUBJECT_ID,
  timezone: "Africa/Tunis",
  title: "Physics lecture",
  updatedAt: NOW,
};

const EXCEPTION: CalendarException = {
  action: "modified",
  createdAt: NOW,
  id: "44444444-4444-4444-8444-444444444444",
  originalStart: "2026-10-12T08:00:00.000Z",
  overridePayload: { location: "Room 401" },
  seriesId: SERIES_ID,
  updatedAt: NOW,
};

const CREATE_INPUT = {
  durationMinutes: SERIES.durationMinutes,
  focusText: SERIES.focusText,
  kind: SERIES.kind,
  location: SERIES.location,
  notesItems: SERIES.notesItems,
  professor: SERIES.professor,
  recurrenceRule: SERIES.recurrenceRule,
  startsAt: SERIES.startsAt,
  subjectId: SERIES.subjectId,
  timezone: SERIES.timezone,
  title: SERIES.title,
};

function repository(overrides: Partial<CalendarRepository> = {}): CalendarRepository {
  return {
    saveExceptionOwned: vi.fn().mockResolvedValue({ data: EXCEPTION, errorCode: null }),
    createOwned: vi.fn().mockResolvedValue({ data: SERIES, errorCode: null }),
    deleteOwned: vi.fn().mockResolvedValue({ data: true, errorCode: null }),
    findOwned: vi.fn().mockResolvedValue({ data: SERIES, errorCode: null }),
    listExceptionsOwned: vi.fn().mockResolvedValue({ data: [], errorCode: null }),
    listOwned: vi.fn().mockResolvedValue({ data: [SERIES], errorCode: null }),
    updateOwned: vi.fn().mockResolvedValue({ data: SERIES, errorCode: null }),
    ...overrides,
  };
}

describe("CalendarService", () => {
  it("normalizes a typed session before creating it", async () => {
    const store = repository();
    const result = await new CalendarService(store).create(USER_ID, {
      ...CREATE_INPUT,
      notesItems: [" Bring notes "],
      professor: " Dr. Smith ",
      title: " Physics   lecture ",
    });

    expect(result.status).toBe("success");
    expect(store.createOwned).toHaveBeenCalledWith(USER_ID, {
      durationMinutes: 90,
      focusText: null,
      kind: "university",
      location: "Room 304",
      notesItems: ["Bring notes"],
      professor: "Dr. Smith",
      recurrenceRule: null,
      startsAt: "2026-10-05T08:00:00.000Z",
      subjectId: SUBJECT_ID,
      timezone: "Africa/Tunis",
      title: "Physics lecture",
    });
  });

  it("merges updates with the stored kind before validating applicability", async () => {
    const store = repository();
    const service = new CalendarService(store);

    await expect(
      service.update(USER_ID, SERIES_ID, { focusText: "Not valid for class" }),
    ).resolves.toEqual({ code: "INVALID_INPUT", status: "error" });
    expect(store.updateOwned).not.toHaveBeenCalled();
  });

  it("persists a validated whole-series update and supports owned deletion", async () => {
    const store = repository();
    const service = new CalendarService(store);

    await expect(
      service.update(USER_ID, SERIES_ID, {
        location: " Room 401 ",
        notesItems: [" Bring the lab sheet "],
      }),
    ).resolves.toEqual({ data: SERIES, status: "success" });
    expect(store.updateOwned).toHaveBeenCalledWith(USER_ID, SERIES_ID, {
      durationMinutes: 90,
      focusText: null,
      location: "Room 401",
      notesItems: ["Bring the lab sheet"],
      professor: "Dr. Smith",
      recurrenceRule: null,
      startsAt: "2026-10-05T08:00:00.000Z",
      subjectId: SUBJECT_ID,
      timezone: "Africa/Tunis",
      title: "Physics lecture",
    });
    await expect(service.delete(USER_ID, SERIES_ID)).resolves.toEqual({
      data: null,
      status: "success",
    });
    expect(store.deleteOwned).toHaveBeenCalledWith(USER_ID, SERIES_ID);
  });

  it("lists bounded effective occurrences and rejects oversized ranges", async () => {
    const store = repository();
    const service = new CalendarService(store, () => new Date(NOW));

    const result = await service.listOccurrences(
      USER_ID,
      "2026-10-01T00:00:00.000Z",
      "2026-10-31T00:00:00.000Z",
    );
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data[0]).toMatchObject({
        originalStart: SERIES.startsAt,
        seriesId: SERIES_ID,
      });
    }
    expect(store.listExceptionsOwned).toHaveBeenCalledWith(USER_ID, [SERIES_ID]);
    await expect(
      service.listOccurrences(
        USER_ID,
        "2026-01-01T00:00:00.000Z",
        "2027-01-03T00:00:00.000Z",
      ),
    ).resolves.toEqual({ code: "INVALID_INPUT", status: "error" });
    await expect(
      service.listOccurrences(USER_ID, "October 1, 2026", "2026-10-31T00:00:00.000Z"),
    ).resolves.toEqual({ code: "INVALID_INPUT", status: "error" });
  });

  it("normalizes exception provider failures without leaking details", async () => {
    const store = repository({
      listExceptionsOwned: vi.fn().mockResolvedValue({
        data: null,
        errorCode: "private provider detail",
      }),
    });

    const result = await new CalendarService(store).listOccurrences(
      USER_ID,
      "2026-10-01T00:00:00.000Z",
      "2026-10-31T00:00:00.000Z",
    );

    expect(result).toEqual({ code: "STORAGE_UNAVAILABLE", status: "error" });
    expect(JSON.stringify(result)).not.toContain("private provider detail");
  });

  it("rejects schedule rewrites that would orphan stored exceptions", async () => {
    const store = repository({
      listExceptionsOwned: vi.fn().mockResolvedValue({
        data: [EXCEPTION],
        errorCode: null,
      }),
    });

    await expect(
      new CalendarService(store).update(USER_ID, SERIES_ID, {
        recurrenceRule: "FREQ=DAILY;COUNT=4",
      }),
    ).resolves.toEqual({ code: "INVALID_INPUT", status: "error" });
    expect(store.updateOwned).not.toHaveBeenCalled();
  });

  it("fails closed for malformed actors and identifiers", async () => {
    const store = repository();
    const service = new CalendarService(store);

    await expect(service.list("not-a-user")).resolves.toEqual({
      code: "INVALID_ACTOR",
      status: "error",
    });
    await expect(service.find(USER_ID, "not-a-series")).resolves.toEqual({
      code: "INVALID_INPUT",
      status: "error",
    });
    expect(store.listOwned).not.toHaveBeenCalled();
    expect(store.findOwned).not.toHaveBeenCalled();
  });

  it("normalizes missing, cross-owner, foreign-key, and provider failures", async () => {
    const missing = repository({
      findOwned: vi.fn().mockResolvedValue({ data: null, errorCode: null }),
    });
    const foreignSubject = repository({
      createOwned: vi.fn().mockResolvedValue({ data: null, errorCode: "23503" }),
    });
    const unavailable = repository({
      listOwned: vi.fn().mockResolvedValue({
        data: null,
        errorCode: "database connection secret",
      }),
    });

    await expect(new CalendarService(missing).find(USER_ID, SERIES_ID)).resolves.toEqual({
      code: "NOT_FOUND",
      status: "error",
    });
    await expect(new CalendarService(foreignSubject).create(USER_ID, CREATE_INPUT)).resolves.toEqual({
      code: "NOT_FOUND",
      status: "error",
    });
    const result = await new CalendarService(unavailable).list(USER_ID);
    expect(result).toEqual({ code: "STORAGE_UNAVAILABLE", status: "error" });
    expect(JSON.stringify(result)).not.toContain("database connection secret");
  });
});
