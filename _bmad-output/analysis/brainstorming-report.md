# BMAD Brainstorming / Decision Capture Report V4

Date: 2026-09-29
Coach: Carson
Owner: Nas
Route: Progressive flow, deep session

## Goal

Turn Nas's already-designed education organizer into an implementation-ready engineering plan for Codex without brainstorming a replacement UI. Superdesign remains the visual authority.

## Captured product decisions

### Platform/auth

Desktop web V1; multi-user/private; email/password + Google; email verification required; forgot/reset supported; Apple excluded; AI backend deferred.

### Academic model

User-managed subjects. Every task/session/file belongs to a subject. Chapters/folders are user-managed, with Cours/TD/Resume as editable starter folders.

### Tasks

Pending/Completed/Someday; completion timestamp and reopening. V4 adds an approved Task Details modal containing priority, description and independent subtasks. V1 priority is normal/high. Parent completion does not auto-complete subtasks. New/Edit Task must be adapted in live Superdesign before those authoring controls are implemented.

### Calendar

Exam, University/Class and Revision; create/edit/delete; one-time or recurring; one-occurrence vs entire-series operations. The underlying model uses RRULE-compatible recurrence, but exact recurrence-control choices are governed by the approved Superdesign UI rather than hard-coded brainstorming assumptions. V4 adds approved Session Details from Calendar Day/Week and Dashboard Today's Classes, with effective occurrence data, location, professor and ordered Notes & Reminders.

### Documents/storage

Supabase/Postgres metadata + private Cloudflare R2 bytes. PDF/DOCX/XLSX/PPTX/PNG/JPG, max 50 MB, default 2 GB/user, direct signed upload/download.

### Notifications/settings/API

In-app notifications only; profile/password/preferences/storage/signout/delete; Developer/API management. `/api/v1` covers application resources with revocable hashed personal API keys. Web and API share services.

## Engineering constraints emerging from the session

1. Port approved live Superdesign states; do not recreate/redesign them.
2. Missing states are designed in the same Superdesign project before code.
3. Database privacy is enforced by RLS plus owner-consistent relationships.
4. UI/API share domain services.
5. File bytes bypass normal app request bodies.
6. Recurring occurrence identity must survive single-instance moves.
7. Detail modals are canonical entity read models, not one-off duplicated UI data.

## Readiness

The package is decomposed into epics/stories. Approved detail states can be implemented after service prerequisites. Missing authoring states are explicitly `ready-superdesign-first`, not blocked on Nas exporting files.
