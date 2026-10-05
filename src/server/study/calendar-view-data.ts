import { TZDate } from "@date-fns/tz";

import type { CalendarTone, CalendarView, CalendarWeekDayDTO, SubjectSummaryDTO } from "@/domain/dto";
import { sessionDateTimeToIso } from "./calendar-date";
import type { CalendarOccurrence } from "./calendar-recurrence";

const weekdays = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function dateKey(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Dates are civil dates; the returned instant range is inclusive/exclusive. */
export function calendarViewWindow(anchor: string, view: CalendarView, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor) || !sessionDateTimeToIso(anchor, "00:00", "UTC")) return null;
  // UTC here is only a host-independent civil-date arithmetic clock.
  const start = new TZDate(`${anchor}T00:00:00.000Z`, "UTC");
  let count = 1;
  if (view === "month") start.setDate(1);
  if (view !== "day") {
    const leadingDays = (start.getDay() + 6) % 7;
    const monthEnd = new TZDate(start.getTime(), "UTC");
    monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
    count = view === "week" ? 7 : Math.ceil((leadingDays + monthEnd.getDate()) / 7) * 7;
    start.setDate(start.getDate() - leadingDays);
  }
  const dates = Array.from({ length: count }, (_, index) => {
    const day = new TZDate(start.getTime(), "UTC");
    day.setDate(day.getDate() + index);
    return dateKey(day);
  });
  const end = new TZDate(start.getTime(), "UTC");
  end.setDate(end.getDate() + count);
  const from = sessionDateTimeToIso(dates[0], "00:00", timeZone);
  const to = sessionDateTimeToIso(dateKey(end), "00:00", timeZone);
  return from && to ? { dates, from, to } : null;
}

function subjectTone(color: string): CalendarTone {
  switch (color) {
    case "#ec4899": return "algebra";
    case "#06b6d4": return "analysis";
    case "#10b981": return "physics";
    case "#f59e0b": return "method";
    default: return "mechanics";
  }
}

/** Input occurrences and subjects must come from the same actor-owned read. */
export function projectCalendarDays(
  dates: readonly string[], occurrences: readonly CalendarOccurrence[],
  subjects: readonly SubjectSummaryDTO[], timeZone: string, now: Date,
): readonly CalendarWeekDayDTO[] {
  const today = dateKey(new TZDate(now.getTime(), timeZone));
  const subjectById = new Map(subjects.map(subject => [subject.id, subject]));
  const eventsByDate = new Map<string, CalendarWeekDayDTO["events"][number][]>();
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  for (const occurrence of [...occurrences].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
    const subject = subjectById.get(occurrence.subjectId);
    if (!subject) continue;
    const start = new Date(occurrence.startsAt);
    const end = new Date(occurrence.endsAt);
    const key = dateKey(new TZDate(start.getTime(), timeZone));
    const inProgress = occurrence.durationMinutes !== null && start <= now && now < end;
    const events = eventsByDate.get(key) ?? [];
    events.push({
      id: `${occurrence.seriesId}:${occurrence.originalStart}`,
      seriesId: occurrence.seriesId, originalStart: occurrence.originalStart, title: occurrence.title,
      subjectLabel: subject.name, tone: subjectTone(subject.color),
      startLabel: clock.format(start), endLabel: clock.format(end),
      durationLabel: occurrence.durationMinutes === null ? "" : `${occurrence.durationMinutes}m`,
      location: occurrence.location, inProgress,
      progressLabel: inProgress ? `Ends in ${Math.ceil((end.getTime() - now.getTime()) / 60_000)} mins` : null,
    });
    eventsByDate.set(key, events);
  }
  return dates.map(key => {
    const civil = new Date(`${key}T00:00:00.000Z`);
    return { weekdayLabel: weekdays[civil.getUTCDay()], day: civil.getUTCDate(),
      isToday: key === today, events: eventsByDate.get(key) ?? [] };
  });
}
