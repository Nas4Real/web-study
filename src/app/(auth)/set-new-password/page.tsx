import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";

export default function SetNewPasswordPage() {
  return (
    <AuthShell>
      <AuthForm screen="set-new-password" />
    </AuthShell>
  );
}
