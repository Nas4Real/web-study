import { z } from "zod";

import type { ChapterService } from "@/server/study/chapter-service";
import type { Chapter } from "@/server/study/document-domain";

import { publicApiErrorResponse } from "./public-api-contract";
import type { PublicApiRequestContext } from "./public-api-handler";
import { encodeCursor, parsePageRequest } from "./public-api-pagination";

const createSchema = z.object({
  name: z.string().min(1).max(160),
  position: z.number().int().min(0).default(0),
  subject_id: z.string().uuid(),
}).strict();
const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  position: z.number().int().min(0).optional(),
}).strict().refine(value => Object.keys(value).length > 0);

function project(value: Chapter) {
  return {
    id: value.id,
    name: value.name,
    position: value.position,
    subject_id: value.subjectId,
  };
}

function error(code: string, requestId: string) {
  if (code === "INVALID_ACTOR") return publicApiErrorResponse({ code: "UNAUTHENTICATED", requestId, status: 401 });
  if (code === "INVALID_INPUT") return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId, status: 422 });
  if (code === "NOT_FOUND") return publicApiErrorResponse({ code: "NOT_FOUND", requestId, status: 404 });
  if (code === "CONFLICT" || code === "DUPLICATE_NAME") return publicApiErrorResponse({ code: "CONFLICT", requestId, status: 409 });
  return publicApiErrorResponse({ code: "PROVIDER_UNAVAILABLE", requestId, status: 503 });
}

async function json(request: Request) {
  try { return await request.json(); } catch { return undefined; }
}

export function createChaptersCollectionAdapter(chapters: ChapterService) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const page = parsePageRequest(url.searchParams);
      const subjectId = url.searchParams.get("subject_id") ?? undefined;
      if (page.status === "error" || (subjectId !== undefined && !z.string().uuid().safeParse(subjectId).success)) {
        return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
      }
      const result = await chapters.listPage(context.actor.userId, { ...page.data, subjectId });
      if (result.status === "error") return error(result.code, context.requestId);
      return Response.json({
        data: result.data.items.map(project),
        pagination: { next_cursor: result.data.nextCursor ? encodeCursor(result.data.nextCursor) : null },
      });
    }
    const parsed = createSchema.safeParse(await json(request));
    if (!parsed.success) return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
    const result = await chapters.create(context.actor.userId, {
      name: parsed.data.name, position: parsed.data.position, subjectId: parsed.data.subject_id,
    });
    return result.status === "error"
      ? error(result.code, context.requestId)
      : Response.json(project(result.data), { status: 201 });
  };
}

export function createChapterItemAdapter(chapters: ChapterService, chapterId: string) {
  return async (request: Request, context: PublicApiRequestContext) => {
    if (request.method === "GET") {
      const result = await chapters.find(context.actor.userId, chapterId);
      return result.status === "error" ? error(result.code, context.requestId) : Response.json(project(result.data));
    }
    if (request.method === "DELETE") {
      const result = await chapters.delete(context.actor.userId, chapterId);
      return result.status === "error" ? error(result.code, context.requestId) : new Response(null, { status: 204 });
    }
    const parsed = patchSchema.safeParse(await json(request));
    if (!parsed.success) return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId: context.requestId, status: 422 });
    const result = await chapters.update(context.actor.userId, chapterId, parsed.data);
    return result.status === "error" ? error(result.code, context.requestId) : Response.json(project(result.data));
  };
}
