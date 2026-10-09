import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProfileRepository } from "./profile-service";
import type {
  Profile,
  ProfileUpdate,
  Subject,
  SubjectCreate,
  SubjectUpdate,
} from "./study-domain";
import type { SubjectRepository } from "./subject-service";
import type {
  Task,
  TaskCreate,
  TaskSubtask,
  TaskUpdate,
} from "./task-domain";
import type { TaskRepository } from "./task-service";

const PROFILE_COLUMNS =
  "id, display_name, timezone, avatar_object_key, storage_quota_bytes, storage_used_bytes, storage_reserved_bytes, created_at, updated_at";
const SUBJECT_COLUMNS =
  "id, name, color, icon, position, created_at, updated_at";
const TASK_COLUMNS =
  "id, subject_id, title, description, priority, status, due_at, completed_at, created_at, updated_at, task_subtasks(id, title, position, completed_at, created_at, updated_at)";

type ProfileRow = Readonly<{
  avatar_object_key: string | null;
  created_at: string;
  display_name: string;
  id: string;
  storage_quota_bytes: number;
  storage_reserved_bytes: number;
  storage_used_bytes: number;
  timezone: string;
  updated_at: string;
}>;

type SubjectRow = Readonly<{
  color: string;
  created_at: string;
  icon: string | null;
  id: string;
  name: string;
  position: number;
  updated_at: string;
}>;

type TaskSubtaskRow = Readonly<{
  completed_at: string | null;
  created_at: string;
  id: string;
  position: number;
  title: string;
  updated_at: string;
}>;

type TaskRow = Readonly<{
  completed_at: string | null;
  created_at: string;
  description: string | null;
  due_at: string | null;
  id: string;
  priority: "normal" | "high";
  status: "pending" | "completed" | "someday";
  subject_id: string;
  task_subtasks: TaskSubtaskRow[] | null;
  title: string;
  updated_at: string;
}>;

function errorCode(error: unknown) {
  if (!error || typeof error !== "object") return error ? "provider_error" : null;
  const code = Reflect.get(error, "code");
  return typeof code === "string" && code.length > 0 ? code : "provider_error";
}

function toProfile(row: ProfileRow): Profile {
  return {
    avatarObjectKey: row.avatar_object_key,
    createdAt: row.created_at,
    displayName: row.display_name,
    id: row.id,
    storageQuotaBytes: row.storage_quota_bytes,
    storageReservedBytes: row.storage_reserved_bytes,
    storageUsedBytes: row.storage_used_bytes,
    timezone: row.timezone,
    updatedAt: row.updated_at,
  };
}

function toSubject(row: SubjectRow): Subject {
  return {
    color: row.color,
    createdAt: row.created_at,
    icon: row.icon,
    id: row.id,
    name: row.name,
    position: row.position,
    updatedAt: row.updated_at,
  };
}

function toTaskSubtask(row: TaskSubtaskRow): TaskSubtask {
  return {
    completedAt: row.completed_at,
    createdAt: row.created_at,
    id: row.id,
    position: row.position,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function toTask(row: TaskRow): Task {
  return {
    completedAt: row.completed_at,
    createdAt: row.created_at,
    description: row.description,
    dueAt: row.due_at,
    id: row.id,
    priority: row.priority,
    status: row.status,
    subjectId: row.subject_id,
    subtasks: [...(row.task_subtasks ?? [])]
      .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
      .map(toTaskSubtask),
    title: row.title,
    updatedAt: row.updated_at,
  };
}

export function createSupabaseProfileRepository(
  supabase: SupabaseClient,
): ProfileRepository {
  return {
    async findByUserId(userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .maybeSingle();
      return {
        data: data ? toProfile(data as ProfileRow) : null,
        errorCode: errorCode(error),
      };
    },

    async updateOwned(userId, update: ProfileUpdate) {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          avatar_object_key: update.avatarObjectKey,
          display_name: update.displayName,
          timezone: update.timezone,
        })
        .eq("id", userId)
        .select(PROFILE_COLUMNS)
        .maybeSingle();
      return {
        data: data ? toProfile(data as ProfileRow) : null,
        errorCode: errorCode(error),
      };
    },
  };
}

function subjectWrite(input: SubjectCreate | SubjectUpdate) {
  return {
    ...(input.color === undefined ? {} : { color: input.color }),
    ...(input.icon === undefined ? {} : { icon: input.icon }),
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.position === undefined ? {} : { position: input.position }),
  };
}

