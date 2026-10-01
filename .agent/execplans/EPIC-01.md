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
- [x] `01-02` Establish live design references and deterministic fixtures (2026-09-30)
- [x] `01-03` Port application shell and Dashboard pixel-faithfully (2026-09-30)
- [x] `01-04` Port Calendar Day Week Month static views (2026-10-01)
- [ ] `01-05` Port Tasks Documents Settings and modals
- [ ] `01-06` Port auth screens with V1 auth-provider correction

## Decisions / discoveries

- The live `WEB STUDY` Superdesign project is accessible as project `71292a60-75e4-449b-a39f-0456ec77d72f`.
- The current approved application draft uses `cdn.tailwindcss.com`, a `tailwind.config` object, and v3 utility conventions. Tailwind 3.4.19 is therefore pinned for parity.
- Next.js 16.3.8 official guidance uses the ESLint CLI and flat config. ESLint 10 is not yet compatible with the React plugin bundled by `eslint-config-next` 16.3.8, so ESLint 9.39.5 is pinned.
- The repository is private at `https://github.com/Nas4Real/web-study`; `main` is the delivery branch.
- Live inspection on 2026-09-30 found Calendar Day/Week/Month and New Session in draft `9fc1a7b4-af57-48f9-b645-88f741ca400a` v53, with Quiet Precision tokens in draft `8aa64fb9-b219-4ac8-bd46-210672382d9c` v10.
- Dashboard, Tasks, Documents, Settings, app auth pages, Task Details, and Session Details had no current live nodes. Their V2/V4 screenshots remain regression evidence and must be checked against the live project again before UI implementation.
- Story `01-03` filled the Dashboard gap in the same live project with draft `4cd2386e-ae7b-47fa-8029-7cd5db1d6636` v1, then ported that approved state with the existing `StudySidebar` component.
- Story `01-04` ports Calendar draft `9fc1a7b4-af57-48f9-b645-88f741ca400a` v53 directly. Period navigation is deterministic local UI state; recurrence and effective-occurrence detail behavior remain deferred to Epic 04.

## Completion evidence

Story `01-01` passes lint, typecheck, four Vitest environment-contract tests, a Chromium Playwright smoke test, and the production build. Production server startup without configured secrets fails during the instrumentation hook as required. Production dependency audit reports no known vulnerabilities.

Story `01-02` adds typed deterministic fixtures and a machine-readable visual target registry. Lint, typecheck, 11 Vitest tests, and the production build pass. No application UI was ported in this story.

Story `01-03` adds the approved workspace shell and Dashboard, a committed 1440×1200 Chromium baseline, keyboard/semantic checks, and responsive no-overflow checks. All lint, type, unit, E2E, build, and production-audit gates pass.

Story `01-04` adds approved Day/Week/Month Calendar views, deterministic date/view state, three visual baselines, and clean-browser/responsive tests. All lint, type, unit, E2E, and build gates pass.
