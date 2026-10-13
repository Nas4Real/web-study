import { createHash } from "node:crypto";
import {
  DEFAULT_IMPORT_COLOR, parseTimetableFile, timetableImportResultSchema,
  type TimetableImportDocument, type TimetableImportResult, type TimetableIssue,
} from "@/domain/timetable-import";
import { actorIdSchema, type RepositoryResult } from "./study-domain";

export type TimetableImportRepository = {
  importOwned(actorId: string, fingerprint: string, document: TimetableImportDocument): Promise<RepositoryResult<TimetableImportResult>>;
};
export type TimetableImportOutcome =
  | { status: "success"; data: TimetableImportResult }
  | { status: "error"; code: "INVALID_ACTOR" | "INVALID_INPUT" | "NOT_FOUND" | "STORAGE_UNAVAILABLE"; issues?: TimetableIssue[] };

export class TimetableImportService {
  constructor(private readonly repository: TimetableImportRepository) {}

  async import(actorId: unknown, fileText: string): Promise<TimetableImportOutcome> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return { status: "error", code: "INVALID_ACTOR" };
    const parsed = parseTimetableFile(fileText);
    if (!parsed.success) return { status: "error", code: "INVALID_INPUT", issues: parsed.issues };
    const subjects = new Map(parsed.data.subjects.map(subject => [subject.name.toLowerCase(), subject]));
    for (const session of parsed.data.sessions) {
      if (session.subjectName && !subjects.has(session.subjectName.toLowerCase())) {
        subjects.set(session.subjectName.toLowerCase(), { name: session.subjectName, color: DEFAULT_IMPORT_COLOR });
      }
    }
    const document = { ...parsed.data, subjects: [...subjects.values()].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())) };
    const fingerprint = createHash("sha256").update(JSON.stringify(document)).digest("hex");
    try {
      const saved = await this.repository.importOwned(actor.data, fingerprint, document);
      if (saved.errorCode === "23503") return { status: "error", code: "NOT_FOUND" };
      if (saved.errorCode === "23514" || saved.errorCode === "22023") return { status: "error", code: "INVALID_INPUT" };
      const result = timetableImportResultSchema.safeParse(saved.data);
      if (saved.errorCode || !result.success) return { status: "error", code: "STORAGE_UNAVAILABLE" };
      return { status: "success", data: result.data };
    } catch {
      return { status: "error", code: "STORAGE_UNAVAILABLE" };
    }
  }
}
