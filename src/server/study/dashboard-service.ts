import { TZDate } from "@date-fns/tz";
import { addDays, startOfMonth } from "date-fns";

import type { CalendarService } from "./calendar-service";
import type { CalendarOccurrence } from "./calendar-recurrence";
import type { SubjectService } from "./subject-service";
import type { TaskService } from "./task-service";
import type { Task } from "./task-domain";
import { actorIdSchema, INVALID_ACTOR, INVALID_INPUT, STORAGE_UNAVAILABLE,
  type Subject, type StudyResult } from "./study-domain";

export type DashboardSources = Readonly<{
  tasks: Pick<TaskService, "list">;
  calendar: Pick<CalendarService, "listOccurrences">;
  subjects: Pick<SubjectService, "list">;
}>;

export type DashboardReadModel = Readonly<{
  now: string;
  timeZone: string;
  subjects: readonly Subject[];
  taskSummary: Readonly<{ total: number; dueToday: number; completedToday: number; todayTotal: number }>;
  upcomingTasks: readonly Task[];
  todayTasks: readonly Task[];
  upcomingExam: CalendarOccurrence | null;
  nextSession: CalendarOccurrence | null;
  todayClasses: readonly CalendarOccurrence[];
  monthTasks: readonly Task[];
  monthExams: readonly CalendarOccurrence[];
}>;

function dateKey(value: string, timeZone: string) {
  const date = new TZDate(value, timeZone);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function taskOrder(left: Task, right: Task) {
  return (left.dueAt ? Date.parse(left.dueAt) : Infinity) -
    (right.dueAt ? Date.parse(right.dueAt) : Infinity) || left.id.localeCompare(right.id);
}

export class DashboardService {
  constructor(private readonly sources: DashboardSources, private readonly now: () => Date = () => new Date()) {}

  async read(actorId: unknown, timeZone: string): Promise<StudyResult<DashboardReadModel>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    try { new Intl.DateTimeFormat("en", { timeZone }).format(); } catch { return INVALID_INPUT; }
    const now = this.now();
    if (!Number.isFinite(now.getTime())) return INVALID_INPUT;
    const monthStart = startOfMonth(new TZDate(now, timeZone));
    // One bounded occurrence query also supplies compact-calendar exam markers.
    const rangeEnd = addDays(monthStart, 365);
    try {
      const [tasks, calendar, subjects] = await Promise.all([
        this.sources.tasks.list(actor.data),
        this.sources.calendar.listOccurrences(actor.data,
          new Date(monthStart.getTime()).toISOString(), new Date(rangeEnd.getTime()).toISOString()),
        this.sources.subjects.list(actor.data),
      ]);
      if (tasks.status === "error") return tasks;
      if (calendar.status === "error") return calendar;
      if (subjects.status === "error") return subjects;
      const today = dateKey(now.toISOString(), timeZone);
      const isToday = (value: string | null) => value !== null && dateKey(value, timeZone) === today;
      const pending = tasks.data.filter(t => t.status === "pending");
      const todayTasks = tasks.data.filter(t => t.status !== "someday" &&
        (isToday(t.dueAt) || (t.status === "completed" && isToday(t.completedAt))))
        .sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed") || taskOrder(a, b));
      const occurrences = [...calendar.data].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
        a.seriesId.localeCompare(b.seriesId) || a.originalStart.localeCompare(b.originalStart));
      const localNow = new TZDate(now, timeZone);
      const inMonth = (value: string) => {
        const local = new TZDate(value, timeZone);
        return local.getFullYear() === localNow.getFullYear() && local.getMonth() === localNow.getMonth();
      };
      return { status: "success", data: {
        now: now.toISOString(), timeZone, subjects: subjects.data,
        taskSummary: { total: pending.length, dueToday: pending.filter(t => isToday(t.dueAt)).length,
          completedToday: todayTasks.filter(t => t.status === "completed").length, todayTotal: todayTasks.length },
        upcomingTasks: pending.filter(t => t.dueAt !== null).sort(taskOrder).slice(0, 3),
        todayTasks,
        upcomingExam: occurrences.find(s => s.kind === "exam" && new Date(s.startsAt) >= now) ?? null,
        nextSession: occurrences.find(s => s.kind !== "exam" && new Date(s.startsAt) >= now) ?? null,
        todayClasses: occurrences.filter(s => s.kind === "university" && isToday(s.startsAt)),
        monthTasks: pending.filter(t => t.dueAt !== null && inMonth(t.dueAt)),
        monthExams: occurrences.filter(s => s.kind === "exam" && inMonth(s.startsAt)),
      } };
    } catch { return STORAGE_UNAVAILABLE; }
  }
}
