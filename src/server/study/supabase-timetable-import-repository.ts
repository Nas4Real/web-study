import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { timetableImportResultSchema } from "@/domain/timetable-import";
import type { TimetableImportRepository } from "./timetable-import-service";

export function createSupabaseTimetableImportRepository(client: SupabaseClient): TimetableImportRepository {
  return {
    async importOwned(actorId, fingerprint, document) {
      const { data, error } = await client.rpc("import_calendar_timetable", {
        p_user_id: actorId, p_fingerprint: fingerprint, p_payload: document,
      });
      if (error) return { data: null, errorCode: typeof error.code === "string" ? error.code : "provider_error" };
      if (!data || typeof data !== "object" || Array.isArray(data)) return { data: null, errorCode: "provider_error" };
      const parsed = timetableImportResultSchema.safeParse({
        importId: data.import_id, sessionCount: data.session_count, subjectsCreated: data.subjects_created,
        alreadyImported: data.already_imported, firstDate: data.first_date,
      });
      return parsed.success ? { data: parsed.data, errorCode: null } : { data: null, errorCode: "provider_error" };
    },
  };
}
