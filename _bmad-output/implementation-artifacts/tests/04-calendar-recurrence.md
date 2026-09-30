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
