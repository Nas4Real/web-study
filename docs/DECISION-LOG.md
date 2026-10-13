# Decision Log V4

Date: 2026-09-29

- Live Superdesign is the primary UI authority; Nas does not export project files.
- Missing required states are designed by Codex in the same Superdesign project before implementation.
- Desktop web only for V1.
- Next.js 16.3.x / React 19.3 / Node 24 LTS baseline.
- Tailwind major is chosen for live-design parity first; no forced v4 migration.
- Supabase Postgres/Auth/RLS + explicit Data API grants; Cloudflare R2 private file bytes.
- Email/password + Google only; email verification required; Apple excluded.
- User-owned private subjects/tasks/calendar/docs.
- Task canonical prose field is `description`; V1 priority is normal/high.
- Task subtasks are relational and independently completable. Parent completion does not rewrite subtasks.
- Task Details approved and reusable from supported Tasks/Dashboard surfaces.
- Calendar types Exam/University/Revision; recurring + one-occurrence/series edit/delete.
- Session Details approved from Day/Week/Dashboard and resolves effective occurrence.
- Session Notes & Reminders are ordered content, not scheduled notifications.
- `original_start` is stable recurrence-instance identity.
- New/Edit Task and Session must be enriched in live Superdesign before coding those missing authoring controls.
- Storage 2 GB/user, 50 MB/file, allowed types PDF/DOCX/XLSX/PPTX/PNG/JPG.
- R2 upload uses single presigned PUT under current 50 MB cap.
- Public `/api/v1` covers the application domain with dual authentication:
  verified Supabase sessions/JWTs for users and personal API keys for external
  integrations. Cookie-authenticated mutations require a same-origin request.
- In-app notifications only; AI Suggestion backend out of V1.

## 2026-10-10: Navigation optimization planning

- Retain Server Components for initial authenticated reads. Client API queries
  for Calendar/Tasks are conditional on measured interaction bottlenecks.
- Add Epic 09 with five core stories and two conditional stories. Local fixture
  timings are exploratory; story 09-01 must establish production evidence.
- Distinguish immediate loading feedback from time to usable content. No claim
  that JSON inherently renders faster or that a loading shell fixes slow queries.
- Share auth/profile results within a render request only; browser caches are
  actor-scoped and cleared on auth loss, sign-out or account replacement.
- Follow the user's later direct-code preference for loading states, reusing
  approved screen geometry/tokens instead of creating new Superdesign drafts.
- Planning uses repository BMAD V6 conventions; no installed BMAD skill was
  found. Existing deferred private-beta product scope remains unchanged.
