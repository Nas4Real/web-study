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

const PROFILE_COLUMNS =
  "id, display_name, timezone, avatar_object_key, storage_quota_bytes, storage_used_bytes, storage_reserved_bytes, created_at, updated_at";
const SUBJECT_COLUMNS =
  "id, name, color, icon, position, created_at, updated_at";

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
