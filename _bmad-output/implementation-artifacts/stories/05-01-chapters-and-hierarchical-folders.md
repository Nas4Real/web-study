# Story 05-01: Chapters and hierarchical folders

Epic: epic-05
Status: done
Dependencies: 02-04

## Purpose

Implement chapters and folders tree, starter Cours/TD/Resume rows, rename/move/delete checks, cycle prevention.

## Expected implementation surface

migrations, ChapterService, FolderService

## Engineering constraints

Starter names are editable rows, not enum constants.

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

Cycle, cross-user, cross-subject tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence

- Added private `chapters` and hierarchical `folders` tables with explicit authenticated grants, complete owner RLS, owner-aware subject/chapter/parent foreign keys, case-insensitive scoped names, and indexed list/foreign-key paths.
- Chapter creation is atomic and inserts editable ordinary `Cours`, `TD`, and `Resume` rows. Safe restrictive deletes preserve dependent data.
- Folder writes are serialized per owner and database-guarded against self/ancestor cycles, cross-subject parents, cross-chapter parents, and moving a folder with children across chapters.
- Added strict Zod/TypeScript contracts, provider-validating Supabase repositories, and application services with stable `NOT_FOUND`, `CONFLICT`, `FOLDER_CYCLE`, and provider-unavailable behavior.
- All 18 focused Vitest tests pass. The full local database reset succeeds and all 103 pgTAP assertions pass, including 33 hierarchy/RLS assertions. `pnpm check` passes with 460 tests and the production build. Database lint reports only the pre-existing Calendar immutable/stable warning; this story adds no lint finding.
