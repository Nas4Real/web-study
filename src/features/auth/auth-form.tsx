"use client";

import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import type { AuthScreen } from "@/domain/dto";

const screenCopy = {
  "sign-in": {
    title: "Welcome back",
    description: "Enter your details to sign in to your account.",
    submitLabel: "Sign In",
  },
  "sign-up": {
    title: "Create an account",
    description: "Join Web Study to organize your academic life.",
    submitLabel: "Sign Up",
  },
  "forgot-password": {
    title: "Reset password",
    description: "Enter your email and we'll send a reset link.",
    submitLabel: "Send Reset Link",
  },
} satisfies Record<AuthScreen, { title: string; description: string; submitLabel: string }>;

const inputClassName = "h-12 w-full rounded-xl border border-border-panel bg-[#0b0b0d] pl-11 pr-4 text-[15px] font-medium text-white outline-none placeholder:text-text-disabled hover:border-text-tertiary focus:border-white focus:ring-2 focus:ring-white/10";

function FieldIcon({ children }: { children: React.ReactNode }) {
  return <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-text-tertiary">{children}</span>;
}

export function AuthForm({ screen }: { screen: AuthScreen }) {
  const [showPassword, setShowPassword] = useState(false);
  const copy = screenCopy[screen];
  const isForgotPassword = screen === "forgot-password";

  function preventStaticSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="w-full max-w-[440px] rounded-[24px] border border-border-panel bg-[#0c0c0e] p-6 shadow-2xl sm:p-10">
      {isForgotPassword ? (
        <div className="mb-6 flex justify-center">
          <span className="grid size-16 place-items-center rounded-2xl border border-border-panel bg-[#0b0b0d] shadow-lg">
            <KeyRound aria-hidden="true" size={28} />
          </span>
        </div>
      ) : null}

      <h2 className="text-center text-[28px] font-bold tracking-tight">{copy.title}</h2>
      <p className={`mt-2 text-center text-[15px] text-text-muted ${isForgotPassword ? "mb-9" : "mb-8"}`}>{copy.description}</p>

      {!isForgotPassword ? (
        <>
          <button className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border-panel bg-[#0a0a0c] text-sm font-semibold transition-colors hover:border-text-tertiary hover:bg-card-hover" type="button">
            <span aria-hidden="true" className="bg-[conic-gradient(from_-45deg,#4285f4_0_25%,#34a853_0_50%,#fbbc05_0_75%,#ea4335_0)] bg-clip-text text-lg font-bold text-transparent">G</span>
            Continue with Google
          </button>
          <div className="my-6 flex items-center">
            <span className="h-px flex-1 bg-border-panel" />
            <span className="mx-4 text-[10px] font-bold uppercase tracking-[0.15em] text-text-disabled">Or continue with email</span>
            <span className="h-px flex-1 bg-border-panel" />
          </div>
        </>
      ) : null}

      <form className="space-y-5" onSubmit={preventStaticSubmit}>
        {screen === "sign-up" ? (
          <label className="block text-[13px] font-semibold text-text-secondary" htmlFor="full-name">
            Full name
            <span className="relative mt-2 block">
              <FieldIcon><UserRound aria-hidden="true" size={18} /></FieldIcon>
              <input autoComplete="name" className={inputClassName} id="full-name" name="fullName" placeholder="Jane Doe" required type="text" />
            </span>
          </label>
        ) : null}

        <label className="block text-[13px] font-semibold text-text-secondary" htmlFor={`${screen}-email`}>
          Email address
          <span className="relative mt-2 block">
            <FieldIcon><Mail aria-hidden="true" size={18} /></FieldIcon>
            <input autoComplete="email" className={inputClassName} id={`${screen}-email`} name="email" placeholder="you@example.com" required type="email" />
          </span>
        </label>

        {!isForgotPassword ? (
          <div className="text-[13px] font-semibold text-text-secondary">
            <div className="flex items-center justify-between">
              <label htmlFor={`${screen}-password`}>Password</label>
              {screen === "sign-in" ? <Link className="font-medium text-text-muted hover:text-white" href="/forgot-password">Forgot password?</Link> : null}
            </div>
            <span className="relative mt-2 block">
              <FieldIcon><LockKeyhole aria-hidden="true" size={18} /></FieldIcon>
              <input autoComplete={screen === "sign-in" ? "current-password" : "new-password"} className={`${inputClassName} pr-11`} id={`${screen}-password`} name="password" placeholder={screen === "sign-in" ? "••••••••" : "Create a password"} required type={showPassword ? "text" : "password"} />
              <button aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-text-tertiary hover:text-white" onClick={() => setShowPassword((visible) => !visible)} type="button">
                {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
              </button>
            </span>
          </div>
        ) : null}

        <button className="mt-2 h-12 w-full rounded-full bg-white text-[15px] font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors hover:bg-zinc-200" type="submit">
          {copy.submitLabel}
        </button>
      </form>

      <div className="mt-8 flex items-center justify-center gap-2 text-sm">
        {screen === "sign-in" ? <><span className="text-text-muted">Don&apos;t have an account?</span><Link className="font-bold hover:underline" href="/sign-up">Sign up for free</Link></> : null}
        {screen === "sign-up" ? <><span className="text-text-muted">Already have an account?</span><Link className="font-bold hover:underline" href="/sign-in">Sign in instead</Link></> : null}
        {isForgotPassword ? <Link className="flex items-center gap-2 font-bold text-text-muted hover:text-white" href="/sign-in"><ArrowLeft aria-hidden="true" size={16} />Back to sign in</Link> : null}
      </div>
    </div>
  );
}
