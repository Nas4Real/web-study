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
- `02-02` complete on 2026-10-02: email/password and Google PKCE flows, callback/profile bootstrap, approved verification-pending UI, shared sign-out, and local Supabase configuration. Clean migration reset, real Mailpit verification/callback, verified and rejected password paths, sign-out cookie clearing, owner and cross-user RLS checks, anonymous denial, and Supabase advisors all pass.
- `02-03` complete on 2026-10-02: non-enumerating reset-link requests, fixed PKCE recovery callbacks, verified-session password updates, and the approved Forgot Password request form. Unit/action/gateway tests, auth visual baselines, and the real local Mailpit recovery flow pass. The post-link visual remains scoped to Superdesign-first Story `02-06`.
- `02-04` complete on 2026-10-02: private subject CRUD schema and services, least-privilege profile/subject grants, owner RLS, stable domain errors, and owner-bound avatar object keys. Unit/static-security tests, a clean local database reset, live owner/cross-user/anonymous Data API checks, quota-tampering denial, and Supabase advisors pass.
- `02-05` complete on 2026-10-02: verified the user-supplied full interactive Superdesign prototype as the live source, retained the approved signup verification-pending state, and confirmed callback success enters the workspace while callback failure returns a stable inline Sign In error. All 12 focused auth browser, responsive, routing, and visual checks pass without inventing another result screen.
- `02-06` complete on 2026-10-02: added the recovery-session set-new-password route by mechanically reusing the live prototype's approved auth shell and field/card language, wired matching-password update behavior and stable states, and added deterministic visual/browser coverage. Lint, typecheck, 95 unit tests, build, all 14 focused auth checks, all 51 single-worker E2E checks, and the real local Supabase + Mailpit recovery flow pass, including old-password rejection and new-password sign-in.

## Design-block rule

If a story is marked `ready-superdesign-first`, inspect the live Superdesign project first. If the required state is absent, create/iterate it in that same project, then implement from the resulting draft.
