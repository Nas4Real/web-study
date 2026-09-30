# Story 02-02: Email signup verification signin and Google OAuth

Epic: epic-02
Status: ready-for-dev
Dependencies: 02-01,01-06

## Purpose

Wire email/password signup, verification callback, sign in, Google OAuth callback and sign out.

## Expected implementation surface

auth routes/actions/services

## Engineering constraints

No Apple. Unverified password accounts cannot enter workspace.

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

E2E happy/failure flows with test Supabase project/local stack.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
