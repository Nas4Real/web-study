# API authentication

Status: implemented on 2026-10-09

Every Web Study resource route under `/api/v1` accepts either a verified
Supabase user session or a personal API key. Users of the website do not need
to create API keys.

## First-party website requests

Same-origin browser requests use the Supabase Auth session already stored in
cookies. The server validates the session with `auth.getClaims()`, accepts only
non-anonymous `authenticated` claims, and uses only the verified JWT `sub` UUID
as the actor identity.

Cookie-authenticated `POST`, `PUT`, `PATCH`, and `DELETE` requests must include
an `Origin` header matching the API request origin. Missing or cross-origin
values return `403 FORBIDDEN`. This check prevents cross-site request forgery;
it is not required for safe reads.

```ts
await fetch("/api/v1/tasks", {
  credentials: "same-origin",
  headers: { "content-type": "application/json" },
  method: "POST",
  body: JSON.stringify(task),
});
```

## Supabase access-token requests

A client that already holds a current Supabase access token can send it
explicitly. Supabase verifies its signature and expiry before the request
reaches an application service.

```http
Authorization: Bearer <supabase-access-jwt>
```

Access JWTs are short-lived. External integrations should not copy browser
refresh tokens or implement their own session persistence.

## Personal API keys

Personal keys remain available for external scripts and integrations:

```http
Authorization: Bearer wsk_<prefix>_<secret>
```

They are shown once, hashed at rest, revocable, and subject to the API-key rate
window. Supabase session/JWT requests do not consume an API-key rate window.

## Authorization boundary

Authentication only establishes `userId`. Every adapter calls the same
owner-scoped application services used by the website, and foreign or missing
resource IDs receive the same non-enumerating response. User metadata is never
used for authorization, and Supabase secret credentials never reach clients.

The shared implementation lives in:

- `src/server/api/public-api-handler.ts`
- `src/server/api/public-api-runtime.ts`
- `src/server/api/supabase-session-verifier.ts`

