import { createCalendarApiDependencies } from "@/server/api/calendar-api-dependencies";
import { createSessionOccurrenceItemAdapter } from "@/server/api/calendar-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";

export const dynamic = "force-dynamic";
async function handle(request: Request, context: Readonly<{
  params: Promise<{ original_start: string; series_id: string }>;
}>) {
  const { original_start: originalStart, series_id: seriesId } = await context.params;
  return handlePublicApiRequest(request, admin => createSessionOccurrenceItemAdapter(
    createCalendarApiDependencies(admin), seriesId, originalStart,
  ));
}
export { handle as DELETE, handle as GET, handle as PATCH };
