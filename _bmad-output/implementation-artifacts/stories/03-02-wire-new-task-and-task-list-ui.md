# Story 03-02: Wire New Task and task list UI

Epic: epic-03
Status: ready-for-dev
Dependencies: 03-01,01-05

## Purpose

Connect approved modal/list to TaskService without changing visual markup.

## Expected implementation surface

task actions/hooks/components

## Engineering constraints

Optimistic completion allowed with rollback on failure.

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

E2E create/complete/reopen/someday.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
