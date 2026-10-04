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

## Progress

- `04-03` backend checkpoint on 2026-10-04: inspected live type-specific forms; implemented recognized scalar-form parsing and trusted-profile timezone conversion through existing CalendarService. Added 61 focused tests for three kinds, duration options, malformed/duplicate/File input, actor/error isolation and date/time conversion. Cross-host testing exposed ambiguous-time dependence in zoned component construction; fixed this adapter with verified nearby-offset candidates, earliest-instant fold selection and gap rejection. Los Angeles/Tokyo checks and full `pnpm check` pass. No UI/schema/repository/dependency changes yet. Remaining: action/context, subject loading, form pending/retry integration, canonical calendar readback, E2E and unchanged visual gates. Live University/Revision include a 60-minute option missing from local static markup. Later recurrence work should also audit the existing recurrence engine's component-based floating-to-instant conversion for host-dependent fall-back behavior; no unrelated recurrence changes were made here. Count remains 19/45 done.

- `04-02` complete on 2026-10-03: added bounded timezone-aware RRULE expansion, DST-preserved wall time, UTC UNTIL handling, canonical stable identities, modified/cancelled exception overlays and moved-in occurrences. `CalendarService.listOccurrences` validates ISO ranges up to 366 days and caps returned occurrences at 500; expansion limits historical evaluation to 10,000 candidates. Added validated owner-filtered exception repository reads and reject schedule rewrites when stored exceptions exist. All 23 focused calendar tests, full `pnpm check`, 42 pgTAP tests, Supabase advisors and dependency audit pass. UI wiring remains in subsequent stories.

- `04-01` complete on 2026-10-02: added private typed session-series and stable occurrence-exception persistence with owner-aware foreign keys, least-privilege grants, full owner RLS, bounded Notes & Reminders, allowlisted override JSON, and query indexes; implemented validated Exam/University/Revision contracts, provider-neutral `CalendarService` CRUD/detail operations, and a Supabase repository adapter with provider-boundary record validation. All 13 focused tests, 42 full pgTAP tests, Supabase advisors, dependency audit, lint, typecheck, all 119 Vitest tests, and the production build pass.
