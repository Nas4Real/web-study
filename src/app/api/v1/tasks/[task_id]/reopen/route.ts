import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { createTaskTransitionAdapter } from "@/server/api/task-api";
import { createTaskApiDependencies } from "@/server/api/task-api-dependencies";

export const dynamic = "force-dynamic";
export async function POST(request: Request, context: Readonly<{ params: Promise<{ task_id: string }> }>) {
  const { task_id: taskId } = await context.params;
  return handlePublicApiRequest(request, admin =>
    createTaskTransitionAdapter(createTaskApiDependencies(admin).details, taskId, "reopen"));
}
