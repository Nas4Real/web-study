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
- Public `/api/v1` covers application domain with personal API keys.
- In-app notifications only; AI Suggestion backend out of V1.
