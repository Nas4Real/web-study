# Data Model - Web Study V1 (V4)

## Design principles

- User-owned rows carry `user_id` for simple RLS and indexed tenant filtering.
- Cross-user references are prevented with owner-aware composite foreign keys wherever practical.
- Timestamps are `timestamptz`.
- User-facing flexible labels are `text`, not database enums that would block future customization.
- Recurrence series and occurrence exceptions are separate. `original_start` is the stable recurrence-instance identity.

## Core entities

### profiles

`id` (PK/FK `auth.users.id`), `display_name`, `timezone` (IANA), optional `avatar_object_key`, `storage_quota_bytes` (default 2 GiB), `storage_used_bytes`, `storage_reserved_bytes`, timestamps.

### subjects

`id`, `user_id`, `name`, `color`, optional `icon`, `position`, timestamps. Unique case-insensitive name per user is recommended.

### chapters

`id`, `user_id`, `subject_id`, `name`, `position`, timestamps. `(subject_id,user_id)` must reference the same user's subject.

### folders

`id`, `user_id`, `subject_id`, optional `chapter_id`, optional `parent_id`, `name`, `position`, timestamps. Owner-aware FKs prevent references to foreign-owned subject/chapter/parent rows. Service logic prevents ancestor cycles.

### tasks

- `id`, `user_id`, `subject_id`
- `title`
- `description` nullable, max-length validated
- `priority` = `normal | high`, default `normal`
- `status` = `pending | completed | someday`
- `due_at` nullable
- `completed_at` nullable
- timestamps

The historical New Task field labeled Notes maps to canonical `description` until Superdesign is updated. Do not keep redundant `notes` and `description` columns in the greenfield schema.

Rules: completed => `completed_at` non-null; other statuses => null. Parent completion does not mutate subtasks.

### task_subtasks

- `id`, `user_id`, `task_id`
- `title`
- `position`
- `completed_at` nullable
- timestamps

`(task_id,user_id)` references the owning task. Subtask completion is independent. Deleting a task cascades to subtasks.

### calendar_series

- `id`, `user_id`, `subject_id`
- `kind` = `exam | university | revision`
- `title`, `starts_at`, optional `duration_minutes`
- `timezone` (IANA)
- optional `recurrence_rule`
- optional `location`, `professor`, `focus_text`
- `notes_items jsonb` default `[]`, application-validated as an ordered array of short strings
- timestamps

University design may expose both location and professor. Exam may expose location. Revision may expose focus/chapter. Notes & Reminders can be used by any kind when the live design exposes them.

### calendar_exceptions

`id`, `user_id`, `series_id`, `original_start`, `action` (`modified|cancelled`), `override_payload jsonb`, timestamps, unique `(series_id, original_start)`.

`original_start` remains the occurrence identity even when an occurrence is moved. `override_payload` can replace title/start/duration/location/professor/focus/notes for one occurrence. This matches RFC 5545's RECURRENCE-ID concept without forcing storage of every generated instance.

### files / upload_intents

Files store private metadata and opaque R2 object key. Upload intent reserves quota before a presigned upload and is finalized only after server-side object verification. Owner-aware FKs cover subject/chapter/folder/file relationships.

### notification_preferences / notifications

Preferences are per user. Notification rows include dedupe identity, source and optional occurrence identity. Calendar notification deep links use `(series_id, occurrence_start)` semantics.

### api_keys / api_rate_windows

Only key prefix/fingerprint/hash and metadata are stored. Raw token is never persisted. Rate counters are internal infrastructure data.

### file_cleanup_jobs

Internal reliable cleanup queue for stale/failed/deleted R2 objects.

## Important indexes

- all `user_id` and FK columns
- `tasks(user_id, status, due_at)`
- `task_subtasks(task_id, position)`
- `calendar_series(user_id, starts_at)`
- `calendar_exceptions(series_id, original_start)`
- `files(user_id, subject_id, created_at desc)` and folder list path
- `notifications(user_id, read_at, created_at desc)`
- active API-key lookup fields

## Ownership consistency

RLS controls which rows a caller may operate on. It does not by itself guarantee a row cannot hold a foreign ID belonging to another user. The schema therefore uses composite owner-aware foreign keys where feasible, e.g. `(subject_id,user_id) -> subjects(id,user_id)` and `(task_id,user_id) -> tasks(id,user_id)`.

## Read models

### TaskDetailDTO

Task + subject display metadata + ordered subtasks. Used by the Task Details modal and `GET /api/v1/tasks/{id}`.

### CalendarOccurrenceDetailDTO

Effective occurrence after applying the series master and any exception override. Includes stable `series_id`, `original_start`, effective start/end, subject, location/professor/focus, notes items and recurrence metadata needed for edit/delete scope.
