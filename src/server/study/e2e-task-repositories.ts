import "server-only";

import { randomUUID } from "node:crypto";

import type { ProfileRepository } from "./profile-service";
import type { Profile, Subject } from "./study-domain";
import type { SubjectRepository } from "./subject-service";
import type { Task, TaskCreate } from "./task-domain";
import type { TaskRepository } from "./task-service";

const SUBJECTS = [
  { color: "#ec4899", id: "10000000-0000-4000-8000-000000000001", name: "Math" },
  { color: "#06b6d4", id: "10000000-0000-4000-8000-000000000002", name: "Analysis" },
  { color: "#10b981", id: "10000000-0000-4000-8000-000000000003", name: "Physics" },
  { color: "#f59e0b", id: "10000000-0000-4000-8000-000000000004", name: "Method" },
].map(
  (subject, position): Subject => ({
    ...subject,
    createdAt: "2026-01-01T00:00:00.000Z",
    icon: null,
    position,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }),
);

function initialTasks(): Task[] {
  const base = {
    completedAt: null,
    createdAt: "2026-10-01T08:00:00.000Z",
    priority: "normal" as const,
    status: "pending" as const,
    subtasks: [],
    updatedAt: "2026-10-01T08:00:00.000Z",
  };
  return [
    {
      ...base,
      description: "Finish all odd-numbered problems before the next tutorial session.",
      dueAt: "2026-10-01T22:59:00.000Z",
      id: "20000000-0000-4000-8000-000000000001",
      priority: "high",
      subtasks: [
        { id: "30000000-0000-4000-8000-000000000001", title: "Review lecture notes", position: 0, completedAt: "2026-10-01T08:00:00.000Z", createdAt: base.createdAt, updatedAt: base.updatedAt },
        { id: "30000000-0000-4000-8000-000000000002", title: "Solve problems 1–15", position: 1, completedAt: null, createdAt: base.createdAt, updatedAt: base.updatedAt },
        { id: "30000000-0000-4000-8000-000000000003", title: "Write down proofs for integrals", position: 2, completedAt: null, createdAt: base.createdAt, updatedAt: base.updatedAt },
      ],
      subjectId: SUBJECTS[0].id,
      title: "Complete Chapter 4 Exercises",
    },
    {
      ...base,
      description: "Read pages 45–60 and summarize key formulas.",
      dueAt: "2026-10-02T22:59:00.000Z",
      id: "20000000-0000-4000-8000-000000000002",
      subjectId: SUBJECTS[2].id,
      title: "Read Chapter 4: Forces",
    },
    {
      ...base,
      description: "Write a 2-page outline for the end-of-term project.",
      dueAt: "2026-10-02T22:59:00.000Z",
      id: "20000000-0000-4000-8000-000000000003",
      subjectId: SUBJECTS[3].id,
      title: "Project Proposal Draft",
    },
    {
      ...base,
      description: "Go over the past exams for matrix inversions.",
      dueAt: "2026-10-09T22:59:00.000Z",
      id: "20000000-0000-4000-8000-000000000004",
      subjectId: SUBJECTS[0].id,
      title: "Review Matrices",
    },
  ];
}

type E2eStores = {
  profiles: Map<string, Profile>;
  subjects: Map<string, Subject[]>;
  tasks: Map<string, Task[]>;
};

const globalE2eState = globalThis as typeof globalThis & {
  __webStudyE2eStores?: E2eStores;
};
const sharedStores = globalE2eState.__webStudyE2eStores ??= {
  profiles: new Map<string, Profile>(),
  subjects: new Map<string, Subject[]>(),
  tasks: new Map<string, Task[]>(),
};
const stores = sharedStores.tasks;
const profileStores = sharedStores.profiles;
const subjectStores = sharedStores.subjects;

