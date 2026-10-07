# Story 08-04: Operational hardening

Epic: epic-08
Status: done
Dependencies: 08-03

## Purpose

Add structured logs, request IDs, cleanup/job monitoring, backups/restore notes and incident checklist.

## Expected implementation surface

logging/ops docs

## Engineering constraints

No secrets logged.

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

Failure injection smoke tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Private-beta scope delivered

- Added a server-only structured `auth_callback_failed` event for the highest-value
  previously silent production failure path.
- Added validated request IDs and returned the correlation ID on both callback
  success and failure responses.
- Kept callback codes, query strings, emails, tokens, provider messages, and raw
  exceptions out of telemetry.
- Added focused failure-injection tests for structured output, unsafe request-ID
  replacement, successful callback correlation, and normalized failure redirects.
- Added `docs/PRIVATE-BETA-OPERATIONS.md` with Vercel/Supabase diagnosis steps,
  an incident checklist, free-plan logical backup policy, and a restore rehearsal
  procedure that never starts by overwriting production.
- Deferred cleanup/job monitoring, metrics, tracing, alerts, and third-party
  monitoring under the agreed two-user private-beta scope.

## Verification

- `pnpm check` passes: lint, TypeScript, 63 Vitest files / 515 tests, and the
  production Next.js build.
- `pnpm test:launch-critical` passes the serialized critical browser flows and
  the 27-assertion tenant-isolation database suite.
- No UI changed, so no visual comparison was required.
