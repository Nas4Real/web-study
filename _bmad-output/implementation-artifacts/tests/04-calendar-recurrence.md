# Calendar Recurrence Test Specification V4

- REC-001 one-time event appears once in bounded range.
- REC-002 RRULE expands only within requested range and safety limit.
- REC-003 cancelled exception removes occurrence.
- REC-004 modified occurrence keeps `original_start` while effective start changes.
- REC-005 effective Session Details overlays title/time/location/professor/focus/notes.
- REC-006 another occurrence in same series remains unchanged after one-occurrence edit.
- REC-007 whole-series edit applies to future generated occurrences according to supported V1 policy.
- REC-008 timezone/DST transitions preserve intended local recurrence semantics.
- REC-009 recurrence-rule rewrite handles or rejects orphaned exceptions deterministically.
- REC-010 invalid `original_start` returns stable occurrence-not-found semantics.

## Creation-form checkpoint

`src/server/study/calendar-date.test.ts` covers strict date/time parsing, leap-date/overflow rejection, profile-timezone conversion, fractional UTC offsets, nonexistent DST times, first-occurrence fold selection, half-hour transitions and skipped days. Run under a second host timezone to detect environment-dependent construction (`TZ=America/Los_Angeles` and `TZ=Asia/Tokyo` were verified). `calendar-action-handlers.test.ts` covers all three approved kinds through the real CalendarService, compatible optional fields, duration choices, trusted actor/timezone, duplicate/File fields and sanitized reference/provider errors. 61 focused tests and full code checks pass. UI creation/readback E2E remains part of story 04-03.
