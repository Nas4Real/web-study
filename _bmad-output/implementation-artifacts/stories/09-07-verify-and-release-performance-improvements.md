# Story 09-07: Verify and release performance improvements

Epic: epic-09
Status: planned
Dependencies: 09-01 through 09-04; written verdicts for 09-05 and 09-06
Scope: medium; report, regression coverage and existing deployment workflow

## User outcome

As a user, I want the live website to feel measurably smoother while my data
and existing task/session behavior remain correct.

## Acceptance criteria

- [ ] Matched before/after traces, sample metadata and experiment verdicts are
  published in the repository. Feedback and usable-content budgets are evaluated
  separately; unresolved delays are named without changing targets silently.
- [ ] Auth/cache switching, failure/rollback, Calendar history/recurrence, Tasks
  and unchanged completed-screen visuals pass the focused regression gates.
- [ ] Existing GitHub/Vercel delivery succeeds and a real authenticated hosted
  smoke confirms the changed flows; baseline and release commits are recorded.

## Expected implementation surface

`docs/performance/`, focused E2E coverage, Epic 09/sprint progress and existing
deployment checks. No new paid infrastructure or broad deferred test matrix.

## Verification / done when

Run `rtk pnpm lint`, `rtk pnpm typecheck`, `rtk test pnpm test`, relevant E2E/
visual suites and `rtk err pnpm build`. Verify private cache headers and focused
two-user/auth tests after cache/auth edits. Validate production build timing and
Vercel Ready plus hosted smoke. Keep an optimization only when comparable
evidence supports it; reverting a failed experiment preserves other work.
