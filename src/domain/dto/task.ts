import type { EntityId, IsoDateTime, SubjectSummaryDTO } from "./shared";

export type TaskPriority = "normal" | "high";
export type TaskStatus = "pending" | "completed" | "someday";

export interface TaskSummaryDTO {
  id: EntityId;
  title: string;
  subject: SubjectSummaryDTO;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
}

export interface TaskSubtaskDTO {
  id: EntityId;
  title: string;
  position: number;
  completedAt: IsoDateTime | null;
}

export interface TaskDetailDTO extends TaskSummaryDTO {
  description: string | null;
  subtasks: readonly TaskSubtaskDTO[];
}
