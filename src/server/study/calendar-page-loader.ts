import "server-only";

import { TZDate } from "@date-fns/tz";
import type { CalendarPageDataDTO, CalendarView } from "@/domain/dto/calendar";
import { calendarViewFixture } from "@/fixtures";
import { sessionDateTimeToIso } from "./calendar-date";
import { resolveCalendarRequestContext } from "./calendar-request-context";
import { calendarViewWindow, projectCalendarDays } from "./calendar-view-data";
import { resolveE2eStudyScope } from "./task-request-context";

type CalendarQuery = Readonly<Record<"date" | "view" | "e2eScope", string | string[] | undefined>>;

export async function loadCalendarPageData(query: Partial<CalendarQuery>): Promise<CalendarPageDataDTO> {
  try {
    const requestedScope = typeof query.e2eScope === "string" ? query.e2eScope : undefined;
    const context = await resolveCalendarRequestContext(requestedScope);
    if (!context) throw new Error("Unauthenticated");
    const scope = await resolveE2eStudyScope(requestedScope);
    // The scope resolver verifies the development-only test credential.
    if (scope === "visual-baseline" && !requestedScope) {
      const subjects = await context.subjectService.list(context.actorId);
      if (subjects.status === "error") throw new Error("Subject read failed");
      return { ...calendarViewFixture, date: calendarViewFixture.anchorDate.slice(0, 10),
        view: "week", fixture: true, greetingName: context.displayName, subjects: subjects.data, timeZone: context.timeZone };
    }

    const now = context.now();
    const localNow = new TZDate(now.getTime(), context.timeZone);
    const today = `${String(localNow.getFullYear()).padStart(4, "0")}-${String(localNow.getMonth() + 1).padStart(2, "0")}-${String(localNow.getDate()).padStart(2, "0")}`;
    const date = typeof query.date === "string" && sessionDateTimeToIso(query.date, "00:00", "UTC")
      ? query.date : today;
    const view: CalendarView = query.view === "day" || query.view === "month" ? query.view : "week";
    const window = calendarViewWindow(date, view, context.timeZone);
    if (!window) throw new Error("Invalid calendar boundary");
    // Both owned reads are independent once the profile-local window is resolved.
    const [subjects, occurrences] = await Promise.all([
      context.subjectService.list(context.actorId),
      context.calendarService.listOccurrences(context.actorId, window.from, window.to),
    ]);
    if (subjects.status === "error") throw new Error("Subject read failed");
    if (occurrences.status === "error") throw new Error("Occurrence read failed");
    const days = projectCalendarDays(window.dates, occurrences.data, subjects.data, context.timeZone, now);
    const events = days[window.dates.indexOf(date)]?.events ?? [];
    return {
      date, view, fixture: false, subjects: subjects.data, timeZone: context.timeZone,
      anchorDate: `${date}T00:00:00.000Z`, greetingName: context.displayName,
      weekDays: days,
      daySections: [
        { label: "Morning", events: events.filter(event => Number(event.startLabel.slice(0, 2)) < 12) },
        { label: "Afternoon", events: events.filter(event => Number(event.startLabel.slice(0, 2)) >= 12 && Number(event.startLabel.slice(0, 2)) < 18) },
        { label: "Evening", events: events.filter(event => Number(event.startLabel.slice(0, 2)) >= 18) },
      ].filter(section => section.events.length > 0),
      monthCells: days.map((day, index) => ({
        id: window.dates[index], day: day.day, isToday: day.isToday,
        outsideMonth: window.dates[index].slice(0, 7) !== date.slice(0, 7),
        event: day.events[0] ?? null, events: day.events,
      })),
    };
  } catch {
    // Never expose provider/auth diagnostics or silently substitute demo data.
    throw new Error("Unable to load calendar");
  }
}
