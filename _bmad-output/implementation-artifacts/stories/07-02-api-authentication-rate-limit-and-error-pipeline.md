# Story 07-02: API authentication rate limit and error pipeline

Epic: epic-07
Status: done
Dependencies: 07-01

## Purpose

Implement bearer parser, actor resolution, Postgres rate limiter, request IDs and error mapping.

## Expected implementation surface

src/server/api/*

## Engineering constraints

Foreign resource IDs never bypass user scope.

## Implementation sequence

1. Read AGENTS.md, project context, active epic and matching engineering contract.
2. Define/confirm Zod/TypeScript contracts before wiring UI.
3. Implement repository/storage boundary, then application service.
4. Add route/action adapter only after service tests pass.
5. Wire approved UI without changing visual structure.
6. Run negative security/error paths, not only happy path.
7. Run required quality and visual gates.

## Failure cases to handle

- unauthenticated/invalid actor
- foreign-owned referenced IDs
- malformed or stale client input
- duplicate/retried request
- provider/database error mapped to normalized domain error
- race conditions relevant to this feature

## Test plan

API integration tests.

## Implementation record

- Added bounded, case-insensitive Bearer parsing; safe client request-ID acceptance with server-generated fallback; and the stable OpenAPI error envelope with no-store and correlation headers.
- Added one reusable public API handler pipeline that resolves the personal API key to `ActorContext`, applies rate limiting before resource adapters, passes only the verified actor to downstream services, and sanitizes provider/internal failures.
- Revoked, expired, malformed, and missing credentials all stop before resource handlers. Invalid/revoked/expired keys share the non-enumerating `API_KEY_INVALID` response.
- Added `api_rate_windows` plus `consume_api_rate_limit` using one atomic `INSERT ... ON CONFLICT DO UPDATE`, a locked empty `search_path`, `SECURITY INVOKER`, RLS, and explicit server-only grants.
- Added a fail-closed Supabase rate-limiter adapter with provider-response validation. The initial policy is 120 requests per 60-second window per API key.
- Applied migration `20261008175956_api_rate_windows.sql` to hosted project `qvqnztgpjludiahmboyd` after a clean dry run.
- Hosted SQL verification confirmed counts `1,2,3`, allowed decisions `true,true,false`, invalid-configuration rejection, browser-role denial, and `service_role` function access. The temporary verification row was deleted in the same block.
- Focused API-pipeline/rate-limit tests pass: 21 tests. The full unit suite, typecheck, and production build pass.
- Lint has zero errors and the same unrelated pre-existing warning in `src/components/modal-frame.tsx`.
- Supabase performance advisors report no issues. Security advisors report only the pre-existing file-function and leaked-password-protection warnings; the new function produced no finding.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
