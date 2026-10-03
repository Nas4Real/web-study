import type { TaskDetailDTO } from "@/domain/dto";
import type { TaskDetailMutation } from "@/server/study/task-detail-service";
import { taskDueLabel } from "./task-view-model";

export function optimisticTaskDetail(detail: TaskDetailDTO, command: TaskDetailMutation, now: string): TaskDetailDTO {
  if (command.type === "delete") return detail;
  if (command.type === "subtask") return { ...detail, subtasks: detail.subtasks.map(subtask =>
    subtask.id === command.subtaskId ? { ...subtask, completedAt: command.completed ? now : null } : subtask) };
  return { ...detail, status: command.type === "complete" ? "completed" : "pending",
    completedAt: command.type === "complete" ? now : null };
}

export function formatTaskDetailDue(dueAt: string | null, timeZone: string, now: string) {
  if (!dueAt) return "No due date";
  const day = taskDueLabel({ dueAt }, timeZone, new Date(now));
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone }).format(new Date(dueAt));
  return `Due ${day}, ${time}`;
}
