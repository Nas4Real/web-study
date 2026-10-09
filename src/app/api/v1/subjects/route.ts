import { handlePublicApiRequest } from "@/server/api/public-api-runtime";
import { createSubjectsCollectionAdapter } from "@/server/api/subject-api";
import { createSupabaseSubjectRepository } from "@/server/study/supabase-study-repositories";
import { SubjectService } from "@/server/study/subject-service";

export const dynamic = "force-dynamic";

function handle(request: Request) {
  return handlePublicApiRequest(request, (admin) =>
    createSubjectsCollectionAdapter(
      new SubjectService(createSupabaseSubjectRepository(admin)),
    ));
}

export { handle as GET, handle as POST };
