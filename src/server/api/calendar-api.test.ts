import { describe, expect, it, vi } from "vitest";

import type { CalendarService } from "@/server/study/calendar-service";
import type { SessionDetailService } from "@/server/study/session-detail-service";
import type { SubjectService } from "@/server/study/subject-service";

import type { PublicApiRequestContext } from "./public-api-handler";
import {
  createSessionOccurrenceItemAdapter,
  createSessionSeriesItemAdapter,
  createSessionsCollectionAdapter,
} from "./calendar-api";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const SERIES_ID = "33333333-3333-4333-8333-333333333333";
const ORIGINAL = "2026-10-12T08:00:00.000Z";
const EFFECTIVE = "2026-10-13T10:00:00.000Z";
const NOW = "2026-10-09T10:00:00.000Z";
const SUBJECT = { color: "#10b981", createdAt: NOW, icon: null, id: SUBJECT_ID,
  name: "Physics", position: 0, updatedAt: NOW };
const SERIES = { createdAt: NOW, durationMinutes: 90, focusText: null,
  id: SERIES_ID, kind: "university" as const, location: "Room 304",
  notesItems: ["Bring notes"], professor: "Dr. Smith",
  recurrenceRule: "FREQ=WEEKLY;COUNT=3", startsAt: ORIGINAL,
  subjectId: SUBJECT_ID, timezone: "Africa/Tunis", title: "Physics lecture", updatedAt: NOW };
const OCCURRENCE = { ...SERIES, endsAt: "2026-10-13T11:30:00.000Z",
  isCurrent: false, originalStart: ORIGINAL, seriesId: SERIES_ID, startsAt: EFFECTIVE,
  title: "Moved physics lecture" };
const DETAIL = { durationMinutes: 90, endsAt: OCCURRENCE.endsAt, focusText: null, isRecurring: true,
  kind: "university" as const, location: "Room 401", notesItems: [],
  originalStart: ORIGINAL, professor: "Dr. Smith", recurrenceRule: SERIES.recurrenceRule,
  seriesMaster: { durationMinutes: 90, focusText: null, location: "Room 304",
    notesItems: ["Bring notes"], professor: "Dr. Smith", recurrenceRule: SERIES.recurrenceRule,
    startsAt: ORIGINAL, title: SERIES.title }, seriesId: SERIES_ID, startsAt: EFFECTIVE,
  subject: { color: SUBJECT.color, id: SUBJECT_ID, name: SUBJECT.name },
  timezone: SERIES.timezone,
  title: "Moved physics lecture" };
const CONTEXT: PublicApiRequestContext = {
  actor: { apiKeyId: "44444444-4444-4444-8444-444444444444", userId: USER_ID },
  requestId: "calendar-request-1",
};

function dependencies() {
  return {
    calendar: {
      create: vi.fn(), delete: vi.fn(), find: vi.fn(), listOccurrences: vi.fn(),
      saveException: vi.fn(), update: vi.fn(),
    } as unknown as CalendarService,
    details: { read: vi.fn() } as unknown as SessionDetailService,
    subjects: { find: vi.fn(), findMany: vi.fn().mockResolvedValue({ data: [SUBJECT], status: "success" }) } as unknown as SubjectService,
  };
}

