import { TZDate } from "@date-fns/tz";
import { differenceInCalendarDays, getDaysInMonth, startOfMonth } from "date-fns";

import type { DashboardFixtureDTO, DashboardTone } from "@/domain/dto";
import type { DashboardReadModel } from "@/server/study/dashboard-service";
import type { Subject } from "@/server/study/study-domain";

function tone(subject: Subject | undefined): DashboardTone {
  switch (subject?.color) {
    case "#ec4899": return "algebra";
    case "#06b6d4": return "analysis";
    case "#10b981": return "physics";
    case "#f59e0b": return "method";
    default: return "mechanics";
  }
}

export function toDashboardViewModel(model: DashboardReadModel): DashboardFixtureDTO {
  const now = new TZDate(model.now, model.timeZone);
  const subjects = new Map(model.subjects.map(s => [s.id, s]));
  const local = (value: string) => new TZDate(value, model.timeZone);
  const time = (value: string) => new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: model.timeZone,
  }).format(new Date(value));
  const distance = (value: string) => differenceInCalendarDays(local(value), now);
  const due = (value: string) => {
    const days = distance(value);
    return days === 0 ? "Due Today" : days === 1 ? "Due Tomorrow" :
      new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: model.timeZone }).format(new Date(value));
  };
  const monthStart = startOfMonth(now);
  const leadingCount = (monthStart.getDay() + 6) % 7;
  const previousMonth = new TZDate(now.getFullYear(), now.getMonth(), 0, model.timeZone);
  const events: Partial<Record<number, "exam" | "task">> = {};
  model.monthTasks.forEach(t => { if (t.dueAt) events[local(t.dueAt).getDate()] = "task"; });
  model.monthExams.forEach(s => { events[local(s.startsAt).getDate()] = "exam"; });
  return {
    date: model.now,
    upcomingExam: { title: model.upcomingExam?.title ?? "—",
      dueLabel: model.upcomingExam ? (distance(model.upcomingExam.startsAt) === 0 ? "Today" :
        `in ${distance(model.upcomingExam.startsAt)} days`) : "—" },
    nextSession: { title: model.nextSession?.title ?? "—", location: model.nextSession?.location ?? "—",
      timeLabel: model.nextSession ? time(model.nextSession.startsAt) : "—" },
    taskSummary: model.taskSummary,
    assignments: model.upcomingTasks.map(task => ({ id: task.id, title: task.title,
      description: task.description ?? "", state: "pending", tone: tone(subjects.get(task.subjectId)),
      dueLabel: task.dueAt ? due(task.dueAt) : "—", dueTime: task.dueAt ? time(task.dueAt) : "—" })),
    tasks: model.todayTasks.map(task => ({ id: task.id, title: task.title,
      subjectLabel: subjects.get(task.subjectId)?.name.toUpperCase() ?? "Subject",
      description: task.description, completed: task.status === "completed", highlighted: task.priority === "high",
      tone: tone(subjects.get(task.subjectId)), dueLabel: task.dueAt ? `Due ${time(task.dueAt)}` : null })),
    todayClasses: model.todayClasses.map(s => ({ id: `${s.seriesId}:${s.originalStart}`,
      title: s.title, timeLabel: time(s.startsAt), location: s.location ?? "—" })),
    calendar: { label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: model.timeZone }).format(now),
      selectedDay: now.getDate(), leadingDays: Array.from({ length: leadingCount }, (_, i) => previousMonth.getDate() - leadingCount + i + 1),
      days: Array.from({ length: getDaysInMonth(now) }, (_, i) => i + 1), events },
  };
}
