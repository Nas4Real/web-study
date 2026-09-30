# V4 Package Validation Report

Date: 2026-09-29

## Scope

Validation covers package structure, BMAD story/status consistency, OpenAPI structure, V4 design evidence, story dependencies, research-backed architecture constraints and obvious schema-safety regressions. The SQL file remains a **draft** to be converted into real Supabase migrations and executed/tested by Codex during implementation.

## Automated structural checks

- YAML parsing: `sprint-status.yaml` OK.
- OpenAPI YAML parsing: OK.
- OpenAPI paths: 26; 33 named schemas; all local `$ref` targets and templated path parameters resolve structurally.
- Story files: 45.
- Sprint story IDs: 45, exact match with story files.
- Test specification files: 11, matching sprint metadata.
- `ready-superdesign-first` story status set exactly matches sprint metadata.
- Story dependency/reference scan: no missing story IDs.
- V4 screenshots present: Task Details and Session Details, with regenerated relative-path SHA-256 checksum files.
- No stale `BLOCKED-DESIGN`, old 41-story/10-test counts, or forced Tailwind-v4 wording outside historical V2/V3 changelogs.
- No composite foreign key using `ON DELETE SET NULL`, avoiding accidental nulling of owner columns.

## New V4 behavioral checks captured by artifacts

### Task Details

- Canonical task detail includes subject, priority, due data, description and ordered subtasks.
- Subtask completion is independent from parent completion.
- Parent Complete remains valid when some subtasks are incomplete, because that is what the approved V4 state demonstrates.
- Checkbox/subtask actions must not accidentally trigger the parent detail opener.
- Authoring controls not yet approved visually are `ready-superdesign-first`.

### Session Details

- Calendar Day/Week and Dashboard Today's Classes resolve the same effective-occurrence detail model.
- Detail includes subject, title, effective time, location/professor where applicable, and ordered Notes & Reminders.
- Recurring occurrence identity uses `(series_id, original_start)`, so moving one occurrence does not change its identity.
- One-occurrence overrides are applied before rendering detail.
- Edit/Delete operations keep one-occurrence vs whole-series scope semantics.

## Research-sensitive checks incorporated

- Current BMAD V6 artifact flow is reflected in package organization.
- Next.js/React/Node baselines are current as of package date, but patch versions must be rechecked at bootstrap.
- Tailwind major is detected from live Superdesign before porting, rather than forcing a major migration during visual parity work.
- Supabase Data API grants are explicit and treated separately from RLS.
- R2 upload strategy stays single-PUT for the 50 MB V1 limit.
- Modal keyboard/focus behavior is specified without changing the approved visuals.
- Playwright visual snapshots are expected to run in a deterministic environment.

## Implementation gate

A story is not complete merely because code exists. Codex must run its required unit/integration/E2E/visual/security checks, repair failures before moving on, and update the applicable ExecPlan/sprint status. Superdesign-first stories require an approved/live draft in the existing Superdesign project before implementation.
