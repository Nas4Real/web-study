# Story 01-04: Port Calendar Day Week Month static views

Epic: epic-01
Status: done
Dependencies: 01-02

## Purpose

Port the approved live Calendar Day, Week and Month states with deterministic fixture data and view/date navigation state.

## Expected implementation surface

`src/features/calendar/views/*`

## Engineering constraints

No real recurrence engine yet. Preserve live current-session/in-progress styling. Session Details may be represented as an approved static fixture state for visual baseline, but real effective-occurrence behavior belongs to Epic 04.

## Test plan

Visual tests for Day/Week/Month and stable view toggles.

## Done when

All three views match live Superdesign and V2 regression references without styling reinterpretation.

## Completion evidence

- Ported live Superdesign Calendar draft `9fc1a7b4-af57-48f9-b645-88f741ca400a` v53 into the shared workspace shell.
- Added deterministic typed fixtures for the seven-column Week view, Day agenda with current-session styling, and 35-cell Month grid.
- Added accessible Day/Week/Month toggles and immutable UTC period navigation without recurrence expansion or Month-view click behavior.
- Added three inspected 1440×1200 Chromium baselines, clean-console/page-error coverage, and no-overflow checks at 320/768/1024 px.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build` pass on 2026-10-01.
