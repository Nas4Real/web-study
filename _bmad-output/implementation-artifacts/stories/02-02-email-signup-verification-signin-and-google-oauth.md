# Story 02-02: Email signup verification signin and Google OAuth

Epic: epic-02
Status: done
Dependencies: 02-01,01-06

## Purpose

Wire email/password signup, verification callback, sign in, Google OAuth callback and sign out.

## Expected implementation surface

auth routes/actions/services

## Engineering constraints

No Apple. Unverified password accounts cannot enter workspace.

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

E2E happy/failure flows with test Supabase project/local stack.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Implementation checkpoint

- Added validated email/password signup and sign-in Server Actions backed by one auth application service.
- Added Google OAuth PKCE startup and callback exchange with safe internal return paths, verified claims, stable public errors, and partial-session rollback.
- Added the approved live Superdesign verification-pending state (`26ac6d79-4750-440c-af86-68af86fdc4ea`) without changing the approved base auth screens.
- Added one shared sign-out action for the profile menu and Settings.
- Added the minimal profiles migration/bootstrap required by authentication, including explicit grants, owner RLS, and a locked-down security-definer trigger. Profile editing, subjects, and avatars remain in Story 02-04.
- Added local Supabase configuration with email confirmations enabled, an eight-character password floor, provider rate limits, and the exact application callback allow-list.
- Lint, typecheck, 55 unit/static-security tests, production build, dependency audit, and 12 focused auth browser tests pass. The full browser suite reached 48/49 because of the existing Dashboard screenshot pixel flake; that unchanged test passed immediately in isolation.
- Local integration gate completed on 2026-10-02 after recovering Docker's stale inference and secrets-engine runtime sockets. A clean database reset applied `20261001170000_auth_profile_bootstrap.sql`; the real browser flow passed email signup, Mailpit verification, PKCE callback exchange, unverified and invalid-password denial, verified password sign-in, profile provisioning, and sign-out cookie clearing.
- Positive and negative Data API checks passed for owner insert/select/update, cross-user select/update denial, and anonymous denial. `supabase db advisors --local --type all --level info --fail-on error` reported no issues.
