# Public API Contract - Web Study V1 (V4)

Base path: `/api/v1`

## Authentication

External clients use `Authorization: Bearer <personal-api-key>`. The raw key is shown once. Store only prefix/fingerprint + secure hash. Revoked/expired keys fail before domain services are invoked.

The normal web app uses the Supabase authenticated session but calls the same application services.

## General rules

- JSON request/response for metadata.
- Zod schemas are shared with service contracts.
- Stable error envelope: `error.code`, `error.message`, `request_id`, optional validation details.
- Mutating POST operations that may be retried support `Idempotency-Key` where documented.
- IDs are UUIDs. Calendar occurrence identity is `(series_id, original_start)`.

## Task endpoints

- `GET /tasks`
- `POST /tasks`
- `GET /tasks/{task_id}` returns full detail with subject + ordered subtasks
- `PATCH /tasks/{task_id}`
- `DELETE /tasks/{task_id}`
- `POST /tasks/{task_id}/complete`
- `POST /tasks/{task_id}/reopen`
- `POST /tasks/{task_id}/subtasks`
- `PATCH /tasks/{task_id}/subtasks/{subtask_id}`
- `DELETE /tasks/{task_id}/subtasks/{subtask_id}`

Task create/update accepts `description`, `priority: normal|high`, and may accept an ordered initial subtask list. Subtask mutation never permits crossing task ownership boundaries.

## Calendar endpoints

- `GET /sessions?from=&to=` returns bounded effective occurrences
- `POST /sessions`
- `PATCH /sessions/{series_id}` / `DELETE /sessions/{series_id}` for whole series
- `GET /sessions/{series_id}/occurrences/{original_start}` for full effective occurrence detail
- `PATCH /sessions/{series_id}/occurrences/{original_start}` for one-occurrence override
- `DELETE /sessions/{series_id}/occurrences/{original_start}` for one-occurrence cancellation

Session payloads support optional `location`, `professor`, `focus_text`, and ordered `notes_items`. The service validates type-specific applicability and recurrence rules.

## Other resources

Subjects, chapters, folders, files/upload-intents, notifications/preferences, profile/storage and API-key settings follow the existing V1 contract in `docs/openapi.yaml`.

## File transfer

The API never accepts a 50 MB file body through the ordinary JSON route. It creates a quota-reserved upload intent and returns a short-lived R2 presigned PUT. Completion verifies the uploaded object before it becomes a ready file.
