import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";

export default function SignUpPage() {
  return <AuthShell><AuthForm screen="sign-up" /></AuthShell>;
}
