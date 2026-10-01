import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { normalizeInternalPath } from "@/server/auth/auth-input";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell>
      <AuthForm nextPath={normalizeInternalPath(params.next)} screen="sign-up" />
    </AuthShell>
  );
}
