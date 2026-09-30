# ExecPlan EPIC 06: Notifications and settings

This ExecPlan is intentionally executable story-by-story. Do not collapse it into one giant implementation.

## Context

Read `AGENTS.md`, the PRD, architecture, engineering index, this epic, and each story before coding.

## Milestones

1. `06-01` Notification preferences and generation backend
2. `06-02` Wire notification bell/list
3. `06-03` Wire Settings profile password storage signout
4. `06-04` Notification preferences UI
5. `06-05` Account deletion orchestration
6. `06-06` Delete-account confirmation UI

## Verification

At every story boundary run the relevant lint, typecheck, unit/integration, E2E, build, RLS, and screenshot gates. Make a small coherent commit only after verification.

## Design-block rule

If a story is marked `ready-superdesign-first`, inspect the live Superdesign project first. If the required state is absent, create/iterate it in that same project, then implement from the resulting draft.
