import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { normalizeInternalPath } from "@/server/auth/auth-input";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell>
      <AuthForm
        callbackFailed={params.error === "CALLBACK_FAILED"}
        nextPath={normalizeInternalPath(params.next)}
        screen="sign-in"
      />
    </AuthShell>
  );
}
