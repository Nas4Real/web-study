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

- `03-05` Superdesign-first checkpoint: fetched existing New Task reproduction and branched only missing priority/Description/ordered-subtask controls in the same project. First generated branch had unmounted template bindings; repaired review branch `89cbf9bb-2e9e-4e0f-8321-b99ffeeb264b` renders correctly. Browser-verified priority selection, add/edit/remove/reorder and 320px overflow behavior, with source fonts/neutral modal/white primary preserved. No Edit flow exists, so none is invented. User review requested before any app code; production authoring will start with zero optional subtasks rather than review samples. Story is in progress; count remains 18/45.

- `03-04` complete: Dashboard assignment cards and non-checkbox task bodies now reuse the canonical Tasks detail/cache/mutation controller. Dashboard checkboxes issue explicit complete/reopen commands without opening detail; successful writes refresh derived summary/assignment/task/calendar data. Verified keyboard opening, exact focus restoration, independent subtask persistence across surfaces, complete/reopen, confirmed deletion across both lists, failed checkbox saves and delayed deletions while another task is selected. The first three Dashboard tests failed against the inert implementation before wiring. Five new browser tests pass; full `pnpm check` and all 63 E2E tests pass (`--workers=2`). The initial six-worker run during the production build hit one cumulative 30-second Tasks-test timeout (60 passed); lower-concurrency rerun passes unchanged assertions and timeouts. Existing Dashboard and all other visual baselines are unchanged; the canonical Dashboard detail screenshot was manually inspected. Review found no additional business rules, authorization paths, dependencies or visual restyling. Completed count is now 18/45; next Epic 03 story is Superdesign-first authoring extension `03-05`.

- `03-04` Tasks integration checkpoint: user continued after the neutral confirmation review; ported same-project draft `fec4830f-529a-41e3-a71d-1d45afa12c0e` without changing approved main screens. Tasks now opens canonical selected-task detail through a per-surface TanStack Query v5 cache, persists independent subtask/parent mutations, rolls back transport failures, and deletes only after confirmation. Nested dialogs use stacked keyboard handling and reference-counted inert/scroll isolation, including simultaneous deletion cleanup. Four new projection tests, three detail E2E tests, full `pnpm check`, and full `pnpm test:e2e` pass after the final cleanup change. Dependency is pinned to 5.104.1 (MIT, React 19 compatible); production audit reports no known vulnerabilities. Original fixture screenshot retained; separately named canonical-content and neutral-confirmation baselines were manually inspected. Review covered mutation ID capture, cache ownership, rollback, safe request gating, and nested cleanup. Dashboard launch/controller integration remains; story stays in progress and completion count remains 17/45.

- Confirmation review: user rejected the pink confirmation palette as inconsistent with the design system. Compared exact main live `#task-details-dialog` DOM and design-system v10; standalone overlay used obsolete subject-color styling. New same-project branch `fec4830f-529a-41e3-a71d-1d45afa12c0e` uses live #101012 surface / #2a2a2e border, neutral v10 primary #f4f4f5 / #09090b, Poppins, and a small red destructive cue instead of pink. Browser screenshot and computed styles verified those values; approved main draft is unchanged. Await review before implementation.

- `03-04` dialog behavior checkpoint: shared ModalFrame now traps Tab/Shift+Tab, isolates background siblings with reversible inert state, handles Escape with the latest callback without reinitializing focus on render, and restores the exact connected invoker and scroll state. Two focused Playwright tests pass; the focus-wrap test failed before implementation. Full `pnpm check` and full `pnpm test:e2e --workers=2` pass, including unchanged visual baselines. No classes/layout/styles changed. Repaired missing confirmation as same-project branch `abad03b2-7a63-4e9c-b022-ba4a602bf087`; browser screenshot verifies correct colors/fonts and three-subtask underlay. User review requested before porting; canonical UI/cache wiring remains.

- `03-04` in progress on 2026-10-03: canonical TaskDetailService projection and strict commands, verified-request handlers and server-action adapters are implemented. Fourteen focused tests and full `pnpm check` pass. Reviewed actor scoping, minimal DTOs, sanitized errors and pre-write subject resolution; no schema or approved UI changes. Remaining: shared Tasks/Dashboard detail controller/cache, optimistic rollback, dialog focus/inert/restore, approved delete confirmation and E2E/visual proof. Live confirmation is missing; separate same-project draft `856f365f-b044-4db2-bfae-2cd0af7a1901` was generated, but browser inspection found malformed Tailwind configuration and incomplete underlay. Repair/review before porting; original drafts unchanged. Completion count remains 17/45.

- `03-03` complete on 2026-10-03: added timezone-aware dashboard derived reads through the shared task/subject/calendar services, bounded effective-occurrence expansion, deterministic chronological ordering, real month markers and honest empty results. Wired authenticated server rendering into the approved dashboard without structural or styling redesign. Nine focused service/projection tests, the full `pnpm check`, and all 53 Playwright tests pass; dashboard visual baselines remain unchanged and the data-backed screenshot was manually inspected. Task/session detail behavior remains for 03-04/04-06.

- `03-01` complete on 2026-10-02: added private task/subtask persistence with owner-aware subject/task foreign keys, least-privilege grants, full owner RLS, atomic ordered subtask creation, normalized service/repository contracts, user-timezone grouping, explicit parent transitions, and independent subtask completion. All 14 focused unit/static tests, 19 live pgTAP isolation/invariant tests, 96 full Vitest tests, lint, typecheck, build, and Supabase advisors pass.
- `03-02` complete on 2026-10-02: wired authenticated task/subject reads and New Task creation through the shared services, added timezone-correct due dates and stable action errors, implemented Pending/Completed/Someday grouping plus optimistic complete/reopen rollback and the approved Someday overflow action, and preserved checkbox-versus-detail click behavior. All 106 Vitest tests, 52 Playwright tests, lint, typecheck, and the production build pass; affected Superdesign-parity baselines were manually inspected without developer-overlay contamination.