function profileFor(scope: string, userId: string) {
  const existing = profileStores.get(scope);
  if (existing) return existing;
  const profile: Profile = {
    avatarObjectKey: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Nas",
    id: userId,
    storageQuotaBytes: 2_147_483_648,
    storageReservedBytes: 0,
    storageUsedBytes: 348_127_232,
    timezone: "Africa/Tunis",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  profileStores.set(scope, profile);
  return profile;
}

function storeFor(scope: string) {
  const existing = stores.get(scope);
  if (existing) return existing;
  const created = initialTasks();
  stores.set(scope, created);
  return created;
}

function subjectsFor(scope: string) {
  const existing = subjectStores.get(scope);
  if (existing) return existing;
  const created = scope.startsWith("empty-subjects") ? [] : SUBJECTS.map((subject) => ({ ...subject }));
  subjectStores.set(scope, created);
  return created;
}

function taskRepository(scope: string): TaskRepository {
  const tasks = storeFor(scope);
  const find = (taskId: string) => tasks.find((task) => task.id === taskId);
  const save = (task: Task) => {
    const index = tasks.findIndex(({ id }) => id === task.id);
    if (index >= 0) tasks[index] = task;
    return { data: task, errorCode: null };
  };
  return {
    async addSubtaskOwned(_userId, taskId, input) {
      const task = find(taskId);
      if (!task) return { data: null, errorCode: null };
      const now = new Date().toISOString();
      const subtask = {
        completedAt: input.completedAt, createdAt: now, id: randomUUID(),
        position: input.position, title: input.title, updatedAt: now,
      };
      save({ ...task, subtasks: [...task.subtasks, subtask], updatedAt: now });
      return { data: subtask, errorCode: null };
    },
    async createOwned(_userId, input: TaskCreate) {
      if (!SUBJECTS.some(({ id }) => id === input.subjectId)) {
        return { data: null, errorCode: "23503" };
      }
      const now = new Date().toISOString();
      const created: Task = {
        completedAt: null,
        createdAt: now,
        description: input.description,
        dueAt: input.dueAt,
        id: randomUUID(),
        priority: input.priority,
        status: "pending",
        subjectId: input.subjectId,
        subtasks: input.subtasks.map((subtask, position) => ({
          completedAt: null, createdAt: now, id: randomUUID(), position,
          title: subtask.title, updatedAt: now,
        })),
        title: input.title,
        updatedAt: now,
      };
      tasks.push(created);
      return { data: created, errorCode: null };
    },
    async deleteOwned(_userId, taskId) {
      const index = tasks.findIndex(({ id }) => id === taskId);
      if (index < 0) return { data: false, errorCode: null };
      tasks.splice(index, 1);
      return { data: true, errorCode: null };
    },
    async findOwned(_userId, taskId) {
      return { data: find(taskId) ?? null, errorCode: null };
    },
    async listOwned() {
      return { data: [...tasks], errorCode: null };
    },
    async listPageOwned(_userId, input) {
      const filtered = tasks.filter(task =>
        (!input.status || task.status === input.status)
        && (!input.subjectId || task.subjectId === input.subjectId)
        && (!input.dueFrom || (task.dueAt !== null && task.dueAt >= input.dueFrom))
        && (!input.dueTo || (task.dueAt !== null && task.dueAt <= input.dueTo)))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
      const after = input.cursor ? filtered.filter(task =>
        task.createdAt < input.cursor!.createdAt
        || (task.createdAt === input.cursor!.createdAt && task.id < input.cursor!.id)) : filtered;
      return { data: after.slice(0, input.limit), errorCode: null };
    },
    async setStatusOwned(_userId, taskId, status, completedAt) {
      const task = find(taskId);
      return task
        ? save({ ...task, completedAt, status, updatedAt: new Date().toISOString() })
        : { data: null, errorCode: null };
    },
    async toggleSubtaskOwned(_userId, taskId, subtaskId, completedAt) {
      const task = find(taskId);
      if (!task?.subtasks.some(subtask => subtask.id === subtaskId)) return { data: null, errorCode: null };
      const now = new Date().toISOString();
      return save({ ...task, updatedAt: now, subtasks: task.subtasks.map(subtask => subtask.id === subtaskId ? { ...subtask, completedAt, updatedAt: now } : subtask) });
    },
    async updateSubtaskOwned(_userId, taskId, subtaskId, input) {
      const task = find(taskId), now = new Date().toISOString();
      if (!task?.subtasks.some(subtask => subtask.id === subtaskId)) return { data: null, errorCode: null };
      const updated = task.subtasks.find(subtask => subtask.id === subtaskId);
      if (!updated) return { data: null, errorCode: null };
      const subtask = { ...updated, ...input, updatedAt: now };
      save({ ...task, subtasks: task.subtasks.map(value => value.id === subtaskId ? subtask : value), updatedAt: now });
      return { data: subtask, errorCode: null };
    },
    async deleteSubtaskOwned(_userId, taskId, subtaskId) {
      const task = find(taskId);
      if (!task?.subtasks.some(subtask => subtask.id === subtaskId)) return { data: false, errorCode: null };
      save({ ...task, subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId), updatedAt: new Date().toISOString() });
      return { data: true, errorCode: null };
    },
    async updateOwned(_userId, taskId, input) {
      const task = find(taskId);
      return task
        ? save({ ...task, ...input, updatedAt: new Date().toISOString() })
        : { data: null, errorCode: null };
    },
  };
}

