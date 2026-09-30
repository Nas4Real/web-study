# Shared Layouts

## RootLayout

- Source: `src/app/layout.tsx`
- Loads Poppins and IBM Plex Mono through `next/font`, applies global styles, metadata, and the root document.

## WorkspaceLayout

- Source: `src/app/(workspace)/layout.tsx`
- Dependencies: `src/features/shell/study-sidebar.tsx`, `src/styles/globals.css`.
- Structure: 12 px black outer shell and gap, 240 px desktop sidebar, flexible `#09090b` workspace with 20 px radius, `#27272a` border, and approved workspace shadow.
- Current active navigation item: Dashboard.
- Below 1024 px the desktop sidebar is hidden; content remains usable without introducing an unapproved alternate shell.
