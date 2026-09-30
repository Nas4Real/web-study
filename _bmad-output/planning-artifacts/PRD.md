# Product Requirements Document - Web Study V1 (V4)

Status: engineered baseline
Date: 2026-09-29

## 1. Product objective

Build the approved Superdesign experience as a reliable, private desktop study workspace. Implementation must preserve approved UI rather than reinterpret it.

## 2. Functional requirements

### Authentication/account

- **FR-AUTH-01** User can sign up with email/password and must verify email before normal app access.
- **FR-AUTH-02** User can sign in with verified email/password or Google OAuth.
- **FR-AUTH-03** User can request password reset and set a new password.
- **FR-AUTH-04** User can update display name/profile, change password, sign out, and delete account.
- **FR-AUTH-05** Apple authentication is excluded from V1 even if historical designs contain an Apple button.

### Subjects

- **FR-SUBJ-01** Each user owns and manages a private list of subjects.
- **FR-SUBJ-02** Subject color/name is reused consistently across tasks, calendar, dashboard, and documents.
- **FR-SUBJ-03** A task, calendar session, or uploaded file cannot reference another user's subject.

### Tasks

- **FR-TASK-01** User can create/edit/delete a task with title, mandatory subject, optional description, due semantics, status, and priority.
- **FR-TASK-02** V1 priority values are `normal` and `high`. Do not invent additional priority tiers without a product change.
- **FR-TASK-03** A task can contain ordered subtasks. Each subtask has independent complete/incomplete state.
- **FR-TASK-04** Completing/reopening the parent task does not automatically alter subtask completion states. Parent completion is allowed even when some subtasks remain incomplete.
- **FR-TASK-05** Pending tasks are grouped as overdue, today, and later according to user-local time. Completed tasks move to the Completed tab and retain `completed_at`. Someday remains a distinct status.
- **FR-TASK-06** Clicking the body of a task on supported Tasks/Dashboard surfaces opens the approved Task Details modal. Direct checkbox actions perform their checkbox behavior rather than opening the modal.
- **FR-TASK-07** Task Details presents subject, priority, due information, description, subtasks, and applicable Complete/Reopen/Delete actions.

### Calendar

- **FR-CAL-01** User can view Day, Week, and Month calendar views with deterministic date navigation.
- **FR-CAL-02** Session types are Exam, University, and Revision with a shared core and type-specific fields.
- **FR-CAL-03** Sessions support one-time and RFC-5545-style recurring schedules. A user can edit/delete one occurrence or the entire series.
- **FR-CAL-04** An occurrence can expose optional location, professor, focus/chapter text, and ordered Notes & Reminders as appropriate for the session type/design.
- **FR-CAL-05** Session Notes & Reminders are descriptive content. They are not equivalent to scheduled notification reminders.
- **FR-CAL-06** Clicking a session in Calendar Day, Calendar Week, or Dashboard Today's Classes opens the approved Session Details modal.
- **FR-CAL-07** Session Details must resolve the effective occurrence, including a single-occurrence modification, rather than always displaying series-master fields.
- **FR-CAL-08** For recurring occurrence edit/delete, the UI must obtain scope (`this occurrence` or `entire series`) before applying the mutation.
- **FR-CAL-09** Month-view click behavior follows live Superdesign only; no additional interaction is assumed by this PRD.

### Documents/storage

- **FR-DOC-01** User organizes private files by subject, chapter, and editable folders.
- **FR-DOC-02** New chapters receive starter folders Cours, TD, Resume as editable data rows, not hard-coded enums.
- **FR-DOC-03** Allowed upload types: PDF, DOCX, XLSX, PPTX, PNG, JPG/JPEG.
- **FR-DOC-04** Maximum file size is 50 MB. Default per-user quota is 2 GB and is configuration/data driven.
- **FR-DOC-05** File bytes are private in Cloudflare R2 and accessed through short-lived authorized URLs. File/folder metadata lives in Postgres.

### Dashboard

- **FR-DASH-01** Dashboard derives upcoming exam, next session, task counts/progress, upcoming assignments/tasks, today's classes, and compact calendar from canonical task/calendar data.
- **FR-DASH-02** Dashboard task/session surfaces reuse the same detail behavior as the canonical Task Details / Session Details flows where shown in live Superdesign.

### Notifications

- **FR-NOTIF-01** V1 supports in-app notifications for upcoming exams, overdue tasks, and sessions starting soon.
- **FR-NOTIF-02** Notifications have read/unread state and deep-link to the relevant task or effective calendar occurrence.
- **FR-NOTIF-03** Notification preferences are user configurable. No email/browser-push channel in V1.

### Settings/API

- **FR-SET-01** Settings contains profile, password, notification preferences, storage usage, sign out, delete account, and Developer/API key management.
- **FR-API-01** Versioned `/api/v1` exposes application domain resources for external clients.
- **FR-API-02** Personal API keys are user-owned, shown once, hashed at rest, revocable, and rate-limited.
- **FR-API-03** Web mutations and public API mutations call the same domain/application services and validation rules.
- **FR-API-04** File uploads use upload intents + direct presigned R2 PUT, not a 50 MB body proxied through Next.js.

## 3. Non-functional requirements

- **NFR-SEC-01** Strict per-user isolation at database and application layers, including foreign-reference ownership.
- **NFR-SEC-02** No R2 credentials, Supabase secret/service-role key, or raw personal API key is exposed to client bundles/logs.
- **NFR-DATA-01** Data API grants are explicit in migrations for intended user-facing tables, and RLS remains a separate mandatory layer.
- **NFR-UI-01** Approved Superdesign states are protected by deterministic Playwright visual regression.
- **NFR-A11Y-01** Modal dialogs behave accessibly: inert outside content, bounded focus, Escape/close behavior, accessible label, focus restoration.
- **NFR-PERF-01** Ordinary authenticated JSON endpoints target p95 < 500 ms excluding third-party/file-transfer variance.
- **NFR-PERF-02** Calendar occurrence expansion is bounded by requested range and recurrence safeguards.
- **NFR-PERF-03** Unbounded lists adopt deterministic pagination/cursor strategy before scale requires it.
- **NFR-OPS-01** Account deletion/reliable file deletion uses recoverable cleanup/reconciliation so failed R2 deletion cannot silently orphan data forever.

## 4. Out of scope V1

User-to-user sharing, public folders, Google Drive sync/import, email/push notifications, native mobile app, Apple auth, AI Suggestion backend, collaborative editing.

## 5. Design completion rule

Task Details and Session Details are approved. New/Edit Task and New/Edit Session do not yet expose all new fields in the supplied older modal screenshots. Codex must create/iterate those missing states in the live Superdesign project before implementing them. No UI is invented directly in code.