export function createE2eStudyRepositories(scope: string) {
  const profileRepository: ProfileRepository = {
    async findByUserId(userId) {
      return {
        data: profileFor(scope, userId),
        errorCode: null,
      };
    },
    async updateOwned(userId, update) {
      const current = profileFor(scope, userId);
      const updated: Profile = {
        ...current,
        ...update,
        updatedAt: new Date().toISOString(),
      };
      profileStores.set(scope, updated);
      return { data: updated, errorCode: null };
    },
  };
  const subjects = subjectsFor(scope);
  const subjectRepository: SubjectRepository = {
    async createOwned(_userId, input) {
      if (subjects.some((subject) => subject.name.toLowerCase() === input.name.toLowerCase())) {
        return { data: null, errorCode: "23505" };
      }
      const now = new Date().toISOString();
      const subject: Subject = {
        ...input,
        createdAt: now,
        id: randomUUID(),
        icon: input.icon ?? null,
        updatedAt: now,
      };
      subjects.push(subject);
      return { data: subject, errorCode: null };
    },
    async deleteOwned() {
      return { data: false, errorCode: "provider_error" };
    },
    async listOwned() {
      return { data: [...subjects], errorCode: null };
    },
    async listPageOwned(_userId, input) {
      const ordered = [...subjects].sort((left, right) =>
        left.position - right.position
        || left.createdAt.localeCompare(right.createdAt)
        || left.id.localeCompare(right.id));
      const after = input.cursor
        ? ordered.filter((subject) =>
          subject.position > input.cursor!.position
          || (subject.position === input.cursor!.position
            && subject.createdAt > input.cursor!.createdAt)
          || (subject.position === input.cursor!.position
            && subject.createdAt === input.cursor!.createdAt
            && subject.id > input.cursor!.id))
        : ordered;
      return { data: after.slice(0, input.limit), errorCode: null };
    },
    async findOwned(_userId, subjectId) {
      return {
        data: subjects.find((subject) => subject.id === subjectId) ?? null,
        errorCode: null,
      };
    },
    async findManyOwned(_userId, subjectIds) {
      return { data: subjects.filter(subject => subjectIds.includes(subject.id)), errorCode: null };
    },
    async updateOwned() {
      return { data: null, errorCode: "provider_error" };
    },
  };
  return {
    profileRepository,
    subjectRepository,
    taskRepository: taskRepository(scope),
  };
}
