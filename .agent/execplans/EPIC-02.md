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

## Design-block rule

If a story is marked `ready-superdesign-first`, inspect the live Superdesign project first. If the required state is absent, create/iterate it in that same project, then implement from the resulting draft.
