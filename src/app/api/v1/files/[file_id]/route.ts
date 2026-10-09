import { createResourceApiDependencies } from "@/server/api/resource-api-dependencies";
import { createFileItemAdapter } from "@/server/api/resource-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";

export const dynamic = "force-dynamic";
async function handle(request: Request, context: Readonly<{ params: Promise<{ file_id: string }> }>) {
  const { file_id: fileId } = await context.params;
  return handlePublicApiRequest(request, admin =>
    createFileItemAdapter(createResourceApiDependencies(admin).files, fileId));
}
export { handle as DELETE, handle as GET, handle as PATCH };
