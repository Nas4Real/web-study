# Story 01-05: Port Tasks Documents Settings and modals

Epic: epic-01
Status: ready-for-dev
Dependencies: 01-02

## Purpose

Port Tasks, Documents, Settings, New Task, and type-specific New Session modals.

## Expected implementation surface

src/features/tasks/*, documents/*, settings/*, calendar/components/*

## Engineering constraints

Do not invent recurrence controls directly in code. Story 04-04 first creates/iterates the recurrence state in the live Superdesign project, then implements it.

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

Visual baselines for every supplied screen.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
