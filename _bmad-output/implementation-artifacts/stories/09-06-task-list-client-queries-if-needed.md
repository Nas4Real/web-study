# Story 09-06: Task list client queries if needed

Epic: epic-09
Status: conditional
Dependencies: 09-01, 09-02, 09-03, 09-04
Scope: medium per slice; complete read model, then list query/mutation integration

## Decision gate

Implement only if Tasks workflows still miss the spec's budgets and traces show
that client read caching addresses the bottleneck. Record a separate verdict
from Calendar; one screen's migration does not require the other.

## User outcome

As a user managing tasks, I want revisits and updates to feel immediate while
the list, details and Dashboard agree with confirmed server data.

## Acceptance criteria

- [ ] Server initial data seeds actor-scoped list queries without an immediate
  duplicate read. Status/grouping, description, subject and timezone data are
  preserved; existing external API consumers receive compatible responses.
- [ ] Optimistic complete/reopen/subtask changes respond within the spec's
  target and reconcile/rollback safely. Parent changes leave subtasks independent.
- [ ] Read/create/edit/delete invalidate only affected projections; rapid
  retries, expired auth and account switching remain correct, with measured gains.

## Expected implementation surface

Task shared read service/projection, existing API adapter or a first-party
read adapter when needed, a Task list query hook, and `tasks-page.tsx`.
Current collection summaries omit description; do not silently reduce the UI
or introduce one detail request per task to compensate.

## Engineering constraints

Reuse TaskService validation and server grouping/timezone rules. Keep cookie
Origin validation, verified actors, tenant isolation, explicit query freshness
and bounded requests. Prefer existing detail mutation behavior when it already
works; do not add a second business-rule implementation to React components.

## Verification / done when

Task actions/authoring/details and Dashboard consistency tests pass, including
failed optimistic writes and stale responses. Measure matched populated lists
before/after and preserve visuals. A defer verdict resolves the conditional
story without claiming client queries were shipped.
