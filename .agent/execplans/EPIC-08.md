# ExecPlan EPIC 08: Security hardening release and operations

This ExecPlan is intentionally executable story-by-story. Do not collapse it into one giant implementation.

## Context

Read `AGENTS.md`, the PRD, architecture, engineering index, this epic, and each story before coding.

## Milestones

1. `08-01` Lightweight RLS and two-user isolation audit — complete 2026-10-07
2. `08-02` Critical-flow tests only — complete 2026-10-07
3. `08-03` Basic Supabase/Vercel deployment and smoke tests — complete 2026-10-07
4. `08-04` Minimal logging and recovery notes — complete 2026-10-07

## Private-beta scope decision

Epic 08 is reduced to the safeguards needed for a private two-user launch.
The exhaustive visual matrix, elaborate monitoring, and job infrastructure are
out of scope. Cloudflare R2 remains optional until credentials are connected;
deployment must fail closed by disabling uploads when storage is unavailable.

## Progress

- `08-01` audited the running schema as well as migration text. All 11 exposed
  public tables have RLS, all UPDATE policies have `USING` and `WITH CHECK`,
  public policies target `authenticated`, security-definer functions have a
  fixed empty `search_path`, and owner-aware relationships remain enforced.
- The audit found and removed broad legacy grants on `subjects` plus an
  unnecessary authenticated DELETE grant on `profiles`. A 27-assertion pgTAP
  regression now covers global catalog invariants and direct two-user profile
  and subject isolation.
- `08-02` added a tagged `test:launch-critical` gate covering auth access,
  dashboard aggregation, enriched task lifecycle, calendar authoring and
  effective-occurrence details, document search/navigation, and the focused
  isolation suite. Hosted email/password sign-up and sign-in remain an `08-03`
  smoke check because deployment credentials are intentionally not configured
  in the local browser fixture.

- `08-03` deployed the private beta at `https://web-study-pearl.vercel.app` with hosted Supabase auth callbacks, the corrected Vercel production origin, and R2 disabled. Health, auth-page, unauthenticated-redirect, and runtime-log smoke checks pass. The accidental duplicate Vercel project created during hostname discovery was removed.
- `08-04` added a safe structured auth-callback failure event with validated
  request correlation, focused failure-path tests, and a private-beta operations
  runbook covering incident triage plus Supabase logical backup and separate-project
  restore rehearsal. Elaborate monitoring and job infrastructure remain deferred.

## Verification

At every story boundary run the relevant lint, typecheck, unit/integration, E2E, build, RLS, and screenshot gates. Make a small coherent commit only after verification.

## Design-block rule

If a story is marked `ready-superdesign-first`, inspect the live Superdesign project first. If the required state is absent, create/iterate it in that same project, then implement from the resulting draft.
