import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { ChapterRepository } from "./chapter-service";
import type {
  Chapter, ChapterCreate, ChapterUpdate, Folder, FolderCreate, FolderUpdate,
} from "./document-domain";
import type { FolderRepository } from "./folder-service";

const chapterColumns = "id, subject_id, name, position, created_at, updated_at";
const folderColumns = "id, subject_id, chapter_id, parent_id, name, position, created_at, updated_at";

const chapterRowSchema = z.object({
  created_at: z.string().min(1), id: z.string().uuid(), name: z.string(), position: z.number().int(),
  subject_id: z.string().uuid(), updated_at: z.string().min(1),
}).strict();
const folderRowSchema = z.object({
  chapter_id: z.string().uuid().nullable(), created_at: z.string().min(1), id: z.string().uuid(),
  name: z.string(), parent_id: z.string().uuid().nullable(), position: z.number().int(),
  subject_id: z.string().uuid(), updated_at: z.string().min(1),
}).strict();

function errorCode(error: unknown) {
  if (!error || typeof error !== "object") return error ? "provider_error" : null;
  const code = Reflect.get(error, "code");
  return typeof code === "string" && code.length > 0 ? code : "provider_error";
}

function toChapter(input: unknown): Chapter | null {
  const row = chapterRowSchema.safeParse(input);
  if (!row.success) return null;
  return {
    createdAt: row.data.created_at, id: row.data.id, name: row.data.name,
    position: row.data.position, subjectId: row.data.subject_id, updatedAt: row.data.updated_at,
  };
}

function toFolder(input: unknown): Folder | null {
  const row = folderRowSchema.safeParse(input);
  if (!row.success) return null;
  return {
    chapterId: row.data.chapter_id, createdAt: row.data.created_at, id: row.data.id,
    name: row.data.name, parentId: row.data.parent_id, position: row.data.position,
    subjectId: row.data.subject_id, updatedAt: row.data.updated_at,
  };
}

function chapterWrite(input: ChapterCreate | ChapterUpdate) {
  return {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.position === undefined ? {} : { position: input.position }),
    ...(Reflect.has(input, "subjectId") ? { subject_id: (input as ChapterCreate).subjectId } : {}),
  };
}

function folderWrite(input: FolderCreate | FolderUpdate) {
  return {
    ...(input.chapterId === undefined ? {} : { chapter_id: input.chapterId }),
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.parentId === undefined ? {} : { parent_id: input.parentId }),
    ...(input.position === undefined ? {} : { position: input.position }),
    ...(Reflect.has(input, "subjectId") ? { subject_id: (input as FolderCreate).subjectId } : {}),
  };
}

export function createSupabaseChapterRepository(supabase: SupabaseClient): ChapterRepository {
  return {
    async listOwned(userId, filter) {
      let query = supabase.from("chapters").select(chapterColumns).eq("user_id", userId);
      if (filter.subjectId) query = query.eq("subject_id", filter.subjectId);
      const { data, error } = await query.order("position", { ascending: true });
      const mapped = data?.map(toChapter);
      return mapped?.every(Boolean)
        ? { data: mapped as Chapter[], errorCode: errorCode(error) }
        : { data: null, errorCode: errorCode(error) ?? "provider_error" };
    },

    async findOwned(userId, chapterId) {
      const { data, error } = await supabase.from("chapters").select(chapterColumns)
        .eq("id", chapterId).eq("user_id", userId).maybeSingle();
      const mapped = data ? toChapter(data) : null;
      return data && !mapped
        ? { data: null, errorCode: errorCode(error) ?? "provider_error" }
        : { data: mapped, errorCode: errorCode(error) };
    },

    async createOwnedWithStarters(userId, input, starterNames) {
      const { data, error } = await supabase.rpc("create_chapter_with_starter_folders", {
        p_name: input.name, p_position: input.position, p_starter_names: [...starterNames],
        p_subject_id: input.subjectId, p_user_id: userId,
      }).single();
      const mapped = data ? toChapter(data) : null;
      return data && !mapped
        ? { data: null, errorCode: errorCode(error) ?? "provider_error" }
        : { data: mapped, errorCode: errorCode(error) };
    },

    async updateOwned(userId, chapterId, input) {
      const { data, error } = await supabase.from("chapters").update(chapterWrite(input))
        .eq("id", chapterId).eq("user_id", userId).select(chapterColumns).maybeSingle();
      const mapped = data ? toChapter(data) : null;
      return data && !mapped
        ? { data: null, errorCode: errorCode(error) ?? "provider_error" }
        : { data: mapped, errorCode: errorCode(error) };
    },

    async deleteOwned(userId, chapterId) {
      const { data, error } = await supabase.from("chapters").delete()
        .eq("id", chapterId).eq("user_id", userId).select("id").maybeSingle();
      const returnedId = data && typeof data === "object" ? Reflect.get(data, "id") : null;
      return returnedId === null
        ? { data: false, errorCode: errorCode(error) }
        : { data: returnedId === chapterId, errorCode: returnedId === chapterId ? errorCode(error) : "provider_error" };
    },
  };
}

