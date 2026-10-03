# Story 03-03: Dashboard derived queries

Epic: epic-03
Status: done
Dependencies: 03-01,04-02

## Purpose

Build dashboard read model for counts/upcoming tasks/exam/next session/today sessions.

## Expected implementation surface

DashboardService/repository queries

## Engineering constraints

No separate dashboard persistence tables.

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

Query/service tests, dashboard E2E.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence — 2026-10-03

- Added a derived DashboardService using the canonical actor-scoped task, subject and effective calendar-occurrence services; no new persistence or schema changes.
- Counts exclude Someday; progress, upcoming tasks, next exam/session, today's university classes and month markers use the profile timezone. Calendar expansion uses one bounded query, with deterministic instant-based ordering.
- Authenticated server rendering supplies the existing approved components. Production does not use screenshot fixtures or E2E repositories. Empty selections do not substitute demo data; failures return normalized errors without partial private data.
- Nine focused service/projection tests cover timezone boundaries, effective overrides, empty data, invalid actors/timezones, offset ordering and provider errors.
- `pnpm check` passed (lint, typecheck, full unit suite and production build); all 53 Playwright tests passed, including dashboard creation/read integration, clean browser console, responsive checks and unchanged approved screenshot baselines.
- Manually inspected the derived-dashboard screenshot. Detail interactions remain scoped to stories 03-04 and 04-06; authoring extensions remain scoped to 03-05.
