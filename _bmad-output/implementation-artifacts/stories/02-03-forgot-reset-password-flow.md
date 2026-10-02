# Story 02-03: Forgot/reset password flow

Epic: epic-02
Status: done
Dependencies: 02-01

## Purpose

Wire reset-link request and password update backend. Post-link UI remains design-blocked if not supplied.

## Expected implementation surface

auth reset routes/actions

## Engineering constraints

Tokens never logged.

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

Integration tests for request and callback errors.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Implementation checkpoint

- Added normalized reset-request and matching-password contracts, with a non-enumerating public response for valid email-shaped requests.
- Added Supabase recovery-link generation through the fixed PKCE callback with `/set-new-password` as the safe internal destination.
- Added verified-session password updates through `updateUser({ password })`, with stable public errors and no token logging.
- Wired the approved Forgot Password request form without changing its initial visual baseline. The designed post-link form remains owned by Superdesign-first Story `02-06`.
- Focused unit/action/gateway tests, the 12 approved auth browser/visual tests, and a real local Supabase + Mailpit recovery flow pass, including old-password rejection and new-password sign-in.
