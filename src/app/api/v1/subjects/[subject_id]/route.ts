import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { createSubjectItemAdapter } from "@/server/api/subject-api";
import { createSupabaseSubjectRepository } from "@/server/study/supabase-study-repositories";
import { SubjectService } from "@/server/study/subject-service";

export const dynamic = "force-dynamic";

async function handle(
  request: Request,
  context: Readonly<{ params: Promise<{ subject_id: string }> }>,
) {
  const { subject_id: subjectId } = await context.params;
  return handlePublicApiRequest(request, (admin) =>
    createSubjectItemAdapter(
      new SubjectService(createSupabaseSubjectRepository(admin)),
      subjectId,
    ));
}

export { handle as DELETE, handle as GET, handle as PATCH };
