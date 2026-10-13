import { MAX_TIMETABLE_BYTES } from "@/domain/timetable-import";
import type { TimetableImportService } from "@/server/study/timetable-import-service";
import { publicApiErrorResponse } from "./public-api-contract";
import type { PublicApiRequestContext } from "./public-api-handler";

async function readBoundedBody(request: Request): Promise<{ text: string } | { error: "size" | "body" }> {
  const length = request.headers.get("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > MAX_TIMETABLE_BYTES) return { error: "size" };
  const reader = request.body?.getReader();
  if (!reader) return { error: "body" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_TIMETABLE_BYTES) { await reader.cancel(); return { error: "size" }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch { return { error: "body" }; }
  finally { reader.releaseLock(); }
}

export function createTimetableImportAdapter(service: TimetableImportService, onImported: () => void = () => {}) {
  return async (request: Request, context: PublicApiRequestContext): Promise<Response> => {
    const invalid = (status: number, message: string) => publicApiErrorResponse({
      code: "VALIDATION_FAILED", status, requestId: context.requestId,
      details: [{ code: "invalid_import", message }],
    });
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST" } });
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) return invalid(415, "Send the timetable as application/json.");
    const body = await readBoundedBody(request);
    if ("error" in body) return invalid(body.error === "size" ? 413 : 422,
      body.error === "size" ? "JSON files must be 1 MiB or smaller." : "Unable to read a UTF-8 JSON body.");
    const result = await service.import(context.actor.userId, body.text);
    if (result.status === "error") {
      if (result.code === "INVALID_ACTOR") return publicApiErrorResponse({ code: "UNAUTHENTICATED", status: 401, requestId: context.requestId });
      if (result.code === "NOT_FOUND") return invalid(422, "An existing subject is unavailable for this account. No sessions were added.");
      if (result.code === "INVALID_INPUT") return publicApiErrorResponse({
        code: "VALIDATION_FAILED", status: 422, requestId: context.requestId,
        details: result.issues?.map(issue => ({ code: "invalid_import", ...issue })),
      });
      return publicApiErrorResponse({ code: "PROVIDER_UNAVAILABLE", status: 503, requestId: context.requestId });
    }
    // Do not turn an already-committed import into a false save failure.
    // The client also requests a fresh Calendar render after success.
    try { onImported(); } catch { /* the receipt makes a retry safe */ }
    return Response.json({
      import_id: result.data.importId, session_count: result.data.sessionCount,
      subjects_created: result.data.subjectsCreated, already_imported: result.data.alreadyImported,
      first_date: result.data.firstDate,
    }, { status: result.data.alreadyImported ? 200 : 201 });
  };
}
