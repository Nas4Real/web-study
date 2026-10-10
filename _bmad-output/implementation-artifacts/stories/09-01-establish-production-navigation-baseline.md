# Story 09-01: Establish production navigation baseline

Epic: epic-09
Status: in-progress
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

## Execution notes — 2026-10-10

Diagnostic tooling is implemented under `scripts/performance/`, with metric and
privacy-category tests in `src/tooling/navigation-metrics.test.ts`. Two approved
auto-confirmed test users were created; only the populated user received synthetic
subjects/tasks/sessions. No production bypass, real-user data changes or application
optimization has been introduced.

See `docs/performance/README.md` for repeatable commands and measurement limitations.
Hosted sidebar/search samples (400) and local production Tasks/Calendar samples
(160) are captured in `docs/performance/BASELINE-2026-10-10.md`, with hypotheses in
`docs/performance/EXPERIMENTS.md`. This first run includes concurrent profiling and some overlapping quality
checks: retain it as exploratory evidence, not a controlled before/after comparison.
Controlled repeats and Calendar/task/session interaction profiling remain required.

Separate finding: hosted chapter creation returned 503 for the dedicated test user.
Chapter metadata is excluded from the populated dataset until that is investigated.

The isolated empty-account repeat completed with 200 samples; see
`docs/performance/ISOLATED-NAVIGATION-2026-10-10.md`. A supplementary real-auth
interaction harness completed 80 populated-account samples; see
`docs/performance/INTERACTIONS-2026-10-10.md` for assertion-timing limitations,
prefetch separation and the confirmed read-only Calendar refresh candidate.
Full baseline acceptance remains incomplete; no whole-epic speedup is claimed.

The isolated populated navigation repeat completed with another 200 samples at
`2026-10-10T18:56:41.958Z`; see
`docs/performance/ISOLATED-POPULATED-NAVIGATION-2026-10-10.md`. All 20 groups have
ten samples. Warm-sidebar content p95 is 792–1255ms, with no observed long tasks;
paint-after-sampled-readiness p95 is <= 6.785ms for warm groups. The app source is
unchanged from the hosted baseline, not the optimization branch candidate.
Only 8/200 first-observed RSC streams completed successfully in the observed
window; headers-to-readiness must not be labeled client rendering time.
Empty/populated runs occurred at different times and do not isolate dataset cost.
Initial-entry/provider attribution, precise interaction timing and session-mutation
coverage remain open; keep this story in-progress.

Local initial-entry attribution is complete: 100 production-build samples, ten
per route/dataset. Each document made one profile and one auth-user read; no
duplicates observed. All 20 Calendar entries waited for subjects before starting
occurrence calls; subject duration median 79–96ms. See
`docs/performance/INITIAL-PROVIDER-2026-10-10.md` for counts/timings and local
instrumentation/automation limits. No application change is bundled here.
Precise interaction/session-mutation and hosted-provider evidence remain pending.

A diagnostic-only detail-readiness follow-up now has 40 real-auth local production
samples (ten each for task/session open/read-only close). Actual page click,
frame-sampled visible-dialog/enabled-control readiness and a following frame are
reported separately from assertion-observed timing. Open readiness medians are
604ms session / 489ms task; read-only close medians are 10–11ms with zero captured
RSC/POST per close. No data writes in the opt-in detail-only run. This improves
measurement precision, not application speed. Four red→green probe tests, full
units/typecheck/build and lint (existing warning) pass. See
`docs/performance/DETAIL-FRAMES-2026-10-10.md` for boundaries/overhead; React/paint,
session mutations and hosted provider attribution are still incomplete.

A second 40-sample local read-only run correlates all 20 detail opens with one
exact fresh POST/provider timeline. Session/task sampled-ready medians are
489/405ms, provider-span medians 456/356ms; four/three sequential reads with no
overlap and zero provider errors. Close remains 10–11ms median with zero captured
RSC/POST; close provider work is not attributed. Six correlation tests pass
red→green; full units/typecheck/build pass and lint's existing warning remains.
See `docs/performance/DETAIL-PROVIDERS-2026-10-10.md` for source dependencies,
conditions and limits. App source is unchanged, so do not claim a speedup between
batches. Next: measure same-page warm detail reopen and freshness before cache
changes, or test a scoped owner-aware round-trip reduction. Effective recurrence
and subject dependencies must remain correct. Keep this story in-progress.
