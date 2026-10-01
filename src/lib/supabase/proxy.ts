import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  buildSignInUrl,
  isE2eAuthenticatedRequest,
  isProtectedWorkspacePath,
} from "@/server/auth/auth-routing";
import { resolveVerifiedActor } from "@/server/auth/verified-actor";

import { getSupabasePublicConfig } from "./config";

const E2E_AUTH_HEADER = "x-web-study-e2e-auth";
const AUTH_CACHE_HEADERS = ["cache-control", "expires", "pragma"] as const;

function copyAuthState(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));

  AUTH_CACHE_HEADERS.forEach((header) => {
    const value = source.headers.get(header);
    if (value) destination.headers.set(header, value);
  });

  return destination;
}

function unauthenticatedResponse(request: NextRequest, source: NextResponse) {
  const redirectResponse = NextResponse.redirect(buildSignInUrl(request.nextUrl));
  redirectResponse.headers.set("Cache-Control", "private, no-store");
  return copyAuthState(source, redirectResponse);
}

export async function updateSession(request: NextRequest) {
  const protectedPath = isProtectedWorkspacePath(request.nextUrl.pathname);
  const e2eAuthenticated = isE2eAuthenticatedRequest({
    nodeEnv: process.env.NODE_ENV,
    configuredToken: process.env.WEB_STUDY_E2E_AUTH_TOKEN,
    requestToken: request.headers.get(E2E_AUTH_HEADER),
  });

  if (e2eAuthenticated) {
    const response = NextResponse.next({ request });
    if (protectedPath) response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const config = getSupabasePublicConfig();
  if (!config) {
    return protectedPath
      ? unauthenticatedResponse(request, NextResponse.next({ request }))
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const actor = await resolveVerifiedActor(() => supabase.auth.getClaims());

  if (protectedPath && !actor) {
    return unauthenticatedResponse(request, response);
  }

  if (protectedPath) response.headers.set("Cache-Control", "private, no-store");
  return response;
}
