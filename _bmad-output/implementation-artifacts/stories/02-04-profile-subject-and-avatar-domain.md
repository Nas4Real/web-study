# Story 02-04: Profile subject and avatar domain

Epic: epic-02
Status: done
Dependencies: 02-01

## Purpose

Implement profiles, subjects CRUD, optional avatar object flow, ownership/RLS, subject color metadata.

## Expected implementation surface

migrations, repositories, ProfileService, SubjectService

## Engineering constraints

Subject ownership enforced; email remains auth source of truth.

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

RLS negative tests, service tests.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Implementation checkpoint

- Added a constrained `subjects` migration with case-insensitive per-user names, validated color/icon/position metadata, owner-addressable keys, timestamps, explicit least-privilege grants, and complete owner RLS policies.
- Restricted profile inserts and updates to user-editable columns so authenticated clients cannot change storage quota or accounting fields.
- Bound avatar object keys to the immutable `users/{user_id}/avatars/{avatar_id}` namespace in both PostgreSQL and the application service.
- Added normalized profile and subject contracts, Supabase repositories that always scope mutations to the actor, and `ProfileService`/`SubjectService` with stable non-provider errors.
- Lint, typecheck, 82 unit/static-security tests, and the production build pass. A clean local database reset plus live Data API checks passed owner CRUD, duplicate/constraint failures, cross-user and anonymous denial, avatar ownership, and quota-tampering denial. Supabase advisors reported no errors.
