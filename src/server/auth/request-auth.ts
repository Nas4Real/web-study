import "server-only";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

import { isE2eAuthenticatedRequest } from "./auth-routing";
import { resolveVerifiedActor, type AuthActor } from "./verified-actor";

const E2E_ACTOR: AuthActor = { userId: "e2e-user" };

export async function getVerifiedActor(): Promise<AuthActor | null> {
  const requestHeaders = await headers();
  if (
    isE2eAuthenticatedRequest({
      nodeEnv: process.env.NODE_ENV,
      configuredToken: process.env.WEB_STUDY_E2E_AUTH_TOKEN,
      requestToken: requestHeaders.get("x-web-study-e2e-auth"),
    })
  ) {
    return E2E_ACTOR;
  }

  try {
    const supabase = await createClient();
    return resolveVerifiedActor(() => supabase.auth.getClaims());
  } catch {
    return null;
  }
}
