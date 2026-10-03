# Story 03-04: Task Details modal and subtask interactions

Epic: epic-03
Status: done
Dependencies: 03-01,03-02,01-05

## Purpose

Implement the approved Task Details modal and connect it to Tasks/Dashboard launch surfaces using a canonical detail read model.

## Visual authority

Live Superdesign Task Details state, with `design-reference/screenshots/v4/17_TaskDetails.png` as regression reference.

## Expected implementation surface

TaskDetail DTO/query, dialog component/behavior, task/subtask service methods, query cache integration, E2E/visual/a11y tests.

## Engineering constraints

- priority is `normal|high`
- description is canonical task prose field
- subtasks are child rows with independent `completed_at`
- parent completion may occur with incomplete subtasks
- checkbox clicks do not bubble into row-open behavior
- modal focus/inert/Escape/restore behavior must meet dialog contract without restyling

## Acceptance scenarios

1. Open detail from Tasks row body.
2. Open same canonical detail from supported Dashboard task surface.
3. Toggle a subtask and see detail/list data stay consistent; rollback on failed mutation.
4. Complete parent with incomplete subtasks; subtasks remain unchanged.
5. Delete uses approved destructive flow and removes detail/list/dashboard state.
6. Another user cannot GET/mutate task or subtask by guessed ID.
7. Visual comparison matches approved Task Details.

## Implementation checkpoint — 2026-10-03

- Added canonical detail projection and strict complete/reopen/delete/subtask commands, delegating to existing actor-owned task services.
- Added verified-request handlers and server actions with safe errors and Tasks/Dashboard revalidation. Subject metadata is resolved before mutation to avoid reporting a committed write as a failed read.
- Fourteen focused service/handler tests passed, including foreign-ID denial, malformed commands, independent subtasks, parent completion/reopening, deletion and provider failure. Full `pnpm check` passed (lint, typecheck, unit tests, production build).
- Backend-only checkpoint: actions are not yet connected to the UI. Story is not complete; shared modal/cache integration, optimistic rollback, focus/inert behavior and E2E/visual verification remain.
- Live Delete Task only closes the detail dialog. Created a separate same-project confirmation draft: https://p.superdesign.dev/draft/856f365f-b044-4db2-bfae-2cd0af7a1901 (original approved drafts unchanged). Browser inspection found malformed generated Tailwind configuration and incomplete underlying detail content; this draft is not approved or suitable to port. Repair and review it before implementing confirmation.

## Dialog behavior checkpoint

- ModalFrame now traps keyboard focus and makes background siblings inert, restoring their original inert state on cleanup. Escape uses the latest close callback without resetting focus on render. Closing restores the connected original invoker and prior scroll state.
- Two focused Playwright tests pass; focus wrapping failed before implementation. Full `pnpm check` and full `pnpm test:e2e --workers=2` pass, including unchanged visual baselines. Existing visual classes are unchanged.
- Repaired confirmation preview: https://p.superdesign.dev/draft/abad03b2-7a63-4e9c-b022-ba4a602bf087. Browser inspection verifies rendering and all three underlying subtasks. Await user review before porting this new state; original approved drafts remain unchanged.

## Confirmation palette review

- User rejected the repaired draft's pink palette. Exact main-live Task Details DOM and design-system v10 were inspected; use main-live evidence rather than the obsolete standalone overlay styling.
- Revised same-project preview: https://p.superdesign.dev/draft/fec4830f-529a-41e3-a71d-1d45afa12c0e. Computed browser styles verify #101012 surface, #2a2a2e border, Poppins, and neutral primary #f4f4f5 / #09090b. Pink is removed from confirmation; red is a small destructive cue. No approved main-draft or app styling changes. Await user review before porting.

## Tasks integration checkpoint

- User continued after the revised preview; the earlier review waits are superseded. Ported only the revised neutral confirmation, leaving approved main screens unchanged.
- Tasks opens the selected canonical task rather than a fixture. The per-mounted-surface TanStack Query cache synchronizes complete/reopen and independent subtasks, snapshots optimistic state, and rolls back failed requests. Mutation callbacks capture the explicit task ID; a synchronous guard prevents concurrent rollback races.
- Confirmation deletion waits for server success before removing the task. Nested dialog Escape/Cancel restores Delete focus; normal closure restores the task invoker, including recreated DOM nodes. Reference-counted background isolation and scroll locking release when both layers unmount together.
- Added four optimistic/timezone projection tests and three browser tests covering canonical selection, persistence, parent/subtask independence, confirmation, cleanup and transport rollback. Focused E2E, full `pnpm check` and full `pnpm test:e2e` pass after the final cleanup change.
- Pinned `@tanstack/react-query` 5.104.1 with only query-core added transitively; MIT, React 19 compatible, production audit clean. No new persistence or authorization rules.
- Original approved fixture baseline retained unchanged. New separately named canonical-content and delete-confirmation images were manually compared; due date/description come from stored data rather than hardcoded demo prose. Existing Tasks/New Task baselines still pass unchanged.
- Story remains in-progress: supported Dashboard task/assignment launch surfaces and shared mutation synchronization are the next slice. Completion count remains 17/45.

## Completion evidence

- Dashboard assignment cards and non-checkbox task bodies now open the same canonical Task Details component/controller as Tasks. Live Dashboard assignment click behavior and pointer-styled task bodies were inspected before wiring; no approved classes/colors/layouts changed.
- Dashboard checkboxes send explicit complete/reopen commands through the same validated actor-owned detail service without opening a modal. Successful mutations refresh the server-derived summary, assignment/task lists and calendar markers; detail cache updates remain keyed to the mutated ID.
- Five new browser tests cover canonical selection, Enter/Space opening, exact invoker restoration, independent subtask persistence across Dashboard/Tasks, parent complete/reopen, confirmed deletion across both surfaces and reload, failed saves, and deferred deletion while a different task is selected (both surfaces).
- The initial three Dashboard tests failed against the inert implementation. Focused behavior tests pass after wiring. Full `pnpm check` (lint, typecheck, unit suite, build) passes. All 63 E2E tests pass with two workers, with all existing visual baselines unchanged. A six-worker run concurrent with the build had one cumulative 30-second Tasks-flow timeout; assertions/timeouts were not weakened for the passing rerun.
- Manually inspected `test-results/dashboard-task-details.png`; the selected Physics task renders canonical data in the existing approved dialog over Dashboard. Existing Tasks canonical-content and neutral-confirmation baselines remain green.
- Review covered explicit mutation identity, cache scope, request authorization, rollback, derived-data refresh, nested dialogs, keyboard paths and selection changes during outstanding requests. No new persistence rules, dependencies, or infrastructure changes in this slice. Earlier backend foreign-ID denial tests and owner-aware task/subtask RLS remain in place.
- All seven acceptance scenarios are covered. Story is done; completion count is 18/45. Priority/description/subtask authoring/editing remains separately scoped to Superdesign-first story 03-05.
