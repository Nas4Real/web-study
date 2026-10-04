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

- Inspected current live Superdesign New Session variants. Existing fields are title/subject/date/start time; Exam adds Room / Location and has no duration, University adds optional Professor and duration, Revision adds optional Focus or chapter and duration. Reinspection of visible controls in v96 corrected an earlier hidden-field mix-up: University has 45/60/90/120 minutes (default 45); Revision has 30/60/90/120/180 minutes (default 90). Preserve the latest source options and visuals when wiring them. Recurrence/notes/additional detail authoring stays in 04-04/04-07.
- Added a provider-neutral creation-form handler that accepts only recognized scalar fields, rejects duplicate/File-valued entries, resolves wall time using the verified profile timezone and delegates validation/normalization/write behavior to CalendarService. Client actor/timezone/recurrence/notes values are not trusted. Exam duration remains null; incompatible type fields are rejected by the shared schema. Stable public errors cover authentication, invalid input, foreign subject references and provider failures. This handler is not exposed by a new route/action yet.
- Added strict local date/time conversion with round-trip candidate verification. A test under a Los Angeles host timezone exposed host-dependent fall-back resolution in the date library's component constructor; replaced that path with verified offset candidates and earliest-instant selection for folds. Nonexistent times are rejected rather than silently shifted. Tests cover Tunis, New York winter/summer/fall-back, Kathmandu fractional offsets, Lord Howe half-hour transitions, leap dates and Apia's skipped day.
- All 61 focused adapter/date tests pass; the date suite passes under both Los Angeles and Tokyo host timezones. Full `pnpm check` passes after the final change. No UI, migration, repository, security policy, dependency or visual baseline changed in this checkpoint. Reviewed schema reuse, trusted actor/timezone, bounded conversion and sanitized errors.
- Remaining: authenticated production action/context, subject loading, approved form wiring with retry/pending behavior, deterministic calendar write/readback, E2E creation of each kind and unchanged visual comparisons. Calendar remains fixture-backed and the existing forms remain unwired; story is not done. Completion count stays 19/45 (26 remaining).

## Read-model checkpoint — 2026-10-04

- Added profile-timezone Day/Week/Month read windows with Monday-leading complete calendar weeks and inclusive/exclusive instant bounds. DST days are not assumed to be 24 hours. Invalid dates/zones and nonexistent midnight boundaries return null rather than shifted data.
- Added effective-occurrence to existing day/card DTO projection: stable series/original-start identity, effective start-date grouping, real subject labels/tokens, location/duration, chronological ordering, and clock-derived progress. Unresolved subjects are omitted; empty data stays empty. No fixture fallback, new rendering, detail behavior or schema change was introduced.
- Added 22 focused tests, passing under both default and Los Angeles host timezones. Full quality checks are recorded in the corresponding commit checkpoint. Production loader/action, month rendering/Day grouping, form integration, scoped E2E persistence and browser/visual verification remain unfinished. Story status and completion count are unchanged.

## Action/context checkpoint — 2026-10-04

- Added a session Server Action that delegates to the existing creation handler. It resolves the verified account, profile timezone and cookie-scoped Supabase adapter through a shared calendar request context, and invalidates Calendar plus the root Dashboard only after a successful save. It returns the existing safe action state, not database records. No new authentication flow, privilege, service or database policy was introduced.
- Reused the authenticated development-only scope gate for calendar test storage and Dashboard reads. Test-created sessions persist across repository instances within a scope/actor, do not leak across scopes/actors, reject unknown subjects and return detached snapshots. Existing seed/override data is retained. Test edit/delete remains deliberately unavailable until its story is implemented.
- Added 22 focused tests. The production gate rejects a configured test token in production; missing/wrong/unconfigured test credentials cannot select fake persistence. No UI or screenshot baseline changed. Calendar route loading, real subject/form binding, pending/retry/success handling, multi-view readback and create-each-kind browser proof remain before this story can be completed.
- Verification: full `pnpm check`, production dependency audit and full E2E suite (`--workers=2`) pass, with zero failed tests in Playwright's last-run report. The dev server emitted an aborted-connection/ECONNRESET diagnostic; no clean-log claim is made. Existing visual baselines were not changed. This verifies regression safety, not the still-unwired create-session UI.

## Page-loader checkpoint — 2026-10-04

- Added a serializable page-data contract and server loader for canonical calendar reads. It resolves the verified actor, profile-local date/name/timezone, owned subjects and bounded effective occurrences; malformed or duplicate date/view query values cannot become scalar parameters. Authentication/provider/date-boundary failures produce only `Unable to load calendar`, without demo substitution. Existing authenticated development fixture selection remains gated by the shared resolver.
- Month cells retain every effective session and complete four/five/six-row grids; selected-date Day sections remain separate from the surrounding Week/Month range. The additive optional month events field preserves existing fixture consumers. Profile display name is forwarded from the verified profile through existing contexts, not taken from query/auth metadata.
- Added 15 loader tests covering canonical and fixture reads, scope gating, local-date defaults, impossible/duplicate query dates, Day grouping, month boundaries, moved sessions and safe failures. A regression test failed with week-wide Day sections, then passed after limiting those sections to the selected civil date. Strengthened the calendar context test for trusted name propagation. Full `pnpm check`, production audit and full E2E (`--workers=2`) pass; Playwright reports no failed tests. Dev-server destination-stream-closed diagnostics were observed; this is not a clean-log claim.
- No route/UI/schema/baseline changed. The new loader remains unconsumed pending approved Calendar page/navigation and New Session wiring. Creation/reload/readback for all three kinds still needs browser proof. Story remains in-progress, 19/45 done (26 remaining).

