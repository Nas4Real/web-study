import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { DocumentLibraryService } from "@/server/study/document-library-service";
import { ProfileService } from "@/server/study/profile-service";
import { createSupabaseDocumentLibraryRepository } from "@/server/study/supabase-document-repositories";
import { createSupabaseProfileRepository } from "@/server/study/supabase-study-repositories";

export function createResourceApiDependencies(admin: SupabaseClient) {
  return {
    files: new DocumentLibraryService(
      createSupabaseDocumentLibraryRepository(admin),
      {
        presignDownload: async () => {
          throw new Error("R2 storage is not configured.");
        },
      },
    ),
    profile: new ProfileService(createSupabaseProfileRepository(admin)),
  };
}
