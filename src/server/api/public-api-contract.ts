import { randomUUID } from "node:crypto";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const MAX_AUTHORIZATION_LENGTH = 512;

const ERROR_MESSAGES = {
  API_KEY_INVALID: "The API key is invalid, expired, or revoked.",
  CONFLICT: "The request conflicts with the current resource state.",
  INTERNAL_ERROR: "The request could not be completed.",
  NOT_FOUND: "The requested resource was not found.",
  PROVIDER_UNAVAILABLE: "The service is temporarily unavailable.",
  RATE_LIMITED: "The API rate limit has been exceeded.",
  UNAUTHENTICATED: "A valid API key is required.",
  VALIDATION_FAILED: "The request is invalid.",
} as const;

export type PublicApiErrorCode = keyof typeof ERROR_MESSAGES;

export type PublicApiErrorIssue = Readonly<{
  code: string;
  message: string;
  path?: readonly (number | string)[];
}>;

export function parseBearerToken(authorization: string | null) {
  if (!authorization || authorization.length > MAX_AUTHORIZATION_LENGTH) {
    return { status: "error" } as const;
  }

  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  return match
    ? { status: "success", token: match[1] } as const
    : { status: "error" } as const;
}

export function createRequestId(
  candidate: string | null,
  generate: () => string = randomUUID,
) {
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : generate();
}

export function publicApiErrorResponse(input: Readonly<{
  code: PublicApiErrorCode;
  details?: readonly PublicApiErrorIssue[];
  requestId: string;
  retryAfterSeconds?: number;
  status: number;
}>) {
  const headers = new Headers({
    "cache-control": "no-store",
    "x-request-id": input.requestId,
  });
  if (input.retryAfterSeconds !== undefined) {
    headers.set("retry-after", String(Math.max(1, Math.ceil(input.retryAfterSeconds))));
  }

  return Response.json({
    error: {
      code: input.code,
      message: ERROR_MESSAGES[input.code],
      request_id: input.requestId,
      ...(input.details ? { details: input.details } : {}),
    },
  }, { headers, status: input.status });
}
