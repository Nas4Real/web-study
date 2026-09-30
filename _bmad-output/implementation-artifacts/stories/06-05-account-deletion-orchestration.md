# Story 06-05: Account deletion orchestration

Epic: epic-06
Status: ready-for-dev
Dependencies: 05-04,07-01

## Purpose

Implement deletion state/cleanup/API key revocation/session revocation. Wire destructive UI only after story 06-06 creates/iterates a confirmation state in the live Superdesign project.

## Expected implementation surface

AccountDeletionService, cleanup jobs

## Engineering constraints

Retryable storage cleanup; no active credentials survive.

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

Integration tests including partial R2 failure.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
