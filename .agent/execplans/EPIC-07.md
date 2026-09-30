# ExecPlan EPIC 07: Public API and personal API keys

This ExecPlan is intentionally executable story-by-story. Do not collapse it into one giant implementation.

## Context

Read `AGENTS.md`, the PRD, architecture, engineering index, this epic, and each story before coding.

## Milestones

1. `07-01` Personal API key backend
2. `07-02` API authentication rate limit and error pipeline
3. `07-03` Tasks subjects chapters folders API
4. `07-04` Calendar API including occurrence operations
5. `07-05` Files notifications profile storage API
6. `07-06` Developer API Settings UI

## Verification

At every story boundary run the relevant lint, typecheck, unit/integration, E2E, build, RLS, and screenshot gates. Make a small coherent commit only after verification.

## Design-block rule

If a story is marked `ready-superdesign-first`, inspect the live Superdesign project first. If the required state is absent, create/iterate it in that same project, then implement from the resulting draft.
