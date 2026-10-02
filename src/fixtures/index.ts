import type {
  AuthFixtureDTO,
  CalendarFixtureDTO,
  CalendarOccurrenceDetailDTO,
  CalendarViewFixtureDTO,
  DashboardFixtureDTO,
  DocumentsVisualFixtureDTO,
  DocumentSummaryDTO,
  ProfileDTO,
  SettingsFixtureDTO,
  SubjectSummaryDTO,
  TaskDetailDTO,
  TaskListVisualDTO,
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

export const tasksPageFixture = [
  {
    id: "task-chapter-4",
    title: "Complete Chapter 4 Exercises",
    description: "Finish all odd-numbered problems before the next tutorial session.",
    subjectLabel: "Math",
    tone: "algebra",
    dueLabel: "Yesterday",
    group: "overdue",
  },
  {
    id: "task-forces",
    title: "Read Chapter 4: Forces",
    description: "Read pages 45–60 and summarize key formulas.",
    subjectLabel: "Physics",
    tone: "physics",
    dueLabel: "Today",
    group: "today",
  },
  {
    id: "task-proposal",
    title: "Project Proposal Draft",
    description: "Write a 2-page outline for the end-of-term project.",
    subjectLabel: "Method",
    tone: "method",
    dueLabel: "Today",
    group: "today",
  },
  {
    id: "task-matrices",
    title: "Review Matrices",
    description: "Go over the past exams for matrix inversions.",
    subjectLabel: "Math",
    tone: "algebra",
    dueLabel: "Friday",
    group: "later",
  },
] as const satisfies readonly TaskListVisualDTO[];

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

const calendarEvents = {
  algebra: {
    id: "calendar-reduction-endomorphismes",
    title: "Réduction des endomorphismes",
    subjectLabel: "Algèbre",
    tone: "algebra",
    startLabel: "08:00",
    endLabel: "09:40",
    durationLabel: "100m",
    location: null,
    inProgress: false,
    progressLabel: null,
  },
  analysis: {
    id: "calendar-integration-theoremes",
    title: "Intégration Théorèmes",
    subjectLabel: "Analyse",
    tone: "analysis",
    startLabel: "08:00",
    endLabel: "09:50",
    durationLabel: "110m",
    location: null,
    inProgress: false,
    progressLabel: null,
  },
  mechanics: {
    id: "calendar-cinematique-pfd",
    title: "Cinématique PFD",
    subjectLabel: "Mécanique",
    tone: "mechanics",
    startLabel: "14:00",
    endLabel: "15:40",
    durationLabel: "100m",
    location: null,
    inProgress: false,
    progressLabel: null,
  },
  physics: {
    id: "calendar-capacites-thermiques",
    title: "Capacités thermiques : modèle d'Einstein",
    subjectLabel: "Physique",
    tone: "physics",
    startLabel: "08:00",
    endLabel: "09:50",
    durationLabel: "110m",
    location: "Class 21",
    inProgress: false,
    progressLabel: null,
  },
  current: {
    id: "calendar-topologie-evn",
    title: "Topologie EVN : exercices structurants",
    subjectLabel: "Analyse",
    tone: "analysis",
    startLabel: "10:00",
    endLabel: "11:15",
    durationLabel: "75m",
    location: "Class 21",
    inProgress: true,
    progressLabel: "Ends in 22 mins",
  },
  frequency: {
    id: "calendar-analyse-frequentielle",
    title: "Analyse fréquentielle",
    subjectLabel: "Physique",
    tone: "physics",
    startLabel: "14:00",
    endLabel: "15:15",
    durationLabel: "75m",
    location: null,
    inProgress: false,
    progressLabel: null,
  },
  simulation: {
    id: "calendar-mini-simulation",
    title: "Mini-simulation Maths 1",
    subjectLabel: "Algèbre",
    tone: "algebra",
    startLabel: "08:00",
    endLabel: "11:00",
    durationLabel: "180m",
    location: null,
    inProgress: false,
    progressLabel: null,
  },
  planning: {
    id: "calendar-bilan-semaine",
    title: "Bilan semaine et plan",
    subjectLabel: "Méthodologie",
    tone: "method",
    startLabel: "10:00",
    endLabel: "11:10",
    durationLabel: "70m",
    location: null,
    inProgress: false,
    progressLabel: null,
  },
} as const;

export const calendarViewFixture = {
  anchorDate: "2026-05-07T12:00:00.000Z",
  greetingName: "Nas",
  weekDays: [
    { weekdayLabel: "Lun", day: 4, isToday: false, events: [calendarEvents.algebra] },
    { weekdayLabel: "Mar", day: 5, isToday: false, events: [calendarEvents.analysis] },
    { weekdayLabel: "Mer", day: 6, isToday: false, events: [calendarEvents.mechanics] },
    { weekdayLabel: "Jeu", day: 7, isToday: true, events: [calendarEvents.physics, calendarEvents.current] },
    { weekdayLabel: "Ven", day: 8, isToday: false, events: [calendarEvents.frequency] },
    { weekdayLabel: "Sam", day: 9, isToday: false, events: [calendarEvents.simulation] },
    { weekdayLabel: "Dim", day: 10, isToday: false, events: [calendarEvents.planning] },
  ],
  daySections: [{ label: "Morning", events: [calendarEvents.physics, calendarEvents.current] }],
  monthCells: [
    { id: "2026-04-27", day: 27, outsideMonth: true, isToday: false, event: null },
    { id: "2026-04-28", day: 28, outsideMonth: true, isToday: false, event: null },
    { id: "2026-04-29", day: 29, outsideMonth: true, isToday: false, event: null },
    { id: "2026-04-30", day: 30, outsideMonth: true, isToday: false, event: null },
    { id: "2026-05-01", day: 1, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-02", day: 2, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-03", day: 3, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-04", day: 4, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-05", day: 5, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-06", day: 6, outsideMonth: false, isToday: false, event: null },
    {
      id: "2026-05-07",
      day: 7,
      outsideMonth: false,
      isToday: true,
      event: { title: "Topologie EVN", tone: "analysis", inProgress: true },
    },
    {
      id: "2026-05-08",
      day: 8,
      outsideMonth: false,
      isToday: false,
      event: { title: "Physique", tone: "physics", inProgress: false },
    },
    { id: "2026-05-09", day: 9, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-10", day: 10, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-11", day: 11, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-12", day: 12, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-13", day: 13, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-14", day: 14, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-15", day: 15, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-16", day: 16, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-17", day: 17, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-18", day: 18, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-19", day: 19, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-20", day: 20, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-21", day: 21, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-22", day: 22, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-23", day: 23, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-24", day: 24, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-25", day: 25, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-26", day: 26, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-27", day: 27, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-28", day: 28, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-29", day: 29, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-30", day: 30, outsideMonth: false, isToday: false, event: null },
    { id: "2026-05-31", day: 31, outsideMonth: false, isToday: false, event: null },
  ],
} as const satisfies CalendarViewFixtureDTO;

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

const documentsVisualFiles = [
  { id: "doc-sequence", name: "Sequence Data", subjectLabel: "Analysis", kindLabel: "PDF", sizeLabel: "1.2 MB", dateLabel: "Oct 24, 2023" },
  { id: "doc-q4", name: "Q4 Results", subjectLabel: "Physics", kindLabel: "DOCX", sizeLabel: "2.5 MB", dateLabel: "Oct 21, 2023" },
  { id: "doc-april", name: "Analysis Data April", subjectLabel: "Math", kindLabel: "PDF", sizeLabel: "840 KB", dateLabel: "Sep 15, 2023" },
  { id: "doc-q2", name: "Q2 Results", subjectLabel: "Archived", kindLabel: "XLSX", sizeLabel: "4.1 MB", dateLabel: "Aug 10, 2023" },
] as const;

export const documentsPageFixture = {
  folders: [
    { id: "folder-analysis", name: "Analysis", detail: "8 Chapters • 620 MB", tone: "analysis" },
    { id: "folder-physics", name: "Physics", detail: "5 Chapters • 510 MB", tone: "physics" },
    { id: "folder-math", name: "Math", detail: "6 Chapters • 420 MB", tone: "algebra" },
    { id: "folder-languages", name: "Languages", detail: "4 Chapters • 150 MB", tone: "neutral" },
  ],
  recent: documentsVisualFiles.slice(0, 3),
  files: documentsVisualFiles,
} as const satisfies DocumentsVisualFixtureDTO;

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
  screens: ["sign-in", "sign-up", "forgot-password", "set-new-password"],
} as const satisfies AuthFixtureDTO;
