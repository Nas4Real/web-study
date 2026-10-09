import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { createTasksCollectionAdapter } from "@/server/api/task-api";
import { createTaskApiDependencies } from "@/server/api/task-api-dependencies";

export const dynamic = "force-dynamic";
function handle(request: Request) {
  return handlePublicApiRequest(request, admin =>
    createTasksCollectionAdapter(createTaskApiDependencies(admin)));
}
export { handle as GET, handle as POST };
