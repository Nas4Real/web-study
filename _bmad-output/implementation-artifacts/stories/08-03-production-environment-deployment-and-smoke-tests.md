# Story 08-03: Production environment deployment and smoke tests

Epic: epic-08
Status: in-progress
Dependencies: 08-01,08-02

## Purpose

Configure Vercel/Supabase/R2 env, CORS, callbacks, cron/jobs and production smoke checks.

## Expected implementation surface

deployment docs/config

## Engineering constraints

Secrets server-only. Authenticated pages uncached publicly.

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

Production smoke checklist.

## Implementation record

- Hosted Supabase project `qvqnztgpjludiahmboyd` is linked and all migrations are applied.
- Production auth allows the Vercel origin plus local development callbacks, requires eight-character passwords, and requires email verification.
- Vercel environment values are configured for Supabase and the production app origin; R2 remains optional and uploads are visibly disabled when it is absent.
- `/api/health` provides a no-store deployment health check.
- `pnpm check` passes.
- `pnpm test:launch-critical` passes: 12 critical browser flows and 27 tenant-isolation pgTAP assertions.
- Public deployment and post-deploy smoke checks remain before this story can be marked done.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
