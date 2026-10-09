import { createCalendarApiDependencies } from "@/server/api/calendar-api-dependencies";
import { createSessionsCollectionAdapter } from "@/server/api/calendar-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";

export const dynamic = "force-dynamic";
function handle(request: Request) {
  return handlePublicApiRequest(request, admin =>
    createSessionsCollectionAdapter(createCalendarApiDependencies(admin)));
}
export { handle as GET, handle as POST };
