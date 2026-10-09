# Story 07-05: Files notifications profile storage API

Epic: epic-07
Status: done
Dependencies: 07-02,05-04,06-01

## Purpose

Expose metadata, upload intent/complete/download-url, notifications, profile and storage usage.

## Expected implementation surface

api/v1/files etc.

## Engineering constraints

No raw object keys/secrets in DTOs.

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

Contract and security tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Implementation outcome

- Profile read/update and storage-usage routes use the existing owner-scoped
  profile service and never expose avatar object keys.
- File list/read/move/delete routes expose safe metadata only and use the
  existing owner-scoped document library service.
- Upload intent, completion, and download URL routes authenticate normally and
  return stable `503 PROVIDER_UNAVAILABLE` responses until R2 is configured.
- Notification routes remain deferred with Epic 06 and were removed from the
  active OpenAPI contract rather than backed by demo data.
- Focused tests, the full unit suite, typecheck, lint, and production build pass.
