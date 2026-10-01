"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { getAppOrigin } from "./app-origin";
import { normalizeInternalPath } from "./auth-input";
import {
  AuthService,
  type AuthActionState,
} from "./auth-service";
import { createSupabaseAuthGateway } from "./supabase-auth-gateway";

async function createAuthService() {
  const client = await createClient();
  return new AuthService(createSupabaseAuthGateway(client, getAppOrigin()));
}

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const service = await createAuthService();
    return await service.signUp({
      fullName: textField(formData, "fullName"),
      email: textField(formData, "email"),
      password: textField(formData, "password"),
    });
  } catch {
    return {
      status: "error",
      code: "PROVIDER_UNAVAILABLE",
      message: "Authentication is temporarily unavailable. Please try again.",
    };
  }
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let result;
  try {
    const service = await createAuthService();
    result = await service.signIn({
      email: textField(formData, "email"),
      password: textField(formData, "password"),
    });
  } catch {
    return {
      status: "error",
      code: "PROVIDER_UNAVAILABLE",
      message: "Authentication is temporarily unavailable. Please try again.",
    };
  }

  if ("redirectTo" in result) {
    redirect(normalizeInternalPath(textField(formData, "next")));
  }
  return result;
}

export async function startGoogleAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let result;
  try {
    const service = await createAuthService();
    result = await service.startGoogle(textField(formData, "next"));
  } catch {
    return {
      status: "error",
      code: "PROVIDER_UNAVAILABLE",
      message: "Authentication is temporarily unavailable. Please try again.",
    };
  }

  if ("redirectTo" in result) {
    redirect(result.redirectTo);
  }
  return result;
}

export async function signOutAction() {
  try {
    const service = await createAuthService();
    await service.signOut();
  } finally {
    redirect("/sign-in");
  }
}
