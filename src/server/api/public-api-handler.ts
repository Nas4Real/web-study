import {
  createRequestId,
  parseBearerToken,
  publicApiErrorResponse,
} from "./public-api-contract";

export type ActorContext = Readonly<{
  apiKeyId: string | null;
  userId: string;
}>;

type ApiKeyActorContext = ActorContext & Readonly<{ apiKeyId: string }>;
type SessionActorContext = ActorContext & Readonly<{ apiKeyId: null }>;

export type ApiKeyVerifier = Readonly<{
  verify(token: string): Promise<
    | Readonly<{ data: ApiKeyActorContext; status: "success" }>
    | Readonly<{ code: string; status: "error" }>
  >;
}>;

export type RateLimiter = Readonly<{
  consume(apiKeyId: string): Promise<
    | Readonly<{
      data: Readonly<{ allowed: boolean; retryAfterSeconds: number }>;
      status: "success";
    }>
    | Readonly<{ code: "STORAGE_UNAVAILABLE"; status: "error" }>
  >;
}>;

export type SessionVerifier = Readonly<{
  verify(token?: string): Promise<
    | Readonly<{ data: SessionActorContext; status: "success" }>
    | Readonly<{ code: "INVALID_SESSION"; status: "error" }>
  >;
}>;

export type PublicApiRequestContext = Readonly<{
  actor: ActorContext;
  requestId: string;
}>;

type PublicApiResourceAdapter = (
  request: Request,
  context: PublicApiRequestContext,
) => Promise<Response>;

function providerUnavailable(requestId: string) {
  return publicApiErrorResponse({
    code: "PROVIDER_UNAVAILABLE",
    requestId,
    status: 503,
  });
}

function unauthenticated(requestId: string) {
  return publicApiErrorResponse({
    code: "UNAUTHENTICATED",
    requestId,
    status: 401,
  });
}

function isCookieMutationAllowed(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function withBoundaryHeaders(response: Response, requestId: string) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-request-id", requestId);
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function callResource(
  next: PublicApiResourceAdapter,
  request: Request,
  context: PublicApiRequestContext,
) {
  try {
    return withBoundaryHeaders(await next(request, context), context.requestId);
  } catch {
    return publicApiErrorResponse({
      code: "INTERNAL_ERROR",
      requestId: context.requestId,
      status: 500,
    });
  }
}

export function createPublicApiHandler(input: Readonly<{
  apiKeys: ApiKeyVerifier;
  limiter: RateLimiter;
  next: PublicApiResourceAdapter;
  requestIdFactory?: () => string;
  sessions: SessionVerifier;
}>) {
  return async function handle(request: Request) {
    const requestId = createRequestId(
      request.headers.get("x-request-id"),
      input.requestIdFactory,
    );
    const authorization = request.headers.get("authorization");
    const bearer = authorization === null ? null : parseBearerToken(authorization);
    if (bearer?.status === "error") return unauthenticated(requestId);

    if (!bearer || !bearer.token.startsWith("wsk_")) {
      let verified: Awaited<ReturnType<SessionVerifier["verify"]>>;
      try {
        verified = await input.sessions.verify(bearer?.token);
      } catch {
        return providerUnavailable(requestId);
      }
      if (verified.status === "error") return unauthenticated(requestId);
      if (!bearer && !isCookieMutationAllowed(request)) {
        return publicApiErrorResponse({ code: "FORBIDDEN", requestId, status: 403 });
      }
      return callResource(input.next, request, { actor: verified.data, requestId });
    }

    let verified: Awaited<ReturnType<ApiKeyVerifier["verify"]>>;
    try {
      verified = await input.apiKeys.verify(bearer.token);
    } catch {
      return providerUnavailable(requestId);
    }
    if (verified.status === "error") {
      return verified.code === "STORAGE_UNAVAILABLE"
        ? providerUnavailable(requestId)
        : publicApiErrorResponse({
          code: "API_KEY_INVALID",
          requestId,
          status: 401,
        });
    }

    let rateLimit: Awaited<ReturnType<RateLimiter["consume"]>>;
    try {
      rateLimit = await input.limiter.consume(verified.data.apiKeyId);
    } catch {
      return providerUnavailable(requestId);
    }
    if (rateLimit.status === "error") return providerUnavailable(requestId);
    if (!rateLimit.data.allowed) {
      return publicApiErrorResponse({
        code: "RATE_LIMITED",
        requestId,
        retryAfterSeconds: rateLimit.data.retryAfterSeconds,
        status: 429,
      });
    }

    return callResource(input.next, request, { actor: verified.data, requestId });
  };
}
