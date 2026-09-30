# Story 03-01: Tasks schema service and CRUD

Epic: epic-03
Status: ready-for-dev
Dependencies: 02-04

## Purpose

Implement task persistence, validation, list grouping, normal/high priority, canonical description, subtask persistence foundation, and complete/reopen/someday transitions.

## Expected implementation surface

tasks migration/repository/service/schemas

## Engineering constraints

Subject mandatory. Owner-aware subject FK. `completed_at` invariant. Parent completion is independent from subtask completion. Canonical prose field is `description`, not duplicate `notes`.

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

Service tests, subtask unit tests, owner-aware FK tests, and RLS tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
