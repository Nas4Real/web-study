import { z } from "zod";

import type { FileMetadata } from "@/server/study/document-domain";
import type { DocumentLibraryService } from "@/server/study/document-library-service";
import type { ProfileService } from "@/server/study/profile-service";
import type { Profile } from "@/server/study/study-domain";

import { publicApiErrorResponse } from "./public-api-contract";
import type { PublicApiRequestContext } from "./public-api-handler";

const id = z.string().uuid();
const profilePatchSchema = z.object({
  display_name: z.string().trim().min(1).max(120).optional(),
  timezone: z.string().trim().min(1).max(64).refine(value => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }).optional(),
}).strict().refine(value => Object.keys(value).length > 0);
const filePatchSchema = z.object({
  chapter_id: id.nullable().optional(),
  folder_id: id.nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0);
const fileQuerySchema = z.object({
  chapterId: id.optional(),
  folderId: id.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  query: z.string().trim().max(160).optional(),
  sort: z.enum(["latest", "oldest", "name", "size"]).default("latest"),
  subjectId: id.optional(),
}).strict();

function failure(code: string, requestId: string) {
  if (code === "INVALID_ACTOR") {
    return publicApiErrorResponse({ code: "UNAUTHENTICATED", requestId, status: 401 });
  }
  if (code === "INVALID_INPUT") {
    return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId, status: 422 });
  }
  if (code === "NOT_FOUND") {
    return publicApiErrorResponse({ code: "NOT_FOUND", requestId, status: 404 });
  }
  return publicApiErrorResponse({ code: "PROVIDER_UNAVAILABLE", requestId, status: 503 });
}

async function json(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function projectProfile(profile: Profile) {
  return {
    avatar_url: null,
    display_name: profile.displayName,
    id: profile.id,
    storage_quota_bytes: profile.storageQuotaBytes,
    storage_reserved_bytes: profile.storageReservedBytes,
    storage_used_bytes: profile.storageUsedBytes,
    timezone: profile.timezone,
  };
}

function projectFile(file: FileMetadata) {
  return {
    chapter_id: file.chapterId,
    created_at: file.createdAt,
    display_name: file.displayName,
    extension: file.extension,
    folder_id: file.folderId,
    id: file.id,
    mime_type: file.mimeType,
    original_filename: file.originalFilename,
    size_bytes: file.sizeBytes,
    subject_id: file.subjectId,
    upload_state: file.uploadState,
  };
}

export function createProfileAdapter(profile: ProfileService) {
  return async (request: Request, context: PublicApiRequestContext) => {
    const current = await profile.get(context.actor.userId);
    if (current.status === "error") return failure(current.code, context.requestId);
    if (request.method === "GET") return Response.json(projectProfile(current.data));

    const parsed = profilePatchSchema.safeParse(await json(request));
    if (!parsed.success) return failure("INVALID_INPUT", context.requestId);
    const result = await profile.update(context.actor.userId, {
      avatarObjectKey: current.data.avatarObjectKey,
      displayName: parsed.data.display_name ?? current.data.displayName,
      timezone: parsed.data.timezone ?? current.data.timezone,
    });
    return result.status === "error"
      ? failure(result.code, context.requestId)
      : Response.json(projectProfile(result.data));
  };
}

export function createStorageAdapter(profile: ProfileService) {
  return async (_request: Request, context: PublicApiRequestContext) => {
    const result = await profile.get(context.actor.userId);
    if (result.status === "error") return failure(result.code, context.requestId);
    return Response.json({
      available_bytes: Math.max(0, result.data.storageQuotaBytes
        - result.data.storageUsedBytes - result.data.storageReservedBytes),
      quota_bytes: result.data.storageQuotaBytes,
      reserved_bytes: result.data.storageReservedBytes,
      used_bytes: result.data.storageUsedBytes,
    });
  };
}

export function createFilesCollectionAdapter(files: DocumentLibraryService) {
  return async (request: Request, context: PublicApiRequestContext) => {
    const search = new URL(request.url).searchParams;
    const allowed = new Set(["chapter_id", "folder_id", "limit", "query", "sort", "subject_id"]);
    if ([...search.keys()].some(key => !allowed.has(key) || search.getAll(key).length !== 1)) {
      return failure("INVALID_INPUT", context.requestId);
    }
    const parsed = fileQuerySchema.safeParse({
      chapterId: search.get("chapter_id") ?? undefined,
      folderId: search.get("folder_id") ?? undefined,
      limit: search.get("limit") ?? undefined,
      query: search.get("query") ?? undefined,
      sort: search.get("sort") ?? undefined,
      subjectId: search.get("subject_id") ?? undefined,
    });
    if (!parsed.success) return failure("INVALID_INPUT", context.requestId);
    const result = await files.list(context.actor.userId, parsed.data);
    return result.status === "error"
      ? failure(result.code, context.requestId)
      : Response.json(result.data.map(projectFile));
  };
}

export function createFileItemAdapter(files: DocumentLibraryService, fileId: string) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "GET") {
      const result = await files.find(context.actor.userId, fileId);
      return result.status === "error"
        ? failure(result.code, context.requestId)
        : Response.json(projectFile(result.data));
    }
    if (request.method === "DELETE") {
      const result = await files.delete(context.actor.userId, fileId);
      return result.status === "error"
        ? failure(result.code, context.requestId)
        : new Response(null, { status: 204 });
    }

    const parsed = filePatchSchema.safeParse(await json(request));
    if (!parsed.success) return failure("INVALID_INPUT", context.requestId);
    const current = await files.find(context.actor.userId, fileId);
    if (current.status === "error") return failure(current.code, context.requestId);
    const result = await files.move(context.actor.userId, fileId, {
      chapterId: parsed.data.chapter_id === undefined
        ? current.data.chapterId
        : parsed.data.chapter_id,
      folderId: parsed.data.folder_id === undefined
        ? current.data.folderId
        : parsed.data.folder_id,
    });
    return result.status === "error"
      ? failure(result.code, context.requestId)
      : Response.json(projectFile(result.data));
  };
}

export function createUnavailableStorageAdapter() {
  return async (_request: Request, context: PublicApiRequestContext) =>
    publicApiErrorResponse({
      code: "PROVIDER_UNAVAILABLE",
      requestId: context.requestId,
      status: 503,
    });
}
