import { createCalendarApiDependencies } from "@/server/api/calendar-api-dependencies";
import { createSessionSeriesItemAdapter } from "@/server/api/calendar-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";

export const dynamic = "force-dynamic";
async function handle(request: Request, context: Readonly<{ params: Promise<{ series_id: string }> }>) {
  const { series_id: seriesId } = await context.params;
  return handlePublicApiRequest(request, admin =>
    createSessionSeriesItemAdapter(createCalendarApiDependencies(admin), seriesId));
}
export { handle as DELETE, handle as GET, handle as PATCH };
