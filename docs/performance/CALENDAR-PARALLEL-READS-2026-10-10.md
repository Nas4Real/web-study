# Calendar parallel-read experiment — 2026-10-10

Verdict: **retain the narrow candidate for review**. Auth/context helpers, query
contracts, cache behavior, application services, recurrence and UI are unchanged.
Story 09-02 is not complete; this does not close 09-01 or the release gates.

## Implementation and correctness

`loadCalendarPageData` resolves verified actor/profile/timezone and a bounded
date/view window before starting subjects and occurrences through `Promise.all`.
Projection still waits for both results, checks both error results and sanitizes
rejected promises. The authenticated development visual-fixture branch retains
its subject-only read and never queries occurrences. No global/private cache,
auth bypass, schema change, extra mutation or new dependency is introduced.

The held-subject regression fails on the original loader (occurrence read never
starts) and passes after. All 18 loader tests, full unit suite, typecheck, build
and all 27 Calendar/data/session browser checks pass. Browser coverage includes
date/view/history, month boundaries, empty day, focus/retry, effective occurrences,
single/series edits/deletes and six unchanged visual snapshots. Lint retains the
existing modal-ref warning. Baselines were not updated.

## Comparable measurements

Before: `2026-10-10T19:20:43.641Z`; candidate:
`2026-10-10T19:23:48.802Z`. Harness/base commit `30bc98f`; candidate loader was a
working-tree change during capture. One production-build server at a time on
localhost:3100, genuine populated test-account auth, Chromium 153.0.8010.12,
1440×900, Africa/Tunis, CPU/network unthrottled. Same synthetic dataset and target
order, fresh context per entry, 20 samples per page (100 per run). No builds,
tests or concurrent benchmarks during either capture. Each server was warmed by
login and 20 Tasks entries before Calendar. Provider/OS activity is uncontrolled.

Only matching document request IDs enter the provider measurements, excluding
background prefetches. Instrumentation overhead exists equally in both runs.
The first attempted baseline was erased by Playwright's output-directory reset;
it is discarded, not reconstructed or used. The rerun and candidate reports
are archived in ignored `.performance-artifacts/09-02-before-populated.json` and
`09-02-after-populated.json`, outside Playwright's cleanup target.

Milliseconds, median / nearest-rank p95, 20 samples per variant:

| Calendar metric | Before | Candidate |
| --- | ---: | ---: |
| Provider span (first start → last end) | 437 / 1002 | 348 / 458 |
| Document headers observed | 473 / 1033 | 378 / 499 |
| Automation-observed ready | 650 / 1250 | 495 / 627 |
| Subject/first-calendar call overlap | 0 / 0 | 84 / 218 |

All 20 baseline Calendar samples are sequential; all 20 candidate samples
overlap. Both variants retain exactly five calls: one profile, one auth-user,
one subject and two calendar calls. No traced provider errors occurred.
No reads or validations were omitted to obtain the result.

## Variation and limitations

The two consecutive ten-sample Calendar batches have provider-span medians
437/435ms before and 333/390ms after; observed-ready medians 650/645ms before
and 486/537ms after. Both candidate batches are faster. Aggregate provider-span
median falls 89ms (~20%); observed-ready median falls 155ms (~24%). The span
delta exceeds the 57ms candidate-batch median spread and observed median changes
of the unchanged provider controls below. These are engineering samples, not
confidence intervals or a fully randomized crossover experiment.

| Unchanged control | Provider-span median before → after | Observed-ready median before → after |
| --- | ---: | ---: |
| Tasks | 218 → 234 | 457 → 483 |
| Documents | 250 → 224 | 468 → 392 |
| Settings | 232 → 181 | 431 → 348 |
| Dashboard | 278 → 320 | 485 → 466 |

Controls vary in both directions; not all readiness/tail gains can be attributed
to this patch. The direct overlap evidence supports removal of the measured
Calendar waterfall. Do not credit the entire p95 reduction to parallelization.
Observed-ready includes document/assets/client work and automation observation
delay; it is not exact React commit, paint, INP or every control's hydration.
Provider span is not the sum of overlapping call durations.

These are local initial entries using hosted Supabase, not hosted Vercel sibling
navigation. They do not prove the 200ms feedback target, the warm-navigation
30% improvement target or whole-epic release performance. Hosted candidate
verification and remaining interaction attribution stay open.

Next: retain the candidate on the review branch; measure navigation loading
feedback separately in 09-03. Do not bundle speculative auth/profile memoization.
