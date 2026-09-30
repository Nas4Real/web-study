# Story 05-04: Upload completion verification and cleanup

Epic: epic-05
Status: ready-for-dev
Dependencies: 05-03

## Purpose

HEAD object, verify size/type metadata, finalize accounting, expire stale intents and enqueue cleanup.

## Expected implementation surface

DocumentService.completeUpload, cleanup job

## Engineering constraints

Completion idempotent; reservation cannot leak.

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

Failure matrix tests and cleanup integration tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
