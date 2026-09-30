# ExecPlan EPIC 05: Documents folders and R2 storage

This ExecPlan is intentionally executable story-by-story. Do not collapse it into one giant implementation.

## Context

Read `AGENTS.md`, the PRD, architecture, engineering index, this epic, and each story before coding.

## Milestones

1. `05-01` Chapters and hierarchical folders
2. `05-02` R2 client private bucket configuration
3. `05-03` Atomic quota reservation and upload intents
4. `05-04` Upload completion verification and cleanup
5. `05-05` Documents UI search sort recent and navigation

## Verification

At every story boundary run the relevant lint, typecheck, unit/integration, E2E, build, RLS, and screenshot gates. Make a small coherent commit only after verification.

## Design-block rule

If a story is marked `ready-superdesign-first`, inspect the live Superdesign project first. If the required state is absent, create/iterate it in that same project, then implement from the resulting draft.
