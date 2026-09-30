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
