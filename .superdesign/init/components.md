# Shared UI Components

## Application shell

- `src/features/shell/study-sidebar.tsx` — 240 px desktop sidebar with brand, search, grouped navigation, active state, Settings, and profile control. Prop: `activeItem: string`.

## Dashboard presentation components

- `src/features/dashboard/dashboard-header.tsx`
- `src/features/dashboard/summary-cards.tsx`
- `src/features/dashboard/upcoming-assignments.tsx`
- `src/features/dashboard/task-progress.tsx`
- `src/features/dashboard/today-classes.tsx`
- `src/features/dashboard/mini-calendar.tsx`

The Dashboard components are presentation-only and consume typed fixture DTOs. Shared subject tone classes live in `src/features/dashboard/dashboard-styles.ts`.

## Calendar presentation components

- `src/features/calendar/calendar-header.tsx`
- `src/features/calendar/calendar-event-card.tsx`
- `src/features/calendar/views/day-view.tsx`
- `src/features/calendar/views/week-view.tsx`
- `src/features/calendar/views/month-view.tsx`

`src/features/calendar/calendar-page.tsx` owns only view and period state. Display data comes from the typed fixture contract and recurrence is intentionally not implemented yet.

## Workspace and dialog components

- `src/components/modal-frame.tsx` — shared labeled dialog frame with Escape dismissal, scroll locking, and focus restoration.
- `src/features/tasks/tasks-page.tsx`
- `src/features/tasks/new-task-modal.tsx`
- `src/features/tasks/task-details-modal.tsx`
- `src/features/documents/documents-page.tsx`
- `src/features/settings/settings-page.tsx`
- `src/features/calendar/new-session-modal.tsx`
- `src/features/calendar/session-details-modal.tsx`

These states are presentation-only and consume typed fixtures. Submit, destructive, persistence, and recurrence behavior belongs to later epics.