export function createSupabaseFolderRepository(supabase: SupabaseClient): FolderRepository {
  return {
    async listOwned(userId, filter) {
      let query = supabase.from("folders").select(folderColumns).eq("user_id", userId);
      if (filter.subjectId) query = query.eq("subject_id", filter.subjectId);
      if (filter.chapterId !== undefined) query = filter.chapterId === null ? query.is("chapter_id", null) : query.eq("chapter_id", filter.chapterId);
      if (filter.parentId !== undefined) query = filter.parentId === null ? query.is("parent_id", null) : query.eq("parent_id", filter.parentId);
      const { data, error } = await query.order("position", { ascending: true });
      const mapped = data?.map(toFolder);
      return mapped?.every(Boolean)
        ? { data: mapped as Folder[], errorCode: errorCode(error) }
        : { data: null, errorCode: errorCode(error) ?? "provider_error" };
    },

    async findOwned(userId, folderId) {
      const { data, error } = await supabase.from("folders").select(folderColumns)
        .eq("id", folderId).eq("user_id", userId).maybeSingle();
      const mapped = data ? toFolder(data) : null;
      return data && !mapped
        ? { data: null, errorCode: errorCode(error) ?? "provider_error" }
        : { data: mapped, errorCode: errorCode(error) };
    },

    async createOwned(userId, input) {
      const { data, error } = await supabase.from("folders")
        .insert({ user_id: userId, ...folderWrite(input) }).select(folderColumns).single();
      const mapped = data ? toFolder(data) : null;
      return data && !mapped
        ? { data: null, errorCode: errorCode(error) ?? "provider_error" }
        : { data: mapped, errorCode: errorCode(error) };
    },

    async updateOwned(userId, folderId, input) {
      const { data, error } = await supabase.from("folders").update(folderWrite(input))
        .eq("id", folderId).eq("user_id", userId).select(folderColumns).maybeSingle();
      const mapped = data ? toFolder(data) : null;
      return data && !mapped
        ? { data: null, errorCode: errorCode(error) ?? "provider_error" }
        : { data: mapped, errorCode: errorCode(error) };
    },

    async deleteOwned(userId, folderId) {
      const { data, error } = await supabase.from("folders").delete()
        .eq("id", folderId).eq("user_id", userId).select("id").maybeSingle();
      const returnedId = data && typeof data === "object" ? Reflect.get(data, "id") : null;
      return returnedId === null
        ? { data: false, errorCode: errorCode(error) }
        : { data: returnedId === folderId, errorCode: returnedId === folderId ? errorCode(error) : "provider_error" };
    },

    async isDescendantOwned(userId, folderId, candidateId) {
      const { data, error } = await supabase.rpc("is_folder_descendant", {
        p_ancestor_id: folderId, p_candidate_id: candidateId, p_user_id: userId,
      });
      return typeof data === "boolean"
        ? { data, errorCode: errorCode(error) }
        : { data: null, errorCode: errorCode(error) ?? "provider_error" };
    },
  };
}
