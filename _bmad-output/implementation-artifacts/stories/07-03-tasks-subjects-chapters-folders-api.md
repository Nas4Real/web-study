# Story 07-03: Tasks subjects chapters folders API

Epic: epic-07
Status: done
Dependencies: 07-02,03-01,05-01

## Purpose

Expose versioned CRUD/list endpoints using shared services.

## Expected implementation surface

src/app/api/v1/...

## Engineering constraints

Cursor pagination; Zod validation.

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

Contract tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## V4 addition

Expose task detail and nested subtask mutations using the same TaskService; include description and normal/high priority.
