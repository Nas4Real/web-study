import type { WorkspaceTone } from "@/domain/dto";
import type { Subject } from "@/server/study/study-domain";
import type { Task, TaskGroups, TaskStatus } from "@/server/study/task-domain";
export { dateInputToEndOfDayIso } from "../../server/study/task-date";

export type TaskListGroup = keyof TaskGroups;

export type TaskListViewModel = Readonly<{
  description: string;
  dueLabel: string;
  group: TaskListGroup;
  id: string;
  status: TaskStatus;
  subjectLabel: string;
  title: string;
  tone: WorkspaceTone;
}>;

const groupOrder = ["overdue", "today", "later", "completed", "someday"] as const;

function dateKey(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dateDistance(left: string, right: string) {
  const [leftYear, leftMonth, leftDay] = left.split("-").map(Number);
  const [rightYear, rightMonth, rightDay] = right.split("-").map(Number);
  return Math.round(
    (Date.UTC(leftYear, leftMonth - 1, leftDay) -
      Date.UTC(rightYear, rightMonth - 1, rightDay)) /
      86_400_000,
  );
}

function dueLabel(task: Task, timeZone: string, now: Date) {
  if (task.dueAt === null) return "No due date";
  const due = new Date(task.dueAt);
  const distance = dateDistance(dateKey(due, timeZone), dateKey(now, timeZone));
  if (distance === -1) return "Yesterday";
  if (distance === 0) return "Today";
  if (distance === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", {
    day: distance < -1 ? "numeric" : undefined,
    month: distance < -1 ? "short" : undefined,
    timeZone,
    weekday: distance > 1 && distance <= 7 ? "long" : undefined,
    year: Math.abs(distance) > 365 ? "numeric" : undefined,
  }).format(due);
}

function subjectTone(subject: Subject | undefined): WorkspaceTone {
  const name = subject?.name.toLowerCase() ?? "";
  const color = subject?.color.toLowerCase();
  if (color === "#ec4899" || /math|alg[èe]bre|algebra/.test(name)) return "algebra";
  if (color === "#06b6d4" || /analysis|analyse/.test(name)) return "analysis";
  if (color === "#10b981" || /physics|physique/.test(name)) return "physics";
  if (color === "#f59e0b" || /method|m[ée]thodologie/.test(name)) return "method";
  return "neutral";
}

export function toTaskListViewModel(
  groups: TaskGroups,
  subjects: readonly Subject[],
  timeZone: string,
  now = new Date(),
): readonly TaskListViewModel[] {
  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
  return groupOrder.flatMap((group) =>
    groups[group].map((task) => {
      const subject = subjectsById.get(task.subjectId);
      return {
        description: task.description ?? "",
        dueLabel: dueLabel(task, timeZone, now),
        group,
        id: task.id,
        status: task.status,
        subjectLabel: subject?.name ?? "Subject",
        title: task.title,
        tone: subjectTone(subject),
      };
    }),
  );
}
