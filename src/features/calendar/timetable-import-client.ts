import { MAX_TIMETABLE_BYTES, parseTimetableFile, timetableImportResultSchema, type TimetableImportDocument, type TimetableIssue } from "@/domain/timetable-import";

export type LoadedTimetable = { fileName: string; text: string; document: TimetableImportDocument };
export async function readTimetableFile(file: Pick<File, "name" | "size" | "text">): Promise<
  { success: true; data: LoadedTimetable } | { success: false; issues: TimetableIssue[] }
> {
  if (!file.name.toLowerCase().endsWith(".json")) return { success: false, issues: [{ path: [], message: "Choose a .json timetable file." }] };
  if (file.size > MAX_TIMETABLE_BYTES) return { success: false, issues: [{ path: [], message: "JSON files must be 1 MiB or smaller." }] };
  try {
    const text = await file.text();
    const parsed = parseTimetableFile(text);
    return parsed.success ? { success: true, data: { fileName: file.name, text, document: parsed.data } } : parsed;
  } catch { return { success: false, issues: [{ path: [], message: "Unable to read this file. Choose it again." }] }; }
}

const uncertain = "The import result could not be confirmed. Retry the same file safely; completed imports will not be duplicated.";
export async function submitTimetable(text: string, fetcher: typeof fetch = fetch) {
  let response: Response;
  let reply: unknown;
  try {
    response = await fetcher("/api/v1/calendar/imports", {
      method: "POST", body: text, credentials: "same-origin",
      headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(60000),
    });
    reply = await response.json();
  } catch { throw new Error(uncertain); }
  if (!response.ok) {
    if (response.status === 401) throw new Error("Sign in again, then retry this file. Your preview is kept.");
    if (response.status === 413) throw new Error("JSON files must be 1 MiB or smaller.");
    if (response.status === 422 && reply && typeof reply === "object" && "error" in reply) {
      const error = reply.error;
      if (error && typeof error === "object" && "details" in error && Array.isArray(error.details)) {
        const issues = error.details.slice(0, 5).flatMap((issue: unknown) => {
          if (!issue || typeof issue !== "object" || !("message" in issue) || typeof issue.message !== "string") return [];
          const path = "path" in issue && Array.isArray(issue.path) ? issue.path.filter(part => typeof part === "string" || typeof part === "number").join(".") : "";
          return [`${path ? path + ": " : ""}${issue.message.slice(0, 300)}`];
        });
        if (issues.length) throw new Error(issues.join("\n"));
      }
      throw new Error("Check your timetable. No sessions were added.");
    }
    if (response.status === 403) throw new Error("The import request was not allowed. Reload Calendar and try again.");
    if (response.status === 429) throw new Error("Too many requests. Wait briefly, then retry the same file.");
    throw new Error(uncertain);
  }
  const value = reply && typeof reply === "object" ? reply as Record<string, unknown> : {};
  const parsed = timetableImportResultSchema.safeParse({
    importId: value.import_id, sessionCount: value.session_count, subjectsCreated: value.subjects_created,
    alreadyImported: value.already_imported, firstDate: value.first_date,
  });
  if (!parsed.success) throw new Error(uncertain);
  return parsed.data;
}
