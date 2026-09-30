# ExecPlan 00 - Foundation and Live Superdesign Port

## Purpose

Create the real Next.js application shell and establish pixel-faithful production versions of currently approved live Superdesign states with deterministic fixtures before backend wiring.

## Source contracts

- `AGENTS.md`
- `DESIGN.md`
- PRD / architecture / DATA_MODEL
- `engineering/VISUAL-PORT.md`
- `.agent/execplans/EPIC-01.md`
- live Superdesign Web Study project
- V4/V2 bundled screenshots as regression evidence

The live project is authoritative. Old preview HTML is historical only.

## Non-goals

No real Supabase data, R2 transfer, public API implementation, AI backend, or direct invention of UI states missing from Superdesign.

## Milestones

1. Bootstrap pinned Next.js/React/TypeScript/Node/pnpm stack.
2. Inspect live Superdesign styling/runtime output and pin the Tailwind major that preserves parity.
3. Establish deterministic fonts/icons/tokens/fixture DTOs.
4. Port shell + Dashboard.
5. Port Calendar Day/Week/Month.
6. Port Tasks, Documents, Settings, profile dropdown and approved create modals.
7. Port approved Task Details and Session Details static states as part of fixture coverage; behavior is wired in Epics 03/04.
8. Port auth pages with Apple intentionally removed.
9. Capture deterministic Playwright baselines for approved states.
10. Run lint/typecheck/unit/build/visual checks.

## Verification

Production has no Superdesign preview runtime dependency. Approved states render from real React/Next.js code and reviewed screenshots. Missing states are not invented in code.
