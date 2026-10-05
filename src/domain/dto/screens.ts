import type { EntityId, IsoDateTime, SubjectSummaryDTO } from "./shared";

export type DashboardTone = "algebra" | "analysis" | "physics" | "mechanics" | "method";

export interface DashboardAssignmentDTO {
  id: EntityId;
  title: string;
  description: string;
  dueLabel: string;
  dueTime: string;
  tone: DashboardTone;
  state: "pending" | "completed";
}

export interface DashboardTaskDTO {
  id: EntityId;
  title: string;
  subjectLabel: string;
  description: string | null;
  dueLabel: string | null;
  tone: DashboardTone;
  completed: boolean;
  highlighted: boolean;
}

export interface DashboardClassDTO {
  id: EntityId;
  seriesId: EntityId;
  originalStart: IsoDateTime;
  timeLabel: string;
  title: string;
  location: string;
}

export interface DashboardFixtureDTO {
  date: string;
  fixture: boolean;
  timeZone: string;
  subjects: readonly SubjectSummaryDTO[];
  upcomingExam: { title: string; dueLabel: string };
  nextSession: { title: string; location: string; timeLabel: string };
  taskSummary: { total: number; dueToday: number; completedToday: number };
  assignments: readonly DashboardAssignmentDTO[];
  tasks: readonly DashboardTaskDTO[];
  todayClasses: readonly DashboardClassDTO[];
  calendar: {
    label: string;
    selectedDay: number;
    leadingDays: readonly number[];
    days: readonly number[];
    events: Readonly<Partial<Record<number, "exam" | "task" | "holiday">>>;
  };
}

export interface SettingsFixtureDTO {
  profileId: EntityId;
  notifications: {
    email: boolean;
    push: boolean;
    taskReminders: boolean;
    sessionReminders: boolean;
  };
  appearance: "dark";
}

export type WorkspaceTone = "algebra" | "analysis" | "physics" | "method" | "neutral";

export interface TaskListVisualDTO {
  id: EntityId;
  title: string;
  description: string;
  subjectLabel: string;
  tone: WorkspaceTone;
  dueLabel: string;
  group: "overdue" | "today" | "later";
}

export interface DocumentFolderVisualDTO {
  id: EntityId;
  name: string;
  detail: string;
  tone: WorkspaceTone;
}

export interface DocumentVisualDTO {
  id: EntityId;
  name: string;
  subjectLabel: string;
  kindLabel: "PDF" | "DOCX" | "XLSX";
  sizeLabel: string;
  dateLabel: string;
}

export interface DocumentsVisualFixtureDTO {
  folders: readonly DocumentFolderVisualDTO[];
  recent: readonly DocumentVisualDTO[];
  files: readonly DocumentVisualDTO[];
}

export type AuthProvider = "email" | "google";
export type AuthScreen =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "set-new-password";

export interface AuthFixtureDTO {
  providers: readonly AuthProvider[];
  screens: readonly AuthScreen[];
}

export interface StudyStreakDTO {
  currentDays: number;
  longestDays: number;
  lastStudiedAt: IsoDateTime;
  leadingSubject: SubjectSummaryDTO;
}
