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
