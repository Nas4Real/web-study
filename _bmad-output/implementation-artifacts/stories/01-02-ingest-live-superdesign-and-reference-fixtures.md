# Story 01-02: Establish live design references and deterministic fixtures

Epic: epic-01
Status: done
Dependencies: 01-01

## Purpose

Inspect the live Web Study Superdesign project, record target states, and create typed fixture DTOs covering dashboard/calendar/tasks/documents/settings/auth plus Task Details and Session Details. Bundled V2/V4 images are regression evidence, not the primary design source.

## Expected implementation surface

`src/domain/dto/*`, `src/fixtures/*`, visual-baseline metadata/design docs.

## Engineering constraints

Fixtures contain no business logic and are replaceable by real services. Tailwind/font/icon assumptions come from the live project, not from a generic starter.

## Test plan

Fixture/schema tests and baseline-state smoke rendering.

## Done when

Live targets are identified, fixture DTOs cover approved states, and design precedence is recorded without requiring Nas to export Superdesign.

## Completion evidence

- Inspected live `WEB STUDY` project `71292a60-75e4-449b-a39f-0456ec77d72f`, Calendar draft v53, and Quiet Precision design system v10.
- Recorded live and screenshot-backed target provenance in `docs/design-targets.md` and `.superdesign/design-system.md`.
- Added typed, deterministic DTO fixtures for Dashboard, Calendar Day/Week/Month, Tasks, Documents, Settings, Auth, Task Details, and effective Session Details.
- Contract tests enforce independent subtask completion, effective occurrence identity, email/Google-only auth, the 2 GiB quota, and visual-source precedence.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass on 2026-09-30.
