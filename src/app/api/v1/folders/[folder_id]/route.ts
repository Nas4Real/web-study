import { createFolderItemAdapter } from "@/server/api/folder-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { FolderService } from "@/server/study/folder-service";
import { createSupabaseFolderRepository } from "@/server/study/supabase-document-repositories";

export const dynamic = "force-dynamic";
async function handle(request: Request, context: Readonly<{ params: Promise<{ folder_id: string }> }>) {
  const { folder_id: folderId } = await context.params;
  return handlePublicApiRequest(request, admin => createFolderItemAdapter(
    new FolderService(createSupabaseFolderRepository(admin)), folderId,
  ));
}
export { handle as DELETE, handle as GET, handle as PATCH };
