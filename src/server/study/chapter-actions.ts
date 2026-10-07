"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedActor } from "@/server/auth/request-auth";

import { createChapterMutationHandler, type ChapterActionState } from "./chapter-action-handlers";
import { ChapterService } from "./chapter-service";
import { createSupabaseChapterRepository } from "./supabase-document-repositories";

async function resolveChapterActionContext() {
  const actor = await getVerifiedActor();
  if (!actor) return null;
  const client = await createClient();
  return {
    actorId: actor.userId,
    chapterService: new ChapterService(createSupabaseChapterRepository(client)),
  };
}

export async function createChapterAction(
  _previousState: ChapterActionState,
  formData: FormData,
): Promise<ChapterActionState> {
  const result = await createChapterMutationHandler(resolveChapterActionContext, formData);
  if (result.status === "success") revalidatePath("/documents");
  return result;
}
