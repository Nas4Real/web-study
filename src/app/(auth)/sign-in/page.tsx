import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";

export default function SignInPage() {
  return <AuthShell><AuthForm screen="sign-in" /></AuthShell>;
}
