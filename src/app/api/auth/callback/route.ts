import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/server/auth/app-origin";
import { AuthService } from "@/server/auth/auth-service";
import { createSupabaseAuthGateway } from "@/server/auth/supabase-auth-gateway";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getAppOrigin();

  try {
    const client = await createClient();
    const service = new AuthService(createSupabaseAuthGateway(client, origin));
    const result = await service.completeCallback(
      requestUrl.searchParams.get("code"),
      requestUrl.searchParams.get("next"),
    );

    if (result.status === "success" && result.code === "CALLBACK_COMPLETE") {
      return NextResponse.redirect(new URL(result.redirectTo, origin));
    }
  } catch {
    // Provider details must not escape through the callback response.
  }

  const destination = new URL("/sign-in", origin);
  destination.searchParams.set("error", "CALLBACK_FAILED");
  return NextResponse.redirect(destination);
}
