# Story 04-01: Calendar schema and typed session services

Epic: epic-04
Status: done
Dependencies: 02-04

## Purpose

Implement calendar_series/calendar_exceptions schema and create/update/delete/detail services for three session kinds, including location, professor, focus text and ordered notes items.

## Expected implementation surface

calendar migrations/service/schemas

## Engineering constraints

Exam duration may be nullable. University/Revision duration follows approved form contract. Notes items are validated ordered strings and occurrence overrides may replace detail fields.

## Implementation sequence

1. Read AGENTS.md, project context, active epic and matching engineering contract.
2. Define/confirm Zod/TypeScript contracts before wiring UI.
3. Implement repository/storage boundary, then application service.
4. Add route/action adapter only after service tests pass.
5. Wire approved UI without changing visual structure.
6. Run negative security/error paths, not only happy path.
7. Run required quality and visual gates.

## Failure cases to handle

- unauthenticated/invalid actor
- foreign-owned referenced IDs
- malformed or stale client input
- duplicate/retried request
- provider/database error mapped to normalized domain error
- race conditions relevant to this feature

## Test plan

Service and RLS tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Implementation checkpoint

- Added private `calendar_series` and `calendar_exceptions` tables with owner-aware subject/series foreign keys, stable `(series_id, original_start)` occurrence identity, typed session kinds, bounded structured content, timestamps, query indexes, and updated-at triggers.
- Added explicit least-privilege Data API grants and complete owner-scoped RLS policies; ownership and stable exception identity columns cannot be reassigned through authenticated writes.
- Added database validators for ordered Notes & Reminders and allowlisted occurrence override payloads so direct Data API writes cannot persist arbitrary JSON or malformed content.
- Implemented Zod contracts for Exam, University, and Revision sessions, including required University/Revision duration, nullable Exam duration, session-specific optional fields, IANA timezone validation, bounded notes, and discriminated modified/cancelled exceptions.
- Implemented provider-neutral `CalendarService` create/list/detail/update/delete behavior and a Supabase repository adapter that maps snake-case storage rows into validated camel-case domain records without leaking provider errors.
- Added 13 focused domain/service/migration tests and 23 calendar pgTAP assertions covering positive access, cross-user denial, owner-aware foreign keys, typed duration rules, structured-content constraints, override allowlisting, and exception uniqueness.
- A clean local Supabase reset applied every migration; all 42 database tests, Supabase security/performance advisors, dependency audit, lint, typecheck, all 119 Vitest tests, and the production build pass.
