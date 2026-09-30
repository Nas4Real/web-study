# Story 04-03: Wire current type-specific session modals

Epic: epic-04
Status: ready-for-dev
Dependencies: 04-01,01-05

## Purpose

Connect Exam/University/Revision create forms exactly as designed.

## Expected implementation surface

calendar form actions/components

## Engineering constraints

Wire only fields present in the currently approved create states. Missing recurrence/detail authoring fields are handled by Superdesign-first stories 04-04/04-07, not invented in code.

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

E2E create each kind and view it.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
