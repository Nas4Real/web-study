# Story 01-01: Bootstrap exact stack and quality gates

Epic: epic-01
Status: done
Dependencies: none

## Purpose

Create Next.js/React/TS/Tailwind project with pinned versions, pnpm, lint/typecheck/test/build scripts, env validation and CI-ready commands.

## Expected implementation surface

package.json, pnpm-lock.yaml, next.config.ts, tsconfig.json, src/styles/globals.css, env schema

## Engineering constraints

Version pins; no UI redesign; CI commands succeed. Inspect live Superdesign before choosing Tailwind major; parity takes precedence over upgrading to v4.

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

Unit config smoke, build, lint, typecheck.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence

- Pinned Next.js 16.3.8, React 19.3.0, Node 24, pnpm 10, and Tailwind 3.4.19.
- Added App Router, TypeScript, ESLint, Vitest, Playwright, PostCSS/Tailwind, and CI-ready scripts.
- Added a Zod environment contract with server-start validation and browser/server variable separation.
- Confirmed production startup fails fast when required environment values are absent.
- Passed `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build` on 2026-09-30.
- `pnpm audit --prod` reported no known vulnerabilities.
