# Unit and Domain Test Specification V4

Tooling: Vitest. Pure domain tests remain independent of Next.js/providers.

## Tasks

- TASK-UNIT-001 missing/foreign subject rejected.
- TASK-UNIT-002 complete sets `completed_at`; reopen clears it.
- TASK-UNIT-003 Someday does not imply completed.
- TASK-UNIT-004 priority accepts only `normal|high`.
- TASK-UNIT-005 parent complete with incomplete subtasks succeeds and does not modify subtask states.
- TASK-UNIT-006 subtask toggle changes only the target subtask.
- TASK-UNIT-007 subtask ordering is deterministic.
- TASK-UNIT-008 description/subtask count/length validation is bounded.

## Calendar

- CAL-UNIT-001 notes_items validation accepts ordered strings and rejects malformed payloads.
- CAL-UNIT-002 effective occurrence overlays location/professor/focus/notes without changing `original_start`.

## Existing domains

Also cover subject rules, folder-cycle prevention, allowed file types, 50 MB size, 2 GB quota, API-key parser/hash, error normalization, and notification dedupe behavior.
