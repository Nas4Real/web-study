# Story 01-03: Port application shell and Dashboard pixel-faithfully

Epic: epic-01
Status: ready-for-dev
Dependencies: 01-02

## Purpose

Port dashboard and shared shell/profile menu markup exactly. No backend.

## Expected implementation surface

src/app/(workspace)/layout.tsx, src/features/dashboard/*, src/features/shell/*

## Engineering constraints

Visual parity at approved viewport.

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

Playwright screenshot baseline and interaction smoke.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
