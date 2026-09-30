# Detail Modal Interaction Test Specification

## Task Details

- DETAIL-TASK-001 row body opens expected task; checkbox action does not open it.
- DETAIL-TASK-002 detail renders subject/priority/due/description/subtasks from canonical DTO.
- DETAIL-TASK-003 subtask toggle is optimistic and rolls back on simulated failure.
- DETAIL-TASK-004 parent Complete works with incomplete subtasks and preserves their states.
- DETAIL-TASK-005 delete closes dialog, invalidates caches and removes list/dashboard row.

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
