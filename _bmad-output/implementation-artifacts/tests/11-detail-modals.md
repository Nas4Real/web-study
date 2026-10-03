# Detail Modal Interaction Test Specification

## Task Details

- DETAIL-TASK-001 row body opens expected task; checkbox action does not open it.
- DETAIL-TASK-002 detail renders subject/priority/due/description/subtasks from canonical DTO.
- DETAIL-TASK-003 subtask toggle is optimistic and rolls back on simulated failure.
- DETAIL-TASK-004 parent Complete works with incomplete subtasks and preserves their states.
- DETAIL-TASK-005 delete closes dialog, invalidates caches and removes list/dashboard row.

## Task verification

Task scenarios above are executable in `tests/e2e/task-details.spec.ts`, `tests/e2e/dashboard-task-details.spec.ts`, `tests/e2e/modal-accessibility.spec.ts` and `tests/e2e/workspace-surfaces.spec.ts`. Canonical projection, validation, ownership and mutation tests live beside the task detail service/handlers and optimistic state helpers. Story 03-04 verification: full code checks and all 63 browser tests pass, including unchanged Dashboard baselines and separately retained canonical-task/confirmation baselines. Deferred-delete tests verify that a different selection remains open on both surfaces. Session scenarios below remain scoped to story 04-06.

## Task authoring verification

Story 03-05 authoring scenarios are executable in `tests/e2e/task-authoring.spec.ts`: approved empty/populated visuals, high-priority/description/ordered-subtask creation, edited/removed/reordered rows, canonical detail round-trip after reload, date-only due time, independent parent/subtask completion, input preservation after rejection, optional-field defaults, keyboard focus/reordering at 320/768/1024/1440px and coarse-pointer controls. The action-handler tests reject malformed priorities, File-valued entries, blank/oversized subtask titles and oversized lists using the shared schemas. Full code checks and all 71 browser tests pass. Historical New Task imagery is retained alongside separately named approved authoring baselines.

## Session Details

- DETAIL-CAL-001 Day card opens effective occurrence.
- DETAIL-CAL-002 Week card opens same occurrence identity.
- DETAIL-CAL-003 Dashboard Today's Classes opens same effective occurrence.
- DETAIL-CAL-004 modified occurrence displays overridden location/professor/notes/time.
- DETAIL-CAL-005 edit/delete routes recurring occurrence through scope selection.

## Dialog behavior

- DETAIL-A11Y-001 background cannot receive pointer/keyboard interaction.
- DETAIL-A11Y-002 focus trap/restore and Escape behavior pass.
- DETAIL-VIS-001 Task Details matches live Superdesign/V4 reference.
- DETAIL-VIS-002 Session Details matches live Superdesign/V4 reference.
