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
  date: "2026-08-10",
  upcomingExam: { title: "Algèbre Linéaire", dueLabel: "in 2 days" },
  nextSession: { title: "Mathematics", location: "Room 27", timeLabel: "11:00 AM" },
  taskSummary: { total: 4, dueToday: 2, completedToday: 1 },
  assignments: [
    {
      id: "assignment-mathematics",
      title: "Mathematics Assignment",
      description: "Chapter 4 : Linear Equation",
      dueLabel: "Due Today",
      dueTime: "23:59",
      tone: "algebra",
      state: "pending",
    },
    {
      id: "assignment-science",
      title: "Science Worksheet",
      description: "Worksheet 2.3 & 2.4",
      dueLabel: "Due Tomorrow",
      dueTime: "23:59",
      tone: "analysis",
      state: "pending",
    },
    {
      id: "assignment-english",
      title: "English Presentation",
      description: "Reading session",
      dueLabel: "Completed",
      dueTime: "10 Aug 09:00",
      tone: "physics",
      state: "completed",
    },
  ],
  tasks: [
    {
      id: "dashboard-task-mathematics",
      title: "Finish Mathematics Assignment",
      subjectLabel: "MATH",
      description: "Chapter 4 : Linear Equation",
      dueLabel: "Due 23:59",
      tone: "algebra",
      completed: false,
      highlighted: true,
    },
    {
      id: "dashboard-task-physics",
      title: "Review Physics Notes",
      subjectLabel: "PHYSICS",
      description: "Quantum Mechanics",
      dueLabel: null,
      tone: "physics",
      completed: false,
      highlighted: false,
    },
    {
      id: "dashboard-task-chemistry",
      title: "Submit Chemistry Lab Report",
      subjectLabel: "CHEMISTRY",
      description: null,
      dueLabel: null,
      tone: "analysis",
      completed: true,
      highlighted: false,
    },
  ],
  todayClasses: [
    { id: "class-mathematics", timeLabel: "09:00", title: "Mathematics", location: "Room 27" },
    { id: "class-english", timeLabel: "11:00", title: "English Language", location: "Room 21" },
    { id: "class-science", timeLabel: "13:00", title: "Science", location: "Lab 3" },
  ],
  calendar: {
    label: "August 2026",
    selectedDay: 10,
    leadingDays: [27, 28, 29, 30, 31],
    days: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      26, 27, 28, 29, 30,
    ],
    events: { 8: "task", 12: "exam", 15: "task" },
  },
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
