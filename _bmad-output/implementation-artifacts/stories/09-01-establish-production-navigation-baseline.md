# Story 09-01: Establish production navigation baseline

Epic: epic-09
Status: ready-for-implementation
Dependencies: none
Scope: medium; profiling procedure, report and focused browser instrumentation

## User outcome

As a user, I want the navigation delay traced accurately so optimizations improve
the delay I experience on the hosted app.

## Acceptance criteria

- [ ] Capture at least ten cold/first-visit and ten warm samples per selected
  transition; report median/p95, environment, commit and dataset metadata.
- [ ] Separate first destination feedback, full response/required JS completion,
  next meaningful paint and usable content; record long tasks and provider calls.
- [ ] Produce ranked hypotheses and an experiment ledger with no production
  bypass, real-user data changes or credentials in saved output.

## Expected implementation surface

`docs/performance/`, a dedicated profiling browser harness, and temporary
development-only timing hooks if required. Do not time dev fixtures as production.

## Implementation sequence

1. Read the Epic 09 spec and record reference conditions and representative flows.
2. Use production-build traces for browser work and real hosted auth for server costs.
3. Compare empty/populated test accounts, sidebar/search, Calendar changes and mutations.
4. Identify repeated reads, JS waterfalls, stream completion and commit/paint delay.
5. Save sanitized evidence and identify which hypothesis each next story tests.

## Verification / done when

The profiling procedure can be repeated against the same conditions, the report
distinguishes local and hosted evidence, and the proposed work is tied to observed
bottlenecks. If hosted login is unavailable, mark the baseline incomplete; do not
invent timings or proceed with a claimed production diagnosis.
