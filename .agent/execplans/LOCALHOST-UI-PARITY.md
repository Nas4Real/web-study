# Localhost UI parity port

## Contract and provenance

User explicitly selected `http://localhost:5173/` as the new visual reference and
asked to copy its existing code, not redesign or recreate it. Source directory:
`C:/Users/itsna/Desktop/web/app/src`. Live Vite runs from `C:/Users/itsna/Desktop/web`;
App, CSS, Sidebar and Dashboard hashes match the corresponding `app/src` files.
Do not edit the reference project or create Superdesign drafts.

Retain Next.js 16.3.8/React 19.3, Tailwind 3.4, real authenticated routes and the
UI -> application service -> repository layering. Copy source JSX/classes with
typed data bindings and existing handlers. Lucide SVGs replace source Iconify
Lucide tags without adding a remote runtime. No new infrastructure/dependencies.

## Ordered, independently verified slices

1. **Shell + Dashboard**: `App.tsx`, `index.css`, `layout/Sidebar.tsx`,
   `dashboard/{DashboardView,KpiCards,UpcomingAssignments,TodayTasks,TodayClasses,MiniCalendar}.tsx`
   -> workspace layout, globals/tokens, study-sidebar and corresponding Dashboard components.
   Source desktop viewport containment, 7/5 grid, spacing, card radius24,
   typography, icon dimensions and hover states must be retained. Bind actual
   priority/subject metadata. Preserve detail queries, checkbox propagation and
   recurring occurrence identity. Wire New Task and real View All routes.
2. **Tasks**: `tasks/TasksView.tsx` -> tasks-page; keep optimistic mutations,
   rollback, pending/completed filters, someday/empty/error states and authoring.
3. **Calendar**: CalendarView/Header/Day/Week/Month -> existing calendar feature;
   keep effective occurrences, recurrence scope and previously fixed subject colors.
4. **Documents**: DocumentsView and subject/chapter screens -> existing document
   components; keep searches, chapter creation and unavailable-storage guidance.
5. **Remaining states**: inspect Settings/auth/dialog source and port differences
   without removing the working app's additional, already-approved controls.

Each slice needs lint, typecheck, focused/full unit tests, build, browser comparison
at equal1280x720 desktop viewport and action checks. Commit separate verified
slices. Existing visual baselines are historical and must not be blindly updated.

## Deliberate functional differences

- Use real identity/data, not Della Guerrero/mock statistics or hardcoded sessions.
- Normal/High priority only; no fake Medium/Low. Real subject colors retained.
- No Apple auth or fake sign-in/save behavior. No fake Holiday events.
- Keep2GB quota and disabled uploads until storage is connected.
- Notifications remain deferred: no fake unread badge or newly functioning backend.
- Preserve mobile navigation/usability; mobile redesign/performance work stays deferred.
- For incomplete mock interactions, wire existing functional routes/actions rather
  than copying no-op handlers. No tenant/security changes.

## Progress and evidence

- 2026-10-11: Source identified and source-to-target mapping inspected. Working
  tree started with user/generated `next-env.d.ts` and untracked `.serena/`; preserve.
- Before port: working Dashboard had2/1 grid, radius16,padding24,uppercase12 labels;
  source has7/5 grid,radius24,padding28,sentence-case15 labels and internal scroll.
- Shell/Dashboard and Tasks copied using source classes. Required subject/priority
  fields are projected from owned data. Notifications show no invented unread
  count; mini-calendar dates/arrows link to actual day/month routes.
- Real authenticated browser at1280x720: Tasks source and app both have header
  top13px,bottom119px,h1 font26px,content padding32px,content height588px,
  overflow-y:auto,document height720px. Differences in rows/card heights reflect
  real text/counts rather than fixture content. Meaningful screenshots inspected.
- Verified Dashboard New Task opens real form; assignment detail; complete/reopen
  via checkbox without opening details (restored test task to pending); Tasks
  keyboard detail, independent action menu, Completed/Someday filters. Calendar
  session detail, Documents and Settings still load in the shell. No data deletion.
- Full regression suite742 tests passes; typecheck passes; lint0errors,existing
  modal-frame effect-ref warning unchanged. Production builds pass, including a
  build using the same public hosted-Supabase configuration as browser verification.
- Self-review: business logic/services/auth unchanged; semantic buttons and control
  propagation preserved; no new dependencies, remote icon runtime or security changes.
- Not yet ported: Calendar, Documents, Settings/auth/dialog differences. Existing
  mobile navigation retained; mobile redesign/performance remain deferred.
