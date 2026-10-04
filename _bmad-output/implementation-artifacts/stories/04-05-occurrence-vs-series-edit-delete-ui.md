# Story 04-05: Occurrence-vs-series edit delete UI

Epic: epic-04
Status: in-progress
Dependencies: 04-02

## Purpose

Implement single occurrence and whole series mutations after approved scope-selection UI exists.

## Expected implementation surface

calendar edit/delete controls

## Engineering constraints

SUPERDESIGN-FIRST for confirmation/scope selection: create/iterate the missing state in the existing project before coding.

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

## Superdesign-first prerequisite

Before coding this UI, inspect the live Web Study Superdesign project. If the required state is absent, create or iterate the missing draft in that same project, preserve the established design language, and then implement from that draft. No user export is required.

## Test plan

E2E modify/cancel one occurrence vs series.

## Reference checkpoint — 2026-10-04

- Re-fetched primary live draft v96 and all project nodes; no recurring scope/confirmation state exists. Existing detail actions do not select occurrence-versus-series scope.
- Created credit-free same-project authored reference: https://p.superdesign.dev/draft/9745a914-49b8-43da-a0fe-c072b4e53417 (v4). Approved existing screens remain unchanged.
- Reuses existing modal backgrounds/borders/typography/neutral controls and session-type selected tokens. Edit scope defaults to This session only; Continue selects the scope without mutating. Delete combines scope and explicit confirmation, names the series action distinctly, warns about exceptions/irreversibility, and skips scope for one-time sessions.
- Prototype-only failure checkbox exercises disabled pending controls, dismissal guard, accessible Deleting label, retained scope on error and corrected retry; do not port the simulator into production.
- Browser inspected desktop and 320x720; mobile panel client/scroll width both 286px and footer is reachable. Tab wraps to Close; Escape restores the launching button. Pending focus stays inside the dialog. Saved ignored desktop/mobile proof under `.superdesign/tmp/`.
- Await approval before production implementation. This reference covers scope/confirmation only: the edit-form authoring state must also be inspected/approved before UI wiring. No application code, schema, dependency or screenshot baseline changed; persistence acceptance is not claimed. Count stays 21/45 done, 24 remaining.

## Backend checkpoint — 2026-10-04

- User continued after the v4 preview; scope/confirmation reference is approved. The edit-form reference is still required before UI wiring.
- Added shared-service owned occurrence modification/cancellation, generated original-start membership checks, canonical UTC identity, merged effective-kind validation and partial override preservation. One-time sessions use series mutations; cancellation is idempotent and stale edits cannot restore cancelled occurrences.
- Supabase persistence inserts first and retries only a unique conflict with owner/series/original-start-filtered updates of the two granted mutable columns. Domain/SQL JSON translation preserves the existing database contract; grants and schema remain unchanged.
- Added seven service tests, four adapter tests and five database assertions. `pnpm check` passes with 341 unit tests and production build; all 47 database tests and all 96 browser tests pass. Local advisors have no issues and production audit reports no known vulnerabilities. Existing visual baselines were not updated. Dev-server stream-closed diagnostics remain observed.
- Reviewed correctness, readability, architecture, security and performance for this additive, unexposed backend slice. No UI, auth, schema, grants or dependencies changed.
- Remaining before story acceptance: atomic reconciliation of whole-series schedule changes with concurrent exception insertion, authenticated action adapter, approved edit authoring reference, scope/UI wiring and actual occurrence-versus-series mutation E2E proof. Application-level read/check alone does not serialize the schedule race; concurrent partial overrides remain last-write-wins.
- Story remains in-progress; 21/45 complete, 24 remaining.

## Atomicity checkpoint — 2026-10-04

