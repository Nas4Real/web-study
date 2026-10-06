import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { ChapterRepository } from "./chapter-service";
import type {
  Chapter, ChapterCreate, ChapterUpdate, FileMetadata, Folder, FolderCreate, FolderUpdate,
  UploadIntentInput, UploadIntentReservation,
} from "./document-domain";
import type { DocumentRepository } from "./document-service";
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
const uploadReservationRowSchema = z.object({
  chapter_id: z.string().uuid().nullable(),
  created_at: z.string().datetime({ offset: true }),
  display_name: z.string().min(1).max(512),
  expires_at: z.string().datetime({ offset: true }),
  extension: z.enum(["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg"]),
  file_id: z.string().uuid(),
  folder_id: z.string().uuid().nullable(),
  intent_id: z.string().uuid(),
  mime_type: z.string().min(1).max(255),
  object_key: z.string().min(1).max(256),
  original_filename: z.string().min(1).max(512),
  size_bytes: z.number().int().min(1).max(52_428_800),
  subject_id: z.string().uuid(),
  upload_state: z.literal("pending"),
}).strict();
const fileMetadataFields = {
  chapter_id: z.string().uuid().nullable(),
  created_at: z.string().datetime({ offset: true }),
  display_name: z.string().min(1).max(512),
  extension: z.enum(["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg"]),
  file_id: z.string().uuid(),
  folder_id: z.string().uuid().nullable(),
  mime_type: z.string().min(1).max(255),
  original_filename: z.string().min(1).max(512),
  size_bytes: z.number().int().min(1).max(52_428_800),
  subject_id: z.string().uuid(),
  upload_state: z.enum(["pending", "ready", "failed", "deleting", "deleted"]),
} as const;
const completionTargetRowSchema = z.object({
  ...fileMetadataFields,
  expected_mime_type: z.string().min(1).max(255),
  expires_at: z.string().datetime({ offset: true }),
  intent_status: z.enum(["pending", "completed", "expired", "failed"]),
  object_key: z.string().min(1).max(256),
}).strict();
const finalizeRowSchema = z.object({
  chapter_id: fileMetadataFields.chapter_id,
  created_at: fileMetadataFields.created_at.nullable(),
  display_name: fileMetadataFields.display_name.nullable(),
  extension: fileMetadataFields.extension.nullable(),
  file_id: fileMetadataFields.file_id.nullable(),
  folder_id: fileMetadataFields.folder_id,
  mime_type: fileMetadataFields.mime_type.nullable(),
  original_filename: fileMetadataFields.original_filename.nullable(),
  result_code: z.enum(["READY", "NOT_FOUND", "EXPIRED", "VERIFICATION_FAILED", "QUOTA_EXCEEDED"]),
  size_bytes: fileMetadataFields.size_bytes.nullable(),
  subject_id: fileMetadataFields.subject_id.nullable(),
  upload_state: fileMetadataFields.upload_state.nullable(),
}).strict();
const cleanupJobRowSchema = z.object({
  id: z.string().uuid(), object_key: z.string().min(1).max(256),
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

function toUploadReservation(userId: string, input: unknown): UploadIntentReservation | null {
  const row = uploadReservationRowSchema.safeParse(input);
  if (!row.success || row.data.object_key !== `users/${userId}/files/${row.data.file_id}`) return null;
  return {
    chapterId: row.data.chapter_id,
    createdAt: row.data.created_at,
    displayName: row.data.display_name,
    expiresAt: row.data.expires_at,
    extension: row.data.extension,
    fileId: row.data.file_id,
    folderId: row.data.folder_id,
    intentId: row.data.intent_id,
    mimeType: row.data.mime_type,
    objectKey: row.data.object_key,
    originalFilename: row.data.original_filename,
    sizeBytes: row.data.size_bytes,
    subjectId: row.data.subject_id,
    uploadState: row.data.upload_state,
  };
}

function fileMetadata(row: z.infer<typeof completionTargetRowSchema> | z.infer<typeof finalizeRowSchema>): FileMetadata | null {
  if (!row.file_id || !row.created_at || !row.display_name || !row.extension || !row.mime_type ||
    !row.original_filename || row.size_bytes === null || !row.subject_id || !row.upload_state) return null;
  return {
    chapterId: row.chapter_id, createdAt: row.created_at, displayName: row.display_name,
    extension: row.extension, folderId: row.folder_id, id: row.file_id, mimeType: row.mime_type,
    originalFilename: row.original_filename, sizeBytes: row.size_bytes,
    subjectId: row.subject_id, uploadState: row.upload_state,
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

export function createSupabaseUploadIntentRepository(supabase: SupabaseClient): DocumentRepository {
  return {
    async expirePending(limit) {
      const { data, error } = await supabase.rpc("expire_file_uploads", { p_limit: limit });
      return typeof data === "number" && Number.isInteger(data) && data >= 0
        ? { data, errorCode: errorCode(error) }
        : { data: null, errorCode: errorCode(error) ?? "provider_error" };
    },

    async finalizeOwned(userId, fileId, actual) {
      const { data, error } = await supabase.rpc("finalize_file_upload", {
        p_actual_mime_type: actual.actualMimeType,
        p_actual_size_bytes: actual.actualSizeBytes,
        p_file_id: fileId,
        p_user_id: userId,
      }).single();
      const row = finalizeRowSchema.safeParse(data);
      if (!row.success) return { data: null, errorCode: errorCode(error) ?? "provider_error" };
      const file = row.data.result_code === "READY" ? fileMetadata(row.data) : null;
      if (row.data.result_code === "READY" && !file) return { data: null, errorCode: "provider_error" };
      return { data: { code: row.data.result_code, file }, errorCode: errorCode(error) };
    },

    async findCompletionTargetOwned(userId, fileId) {
      const { data, error } = await supabase.rpc("get_file_upload_completion_target", {
        p_file_id: fileId, p_user_id: userId,
      }).maybeSingle();
      if (!data) return { data: null, errorCode: errorCode(error) };
      const row = completionTargetRowSchema.safeParse(data);
      const file = row.success ? fileMetadata(row.data) : null;
      if (!row.success || !file || row.data.object_key !== `users/${userId}/files/${fileId}`) {
        return { data: null, errorCode: errorCode(error) ?? "provider_error" };
      }
      return { data: {
        expectedMimeType: row.data.expected_mime_type, expiresAt: row.data.expires_at,
        file, intentStatus: row.data.intent_status, objectKey: row.data.object_key,
      }, errorCode: errorCode(error) };
    },

    async listDueCleanup(limit) {
      const { data, error } = await supabase.rpc("claim_file_cleanup_jobs", { p_limit: limit });
      const rows = z.array(cleanupJobRowSchema).safeParse(data);
      return rows.success
        ? { data: rows.data.map(row => ({ id: row.id, objectKey: row.object_key })), errorCode: errorCode(error) }
        : { data: null, errorCode: errorCode(error) ?? "provider_error" };
    },

    async markCleanupCompleted(jobId) {
      const { data, error } = await supabase.rpc("complete_file_cleanup_job", { p_job_id: jobId });
      return typeof data === "boolean"
        ? { data, errorCode: errorCode(error) }
        : { data: null, errorCode: errorCode(error) ?? "provider_error" };
    },

    async markCleanupRetry(jobId, cleanupErrorCode) {
      const { data, error } = await supabase.rpc("retry_file_cleanup_job", {
        p_error_code: cleanupErrorCode, p_job_id: jobId,
      });
      return typeof data === "boolean"
        ? { data, errorCode: errorCode(error) }
        : { data: null, errorCode: errorCode(error) ?? "provider_error" };
    },

    async reserveOwned(userId: string, input: UploadIntentInput) {
      const { data, error } = await supabase.rpc("reserve_file_upload", {
        p_chapter_id: input.chapterId,
        p_extension: input.extension,
        p_filename: input.filename,
        p_folder_id: input.folderId,
        p_mime_type: input.mimeType,
        p_size_bytes: input.sizeBytes,
        p_subject_id: input.subjectId,
        p_user_id: userId,
      }).single();
      const mapped = data ? toUploadReservation(userId, data) : null;
      return data && !mapped
        ? { data: null, errorCode: errorCode(error) ?? "provider_error" }
        : { data: mapped, errorCode: errorCode(error) };
    },
  };
}
