# V4 Changelog - 2026-09-29

## Product additions

- Task Details modal approved.
- Task priority + description + ordered subtasks engineered.
- Session Details modal approved from Day/Week/Dashboard.
- Session location/professor/ordered Notes & Reminders engineered.
- New/Edit Task and Session marked Superdesign-first for missing authoring controls.

## Architecture changes

- relational `task_subtasks`
- `tasks.description` + `tasks.priority`
- `calendar_series.notes_items`
- effective occurrence detail DTO/query keyed by original start
- client detail-cache/invalidation rules
- owner-aware composite foreign keys emphasized
- explicit Supabase Data API grants added to migration plan
- Tailwind parity-first rule replaces blanket v4 assumption
- R2 single PUT explicitly selected for 50 MB cap

## Planning changes

- 4 new stories: 03-04, 03-05, 04-06, 04-07
- total stories: 45
- new detail-modal test spec, total test specs: 11
- new ADR, detail-view, BMAD mapping and traceability docs
- V4 screenshots added to design references
