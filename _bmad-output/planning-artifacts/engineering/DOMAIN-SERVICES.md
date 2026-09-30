# Domain Services - Web Study V4

## Rule

Route handlers, Server Actions and React components are adapters. Domain behavior lives in application services over repositories/adapters.

## TaskService

Operations:

- list/group tasks
- create/update/delete task
- getTaskDetail
- complete/reopen/setSomeday
- add/update/delete/reorder/toggle subtask

Validation:

- actor owns subject/task/subtask
- title/description length
- `priority in {normal,high}`
- parent completion invariant
- due-at/timezone conversions happen at boundary with explicit user timezone

Parent complete/reopen does not mutate subtasks.

## CalendarService

Operations:

- create/update/delete series
- listOccurrences(range)
- getOccurrenceDetail(seriesId, originalStart)
- modifyOccurrence
- cancelOccurrence

Occurrence detail resolves effective series + exception fields. Type-specific validators cover duration/location/professor/focus. `notes_items` is an ordered validated string list. Recurrence expansion is bounded.

## Subject/Document/Notification/Account/ApiKey services

All previously defined domain services accept an explicit actor and produce provider-neutral domain errors.

## Repositories

Repositories are persistence-only and never decide UI semantics. They accept already-authorized/scoped input from services, and still use RLS/owner-aware database constraints as defense in depth.

## Query/cache adapters

Client detail queries may use TanStack Query. Query keys are stable domain identities, not component names. Components never cache raw R2 credentials or personal API key secrets.
