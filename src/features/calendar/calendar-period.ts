import type { CalendarView } from "@/domain/dto";

const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;
const monthNames = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

export function formatCalendarPeriod(date: Date, view: CalendarView): string {
  const day = date.getUTCDate();
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  if (view === "day") {
    return `${dayNames[date.getUTCDay()]}, ${day} ${month} ${year}`;
  }

  if (view === "month") {
    return `${month} ${year}`;
  }

  const monday = new Date(date.getTime());
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  monday.setUTCDate(date.getUTCDate() - daysSinceMonday);
  const sunday = new Date(monday.getTime());
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const mondayMonth = monthNames[monday.getUTCMonth()];
  const sundayMonth = monthNames[sunday.getUTCMonth()];
  const start = `${monday.getUTCDate()} ${mondayMonth}`;
  return `${start} - ${sunday.getUTCDate()} ${sundayMonth} ${sunday.getUTCFullYear()}`;
}

export function shiftCalendarPeriod(date: Date, view: CalendarView, direction: -1 | 1): Date {
  const shifted = new Date(date.getTime());

  if (view === "day") {
    shifted.setUTCDate(shifted.getUTCDate() + direction);
  } else if (view === "week") {
    shifted.setUTCDate(shifted.getUTCDate() + direction * 7);
  } else {
    const originalDay = shifted.getUTCDate();
    shifted.setUTCDate(1);
    shifted.setUTCMonth(shifted.getUTCMonth() + direction);
    const lastDayOfTargetMonth = new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0),
    ).getUTCDate();
    shifted.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  }

  return shifted;
}
