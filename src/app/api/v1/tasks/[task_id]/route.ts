import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { createTaskItemAdapter } from "@/server/api/task-api";
import { createTaskApiDependencies } from "@/server/api/task-api-dependencies";

export const dynamic = "force-dynamic";
async function handle(request: Request, context: Readonly<{ params: Promise<{ task_id: string }> }>) {
  const { task_id: taskId } = await context.params;
  return handlePublicApiRequest(request, admin =>
    createTaskItemAdapter(createTaskApiDependencies(admin), taskId));
}
export { handle as DELETE, handle as GET, handle as PATCH };
