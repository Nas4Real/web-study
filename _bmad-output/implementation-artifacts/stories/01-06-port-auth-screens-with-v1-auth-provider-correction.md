# Story 01-06: Port auth screens with V1 auth-provider correction

Epic: epic-01
Status: done
Dependencies: 01-02

## Purpose

Port Sign In, Sign Up, Forgot Password. Remove Apple button while preserving intended composition as closely as approved rules allow.

## Expected implementation surface

src/app/(auth)/*, src/features/auth/*

## Engineering constraints

Google + email only. No real auth yet.

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

Visual diff with intentional Apple removal documented.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence

- Added approved `/sign-in`, `/sign-up`, and `/forgot-password` routes with a shared responsive auth shell.
- Removed Apple authentication from Sign In and Sign Up while preserving full-width Google and email/password composition.
- Kept submit and Google actions intentionally static; Supabase and OAuth wiring remains Story 02-02.
- Added accessible labels, native form semantics, password visibility control, and client-side navigation between auth screens.
- Added three inspected 1440×900 Chromium baselines, clean-console/page-error coverage, and responsive no-overflow checks at 320/768/1024 px.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (14 tests), `pnpm test:e2e`, and `pnpm build` pass on 2026-10-01.