- Reproduced schedule-wins and exception-wins races with failing service tests. The repository now receives the exact validated master schedule; an invoker RPC locks the owned master, compares that snapshot and persists the exception in one transaction. SQL check violations map to stable `INVALID_INPUT` rather than provider messages.
- Added schedule-guard and parent-lock triggers so persisted exceptions prevent unsafe schedule rewrites and direct inserts also serialize. Preserved owner RLS/FKs, prior negative-test errors, immutable identity grants, metadata edits and cancellation-wins semantics. No SECURITY DEFINER, table grant widening or data rewrite.
- Created and replayed local migration `20261004124427_calendar_mutation_serialization.sql`; local history matches. Data-preserving rollback and migration-before-adapter deployment order are documented in the recurrence contract. Replay removed/recreated only the new triggers/functions, not stored data.
- All 343 unit tests/build in `pnpm check`, all 62 database assertions, three real two-connection lock tests and all 96 browser tests pass. Supabase advisors report no issues; production audit is clean. Existing UI and visual baselines remain unchanged. Known development-server aborted/stream-closed diagnostics remain observed.
- Five-axis review covers schedule identity, race ordering, existing service/repository layering, ownership/ACLs and short parent-first transactions. Partial metadata/override modifications remain last-write-wins, not general optimistic versioning.
- Remaining: authenticated action/context integration, approved edit authoring state, scope/UI wiring and actual occurrence/series mutation E2E acceptance. Story remains in-progress; 21/45 done, 24 remaining.

## Deletion action checkpoint — 2026-10-04

- Added `deleteSessionAction` and a narrow strict target contract through the existing authenticated context and shared CalendarService. Scope is mandatory; series targets cannot carry an occurrence identity and client actor/extra fields are rejected. No new authentication path or trust in client test scope.
- Occurrence deletion writes a cancellation under its original generated identity, preserving master/siblings; a moved effective start is not an identity. Whole-series deletion uses the owned master/FK cascade and also handles one-time sessions. Cancellation retries succeed; series-deletion retries return safe NOT_FOUND without affecting another record.
- Success invalidates `/calendar` and `/`; errors use fixed safe messages/codes and never invalidate. No raw provider records are returned. Added isolated fake deletion/cascade for future browser integration. Red provider-boundary tests reproduced malformed/undefined delete rows being reported as success; the adapter now requires an exact returned identity.
- Added 36 unit tests and six pgTAP assertions. `pnpm check` passes (379 unit tests/build), all 68 database assertions and all 96 browser tests pass, advisors and production audit are clean. Production UI is not yet bound and no actual UI deletion acceptance is claimed. Five-axis review found no blocking issue for this additive backend slice; known dev-server stream-closed diagnostics remain observed.
- No UI, auth, schema, grants, dependencies or screenshot baselines changed. Remaining: edit action adapter, approved edit-form reference, scope/UI binding, real mutation E2E acceptance. Story remains in-progress; 21/45 done, 24 remaining.

## Authenticated edit-action checkpoint — 2026-10-04

- Added strict explicit series/occurrence edit targets and authenticated action delegation through the existing actor/context resolver and CalendarService. No client actor, ownership, kind, timezone, RRULE text, or schedule snapshot is accepted.
- Partial allowlisted content changes preserve omitted fields and ordered Notes & Reminders. Date/time are paired and interpreted in the stored master timezone. Whole-series edits may change subject and structured recurrence; occurrence edits may not.
- Added stale-schedule protection to both paths: the occurrence RPC retains its transactional master comparison, while series updates recheck exact start, timezone, and nullable recurrence rule in the database write predicate. This protects timezone-derived edits from concurrent schedule rewrites; metadata and partial override concurrency remain last-write-wins.
- Successful edits return only `SESSION_UPDATED` and invalidate `/calendar` and `/`; failures stay stable, safe, and do not invalidate. Shared target extraction leaves the previously verified deletion interface intact.
- Added 41 handler tests, six action tests, two adapter regressions, two pgTAP assertions, and a fourth real two-connection lock proof. Focused edit tests also pass with Los Angeles and Tokyo host timezones. `pnpm check` passes 428 unit tests and the production build; all 70 database assertions, all four concurrency proofs, and all 96 browser tests pass. No UI, schema, grant, auth, dependency, or visual-baseline change was made.
- Remaining before acceptance: create and approve the edit-authoring state in the existing Superdesign project, wire the approved scope/form UI, and prove real occurrence-versus-series mutations in browser E2E. Story remains in progress; 21/45 done, 24 remaining.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
