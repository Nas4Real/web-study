# Story 03-02: Wire New Task and task list UI

Epic: epic-03
Status: done
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

## Implementation checkpoint

- Replaced the Tasks page demo source with authenticated, owner-scoped reads through the verified actor, profile timezone, `SubjectService`, `TaskService`, and Supabase repositories.
- Wired the approved New Task modal to a server action with service validation, provider-neutral errors, real subjects, and user-timezone end-of-day conversion for HTML due dates without changing the approved Superdesign structure.
- Implemented Pending, Completed, and Someday views; overdue/today/later grouping; optimistic complete/reopen with rollback; and the approved overflow action for moving a task to Someday.
- Preserved the task-row interaction contract: checkbox actions do not open Task Details, while the non-checkbox task body continues to open the approved detail dialog.
- Added a deterministic in-memory task repository gated by the existing non-production E2E auth token so create/complete/reopen/someday behavior is tested without weakening production authentication or tenant isolation.
- Added focused unit/action-handler tests and Playwright coverage for create, complete, reopen, Someday, event propagation, responsive surfaces, and clean approved visual baselines.
- Lint, typecheck, all 106 Vitest tests, the production build, and all 52 Playwright tests pass; the task-dialog baselines were manually inspected after removing Next.js developer-overlay pixels.
