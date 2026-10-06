# Story 08-02: End-to-end visual regression matrix

Epic: epic-08
Status: complete
Dependencies: 08-01 and implemented private-beta UI stories

## Reduced private-beta purpose

Run a fast launch gate for the flows needed by two website users. The exhaustive
visual and responsive matrix is deferred.

## Expected implementation surface

Playwright critical-flow tags and package scripts

## Engineering constraints

Do not add or update visual baselines. Reuse existing behavioral tests and keep
the launch gate independent from deferred notifications, public API keys,
account deletion, and live R2 bytes.

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

`pnpm test:launch-critical` runs application tests, tagged critical Playwright
flows, and the focused two-user database isolation audit.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence

- Added an explicit `@critical` browser subset instead of duplicating the
  existing E2E suite or regenerating approved screenshots.
- The 12 browser checks cover auth-screen navigation and unauthenticated
  redirect, dashboard aggregation, basic and enriched task creation, task and
  subtask persistence/deletion, Exam/University/Revision session authoring,
  effective occurrence details and editing, and document metadata
  search/sort/hierarchy navigation.
- The launch command also runs all 507 Vitest tests and the 27-assertion
  catalog/cross-user isolation audit from `08-01`.
- Hosted Supabase email/password sign-up and sign-in are intentionally reserved
  for the `08-03` deployment smoke test. Local browser tests validate the UI and
  access boundary without inventing deployment credentials.
- Verification: `pnpm test:launch-critical` passes with 507 application tests,
  12 critical Chromium tests, and 27 focused pgTAP assertions.
