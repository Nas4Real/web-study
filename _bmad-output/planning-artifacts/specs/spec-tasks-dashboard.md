# Feature Specification - Tasks, Task Details and Dashboard

## Scope

Task persistence/status, priority, descriptions, subtasks, Pending/Completed/Someday lists, dashboard task summaries, Task Details modal, and canonical click/mutation behavior.

## Data contract

Parent task: mandatory subject/title, optional description/due, status, `normal|high` priority, completed timestamp. Subtasks are ordered child rows with independent completion.

## UI contract

- Existing Task list/Dashboard designs remain exact.
- V4 Task Details is approved and must match live Superdesign / `v4/17_TaskDetails.png`.
- Clicking supported row/card body opens details; checkbox actions do not bubble into open-detail.
- New Task needs a same-project Superdesign update before code exposes priority/subtask authoring. If an Edit Task flow is present or later approved in live Superdesign, it uses the same domain fields; do not invent a separate edit UI in code.

## Behavior

Parent completion is independent from subtasks. Task detail mutations synchronize all relevant task/dashboard views. Due grouping uses the user's timezone.

## API

Full detail GET plus nested subtask mutation endpoints are part of `/api/v1`.

## Acceptance

Service/RLS/unit/E2E/visual/a11y tests in the test index must pass, including cross-user subtask denial and modal focus behavior.
