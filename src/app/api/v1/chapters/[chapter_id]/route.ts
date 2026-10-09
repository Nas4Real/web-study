import { createChapterItemAdapter } from "@/server/api/chapter-api";
import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { ChapterService } from "@/server/study/chapter-service";
import { createSupabaseChapterRepository } from "@/server/study/supabase-document-repositories";

export const dynamic = "force-dynamic";

async function handle(request: Request, context: Readonly<{ params: Promise<{ chapter_id: string }> }>) {
  const { chapter_id: chapterId } = await context.params;
  return handlePublicApiRequest(request, admin => createChapterItemAdapter(
    new ChapterService(createSupabaseChapterRepository(admin)), chapterId,
  ));
}

export { handle as DELETE, handle as GET, handle as PATCH };
