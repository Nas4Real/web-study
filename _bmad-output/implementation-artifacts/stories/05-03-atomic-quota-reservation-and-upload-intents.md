# Story 05-03: Atomic quota reservation and upload intents

Epic: epic-05
Status: done
Dependencies: 05-01,05-02

## Purpose

Implement transaction/function for quota reservation plus pending file and intent creation.

## Expected implementation surface

SQL function/migration, DocumentService.createUploadIntent

## Engineering constraints

2 GB default; 50 MB file limit; concurrent uploads safe.

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

Concurrent quota tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence

- Added strict upload contracts for the seven approved extensions, matching MIME types, normalized safe filenames, the 50 MiB boundary, optional owned locations, and stable file/upload-intent DTOs.
- Added private `files` and `upload_intents` tables with explicit grants, file-owner RLS, owner-aware subject/chapter/folder/file foreign keys, consistent folder/chapter validation, opaque object keys, and database-level filename/MIME/extension checks.
- Added the tightly scoped `reserve_file_upload` security-definer RPC. It validates the authenticated actor, locks the profile row, checks quota, creates pending file/intent rows, and increments reserved bytes within one transaction. Authenticated users cannot directly mutate upload metadata or quota counters.
- Added `DocumentService.createUploadIntent` and a provider-validating Supabase repository. The service reserves quota before asking the existing R2 adapter for a 10-minute, exact-Content-Type PUT URL and maps SQL/provider failures to stable non-enumerating codes.
- Two real PostgreSQL connections prove that simultaneous 50 MiB reservations serialize on the profile row and exactly one wins. All 124 pgTAP assertions, 16 focused tests, the production dependency audit, and `pnpm check` with 478 tests/build pass. R2 remains intentionally unconnected until credentials are available; signing behavior is verified with the server-only adapter boundary.
