# Engineering Audit V4

## Audit question

Can Codex implement the new Task Details and Session Details behaviors without inventing domain semantics, weakening security, or drifting from Superdesign?

## Result

**Yes, with Superdesign-first gates for the still-missing authoring states.**

## Key reasoning

1. Task details imply persistent concepts that the old task create modal does not contain. Priority/description/subtasks are modeled explicitly rather than hidden inside UI-only state.
2. Subtasks are relational because they have identity, ordering, independent mutations, API routes and security boundaries.
3. Parent completion is independent because the approved modal exposes Complete while multiple subtasks remain unchecked.
4. Session detail must be occurrence-aware. Reading the series master would display stale data after a one-occurrence edit, so detail resolution is part of CalendarService.
5. Notes & Reminders are value content rather than scheduled notifications. JSON ordered strings fit the demonstrated behavior and are easy to override per occurrence.
6. Original-start identity follows RFC 5545 and prevents moved occurrences from losing edit/delete identity.
7. Exact UI port should not be bundled with a Tailwind-major migration; official Tailwind docs confirm v4 has visual-impacting breaking changes.
8. Supabase's 2026 grants change means RLS alone is not enough to make intended Data API tables reachable. Explicit grants belong in migrations.
9. The 50 MB product cap is below R2's ~100 MB single-PUT guidance, so multipart would be unnecessary V1 complexity.
10. Modal accessibility is implemented behaviorally beneath the approved visual layer, following W3C APG focus/inert semantics.

## Remaining intentional unknowns

Exact layouts for enriched New/Edit Task, enriched New/Edit Session, recurrence scope and other previously identified missing Settings/auth states must come from live Superdesign. The engineering package specifies capability/constraints but deliberately does not fabricate their visual design.
