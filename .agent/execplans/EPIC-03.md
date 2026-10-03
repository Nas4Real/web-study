# ExecPlan - Epic 03 Tasks, Details and Dashboard

## Goal

Deliver one secure canonical task domain, approved Tasks/Dashboard rendering, and the V4 Task Details/subtask experience without visual redesign.

## Plan

1. Update schema/migration with `description`, `priority`, `task_subtasks`, owner-aware FKs, indexes, grants and RLS.
2. Implement TaskService/repository and tests before UI.
3. Wire existing New Task/list and dashboard derived reads.
4. Implement `TaskDetailDTO`, detail query/caching, approved modal, click propagation rules and subtask mutations.
5. Run story 03-05 Superdesign-first to add priority/description/subtask authoring/edit state, then implement.
6. Add API detail/nested subtask endpoints through same services.
7. Run unit/RLS/API/E2E/a11y/visual tests and inspect screenshot diffs.

## Key decisions

- normal/high only
- description is canonical, no duplicate notes column
- parent completion independent from subtasks
- live Superdesign > V4 screenshot > older design artifacts

## Proof

All Epic 03 stories ready/done, relevant test specs executable and passing, visual comparison approved, no cross-user task/subtask access.

## Progress

- `03-04` dialog behavior checkpoint: shared ModalFrame now traps Tab/Shift+Tab, isolates background siblings with reversible inert state, handles Escape with the latest callback without reinitializing focus on render, and restores the exact connected invoker and scroll state. Two focused Playwright tests pass; the focus-wrap test failed before implementation. Full `pnpm check` and full `pnpm test:e2e --workers=2` pass, including unchanged visual baselines. No classes/layout/styles changed. Repaired missing confirmation as same-project branch `abad03b2-7a63-4e9c-b022-ba4a602bf087`; browser screenshot verifies correct colors/fonts and three-subtask underlay. User review requested before porting; canonical UI/cache wiring remains.

- `03-04` in progress on 2026-10-03: canonical TaskDetailService projection and strict commands, verified-request handlers and server-action adapters are implemented. Fourteen focused tests and full `pnpm check` pass. Reviewed actor scoping, minimal DTOs, sanitized errors and pre-write subject resolution; no schema or approved UI changes. Remaining: shared Tasks/Dashboard detail controller/cache, optimistic rollback, dialog focus/inert/restore, approved delete confirmation and E2E/visual proof. Live confirmation is missing; separate same-project draft `856f365f-b044-4db2-bfae-2cd0af7a1901` was generated, but browser inspection found malformed Tailwind configuration and incomplete underlay. Repair/review before porting; original drafts unchanged. Completion count remains 17/45.

- `03-03` complete on 2026-10-03: added timezone-aware dashboard derived reads through the shared task/subject/calendar services, bounded effective-occurrence expansion, deterministic chronological ordering, real month markers and honest empty results. Wired authenticated server rendering into the approved dashboard without structural or styling redesign. Nine focused service/projection tests, the full `pnpm check`, and all 53 Playwright tests pass; dashboard visual baselines remain unchanged and the data-backed screenshot was manually inspected. Task/session detail behavior remains for 03-04/04-06.

- `03-01` complete on 2026-10-02: added private task/subtask persistence with owner-aware subject/task foreign keys, least-privilege grants, full owner RLS, atomic ordered subtask creation, normalized service/repository contracts, user-timezone grouping, explicit parent transitions, and independent subtask completion. All 14 focused unit/static tests, 19 live pgTAP isolation/invariant tests, 96 full Vitest tests, lint, typecheck, build, and Supabase advisors pass.
- `03-02` complete on 2026-10-02: wired authenticated task/subject reads and New Task creation through the shared services, added timezone-correct due dates and stable action errors, implemented Pending/Completed/Someday grouping plus optimistic complete/reopen rollback and the approved Someday overflow action, and preserved checkbox-versus-detail click behavior. All 106 Vitest tests, 52 Playwright tests, lint, typecheck, and the production build pass; affected Superdesign-parity baselines were manually inspected without developer-overlay contamination.
