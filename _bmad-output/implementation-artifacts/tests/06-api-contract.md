# Public API Contract Test Specification V4

## Generic

- API-001 missing/malformed/revoked API key rejected.
- API-002 user can access only own resources.
- API-003 validation errors use stable envelope/code.
- API-004 idempotency prevents duplicate create for supported POST endpoints.

## Tasks

- API-TASK-001 POST task accepts description/normal-high priority/initial subtasks.
- API-TASK-002 GET `/tasks/{id}` returns ordered TaskDetail DTO.
- API-TASK-003 nested subtask create/patch/delete works for owner.
- API-TASK-004 cross-user nested subtask ID is denied/non-enumerating.
- API-TASK-005 complete/reopen preserves subtask states.

## Calendar

- API-CAL-001 list range returns effective occurrences.
- API-CAL-002 GET occurrence detail returns effective override fields and stable original_start.
- API-CAL-003 occurrence PATCH can override allowed detail fields/notes.
- API-CAL-004 occurrence DELETE cancels one instance only.
- API-CAL-005 series PATCH/DELETE remains distinct.

Also cover subject/chapter/folder/file/notification/profile/storage API contracts.
