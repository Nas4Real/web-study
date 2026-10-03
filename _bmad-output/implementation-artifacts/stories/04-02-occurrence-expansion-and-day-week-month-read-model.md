# Story 04-02: Occurrence expansion and Day Week Month read model

Epic: epic-04
Status: done
Dependencies: 04-01

## Purpose

Implement bounded RRULE expansion, exceptions, timezone conversion, current-session state, and calendar DTOs.

## Expected implementation surface

recurrence utility, CalendarService.listOccurrences

## Engineering constraints

Maximum API range enforced; original_start stable.

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

DST/timezone fixtures, recurrence tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Implementation evidence — 2026-10-03

- Added timezone-aware RRULE expansion and an effective occurrence read model shared by Day/Week/Month consumers. Series-local wall-clock times survive DST; UTC UNTIL is converted into the same clock before expansion.
- Occurrence identity remains `(seriesId, originalStart)` in canonical UTC. Cancelled instances disappear; modified instances overlay allowlisted fields, including location, professor and ordered notes. Moved-in instances remain visible; siblings and the series master remain unchanged.
- `CalendarService.listOccurrences` requires ISO timestamps, a positive range no longer than 366 days and no more than 500 returned occurrences. Per-series expansion caps candidate occurrences at 500 and evaluated historical occurrences at 10,000, returning `INVALID_INPUT` when safeguards are exceeded.
- Added owner/series-filtered exception reads with strict provider-record validation. Invalid actors, malformed ranges, invalid RRULE values and provider failures use normalized errors.
- Whole-series schedule rewrites are rejected when exceptions exist; unchanged schedule values and content updates remain allowed. Transactional occurrence mutations belong to the later recurrence mutation stories.
- Verification: all 23 focused calendar tests, full `pnpm check` (lint, typecheck, Vitest, production build), 42 local pgTAP tests, Supabase advisors and production dependency audit pass.
- No UI changed; live-design porting and browser visual gates remain with the Calendar UI stories.
