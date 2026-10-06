import type { Profile, StudyResult } from "./study-domain";

export type SettingsActionState =
  | Readonly<{ code: "IDLE"; message: ""; status: "idle" }>
  | Readonly<{
      code: "PROFILE_UPDATED";
      message: "Profile updated.";
      status: "success";
    }>
  | Readonly<{
      code:
        | "UNAUTHENTICATED"
        | "INVALID_INPUT"
        | "NOT_FOUND"
        | "STORAGE_UNAVAILABLE";
      message: string;
      status: "error";
    }>;

export type SettingsActionContext = Readonly<{
  actorId: string;
  profile: Profile;
  profileService: Readonly<{
    update(actorId: unknown, input: unknown): Promise<StudyResult<Profile>>;
  }>;
}>;

type ResolveContext = () => Promise<SettingsActionContext | null>;

const messages = {
  INVALID_INPUT: "Enter a name between 1 and 120 characters.",
  NOT_FOUND: "Your profile is no longer available.",
  STORAGE_UNAVAILABLE: "Profile changes are temporarily unavailable. Try again.",
  UNAUTHENTICATED: "Your session has expired. Sign in and try again.",
} as const;

function errorState(
  code: keyof typeof messages,
): Extract<SettingsActionState, { status: "error" }> {
  return { code, message: messages[code], status: "error" };
}

export async function updateProfileMutationHandler(
  resolveContext: ResolveContext,
  formData: FormData,
): Promise<SettingsActionState> {
  let context: SettingsActionContext | null;
  try {
    context = await resolveContext();
  } catch {
    return errorState("STORAGE_UNAVAILABLE");
  }
  if (!context) return errorState("UNAUTHENTICATED");

  const displayName = formData.get("displayName");
  if (typeof displayName !== "string") return errorState("INVALID_INPUT");

  try {
    const result = await context.profileService.update(context.actorId, {
      avatarObjectKey: context.profile.avatarObjectKey,
      displayName,
      timezone: context.profile.timezone,
    });
    if (result.status === "success") {
      return {
        code: "PROFILE_UPDATED",
        message: "Profile updated.",
        status: "success",
      };
    }
    const code =
      result.code === "INVALID_ACTOR" ? "UNAUTHENTICATED" : result.code;
    return errorState(code === "DUPLICATE_NAME" ? "INVALID_INPUT" : code);
  } catch {
    return errorState("STORAGE_UNAVAILABLE");
  }
}
