# ExecPlan EPIC 01: Foundation and exact UI port

This ExecPlan is intentionally executable story-by-story. Do not collapse it into one giant implementation.

## Context

Read `AGENTS.md`, the PRD, architecture, engineering index, this epic, and each story before coding.

## Milestones

1. `01-01` Bootstrap exact stack and quality gates
2. `01-02` Establish live design references and deterministic fixtures
3. `01-03` Port application shell and Dashboard pixel-faithfully
4. `01-04` Port Calendar Day Week Month static views
5. `01-05` Port Tasks Documents Settings and modals
6. `01-06` Port auth screens with V1 auth-provider correction

## Verification

At every story boundary run the relevant lint, typecheck, unit/integration, E2E, build, RLS, and screenshot gates. Make a small coherent commit only after verification.

## Superdesign-first rule

If a story is marked `ready-superdesign-first`, inspect the live Superdesign project first. If the required state is absent, create/iterate it in that same project, then implement from the resulting draft.

## Progress log

- [x] `01-01` Bootstrap exact stack and quality gates (2026-09-30)
- [ ] `01-02` Establish live design references and deterministic fixtures
- [ ] `01-03` Port application shell and Dashboard pixel-faithfully
- [ ] `01-04` Port Calendar Day Week Month static views
- [ ] `01-05` Port Tasks Documents Settings and modals
- [ ] `01-06` Port auth screens with V1 auth-provider correction

## Decisions / discoveries

- The live `WEB STUDY` Superdesign project is accessible as project `71292a60-75e4-449b-a39f-0456ec77d72f`.
- The current approved application draft uses `cdn.tailwindcss.com`, a `tailwind.config` object, and v3 utility conventions. Tailwind 3.4.19 is therefore pinned for parity.
- Next.js 16.3.8 official guidance uses the ESLint CLI and flat config. ESLint 10 is not yet compatible with the React plugin bundled by `eslint-config-next` 16.3.8, so ESLint 9.39.5 is pinned.
- The repository was not initialized as a Git repository, so no story commit was created.

## Completion evidence

Story `01-01` passes lint, typecheck, four Vitest environment-contract tests, a Chromium Playwright smoke test, and the production build. Production server startup without configured secrets fails during the instrumentation hook as required. Production dependency audit reports no known vulnerabilities.
