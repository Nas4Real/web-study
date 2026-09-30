# Codex Handoff V4

## First instruction

Read `AGENTS.md`, project context, PRD, architecture, DATA_MODEL, ADRS, engineering index, Superdesign live workflow, traceability matrix and the active epic ExecPlan.

Before UI code, inspect Nas's existing live Web Study Superdesign project. Do not ask Nas for exports and do not create a replacement project.

## Story loop

1. Read active story + engineering/test contracts.
2. Inspect live Superdesign for UI story.
3. If required UI state is absent, create/iterate it in the same project first.
4. State intended files/DB changes.
5. Implement service/repository rules before adapter duplication.
6. Add executable tests described by specs.
7. Run lint/typecheck/unit/integration/E2E/build as applicable.
8. Run visual comparison for UI states and review diffs manually.
9. Update story/status/ExecPlan notes with evidence and risks.
10. Move to next story only after acceptance is proven.

Do not attempt all epics in a single context window.

## V4 first-order changes Codex must know

- Task Details + Session Details are approved live states.
- Task schema now includes description, normal/high priority and child subtasks.
- Session detail uses effective occurrence + notes/location/professor.
- New Task and New/Edit Session require Superdesign-first enrichment. Do not invent an Edit Task surface unless the live Superdesign flow calls for it.
- Tailwind major must match live design during initial port.
- Supabase migrations need explicit Data API grants in addition to RLS.
