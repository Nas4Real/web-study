# Story 03-04: Task Details modal and subtask interactions

Epic: epic-03
Status: in-progress
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
