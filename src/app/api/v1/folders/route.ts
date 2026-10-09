import { createFoldersCollectionAdapter } from "@/server/api/folder-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { FolderService } from "@/server/study/folder-service";
import { createSupabaseFolderRepository } from "@/server/study/supabase-document-repositories";

export const dynamic = "force-dynamic";
function handle(request: Request) {
  return handlePublicApiRequest(request, admin => createFoldersCollectionAdapter(
    new FolderService(createSupabaseFolderRepository(admin)),
  ));
}
export { handle as GET, handle as POST };
