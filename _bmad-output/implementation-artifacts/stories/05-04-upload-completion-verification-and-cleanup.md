# Story 05-04: Upload completion verification and cleanup

Epic: epic-05
Status: done
Dependencies: 05-03

## Purpose

HEAD object, verify size/type metadata, finalize accounting, expire stale intents and enqueue cleanup.

## Expected implementation surface

DocumentService.completeUpload, cleanup job

## Engineering constraints

Completion idempotent; reservation cannot leak.

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

Failure matrix tests and cleanup integration tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence

- Added `DocumentService.completeUpload`, which loads only an owned completion target, skips R2 on idempotent retries, HEAD-verifies pending objects, and delegates all state/quota transitions to one locked database function.
- Completion validates authoritative size and MIME metadata, converts declared reservation bytes to actual used bytes exactly once, allows smaller uploads, checks remaining quota for larger uploads, and maps missing/expired/invalid/provider cases to stable sanitized errors.
- Added a private `file_cleanup_jobs` queue plus bounded, skip-locked expiry and cleanup claims. Expiry and verification failures release reservations once, hide file metadata, enqueue the opaque object key, retry provider failures with capped backoff, and mark files deleted after physical cleanup.
- Security-definer functions use an empty search path and least-privilege grants: authenticated users can only inspect/finalize their own upload, while global expiry and cleanup operations are service-role only. Completion and expiry use the same explicit file-then-intent lock order.
- The real two-connection concurrency proof shows simultaneous completion retries serialize and count actual used bytes once. All 152 pgTAP assertions, 28 focused tests, the production dependency audit, and `pnpm check` with 490 tests/build pass. Live R2 verification remains deferred until credentials are connected.
