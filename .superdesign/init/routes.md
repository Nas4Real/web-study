# Routes

## `/`

- Entry: `src/app/(workspace)/page.tsx`
- Layout chain: `src/app/layout.tsx` → `src/app/(workspace)/layout.tsx`
- Rendering: approved Dashboard with the persistent Web Study shell.

## `/calendar`

- Entry: `src/app/(workspace)/calendar/page.tsx`
- Layout chain: `src/app/layout.tsx` → `src/app/(workspace)/layout.tsx`
- Rendering: approved Calendar Day, Week, and Month views with local view/period navigation.

## `/tasks`

- Entry: `src/app/(workspace)/tasks/page.tsx`
- Layout chain: `src/app/layout.tsx` → `src/app/(workspace)/layout.tsx`
- Rendering: approved pending-task groups with New Task and Task Details dialog states.

## `/documents`

- Entry: `src/app/(workspace)/documents/page.tsx`
- Layout chain: `src/app/layout.tsx` → `src/app/(workspace)/layout.tsx`
- Rendering: approved search, subject folders, recent documents, and all-files table.

## `/settings`

- Entry: `src/app/(workspace)/settings/page.tsx`
- Layout chain: `src/app/layout.tsx` → `src/app/(workspace)/layout.tsx`
- Rendering: approved profile, security, preferences, locked 2 GB storage, danger-zone, and profile-menu states.

Sidebar links for AI Tutor, Knowledge Base, and Statistics remain hash placeholders until their routes exist.
