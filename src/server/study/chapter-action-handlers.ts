import { chapterCreateInputSchema, type Chapter } from "./document-domain";
import type { StudyResult } from "./study-domain";

export type ChapterActionState =
  | Readonly<{ code: "IDLE"; message: ""; status: "idle" }>
  | Readonly<{ code: "CHAPTER_CREATED"; message: "Chapter created."; status: "success" }>
  | Readonly<{
      code: "UNAUTHENTICATED" | "INVALID_INPUT" | "DUPLICATE_NAME" | "STORAGE_UNAVAILABLE";
      message: string;
      status: "error";
    }>;

export type ChapterActionContext = Readonly<{
  actorId: string;
  chapterService: Readonly<{
    create(actorId: unknown, input: unknown): Promise<StudyResult<Chapter, "CONFLICT">>;
    list(actorId: unknown, filter?: unknown): Promise<StudyResult<readonly Chapter[], "CONFLICT">>;
  }>;
}>;

type ResolveContext = () => Promise<ChapterActionContext | null>;

const messages = {
  DUPLICATE_NAME: "A chapter with this name already exists in this subject.",
  INVALID_INPUT: "Enter a valid chapter name.",
  STORAGE_UNAVAILABLE: "Chapters are temporarily unavailable. Try again.",
  UNAUTHENTICATED: "Your session has expired. Sign in and try again.",
} as const;

function errorState(code: keyof typeof messages): Extract<ChapterActionState, { status: "error" }> {
  return { code, message: messages[code], status: "error" };
}

export async function createChapterMutationHandler(
  resolveContext: ResolveContext,
  formData: FormData,
): Promise<ChapterActionState> {
  let context: ChapterActionContext | null;
  try { context = await resolveContext(); } catch { return errorState("STORAGE_UNAVAILABLE"); }
  if (!context) return errorState("UNAUTHENTICATED");

  const name = formData.get("name");
  const subjectId = formData.get("subjectId");
  if (typeof name !== "string" || typeof subjectId !== "string") return errorState("INVALID_INPUT");

  try {
    const chapters = await context.chapterService.list(context.actorId, { subjectId });
    if (chapters.status === "error") return errorState(chapters.code === "INVALID_INPUT" ? "INVALID_INPUT" : "STORAGE_UNAVAILABLE");
    const input = chapterCreateInputSchema.safeParse({ name, position: chapters.data.length, subjectId });
    if (!input.success) return errorState("INVALID_INPUT");
    const result = await context.chapterService.create(context.actorId, input.data);
    if (result.status === "success") return { code: "CHAPTER_CREATED", message: "Chapter created.", status: "success" };
    if (result.code === "DUPLICATE_NAME") return errorState("DUPLICATE_NAME");
    if (result.code === "INVALID_INPUT" || result.code === "INVALID_ACTOR" || result.code === "NOT_FOUND") return errorState("INVALID_INPUT");
    return errorState("STORAGE_UNAVAILABLE");
  } catch { return errorState("STORAGE_UNAVAILABLE"); }
}
