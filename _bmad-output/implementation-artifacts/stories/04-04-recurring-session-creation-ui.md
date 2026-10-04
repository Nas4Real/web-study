# Story 04-04: Recurring session creation UI

Epic: epic-04
Status: done
Dependencies: 04-02

## Purpose

Connect recurrence input to backend after approved Superdesign recurrence controls arrive.

## Expected implementation surface

calendar recurrence form UI

## Engineering constraints

SUPERDESIGN-FIRST: if recurrence UI is missing live, create/iterate it in the existing project before coding.

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

Visual + recurrence E2E after unblock.

## Reference checkpoint — 2026-10-04

- Main live draft remains v96 with no recurrence controls.
- Same-project recurrence authoring reference: https://p.superdesign.dev/draft/74ce705b-0f0d-4a89-bd7e-36b09841a650 (v2; approved by the subsequent continue).
- Reuses approved form styling and mobile reflow; adds daily/weekly/monthly interval, weekly weekdays and end conditions. Production default remains Does not repeat.
- Desktop/mobile prototype inspection confirms control switching, 320px horizontal containment, footer reachability, focus wrapping and Escape restoration. This is reference-only verification, not persisted recurrence acceptance.
- Backend checkpoint: structured settings now flow through the existing trusted action/service; malformed/duplicate/File input is rejected. Created rules pass monthly/end-date/fold readback tests; recurrence expansion now uses deterministic fold/gap semantics. `pnpm check` passes (330 tests/build) and LA/Tokyo focused checks pass. Approved UI integration and complete browser gates remain. No schema, dependency or screenshot baseline changed.

## Completion — 2026-10-04

- Implemented the approved v2 recurrence controls for all three session kinds, with trusted profile timezone, one-time default, active-only settings, pending locking and rejected-save retention.
- Nine new browser tests cover persisted recurrence/reload across Day/Week/Month, end-count/date bounds, skipped monthly dates, scope isolation, native limits and responsive/keyboard behavior at 320/768/1024/1440px. Strengthened the existing pending test for recurring creation.
- Seven explicitly named new recurrence snapshots were manually inspected against the approved reference; historical snapshots are preserved. Existing mobile authoring baselines pass unchanged.
- Final `pnpm check` passes: lint, typecheck, 330 unit tests and production build. Full browser suite passes all 96 tests without snapshot updates. Production audit and focused Los Angeles/Tokyo recurrence checks passed at the backend checkpoint; no dependencies changed afterward.
- Five-axis review found no blocking issue: structured server validation and trusted identity/timezone are unchanged, no schema/auth/privilege change, bounded expansion remains enforced, and UI state stays scoped to authoring. Dev-server stream-closed diagnostics were observed despite passing browser checks; no clean-server-log claim.
- Updated recurrence semantics in the existing feature specification. Occurrence/series editing and enriched session-detail authoring remain out of scope.

## Completion criteria

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
