import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { createTaskSubtaskItemAdapter } from "@/server/api/task-api";
import { createTaskApiDependencies } from "@/server/api/task-api-dependencies";

export const dynamic = "force-dynamic";
async function handle(request: Request, context: Readonly<{
  params: Promise<{ subtask_id: string; task_id: string }>;
}>) {
  const { subtask_id: subtaskId, task_id: taskId } = await context.params;
  return handlePublicApiRequest(request, admin =>
    createTaskSubtaskItemAdapter(createTaskApiDependencies(admin).tasks, taskId, subtaskId));
}
export { handle as DELETE, handle as PATCH };
