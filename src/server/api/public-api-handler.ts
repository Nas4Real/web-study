import {
  createRequestId,
  parseBearerToken,
  publicApiErrorResponse,
} from "./public-api-contract";

export type ActorContext = Readonly<{
  apiKeyId: string;
  userId: string;
}>;

export type ApiKeyVerifier = Readonly<{
  verify(token: string): Promise<
    | Readonly<{ data: ActorContext; status: "success" }>
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

export function createPublicApiHandler(input: Readonly<{
  apiKeys: ApiKeyVerifier;
  limiter: RateLimiter;
  next: PublicApiResourceAdapter;
  requestIdFactory?: () => string;
}>) {
  return async function handle(request: Request) {
    const requestId = createRequestId(
      request.headers.get("x-request-id"),
      input.requestIdFactory,
    );
    const bearer = parseBearerToken(request.headers.get("authorization"));
    if (bearer.status === "error") {
      return publicApiErrorResponse({
        code: "UNAUTHENTICATED",
        requestId,
        status: 401,
      });
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

    try {
      return withBoundaryHeaders(
        await input.next(request, { actor: verified.data, requestId }),
        requestId,
      );
    } catch {
      return publicApiErrorResponse({
        code: "INTERNAL_ERROR",
        requestId,
        status: 500,
      });
    }
  };
}