## Calendar integration checkpoint — 2026-10-04

- The route now awaits Next searchParams and consumes the canonical loader. Day/Week/Month render owned effective occurrences; encoded URL date/view navigation survives reload and browser history and preserves the authenticated test scope. Existing no-scope development screenshots keep their deterministic fixture navigation. No new authentication flow or privilege was introduced.
- Inspected live Day/Month before wiring. Month repeats the approved card markup for every event, handles four/five/six-row grids and last-row borders, and remains non-clickable. Approved classes/tokens are unchanged. Hardcoded detail content remains development-fixture-only; canonical Day/Week detail buttons are temporarily disabled until story 04-06 wires effective occurrence details rather than showing unrelated demo data.
- Added five renderer tests and five browser tests for effective override readback, recurring sessions, selected view/date, reload/history, month boundaries, duplicate query normalization, narrow-screen content and keyboard navigation. The first three browser tests failed against fixture-only Calendar, then passed after implementation. Full `pnpm check` and full E2E (`--workers=2`) pass, including existing visual comparisons; no baseline changed. Manually inspected canonical desktop Month and 320px Day screenshots. The canonical readback test recorded no browser warnings/errors; dev-server stream-closed/aborted ECONNRESET diagnostics were observed, so no clean-server-log claim is made.
- Manual 320px inspection found the unchanged header clips part of New Session despite no document overflow. This remains an authoring/responsive issue to resolve against the live reference; this checkpoint is not a full mobile acceptance pass. New Session subject/action/pending/retry binding, that narrow-header issue and create-each-kind reload proof remain. Story remains in-progress, 19/45 done (26 remaining).

## Authoring reference checkpoint — 2026-10-04

- Added uncommitted red E2E coverage for each-kind creation/reload/scope isolation and invalid-input correction/retry. The first three tests fail against the unwired modal at the Subject label; the fourth is not yet run. Do not count these as passing verification or commit failing tests alone.
- Generated same-project pending (`cfdded66-5c0f-45d6-941d-d1b0f2b4d74f`) and save-failure (`26f02e70-5c25-483a-930f-c5d8d367d916`) references. Browser inspection rejected both: pending still displays enabled Add session, and the retry draft has no visible failure message. Neither is approved or ready to implement.
- A narrowly scoped correction attempt was blocked by Superdesign's out-of-credits response before generation. No production UI, baseline or application behavior changed. Pending/retry implementation awaits a usable reference and user approval under the Superdesign workflow. Story stays in-progress, 19/45 done.
- Subsequently confirmed the CLI's credit-free authored HTML import path and used it to correct the existing reference drafts: pending v4, retry v3. Final imports have no warnings after root-container/anchor-ID fixes. Browser verified disabled pending controls, aria-busy and Saving... text; retry exposes the neutral failure alert with enabled submit. Both were visually inspected; retry footer is below the panel fold at 720px and requires scrolling. Approved main draft and production code remain unchanged. Credits no longer block reference publication; user approval remains required before implementation.

## Authoring integration checkpoint — 2026-10-04

- Following the user's continuation after preview review, wired Exam/University/Revision forms to the existing authenticated action and owned subject options. Ported the live-v96 modal classes, scoped CSS, labels and icons rather than retaining the old local approximation. Common required fields use native validation plus authoritative server validation; only the active kind's optional fields are submitted. University retains 45/60/90/120 with default45, Revision 30/60/90/120/180 with default90. No recurrence or Notes & Reminders controls were added.
- Pending implements the approved Saving indicator, disabled form/submit/Cancel/close controls and blocked Escape dismissal. Failed saves show safe normalized messages in the approved neutral alert styling and retain values for correction/retry. React's automatic form reset initially reset the duration select after an invalid save; cancelling that reset fixes the browser reproduction. Success closes the dialog and the action's existing route revalidation supplies read-your-own-writes.
- Added seven authoring E2E tests: each-kind create/reload/Month/scope-isolation, invalid-input correction/retry, held-request pending locks, approved duration/type-switch active-field behavior, and native required-field validation/Escape focus restoration. The original four tests failed before wiring; three creation paths then passed while retry caught the select reset. The pending test caught the inaccessible button name before its correction. All now pass.
- Full `pnpm check`, production dependency audit and all 83 E2E tests (`--workers=2`) pass, including all unrelated visuals. Added three live-v96 modal baselines only, retaining the historical images. Manually inspected meaningful modal differences plus pending/retry screenshots. Shared frame changes are additive optional description and close-disabled props; no schema, permission, auth or dependency changes. Dev-server aborted ECONNRESET diagnostics remain observed; this is not a clean-server-log claim.
- Remaining before story completion: the known 320px Calendar-header clipping issue, checked against the live visual contract, and wider responsive authoring verification. Status remains in-progress, 19/45 done (26 remaining).
