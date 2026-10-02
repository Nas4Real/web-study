import "server-only";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

import { isE2eAuthenticatedRequest } from "./auth-routing";
import { resolveVerifiedActor, type AuthActor } from "./verified-actor";

export const E2E_ACTOR_ID = "00000000-0000-4000-8000-000000000001";
const E2E_ACTOR: AuthActor = { userId: E2E_ACTOR_ID };

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
