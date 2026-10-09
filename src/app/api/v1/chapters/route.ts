import { createChaptersCollectionAdapter } from "@/server/api/chapter-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { ChapterService } from "@/server/study/chapter-service";
import { createSupabaseChapterRepository } from "@/server/study/supabase-document-repositories";

export const dynamic = "force-dynamic";

function handle(request: Request) {
  return handlePublicApiRequest(request, admin => createChaptersCollectionAdapter(
    new ChapterService(createSupabaseChapterRepository(admin)),
  ));
}

export { handle as GET, handle as POST };
