import type { CalendarOccurrenceSummaryDTO } from "./calendar";
import type { EntityId, IsoDateTime, SubjectSummaryDTO } from "./shared";
import type { TaskSummaryDTO } from "./task";

export interface DashboardFixtureDTO {
  date: string;
  greetingName: string;
  todaySessions: readonly CalendarOccurrenceSummaryDTO[];
  upcomingTasks: readonly TaskSummaryDTO[];
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

export type AuthProvider = "email" | "google";
export type AuthScreen = "sign-in" | "sign-up" | "forgot-password";

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
