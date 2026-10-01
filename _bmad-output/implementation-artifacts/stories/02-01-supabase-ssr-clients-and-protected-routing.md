# Story 02-01: Supabase SSR clients and protected routing

Epic: epic-02
Status: done
Dependencies: 01-01

## Purpose

Implement browser/server clients, proxy/session refresh, protected workspace routing and request-scoped auth context.

## Expected implementation surface

src/lib/supabase/*, proxy.ts, src/server/auth/*

## Engineering constraints

No module-global user client. Protected pages require verified identity.

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

Auth unit tests plus E2E unauthenticated redirect.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence

- Added pinned `@supabase/ssr` and `@supabase/supabase-js` dependencies with the committed pnpm lockfile.
- Added browser and request-scoped server clients that use only the public Supabase URL and publishable key.
- Added Next.js 16 Proxy cookie refresh with verified `getClaims()` identity checks, cache-safe cookie propagation, and internal return-path redirects to `/sign-in`.
- Added a second verified-actor check in the workspace server layout so route protection does not rely on Proxy alone.
- Added fail-closed handling for missing, malformed, stale, and provider-failed identity state without exposing provider details.
- Added unit coverage for route protection, safe redirects, public configuration, test-auth isolation, and verified actors, plus browser coverage for unauthenticated workspace redirects.
- Refreshed the four stale shared-shell baselines that predated the approved Tasks navigation item; no application UI source changed.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (34 tests), production dependency audit, protected-route E2E, visual checks, and `pnpm build` pass on 2026-10-01. The full 47-test parallel browser run had one pre-existing pixel-flake; its unchanged Forgot Password baseline passed immediately in an isolated rerun.
