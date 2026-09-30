# AGENTS.md - Web Study

This repository is implemented from the BMAD engineering package and Nas's live Superdesign Web Study project.

## 1. Non-negotiable visual contract

The live Superdesign project is the primary UI source of truth.

For existing approved screens and states:

- Inspect the newest relevant live Superdesign draft before implementing UI.
- Port approved structure, classes/tokens, assets, dimensions, spacing, colors, typography, borders, radii, shadows, icons, backdrops, and interaction states as mechanically as practical.
- Do not redesign, modernize, simplify, reinterpret, or replace an approved state.
- Do not substitute shadcn, Material UI, Chakra, Mantine, or another visual system for approved Superdesign UI.
- Behavioral libraries are allowed only when they do not alter the approved appearance.
- Functional code adapts to the design, not the reverse.

For a required state that is not yet designed:

- Codex may create/iterate it **inside the same existing Superdesign project**.
- Reuse the project's current design language and existing components.
- Do not change unrelated approved states.
- Implement only after the missing state exists in Superdesign.

Nas is not expected to export Superdesign files.

## 2. Current design source precedence

1. Live Superdesign, newest relevant state.
2. A same-project Superdesign state Codex creates for a missing required state.
3. `design-reference/screenshots/v4/` for Task Details and Session Details.
4. `design-reference/screenshots/v2/` for earlier approved states.
5. Written UX/design contracts.
6. Old preview HTML, historical only.

Locked product rules override placeholder demo data in designs. Examples: Apple login remains excluded and the actual V1 storage quota is 2 GB even if an old mock says 10 GB.

## 3. V4 interaction invariants

### Task details

- Clicking the non-checkbox body of a task on Tasks or Dashboard surfaces opens the same Task Details modal when the live design supports that surface.
- A checkbox/toggle action performs completion behavior and must not accidentally open the modal.
- Task detail includes subject, `normal|high` priority, due time/date, description, and ordered subtasks.
- Subtasks have independent completion state.
- Completing/reopening the parent task does not silently rewrite subtask completion state.
- The V4 screenshot shows parent completion available while subtasks remain incomplete; do not impose an all-subtasks-complete prerequisite.

### Session details

- Session cards in Calendar Day, Calendar Week, and Dashboard Today's Classes open Session Details.
- Detail data is the **effective occurrence**, not blindly the series master. Single-occurrence overrides must be reflected.
- Detail can show location, professor, and ordered Notes & Reminders.
- Notes & Reminders are session content, not notification scheduling rules.
- Edit/delete for recurring occurrences follows the existing one-occurrence vs entire-series scope contract.
- Do not invent Month-view click behavior unless the live Superdesign project defines it.

## 4. Stack baseline

- Next.js 16.3.x, use the latest patched 16.3 release available when bootstrapping.
- React 19.3.x.
- TypeScript.
- Node.js 24 LTS.
- pnpm with committed lockfile.
- Supabase PostgreSQL, Auth, RLS and cookie SSR integration.
- Cloudflare R2 for private file bytes.
- Zod + React Hook Form.
- TanStack Query v5 only where cache/optimistic behavior materially helps, especially detail dialogs and mutation synchronization.
- date-fns plus an RFC 5545-compatible recurrence library.
- Vitest + Playwright.

### Tailwind parity rule

Do **not** default-migrate the Superdesign styling to Tailwind v4 just because it is newer. Tailwind v4 changes utilities and Preflight behavior (including ring defaults, placeholder behavior, button cursor, dialog margin, and renamed utilities). During the exact UI port, identify the Tailwind major used by the live Superdesign output and pin that major first. If the live project emits v3-style markup/config, use Tailwind 3.4.x for the parity phase. A v4 migration is a separate later change with visual-regression approval.

## 5. Data/security invariants

- Every exposed user-owned table has RLS enabled.
- Explicit Postgres `GRANT`s are part of migrations for tables intentionally used through Supabase Data API. Grants and RLS are separate controls.
- `(select auth.uid()) = user_id` ownership checks are used in RLS where appropriate.
- UPDATE policies have both `USING` and `WITH CHECK`.
- Cross-user foreign references are prevented with composite owner-aware FKs where practical, not left solely to application code.
- `user_metadata` is never an authorization source.
- Supabase secret/service-role credentials and R2 credentials never reach the browser.
- API keys are shown once, hashed at rest, revocable, and rate limited.
- Presigned R2 URLs are short-lived bearer capabilities and restricted to the intended operation/object/content type.

## 6. Layering rule

```text
UI / Server Action / Route Handler / Public API
                    -> application service
                    -> repository / storage adapter
                    -> Supabase / R2
```

Web UI and `/api/v1` share application services and validation rules. Route handlers do not become a second business-logic implementation.

## 7. Execution discipline

For a complex story, use its `.agent/execplans/EPIC-XX.md` and update the ExecPlan as a living plan. Work one story-sized unit at a time.

Required checks as applicable:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

For UI stories, run Playwright visual comparison in the same deterministic environment as the baseline and manually inspect meaningful diffs.

For database stories, run Supabase advisors plus positive and negative RLS tests.

## 8. Stop conditions

Stop and surface the exact conflict only when:

- live Superdesign cannot be accessed and a required UI state has no usable reference;
- a live design conflicts with a locked product decision;
- implementation would weaken tenant isolation;
- a destructive migration lacks a data strategy;
- a new external infrastructure service is required but not approved;
- a story's acceptance criteria materially contradict another locked contract.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
