# In-App Notifications Engineering

## V1 categories

- upcoming exam
- overdue task
- session reminder

No email and no browser push.

## Generation

A scheduled job evaluates enabled preferences and inserts notifications with deterministic dedupe keys.

Examples:

```text
exam:{calendar_series_id}:{occurrence_start}:lead:{hours}
task:{task_id}:overdue:{due_at}
session:{calendar_series_id}:{occurrence_start}:lead:{minutes}
```

Unique `(user_id, dedupe_key)` makes generation idempotent.

## Deep links

Notification payload stores source type/id and optional occurrence start. The UI resolves task notifications to the canonical Task Details flow and session notifications to the effective Session Details occurrence when the live design supports that deep link.

## Read state

`read_at` nullable. Bell unread badge counts unread rows. Marking read or unread is user-scoped and idempotent.

## Superdesign-first states

If the detailed notification popover/list or preference-management UI is absent from the live project, Codex creates/iterates those states in the existing Superdesign project before implementation. Do not invent their appearance directly in code.
