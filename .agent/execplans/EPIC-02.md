# ExecPlan EPIC 02: Authentication profile and subjects

This ExecPlan is intentionally executable story-by-story. Do not collapse it into one giant implementation.

## Context

Read `AGENTS.md`, the PRD, architecture, engineering index, this epic, and each story before coding.

## Milestones

1. `02-01` Supabase SSR clients and protected routing
2. `02-02` Email signup verification signin and Google OAuth
3. `02-03` Forgot/reset password flow
4. `02-04` Profile subject and avatar domain
5. `02-05` Email verification result UI
6. `02-06` Set-new-password UI

## Verification

At every story boundary run the relevant lint, typecheck, unit/integration, E2E, build, RLS, and screenshot gates. Make a small coherent commit only after verification.

## Progress

- `02-01` complete on 2026-10-01: pinned Supabase SSR clients, Next.js 16 Proxy session refresh, protected workspace routing, request-scoped verified actor context, and negative auth coverage.
- `02-02` implementation checkpoint on 2026-10-01: email/password and Google PKCE flows, callback/profile bootstrap, approved verification-pending UI, shared sign-out, local Supabase configuration, and unit/browser/build gates are complete. Local migration, RLS, and real auth-flow verification remain blocked because Docker Desktop aborts on the inaccessible stale `%LOCALAPPDATA%\Docker\run\dockerInference` socket. Docker/WSL shutdown and disabling Docker AI did not release or bypass it; reboot Windows or perform administrator-level cleanup, then rerun the gate before marking the story done.

## Design-block rule

If a story is marked `ready-superdesign-first`, inspect the live Superdesign project first. If the required state is absent, create/iterate it in that same project, then implement from the resulting draft.
