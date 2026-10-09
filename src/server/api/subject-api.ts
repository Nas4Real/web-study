import { z } from "zod";

import type { Subject } from "@/server/study/study-domain";
import type { SubjectService } from "@/server/study/subject-service";

import {
  encodeCursor,
  parsePageRequest,
} from "./public-api-pagination";
import { publicApiErrorResponse } from "./public-api-contract";
import type { PublicApiRequestContext } from "./public-api-handler";

const subjectCreateSchema = z.object({
  color: z.string().min(1).max(80),
  icon: z.string().max(120).nullable().default(null),
  name: z.string().min(1).max(120),
  position: z.number().int().min(0).default(0),
}).strict();

const subjectPatchSchema = subjectCreateSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
);

type SubjectResult = Awaited<
  ReturnType<SubjectService["create" | "delete" | "find" | "listPage" | "update"]>
>;

function projectSubject(subject: Subject) {
  return {
    color: subject.color,
    icon: subject.icon,
    id: subject.id,
    name: subject.name,
  };
}

function resultError(result: Extract<SubjectResult, { status: "error" }>, requestId: string) {
  switch (result.code) {
    case "INVALID_ACTOR":
      return publicApiErrorResponse({ code: "UNAUTHENTICATED", requestId, status: 401 });
    case "INVALID_INPUT":
      return publicApiErrorResponse({ code: "VALIDATION_FAILED", requestId, status: 422 });
    case "NOT_FOUND":
      return publicApiErrorResponse({ code: "NOT_FOUND", requestId, status: 404 });
    case "DUPLICATE_NAME":
      return publicApiErrorResponse({ code: "CONFLICT", requestId, status: 409 });
    default:
      return publicApiErrorResponse({ code: "PROVIDER_UNAVAILABLE", requestId, status: 503 });
  }
}

async function readJson(request: Request) {
  try {
    return { data: await request.json(), status: "success" } as const;
  } catch {
    return { code: "INVALID_INPUT", status: "error" } as const;
  }
}

export function createSubjectsCollectionAdapter(subjects: SubjectService) {
  return async function subjectsCollection(
    request: Request,
    context: PublicApiRequestContext,
  ) {
    if (request.method === "GET") {
      const page = parsePageRequest(new URL(request.url).searchParams);
      if (page.status === "error") {
        return publicApiErrorResponse({
          code: "VALIDATION_FAILED",
          requestId: context.requestId,
          status: 422,
        });
      }
      const result = await subjects.listPage(context.actor.userId, page.data);
      if (result.status === "error") return resultError(result, context.requestId);
      return Response.json({
        data: result.data.items.map(projectSubject),
        pagination: {
          next_cursor: result.data.nextCursor
            ? encodeCursor(result.data.nextCursor)
            : null,
        },
      });
    }

    const body = await readJson(request);
    const parsed = body.status === "success"
      ? subjectCreateSchema.safeParse(body.data)
      : null;
    if (!parsed?.success) {
      return publicApiErrorResponse({
        code: "VALIDATION_FAILED",
        requestId: context.requestId,
        status: 422,
      });
    }
    const result = await subjects.create(context.actor.userId, parsed.data);
    return result.status === "error"
      ? resultError(result, context.requestId)
      : Response.json(projectSubject(result.data), { status: 201 });
  };
}

export function createSubjectItemAdapter(
  subjects: SubjectService,
  subjectId: string,
) {
  return async function subjectItem(
    request: Request,
    context: PublicApiRequestContext,
  ) {
    if (request.method === "GET") {
      const result = await subjects.find(context.actor.userId, subjectId);
      return result.status === "error"
        ? resultError(result, context.requestId)
        : Response.json(projectSubject(result.data));
    }
    if (request.method === "DELETE") {
      const result = await subjects.delete(context.actor.userId, subjectId);
      return result.status === "error"
        ? resultError(result, context.requestId)
        : new Response(null, { status: 204 });
    }

    const body = await readJson(request);
    const parsed = body.status === "success"
      ? subjectPatchSchema.safeParse(body.data)
      : null;
    if (!parsed?.success) {
      return publicApiErrorResponse({
        code: "VALIDATION_FAILED",
        requestId: context.requestId,
        status: 422,
      });
    }
    const result = await subjects.update(context.actor.userId, subjectId, parsed.data);
    return result.status === "error"
      ? resultError(result, context.requestId)
      : Response.json(projectSubject(result.data));
  };
}
