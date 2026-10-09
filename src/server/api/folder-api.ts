import { z } from "zod";

import type { Folder } from "@/server/study/document-domain";
import type { FolderService } from "@/server/study/folder-service";

import { publicApiErrorResponse } from "./public-api-contract";
import type { PublicApiRequestContext } from "./public-api-handler";
import { encodeCursor, parsePageRequest } from "./public-api-pagination";

const nullableId = z.string().uuid().nullable();
const createSchema = z.object({
  chapter_id: nullableId.default(null), name: z.string().min(1).max(160),
  parent_id: nullableId.default(null), position: z.number().int().min(0).default(0),
  subject_id: z.string().uuid(),
}).strict();
const patchSchema = z.object({
  chapter_id: nullableId.optional(), name: z.string().min(1).max(160).optional(),
  parent_id: nullableId.optional(), position: z.number().int().min(0).optional(),
}).strict().refine(value => Object.keys(value).length > 0);

function project(value: Folder) {
  return { chapter_id: value.chapterId, id: value.id, name: value.name,
    parent_id: value.parentId, position: value.position, subject_id: value.subjectId };
}
function failure(code: string, requestId: string) {
  if (code === "INVALID_ACTOR") return publicApiErrorResponse({ code: "UNAUTHENTICATED", requestId, status: 401 });
  if (code === "INVALID_INPUT") return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId, status: 422 });
  if (code === "NOT_FOUND") return publicApiErrorResponse({ code: "NOT_FOUND", requestId, status: 404 });
  if (["CONFLICT", "DUPLICATE_NAME", "FOLDER_CYCLE"].includes(code)) return publicApiErrorResponse({ code: "CONFLICT", requestId, status: 409 });
  return publicApiErrorResponse({ code: "PROVIDER_UNAVAILABLE", requestId, status: 503 });
}
async function json(request: Request) { try { return await request.json(); } catch { return undefined; } }
function optionalId(search: URLSearchParams, name: string) {
  const value = search.get(name);
  if (value === null) return { status: "missing" } as const;
  const parsed = z.string().uuid().safeParse(value);
  return parsed.success ? { data: parsed.data, status: "success" } as const : { status: "error" } as const;
}

export function createFoldersCollectionAdapter(folders: FolderService) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "GET") {
      const search = new URL(request.url).searchParams;
      const page = parsePageRequest(search), subject = optionalId(search, "subject_id");
      const chapter = optionalId(search, "chapter_id"), parent = optionalId(search, "parent_id");
      if (page.status === "error" || subject.status === "error" || chapter.status === "error" || parent.status === "error") {
        return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
      }
      const result = await folders.listPage(context.actor.userId, {
        ...page.data,
        ...(subject.status === "success" ? { subjectId: subject.data } : {}),
        ...(chapter.status === "success" ? { chapterId: chapter.data } : {}),
        ...(parent.status === "success" ? { parentId: parent.data } : {}),
      });
      if (result.status === "error") return failure(result.code, context.requestId);
      return Response.json({ data: result.data.items.map(project), pagination: {
        next_cursor: result.data.nextCursor ? encodeCursor(result.data.nextCursor) : null,
      } });
    }
    const parsed = createSchema.safeParse(await json(request));
    if (!parsed.success) return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
    const result = await folders.create(context.actor.userId, {
      chapterId: parsed.data.chapter_id, name: parsed.data.name, parentId: parsed.data.parent_id,
      position: parsed.data.position, subjectId: parsed.data.subject_id,
    });
    return result.status === "error" ? failure(result.code, context.requestId) : Response.json(project(result.data), { status: 201 });
  };
}

export function createFolderItemAdapter(folders: FolderService, folderId: string) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "GET") {
      const result = await folders.find(context.actor.userId, folderId);
      return result.status === "error" ? failure(result.code, context.requestId) : Response.json(project(result.data));
    }
    if (request.method === "DELETE") {
      const result = await folders.delete(context.actor.userId, folderId);
      return result.status === "error" ? failure(result.code, context.requestId) : new Response(null, { status: 204 });
    }
    const parsed = patchSchema.safeParse(await json(request));
    if (!parsed.success) return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
    const input = {
      ...(parsed.data.chapter_id === undefined ? {} : { chapterId: parsed.data.chapter_id }),
      ...(parsed.data.name === undefined ? {} : { name: parsed.data.name }),
      ...(parsed.data.parent_id === undefined ? {} : { parentId: parsed.data.parent_id }),
      ...(parsed.data.position === undefined ? {} : { position: parsed.data.position }),
    };
    const result = await folders.update(context.actor.userId, folderId, input);
    return result.status === "error" ? failure(result.code, context.requestId) : Response.json(project(result.data));
  };
}
