import type {
  AuthFixtureDTO,
  CalendarFixtureDTO,
  CalendarOccurrenceDetailDTO,
  DashboardFixtureDTO,
  DocumentSummaryDTO,
  ProfileDTO,
  SettingsFixtureDTO,
  SubjectSummaryDTO,
  TaskDetailDTO,
  TaskSummaryDTO,
} from "../domain/dto";

export const subjectsFixture = [
  { id: "subject-algebra", name: "Math", color: "#ec4899" },
  { id: "subject-analysis", name: "Analysis", color: "#06b6d4" },
  { id: "subject-physics", name: "Physics", color: "#10b981" },
  { id: "subject-mechanics", name: "Mechanics", color: "#3b82f6" },
  { id: "subject-method", name: "Method", color: "#f59e0b" },
  { id: "subject-languages", name: "Languages", color: "#eab308" },
] as const satisfies readonly SubjectSummaryDTO[];

const [mathSubject, analysisSubject, physicsSubject] = subjectsFixture;

export const profileFixture = {
  id: "profile-demo",
  displayName: "Nas",
  email: "nas@example.com",
  timezone: "Africa/Tunis",
  storageQuotaBytes: 2_147_483_648,
  storageUsedBytes: 348_127_232,
} as const satisfies ProfileDTO;

export const tasksFixture = [
  {
    id: "task-chapter-4",
    title: "Complete Chapter 4 Exercises",
    subject: mathSubject,
    priority: "high",
    status: "completed",
    dueAt: "2026-10-01T22:59:00.000Z",
    completedAt: "2026-09-30T17:20:00.000Z",
  },
  {
    id: "task-analysis-notes",
    title: "Review analysis lecture notes",
    subject: analysisSubject,
    priority: "normal",
    status: "pending",
    dueAt: "2026-10-03T15:00:00.000Z",
    completedAt: null,
  },
] as const satisfies readonly TaskSummaryDTO[];

export const taskDetailFixture = {
  ...tasksFixture[0],
  description:
    "Complete the odd-numbered problems on pages 112–118, focusing on the integral proofs.",
  subtasks: [
    {
      id: "subtask-review-notes",
      title: "Review lecture notes",
      position: 0,
      completedAt: "2026-09-30T16:45:00.000Z",
    },
    {
      id: "subtask-problems-1-15",
      title: "Solve problems 1–15",
      position: 1,
      completedAt: null,
    },
    {
      id: "subtask-integral-proofs",
      title: "Write down proofs for integrals",
      position: 2,
      completedAt: null,
    },
  ],
} as const satisfies TaskDetailDTO;

export const sessionDetailFixture = {
  seriesId: "series-quantum-mechanics",
  originalStart: "2026-09-30T08:00:00.000Z",
  title: "Quantum Mechanics Lecture",
  kind: "university",
  startsAt: "2026-09-30T09:00:00.000Z",
  endsAt: "2026-09-30T10:30:00.000Z",
  subject: physicsSubject,
  location: "Room 304, Sci-Tech",
  professor: "Prof. Heisenberg",
  focusText: null,
  notesItems: [
    {
      id: "session-note-uncertainty",
      text: "Ask about uncertainty principle proof on slide 14.",
      position: 0,
    },
    {
      id: "session-note-lab-report",
      text: "Bring graded lab report from last week.",
      position: 1,
    },
    {
      id: "session-note-midterm",
      text: "Check whether midterm covers chapters 4 and 5.",
      position: 2,
    },
  ],
  isRecurring: true,
  recurrenceRule: "FREQ=WEEKLY;BYDAY=WE",
} as const satisfies CalendarOccurrenceDetailDTO;

export const calendarFixture = {
  selectedDate: "2026-09-30",
  defaultView: "week",
  availableViews: ["day", "week", "month"],
  occurrences: [sessionDetailFixture],
} as const satisfies CalendarFixtureDTO;

export const documentsFixture = [
  {
    id: "document-quantum-notes",
    name: "Quantum Mechanics Notes.pdf",
    kind: "pdf",
    sizeBytes: 2_621_440,
    subject: physicsSubject,
    createdAt: "2026-09-28T13:30:00.000Z",
  },
  {
    id: "document-analysis-summary",
    name: "Analysis Summary.docx",
    kind: "document",
    sizeBytes: 438_272,
    subject: analysisSubject,
    createdAt: "2026-09-27T09:15:00.000Z",
  },
] as const satisfies readonly DocumentSummaryDTO[];

export const dashboardFixture = {
  date: "2026-09-30",
  greetingName: profileFixture.displayName,
  todaySessions: calendarFixture.occurrences,
  upcomingTasks: tasksFixture,
} as const satisfies DashboardFixtureDTO;

export const settingsFixture = {
  profileId: profileFixture.id,
  notifications: {
    email: true,
    push: true,
    taskReminders: true,
    sessionReminders: true,
  },
  appearance: "dark",
} as const satisfies SettingsFixtureDTO;

export const authFixture = {
  providers: ["email", "google"],
  screens: ["sign-in", "sign-up", "forgot-password"],
} as const satisfies AuthFixtureDTO;
