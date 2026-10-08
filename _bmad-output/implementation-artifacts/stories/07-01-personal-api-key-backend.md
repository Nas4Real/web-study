# Story 07-01: Personal API key backend

Epic: epic-07
Status: done
Dependencies: 02-04

## Purpose

Implement key generation, hashing, list/revoke, session-only management actions.

## Expected implementation surface

api_keys migration/service

## Engineering constraints

Secret shown once. No plaintext at rest.

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

Key verify/revoke/expiry tests.

## Implementation record

- Added a private `api_keys` migration with bounded metadata, digest-only secret storage, RLS enabled, browser-role access revoked, and minimum `service_role` grants.
- Added 256-bit personal API-key generation, HMAC-SHA-256 digesting with `API_KEY_HASH_PEPPER`, constant-time verification, expiry/revocation enforcement, and one-time raw-token return.
- Added owner-scoped create/list/revoke/verify services, a server-only Supabase repository adapter, and session-authenticated management actions.
- Added fail-closed environment validation for the Supabase secret-key/API-key-pepper pair and a server-only Supabase admin client.
- Applied migration `20261008172409_personal_api_keys.sql` to hosted project `qvqnztgpjludiahmboyd`; migration dry run was clean.
- Configured `SUPABASE_SECRET_KEY` and a generated `API_KEY_HASH_PEPPER` as Vercel Secrets for Production and Preview.
- Focused API-key tests pass: 35 tests across crypto, service, repository, actions, environment, and migration contracts.
- Full `pnpm test`, `pnpm typecheck`, and `pnpm build` pass. `pnpm lint` has zero errors and one unrelated pre-existing warning in `src/components/modal-frame.tsx`.
- Hosted Supabase security advisors reported only pre-existing file-function/Auth findings; performance advisors reported no issues.
- Local pgTAP could not run because Docker Desktop was unavailable; the migration is additive and the key table is intentionally inaccessible to browser roles.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
