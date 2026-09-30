# Story 05-03: Atomic quota reservation and upload intents

Epic: epic-05
Status: ready-for-dev
Dependencies: 05-01,05-02

## Purpose

Implement transaction/function for quota reservation plus pending file and intent creation.

## Expected implementation surface

SQL function/migration, DocumentService.createUploadIntent

## Engineering constraints

2 GB default; 50 MB file limit; concurrent uploads safe.

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

Concurrent quota tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
