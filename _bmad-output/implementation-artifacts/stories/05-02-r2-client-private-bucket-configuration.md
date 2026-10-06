# Story 05-02: R2 client private bucket configuration

Epic: epic-05
Status: done
Dependencies: 01-01

## Purpose

Implement server-only R2 adapter, CORS config documentation, object-key helper and presigner.

## Expected implementation surface

src/server/storage/r2.ts, env docs

## Engineering constraints

No credentials/client secrets exposed.

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

Unit test presign parameters; integration against dev bucket when available.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence

- Added a server-only Cloudflare R2 adapter using pinned AWS SDK v3 packages and Cloudflare's documented `auto` region/account endpoint configuration.
- Opaque file keys accept only canonical user/file UUID paths. Upload signatures bind the exact private bucket, key, and normalized `Content-Type`; upload/download bearer URLs cannot exceed 10 minutes.
- HEAD and delete operations share the same adapter for completion verification and reliable cleanup stories. Provider output is narrowed to safe metadata, while failures expose only stable `INVALID_INPUT` or `PROVIDER_UNAVAILABLE` errors.
- Environment validation now rejects malformed account IDs and bucket names before startup. Private-bucket and exact-origin CORS setup is documented in `docs/R2.md`; credentials remain server-only.
- All 12 focused environment/R2 tests pass. `pnpm audit --prod` reports no known vulnerabilities. No local R2 credentials were available, so the optional live dev-bucket integration was not run. `pnpm check` passes with 468 tests and the production build.
