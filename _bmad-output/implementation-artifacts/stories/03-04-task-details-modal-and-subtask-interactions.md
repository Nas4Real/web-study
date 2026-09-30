# Story 03-04: Task Details modal and subtask interactions

Epic: epic-03
Status: ready-for-dev
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
