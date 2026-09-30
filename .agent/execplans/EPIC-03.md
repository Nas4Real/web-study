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
