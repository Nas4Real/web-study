import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), scope: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./calendar-request-context", () => ({ resolveCalendarRequestContext: mocks.resolve }));
vi.mock("./task-request-context", () => ({ resolveE2eStudyScope: mocks.scope }));
vi.mock("@/fixtures", async () => import("../../fixtures"));

import { loadCalendarPageData } from "./calendar-page-loader";

describe("calendar page loader", () => {
  const subjects = [{ id: "subject-1", name: "Physics", color: "#10b981" }];
  const list = vi.fn();
  const listOccurrences = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scope.mockResolvedValue(null);
    list.mockResolvedValue({ status: "success", data: subjects });
    listOccurrences.mockResolvedValue({ status: "success", data: [] });
    mocks.resolve.mockResolvedValue({ actorId: "actor-1", displayName: "Nas", timeZone: "Africa/Tunis",
      now: () => new Date("2026-10-02T23:30:00Z"), subjectService: { list }, calendarService: { listOccurrences } });
  });
  it("defaults to the actual profile-local date and an owned bounded week read", async () => {
    const data = await loadCalendarPageData({});
    expect(data).toMatchObject({ date: "2026-10-03", view: "week", greetingName: "Nas", fixture: false, subjects, timeZone: "Africa/Tunis" });
    expect(data.weekDays).toHaveLength(7);
    expect(data.weekDays.every(day => day.events.length === 0)).toBe(true);
    expect(list).toHaveBeenCalledWith("actor-1");
    expect(listOccurrences).toHaveBeenCalledWith("actor-1", "2026-09-27T23:00:00.000Z", "2026-10-04T23:00:00.000Z");
  });
  it("preserves screenshots only for authenticated development requests without a scope", async () => {
    mocks.scope.mockResolvedValue("visual-baseline");
    const data = await loadCalendarPageData({});
    expect(data).toMatchObject({ date: "2026-05-07", fixture: true, greetingName: "Nas", timeZone: "Africa/Tunis" });
    expect(data.weekDays[0].events[0].title).toBe("Réduction des endomorphismes");
    expect(listOccurrences).not.toHaveBeenCalled();
  });
  it("starts owned occurrence reads while independent subjects are still pending", async () => {
    let releaseSubjects!: (value: { status: "success"; data: typeof subjects }) => void;
    list.mockReturnValueOnce(new Promise(resolve => { releaseSubjects = resolve; }));
    const pending = loadCalendarPageData({ date: "2026-10-05", view: "day" });
    try {
      await vi.waitFor(() => expect(listOccurrences).toHaveBeenCalledWith(
        "actor-1", "2026-10-04T23:00:00.000Z", "2026-10-05T23:00:00.000Z",
      ), { timeout: 300 });
    } finally {
      releaseSubjects({ status: "success", data: subjects });
    }
    expect(await pending).toMatchObject({ subjects, fixture: false, date: "2026-10-05", view: "day" });
  });
  it.each(["subjects", "occurrences"])("sanitizes a rejected parallel %s read", async failure => {
    if (failure === "subjects") list.mockRejectedValueOnce(new Error("private subject provider detail"));
    else listOccurrences.mockRejectedValueOnce(new Error("private occurrence provider detail"));
    await expect(loadCalendarPageData({})).rejects.toThrow("Unable to load calendar");
  });
  it("does not let an untrusted scope or query enable fixture data", async () => {
    const data = await loadCalendarPageData({ e2eScope: "visual-baseline", date: "not-a-date", view: "invalid" });
    expect(data).toMatchObject({ date: "2026-10-03", view: "week", fixture: false });
    expect(listOccurrences).toHaveBeenCalledTimes(1);
  });
  it("uses scoped canonical reads in development", async () => {
    mocks.scope.mockResolvedValue("created-sessions");
    expect((await loadCalendarPageData({ e2eScope: "created-sessions" })).fixture).toBe(false);
    expect(mocks.resolve).toHaveBeenCalledWith("created-sessions");
  });
  it("does not treat duplicate query values as scalar dates/views", async () => {
    expect(await loadCalendarPageData({ date: ["2026-05-01", "2026-05-02"], view: ["day", "month"] }))
      .toMatchObject({ date: "2026-10-03", view: "week" });
  });
  it("defaults impossible civil dates without rolling them into another month", async () => {
    expect(await loadCalendarPageData({ date: "2026-02-30" })).toMatchObject({ date: "2026-10-03" });
  });
  it.each([["2027-02-10", 28], ["2026-11-10", 42]])("retains complete %s month grids", async (date, count) => {
    expect((await loadCalendarPageData({ date, view: "month" })).monthCells).toHaveLength(count);
  });
  it("projects a bounded day into ordered time-of-day sections with actual content", async () => {
    const base = { originalStart: "2026-10-05T08:00:00Z", timezone: "Africa/Tunis", subjectId: "subject-1",
      kind: "revision", durationMinutes: 60, location: null, professor: null, focusText: null, notesItems: [] };
    listOccurrences.mockResolvedValue({ status: "success", data: [
      { ...base, seriesId: "evening", title: "Evening session", startsAt: "2026-10-05T17:00:00Z", endsAt: "2026-10-05T18:00:00Z" },
      { ...base, seriesId: "morning", title: "Morning session", startsAt: "2026-10-05T08:00:00Z", endsAt: "2026-10-05T09:00:00Z" },
      { ...base, seriesId: "afternoon", title: "Afternoon session", startsAt: "2026-10-05T11:00:00Z", endsAt: "2026-10-05T12:00:00Z" },
    ] });
    const data = await loadCalendarPageData({ date: "2026-10-05", view: "day" });
    expect(data.weekDays).toHaveLength(1);
    expect(data.daySections.map(section => [section.label, section.events[0].title])).toEqual([
      ["Morning", "Morning session"], ["Afternoon", "Afternoon session"], ["Evening", "Evening session"],
    ]);
    expect(listOccurrences).toHaveBeenCalledWith("actor-1", "2026-10-04T23:00:00.000Z", "2026-10-05T23:00:00.000Z");
  });
  it("keeps all effective sessions in month cells and does not add click semantics", async () => {
    const base = { seriesId: "series-1", originalStart: "2026-10-04T08:00:00Z", startsAt: "2026-10-05T08:00:00Z",
      endsAt: "2026-10-05T09:00:00Z", timezone: "Africa/Tunis", subjectId: "subject-1", kind: "university",
      title: "Moved lecture", durationMinutes: 60, location: "Room 401", professor: null, focusText: null, notesItems: [], isCurrent: false };
    listOccurrences.mockResolvedValue({ status: "success", data: [base, { ...base, seriesId: "series-2", title: "Second lecture" }] });
    const data = await loadCalendarPageData({ date: "2026-10-05", view: "month" });
    expect(data.monthCells).toHaveLength(35);
    expect(data.monthCells.find(cell => cell.id === "2026-10-05")?.events?.map(event => event.title)).toEqual(["Moved lecture", "Second lecture"]);
    expect(data.monthCells.find(cell => cell.id === "2026-10-04")?.events).toEqual([]);
  });
  it("keeps Day sections limited to the selected civil date inside a Week read", async () => {
    const base = { originalStart: "2026-10-05T08:00:00Z", timezone: "Africa/Tunis", subjectId: "subject-1",
      kind: "university", durationMinutes: 60, location: null, professor: null, focusText: null, notesItems: [] };
    listOccurrences.mockResolvedValue({ status: "success", data: [
      { ...base, seriesId: "selected", title: "Selected day", startsAt: "2026-10-05T08:00:00Z", endsAt: "2026-10-05T09:00:00Z" },
      { ...base, seriesId: "other", title: "Other day", startsAt: "2026-10-06T08:00:00Z", endsAt: "2026-10-06T09:00:00Z" },
    ] });
    const data = await loadCalendarPageData({ date: "2026-10-05", view: "week" });
    expect(data.weekDays.flatMap(day => day.events)).toHaveLength(2);
    expect(data.daySections.flatMap(section => section.events).map(event => event.title)).toEqual(["Selected day"]);
  });
  it.each(["unauthenticated", "subjects", "occurrences", "exception"])("does not leak provider internals or insert demo data after %s failure", async failure => {
    if (failure === "unauthenticated") mocks.resolve.mockResolvedValue(null);
    if (failure === "subjects") list.mockResolvedValue({ status: "error", code: "STORAGE_UNAVAILABLE" });
    if (failure === "occurrences") listOccurrences.mockResolvedValue({ status: "error", code: "STORAGE_UNAVAILABLE" });
    if (failure === "exception") mocks.resolve.mockRejectedValue(new Error("private connection detail"));
    await expect(loadCalendarPageData({})).rejects.toThrow("Unable to load calendar");
  });
});