describe("calendar public API adapter", () => {
  it("lists a bounded range of effective occurrences with owned subjects", async () => {
    const deps = dependencies();
    vi.mocked(deps.calendar.listOccurrences).mockResolvedValue({ data: [OCCURRENCE], status: "success" });
    const response = await createSessionsCollectionAdapter(deps)(new Request(
      `https://example.test/api/v1/sessions?from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z&subject_id=${SUBJECT_ID}`,
    ), CONTEXT);

    expect(deps.calendar.listOccurrences).toHaveBeenCalledWith(
      USER_ID, "2026-10-01T00:00:00Z", "2026-11-01T00:00:00Z",
    );
    expect(await response.json()).toEqual([expect.objectContaining({
      original_start: ORIGINAL, series_id: SERIES_ID,
      starts_at: EFFECTIVE, subject: { color: SUBJECT.color, icon: null, id: SUBJECT_ID, name: SUBJECT.name },
    })]);
  });

  it("creates a typed series through the canonical calendar service", async () => {
    const deps = dependencies();
    vi.mocked(deps.calendar.create).mockResolvedValue({ data: SERIES, status: "success" });
    vi.mocked(deps.subjects.find).mockResolvedValue({ data: SUBJECT, status: "success" });
    const response = await createSessionsCollectionAdapter(deps)(new Request(
      "https://example.test/api/v1/sessions", { body: JSON.stringify({
        duration_minutes: 90, kind: "university", location: "Room 304",
        professor: "Dr. Smith", starts_at: ORIGINAL, subject_id: SUBJECT_ID,
        timezone: "Africa/Tunis", title: "Physics lecture",
      }), headers: { "content-type": "application/json" }, method: "POST" },
    ), CONTEXT);

    expect(deps.calendar.create).toHaveBeenCalledWith(USER_ID, expect.objectContaining({
      durationMinutes: 90, kind: "university", notesItems: [], recurrenceRule: null,
      subjectId: SUBJECT_ID,
    }));
    expect(response.status).toBe(201);
  });

  it("rejects malformed range and create payloads before service calls", async () => {
    const deps = dependencies();
    const range = await createSessionsCollectionAdapter(deps)(new Request(
      "https://example.test/api/v1/sessions?from=bad&to=2026-11-01T00:00:00Z",
    ), CONTEXT);
    const create = await createSessionsCollectionAdapter(deps)(new Request(
      "https://example.test/api/v1/sessions", { body: JSON.stringify({
        kind: "university", starts_at: ORIGINAL, subject_id: SUBJECT_ID,
        timezone: "Africa/Tunis", title: "Physics", unexpected: true,
      }), headers: { "content-type": "application/json" }, method: "POST" },
    ), CONTEXT);

    expect(range.status).toBe(422);
    expect(create.status).toBe(422);
    expect(deps.calendar.listOccurrences).not.toHaveBeenCalled();
    expect(deps.calendar.create).not.toHaveBeenCalled();
  });

  it("updates a whole series without permitting kind changes", async () => {
    const deps = dependencies();
    vi.mocked(deps.calendar.update).mockResolvedValue({ data: { ...SERIES, location: "Room 401" }, status: "success" });
    vi.mocked(deps.subjects.find).mockResolvedValue({ data: SUBJECT, status: "success" });
    const response = await createSessionSeriesItemAdapter(deps, SERIES_ID)(new Request(
      `https://example.test/api/v1/sessions/${SERIES_ID}`, { body: JSON.stringify({ location: "Room 401" }),
        headers: { "content-type": "application/json" }, method: "PATCH" },
    ), CONTEXT);

    expect(deps.calendar.update).toHaveBeenCalledWith(USER_ID, SERIES_ID, { location: "Room 401" });
    expect(response.status).toBe(200);
  });

  it("reads and modifies one occurrence by stable original identity", async () => {
    const deps = dependencies();
    vi.mocked(deps.calendar.saveException).mockResolvedValue({ data: {} as never, status: "success" });
    vi.mocked(deps.details.read).mockResolvedValue({ data: DETAIL, status: "success" });
    const response = await createSessionOccurrenceItemAdapter(deps, SERIES_ID, ORIGINAL)(new Request(
      `https://example.test/api/v1/sessions/${SERIES_ID}/occurrences/${encodeURIComponent(ORIGINAL)}`,
      { body: JSON.stringify({ location: "Room 401", starts_at: EFFECTIVE }),
        headers: { "content-type": "application/json" }, method: "PATCH" },
    ), CONTEXT);

    expect(deps.calendar.saveException).toHaveBeenCalledWith(USER_ID, {
      action: "modified", originalStart: ORIGINAL,
      overridePayload: { location: "Room 401", startsAt: EFFECTIVE }, seriesId: SERIES_ID,
    });
    expect(await response.json()).toMatchObject({ original_start: ORIGINAL, starts_at: EFFECTIVE });
  });

  it("does not mark a later unmodified recurrence as overridden", async () => {
    const deps = dependencies();
    const later = "2026-10-19T08:00:00.000Z";
    vi.mocked(deps.details.read).mockResolvedValue({
      data: {
        ...DETAIL,
        location: SERIES.location,
        notesItems: SERIES.notesItems.map((text, position) => ({ id: `note-${position}`, position, text })),
        originalStart: later,
        startsAt: later,
        title: SERIES.title,
      },
      status: "success",
    });
    const response = await createSessionOccurrenceItemAdapter(deps, SERIES_ID, later)(new Request(
      `https://example.test/api/v1/sessions/${SERIES_ID}/occurrences/${encodeURIComponent(later)}`,
    ), CONTEXT);

    expect(await response.json()).toMatchObject({ original_start: later, overridden: false });
  });

  it("cancels one occurrence idempotently without deleting its series", async () => {
    const deps = dependencies();
    vi.mocked(deps.calendar.saveException).mockResolvedValue({ data: {} as never, status: "success" });
    const response = await createSessionOccurrenceItemAdapter(deps, SERIES_ID, ORIGINAL)(new Request(
      `https://example.test/api/v1/sessions/${SERIES_ID}/occurrences/${encodeURIComponent(ORIGINAL)}`,
      { method: "DELETE" },
    ), CONTEXT);

    expect(deps.calendar.saveException).toHaveBeenCalledWith(USER_ID, {
      action: "cancelled", originalStart: ORIGINAL, overridePayload: {}, seriesId: SERIES_ID,
    });
    expect(deps.calendar.delete).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it("conceals missing and foreign-owned occurrence identities", async () => {
    const deps = dependencies();
    vi.mocked(deps.details.read).mockResolvedValue({ code: "NOT_FOUND", status: "error" });
    const response = await createSessionOccurrenceItemAdapter(deps, SERIES_ID, ORIGINAL)(new Request(
      `https://example.test/api/v1/sessions/${SERIES_ID}/occurrences/${encodeURIComponent(ORIGINAL)}`,
    ), CONTEXT);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
