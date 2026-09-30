# ExecPlan - Epic 04 Calendar, Recurrence and Session Details

## Goal

Deliver recurrence-correct Day/Week/Month data and approved effective-occurrence Session Details from Day/Week/Dashboard.

## Plan

1. Implement series/exception schema including ordered notes content and owner-aware constraints/RLS.
2. Implement bounded RFC-aligned occurrence expansion and effective-detail resolver keyed by original start.
3. Wire current type-specific authoring states without inventing missing UI.
4. Design/implement recurrence controls and occurrence-vs-series scope in live Superdesign-first stories.
5. Implement V4 Session Details and launch surfaces.
6. Superdesign-first enrich New/Edit Session with location/professor/notes as appropriate by type, then wire to service.
7. Add occurrence detail API and tests.
8. Run recurrence/timezone/RLS/E2E/a11y/visual suites.

## Key decisions

- original_start is stable instance identity
- effective detail overlays exceptions
- Notes & Reminders are content, not notification scheduler entries
- no invented Month click behavior

## Proof

Moved/cancelled/overridden occurrences behave correctly; detail matches live design; sibling occurrences remain unchanged after one-occurrence edit; tests pass.
