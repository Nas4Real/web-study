import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/server/auth/app-origin";
import { AuthService } from "@/server/auth/auth-service";
import { createSupabaseAuthGateway } from "@/server/auth/supabase-auth-gateway";
import {
  logAuthCallbackFailure,
  resolveRequestId,
} from "@/server/observability/auth-callback";

function redirectWithRequestId(destination: URL, requestId: string) {
  const response = NextResponse.redirect(destination);
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getAppOrigin();
  const requestId = resolveRequestId(request.headers);

  try {
    const client = await createClient();
    const service = new AuthService(createSupabaseAuthGateway(client, origin));
    const result = await service.completeCallback(
      requestUrl.searchParams.get("code"),
      requestUrl.searchParams.get("next"),
    );

    if (result.status === "success" && result.code === "CALLBACK_COMPLETE") {
      return redirectWithRequestId(
        new URL(result.redirectTo, origin),
        requestId,
      );
    }
  } catch {
    // Provider details must not escape through the callback response.
  }

  logAuthCallbackFailure(requestId);

  const destination = new URL("/sign-in", origin);
  destination.searchParams.set("error", "CALLBACK_FAILED");
  return redirectWithRequestId(destination, requestId);
}
