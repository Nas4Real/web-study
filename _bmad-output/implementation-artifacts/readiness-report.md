# Implementation Readiness Report V4

Status: **READY WITH SUPERDESIGN-FIRST GATES**

## Ready now

Product scope, stack boundaries, database model, ownership/RLS approach, public API, R2 flow, recurrence model, task/session detail behavior, story decomposition, test specifications, and Codex execution rules are engineered sufficiently to start implementation.

Task Details and Session Details have approved live designs plus V4 screenshot evidence and are `ready-for-dev` once their prerequisite services exist.

## Design-gated stories

Some behaviors are specified but their final authoring/confirmation UI is not yet approved. Codex has direct Superdesign access, so these are not blockers for the project; they are `ready-superdesign-first`. The agent creates/iterates the missing state in the existing project, then implements it.

Notable V4 gates: enriched New/Edit Task and New/Edit Session states.

## Risks explicitly handled

- Tailwind major drift during exact port: prevented by parity-first pinning.
- Cross-tenant foreign IDs: owner-aware composite FKs + RLS + service checks.
- Recurrence occurrence drift: original-start identity + exception model.
- Detail/list stale data: keyed cache/invalidation contract.
- Parent/subtask semantic ambiguity: parent completion independent from subtasks.
- Supabase 2026 Data API grants change: explicit grants in migration plan.
- R2 upload complexity: single presigned PUT fits the 50 MB limit.

## Gate before production

All runnable tests described in the 11 test specifications must exist and pass; Supabase advisors must be clean/reviewed; visual diffs must be approved; production environment/secrets/CORS/R2 policies must be smoke-tested.
