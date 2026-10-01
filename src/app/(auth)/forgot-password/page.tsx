import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";

export default function ForgotPasswordPage() {
  return <AuthShell><AuthForm screen="forgot-password" /></AuthShell>;
}
