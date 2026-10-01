# Page Dependency Trees

## `/` (Dashboard)

Entry: `src/app/(workspace)/page.tsx`

- `src/app/layout.tsx`
  - `src/styles/globals.css`
- `src/app/(workspace)/layout.tsx`
  - `src/features/shell/study-sidebar.tsx`
- `src/features/dashboard/dashboard.tsx`
  - `src/features/dashboard/dashboard-header.tsx`
  - `src/features/dashboard/summary-cards.tsx`
  - `src/features/dashboard/upcoming-assignments.tsx`
  - `src/features/dashboard/task-progress.tsx`
  - `src/features/dashboard/today-classes.tsx`
  - `src/features/dashboard/mini-calendar.tsx`
  - `src/features/dashboard/dashboard-styles.ts`
  - `src/fixtures/index.ts`
  - `src/domain/dto/screens.ts`

For sibling designs, pass the WorkspaceLayout, StudySidebar, closest Dashboard components, global styles, Tailwind config, and `.superdesign/design-system.md` as context.

## `/calendar` (Calendar)

Entry: `src/app/(workspace)/calendar/page.tsx`

- `src/app/layout.tsx`
  - `src/styles/globals.css`
- `src/app/(workspace)/layout.tsx`
  - `src/features/shell/study-sidebar.tsx`
- `src/features/calendar/calendar-page.tsx`
  - `src/features/calendar/calendar-header.tsx`
  - `src/features/calendar/calendar-event-card.tsx`
  - `src/features/calendar/calendar-styles.ts`
  - `src/features/calendar/calendar-period.ts`
  - `src/features/calendar/views/day-view.tsx`
  - `src/features/calendar/views/week-view.tsx`
  - `src/features/calendar/views/month-view.tsx`
  - `src/fixtures/index.ts`
  - `src/domain/dto/calendar.ts`

## `/tasks` (Tasks)

Entry: `src/app/(workspace)/tasks/page.tsx`

- `src/features/tasks/tasks-page.tsx`
  - `src/features/tasks/new-task-modal.tsx`
  - `src/features/tasks/task-details-modal.tsx`
  - `src/components/modal-frame.tsx`
  - `src/fixtures/index.ts`

## `/documents` (Documents)

Entry: `src/app/(workspace)/documents/page.tsx`

- `src/features/documents/documents-page.tsx`
  - `src/fixtures/index.ts`

## `/settings` (Settings)

Entry: `src/app/(workspace)/settings/page.tsx`

- `src/features/settings/settings-page.tsx`
- `src/features/shell/study-sidebar.tsx` (profile menu)
- `src/fixtures/index.ts`

Calendar dialog states additionally use `src/features/calendar/new-session-modal.tsx`, `src/features/calendar/session-details-modal.tsx`, and the shared `src/components/modal-frame.tsx`.

## Auth routes

Entries:

- `src/app/(auth)/sign-in/page.tsx`
- `src/app/(auth)/sign-up/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`

Shared dependencies:

- `src/features/auth/auth-shell.tsx`
- `src/features/auth/auth-form.tsx`
- `src/domain/dto/screens.ts`
- `src/styles/globals.css`
