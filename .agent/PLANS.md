# Codex Execution Plans (ExecPlans)

Use an ExecPlan for multi-hour work, cross-cutting features, database migrations, auth/storage changes or any refactor touching several modules.

An ExecPlan must be self-contained. Assume the implementer has only the current repository and this plan.

## Required sections

### Purpose / user-visible outcome

State exactly what becomes possible after the work.

### Source contracts

List the PRD capability, active epic/spec, architecture sections and Superdesign references that constrain the work.

### Non-goals

List nearby work that must not be introduced.

### Current state

Describe relevant files/modules and how the system works before the change.

### Implementation plan

Use ordered, testable milestones. Name files/modules that will change.

### Database / migration plan

If applicable, include schema changes, backfill, indexes, RLS, rollback considerations and verification queries.

### Security checks

State ownership/credential/input rules that must remain true.

### UI parity checks

For UI work, name the exact reference screenshot/frame and viewport. State that visual changes need approved Superdesign backing.

### Verification

List exact commands and manual/E2E checks.

### Progress log

Keep a checkbox list updated while implementing.

### Decisions / discoveries

Record unexpected repository facts and the decision taken. Do not silently change product scope.

### Completion evidence

Summarize tests, visual diff result, migrations and any follow-up work.
