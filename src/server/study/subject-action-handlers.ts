import {
  subjectCreateInputSchema,
  type StudyResult,
  type Subject,
} from "./study-domain";

export type SubjectActionState =
  | Readonly<{ code: "IDLE"; message: ""; status: "idle" }>
  | Readonly<{
      code: "SUBJECT_CREATED";
      message: "Subject created.";
      status: "success";
    }>
  | Readonly<{
      code:
        | "UNAUTHENTICATED"
        | "INVALID_INPUT"
        | "DUPLICATE_NAME"
        | "STORAGE_UNAVAILABLE";
      message: string;
      status: "error";
    }>;

export type SubjectActionContext = Readonly<{
  actorId: string;
  subjectService: Readonly<{
    create(actorId: unknown, input: unknown): Promise<StudyResult<Subject>>;
    list(actorId: unknown): Promise<StudyResult<readonly Subject[]>>;
  }>;
}>;

type ResolveContext = () => Promise<SubjectActionContext | null>;

const messages = {
  DUPLICATE_NAME: "A subject with this name already exists.",
  INVALID_INPUT: "Enter a subject name and choose a valid color.",
  STORAGE_UNAVAILABLE: "Subjects are temporarily unavailable. Try again.",
  UNAUTHENTICATED: "Your session has expired. Sign in and try again.",
} as const;

function errorState(
  code: keyof typeof messages,
): Extract<SubjectActionState, { status: "error" }> {
  return { code, message: messages[code], status: "error" };
}

export async function createSubjectMutationHandler(
  resolveContext: ResolveContext,
  formData: FormData,
): Promise<SubjectActionState> {
  let context: SubjectActionContext | null;
  try {
    context = await resolveContext();
  } catch {
    return errorState("STORAGE_UNAVAILABLE");
  }
  if (!context) return errorState("UNAUTHENTICATED");

  const name = formData.get("name");
  const color = formData.get("color");
  if (typeof name !== "string" || typeof color !== "string") {
    return errorState("INVALID_INPUT");
  }

  try {
    const subjects = await context.subjectService.list(context.actorId);
    if (subjects.status === "error") {
      return errorState(
        subjects.code === "INVALID_INPUT" || subjects.code === "INVALID_ACTOR"
          ? "INVALID_INPUT"
          : "STORAGE_UNAVAILABLE",
      );
    }

    const input = subjectCreateInputSchema.safeParse({
      color,
      icon: "book-open",
      name,
      position: subjects.data.length,
    });
    if (!input.success) return errorState("INVALID_INPUT");

    const result = await context.subjectService.create(
      context.actorId,
      input.data,
    );
    if (result.status === "success") {
      return {
        code: "SUBJECT_CREATED",
        message: "Subject created.",
        status: "success",
      };
    }
    if (result.code === "DUPLICATE_NAME") {
      return errorState("DUPLICATE_NAME");
    }
    if (result.code === "INVALID_INPUT" || result.code === "INVALID_ACTOR") {
      return errorState("INVALID_INPUT");
    }
    return errorState("STORAGE_UNAVAILABLE");
  } catch {
    return errorState("STORAGE_UNAVAILABLE");
  }
}
