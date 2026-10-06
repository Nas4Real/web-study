# Story 05-05: Documents UI search sort recent and navigation

Epic: epic-05
Status: complete
Dependencies: 05-04,01-05

## Purpose

Wire Documents page/subject/chapter/folder navigation and file table to backend.

## Expected implementation surface

documents components/actions/queries

## Engineering constraints

Preserve approved live layout; V2 screenshot is regression evidence. 2 GB real quota data overrides mock sizes.

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

E2E upload/list/search/move/download/delete.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence

- Root Documents screen remains pixel-compatible with the approved live Superdesign/V2 baseline while adding keyboard-focusable search, literal file-type filtering, deterministic latest/oldest/name/size sorting, and a bounded recent-files strip.
- Approved Documents → Subject → Chapter navigation is implemented with folder filtering and responsive empty states.
- The server page loader projects authenticated owner-scoped subjects, chapters, folders, and ready files; visual tests use the existing authenticated deterministic fixture path only.
- Owner-scoped application/repository boundaries cover list, move, short-lived download signing, and idempotent logical delete. Logical delete releases used quota exactly once and enqueues reliable R2 cleanup.
- A new migration exposes only authenticated owner-checked move/delete RPCs; anon is denied and cross-user destinations/files fail closed.
- Verification: 500 application tests, 168 pgTAP assertions, production build, relevant Chromium E2E interactions, 320/768/1024 responsive checks, and the approved 1440×1200 Documents visual baseline all pass.
- Live R2 upload/download E2E remains intentionally deferred until bucket credentials are connected, as approved by the user; no secret or provider diagnostic reaches the browser.
