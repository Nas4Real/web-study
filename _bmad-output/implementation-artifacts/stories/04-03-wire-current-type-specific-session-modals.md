# Story 04-03: Wire current type-specific session modals

Epic: epic-04
Status: in-progress
Dependencies: 04-01,01-05

## Purpose

Connect Exam/University/Revision create forms exactly as designed.

## Expected implementation surface

calendar form actions/components

## Engineering constraints

Wire only fields present in the currently approved create states. Missing recurrence/detail authoring fields are handled by Superdesign-first stories 04-04/04-07, not invented in code.

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

E2E create each kind and view it.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Backend checkpoint — 2026-10-04

- Inspected current live Superdesign New Session variants. Existing fields are title/subject/date/start time; Exam adds Room / Location and has no duration, University adds optional Professor and duration, Revision adds optional Focus or chapter and duration. Live duration options are 45/60/90/120 minutes; the static local form currently omits the 60-minute option. Preserve source visuals when wiring it. Recurrence/notes/additional detail authoring stays in 04-04/04-07.
- Added a provider-neutral creation-form handler that accepts only recognized scalar fields, rejects duplicate/File-valued entries, resolves wall time using the verified profile timezone and delegates validation/normalization/write behavior to CalendarService. Client actor/timezone/recurrence/notes values are not trusted. Exam duration remains null; incompatible type fields are rejected by the shared schema. Stable public errors cover authentication, invalid input, foreign subject references and provider failures. This handler is not exposed by a new route/action yet.
- Added strict local date/time conversion with round-trip candidate verification. A test under a Los Angeles host timezone exposed host-dependent fall-back resolution in the date library's component constructor; replaced that path with verified offset candidates and earliest-instant selection for folds. Nonexistent times are rejected rather than silently shifted. Tests cover Tunis, New York winter/summer/fall-back, Kathmandu fractional offsets, Lord Howe half-hour transitions, leap dates and Apia's skipped day.
- All 61 focused adapter/date tests pass; the date suite passes under both Los Angeles and Tokyo host timezones. Full `pnpm check` passes after the final change. No UI, migration, repository, security policy, dependency or visual baseline changed in this checkpoint. Reviewed schema reuse, trusted actor/timezone, bounded conversion and sanitized errors.
- Remaining: authenticated production action/context, subject loading, approved form wiring with retry/pending behavior, deterministic calendar write/readback, E2E creation of each kind and unchanged visual comparisons. Calendar remains fixture-backed and the existing forms remain unwired; story is not done. Completion count stays 19/45 (26 remaining).