export function createSupabaseSubjectRepository(
  supabase: SupabaseClient,
): SubjectRepository {
  return {
    async listOwned(userId) {
      const { data, error } = await supabase
        .from("subjects")
        .select(SUBJECT_COLUMNS)
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      return {
        data: data ? (data as SubjectRow[]).map(toSubject) : null,
        errorCode: errorCode(error),
      };
    },

    async listPageOwned(userId, input) {
      let query = supabase
        .from("subjects")
        .select(SUBJECT_COLUMNS)
        .eq("user_id", userId);
      if (input.cursor) {
        const { createdAt, id, position } = input.cursor;
        query = query.or([
          `position.gt.${position}`,
          `and(position.eq.${position},created_at.gt.${createdAt})`,
          `and(position.eq.${position},created_at.eq.${createdAt},id.gt.${id})`,
        ].join(","));
      }
      const { data, error } = await query
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(input.limit);
      return {
        data: data ? (data as SubjectRow[]).map(toSubject) : null,
        errorCode: errorCode(error),
      };
    },

    async findOwned(userId, subjectId) {
      const { data, error } = await supabase
        .from("subjects")
        .select(SUBJECT_COLUMNS)
        .eq("id", subjectId)
        .eq("user_id", userId)
        .maybeSingle();
      return {
        data: data ? toSubject(data as SubjectRow) : null,
        errorCode: errorCode(error),
      };
    },

    async createOwned(userId, input) {
      const { data, error } = await supabase
        .from("subjects")
        .insert({ user_id: userId, ...subjectWrite(input) })
        .select(SUBJECT_COLUMNS)
        .single();
      return {
        data: data ? toSubject(data as SubjectRow) : null,
        errorCode: errorCode(error),
      };
    },

    async updateOwned(userId, subjectId, input) {
      const { data, error } = await supabase
        .from("subjects")
        .update(subjectWrite(input))
        .eq("id", subjectId)
        .eq("user_id", userId)
        .select(SUBJECT_COLUMNS)
        .maybeSingle();
      return {
        data: data ? toSubject(data as SubjectRow) : null,
        errorCode: errorCode(error),
      };
    },

    async deleteOwned(userId, subjectId) {
      const { data, error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subjectId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      return { data: data !== null, errorCode: errorCode(error) };
    },
  };
}

function taskWrite(input: TaskUpdate) {
  return {
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.dueAt === undefined ? {} : { due_at: input.dueAt }),
    ...(input.priority === undefined ? {} : { priority: input.priority }),
    ...(input.subjectId === undefined ? {} : { subject_id: input.subjectId }),
    ...(input.title === undefined ? {} : { title: input.title }),
  };
}

export function createSupabaseTaskRepository(
  supabase: SupabaseClient,
): TaskRepository {
  async function findOwned(userId: string, taskId: string) {
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .eq("id", taskId)
      .eq("user_id", userId)
      .maybeSingle();
    return {
      data: data ? toTask(data as unknown as TaskRow) : null,
      errorCode: errorCode(error),
    };
  }

  async function findAfterMutation(
    userId: string,
    taskId: string,
    mutationError: unknown,
  ) {
    const code = errorCode(mutationError);
    return code ? { data: null, errorCode: code } : findOwned(userId, taskId);
  }

  return {
    async listOwned(userId) {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_COLUMNS)
        .eq("user_id", userId)
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      return {
        data: data ? (data as unknown as TaskRow[]).map(toTask) : null,
        errorCode: errorCode(error),
      };
    },

    findOwned,

    async createOwned(userId, input: TaskCreate) {
      const { data, error } = await supabase
        .rpc("create_task_with_subtasks", {
          p_description: input.description,
          p_due_at: input.dueAt,
          p_priority: input.priority,
          p_subject_id: input.subjectId,
          p_subtasks: input.subtasks.map(({ title }) => title),
          p_title: input.title,
          p_user_id: userId,
        })
        .single();
      const code = errorCode(error);
      if (code || !data || typeof data !== "object") {
        return { data: null, errorCode: code ?? "provider_error" };
      }
      const taskId = Reflect.get(data, "id");
      return typeof taskId === "string"
        ? findOwned(userId, taskId)
        : { data: null, errorCode: "provider_error" };
    },

    async updateOwned(userId, taskId, input) {
      const { data, error } = await supabase
        .from("tasks")
        .update(taskWrite(input))
        .eq("id", taskId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      return data
        ? findAfterMutation(userId, taskId, error)
        : { data: null, errorCode: errorCode(error) };
    },

    async deleteOwned(userId, taskId) {
      const { data, error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      return { data: data !== null, errorCode: errorCode(error) };
    },

    async setStatusOwned(userId, taskId, status, completedAt) {
      const { data, error } = await supabase
        .from("tasks")
        .update({ completed_at: completedAt, status })
        .eq("id", taskId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      return data
        ? findAfterMutation(userId, taskId, error)
        : { data: null, errorCode: errorCode(error) };
    },

    async toggleSubtaskOwned(userId, taskId, subtaskId, completedAt) {
      const { data, error } = await supabase
        .from("task_subtasks")
        .update({ completed_at: completedAt })
        .eq("id", subtaskId)
        .eq("task_id", taskId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      return data
        ? findAfterMutation(userId, taskId, error)
        : { data: null, errorCode: errorCode(error) };
    },
  };
}
