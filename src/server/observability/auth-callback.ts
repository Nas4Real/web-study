import "server-only";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveRequestId(headers: Headers): string {
  const candidate = headers.get("x-request-id");

  if (candidate && REQUEST_ID_PATTERN.test(candidate)) {
    return candidate;
  }

  return globalThis.crypto.randomUUID();
}

export function logAuthCallbackFailure(requestId: string): void {
  console.error(
    JSON.stringify({
      level: "error",
      event: "auth_callback_failed",
      requestId,
      route: "/api/auth/callback",
    }),
  );
}
