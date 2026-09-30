# Story 07-04: Calendar API including occurrence operations

Epic: epic-07
Status: ready-for-dev
Dependencies: 07-02,04-02

## Purpose

Expose series CRUD, range occurrences and occurrence exception actions.

## Expected implementation surface

api/v1/sessions/*

## Engineering constraints

Bound range; explicit scope.

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

Contract/recurrence API tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## V4 addition

Add effective occurrence detail GET keyed by series_id + original_start, including location/professor/focus/notes after overrides.
