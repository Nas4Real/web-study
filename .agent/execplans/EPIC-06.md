# ExecPlan EPIC 06: Notifications and settings

This ExecPlan is intentionally executable story-by-story. Do not collapse it into one giant implementation.

## Context

Read `AGENTS.md`, the PRD, architecture, engineering index, this epic, and each story before coding.

## Milestones

1. `06-01` Notification preferences and generation backend — deferred for the private beta
2. `06-02` Wire notification bell/list — deferred for the private beta
3. `06-03` Wire Settings profile password storage signout — complete 2026-10-07
4. `06-04` Notification preferences UI — deferred for the private beta
5. `06-05` Account deletion orchestration — deferred for the private beta
6. `06-06` Delete-account confirmation UI — deferred for the private beta

## Private-beta scope decision

The current two-user beta keeps functional profile editing, password recovery,
storage usage, and sign-out. Notifications and account deletion remain planned
but are intentionally deferred; their existing controls stay disabled until the
supporting stories are implemented.

## Verification

At every story boundary run the relevant lint, typecheck, unit/integration, E2E, build, RLS, and screenshot gates. Make a small coherent commit only after verification.

## Design-block rule

If a story is marked `ready-superdesign-first`, inspect the live Superdesign project first. If the required state is absent, create/iterate it in that same project, then implement from the resulting draft.
