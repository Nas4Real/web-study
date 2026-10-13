import { revalidatePath } from "next/cache";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { createTimetableImportAdapter } from "@/server/api/timetable-import-api";
import { TimetableImportService } from "@/server/study/timetable-import-service";
import { createSupabaseTimetableImportRepository } from "@/server/study/supabase-timetable-import-repository";

export const dynamic = "force-dynamic";
export function POST(request: Request) {
  return handlePublicApiRequest(request, admin => createTimetableImportAdapter(
    new TimetableImportService(createSupabaseTimetableImportRepository(admin)),
    () => { for (const path of ["/calendar", "/", "/settings", "/documents", "/tasks"]) revalidatePath(path); },
  ));
}
