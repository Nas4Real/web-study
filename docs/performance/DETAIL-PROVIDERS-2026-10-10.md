# Detail-open provider attribution — 2026-10-10

Diagnostic-only follow-up to [detail frame sampling](DETAIL-FRAMES-2026-10-10.md).
No application, auth, schema, cache or UI changes; no speedup claim.
Story 09-01 remains in progress.

## Conditions and reproduction

- Local traced production build, genuine populated synthetic account; no data writes.
- Application/HEAD `574d714fd165e6db523cb98396214be8a4e21ca8` plus this
  diagnostic working patch. Reused the preceding production build; app source unchanged.
- Capture finished `2026-10-10T21:12:23.538Z`; Chromium 153.0.8010.12,
  1440×900, Africa/Tunis, default unthrottled CPU/network.
- Ten samples each for session/task open and read-only close (40 total).
  Full navigation precedes each open; these are not same-page warm reopens.
  No concurrent builds/tests/profilers during capture.
- Version-3 complete report archived in ignored
  `.performance-artifacts/09-01-local-detail-providers.json`.

Start the existing local production runner with `PERF_PROVIDER_TIMING=true` in
the ignored server environment. Run the interaction profiler with
`PERF_ORIGIN=http://localhost:3100`, `PERF_DETAILS_ONLY=1`,
`PERF_CORRELATE_PROVIDER=true`, `PERF_SAMPLES=10` in its ignored environment:

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/profile-interactions.ts
```

Each open records the pre-action log boundary, reads only the response's numeric
`x-perf-request` ID and requires exactly one current-route POST with matching
fresh provider events. Missing/invalid/ambiguous attribution fails incomplete,
not zero work. Reports contain sanitized category/timing projections, not raw
IDs, credentials, bodies or URLs. Existing eight-flow default mode is preserved.

## Results

All values below are milliseconds, median / nearest-rank p95.

| Scenario (n=10) | Sampled ready | Following frame | Provider span | Calls per open |
| --- | --- | --- | --- | --- |
| Session open | 489.45 / 880.60 | 496.75 / 885.80 | 455.90 / 697.01 | profile 1, calendar 2, subject 1 |
| Task open | 404.50 / 508.30 | 421.85 / 561.10 | 355.59 / 461.54 | profile 1, task 1, subject 1 |
| Session close | 9.75 / 13.90 | 25.95 / 31.00 | Not attributed | — |
| Task close | 10.95 / 15.00 | 26.20 / 35.20 | Not attributed | — |

20/20 opens have provider attribution, zero provider errors, one POST and zero
current-route non-prefetch RSC requests. Total RSC p95 is one in each open group
(background prefetch); this is not evidence of a forced page refresh.
Every close has zero captured RSC/POST in the fixed one-second post-readiness
observation window. Close provider fields are null/empty: an aggregate error
count of zero there does not prove zero provider work.

No provider intervals overlap in any open sample. Category order is
`profile → calendar → calendar → subject` for sessions and
`profile → task → subject` for tasks. Provider-span vs sampled-ready Pearson
correlation is 0.981 for sessions and 0.979 for tasks. Sequential provider waits
are a major measured contributor; this is not exclusive root-cause proof.
There is no duplicate profile-read evidence in these action scopes.

## Source relationships and next experiment

`resolveTaskRequestContext` verifies the actor, builds services and awaits the
profile/timezone before the detail handler reads data. Calendar context reuses
that context, without an additional profile read in the measured actions.

`TaskDetailService.read` finds the owner-scoped task, then its actual subject.
`SessionDetailService.read` resolves the effective occurrence through the
owner-scoped series and exception reads, then its effective subject. Recurrence
membership, cancellation and single-occurrence overrides are load-bearing;
fetching the series master's subject blindly would be incorrect.

Ranked follow-ups:

1. Measure same-page warm detail reopen/request counts and freshness before
   changing the current page-mounted QueryClient/default stale behavior.
   Preserve mutation reconciliation and actor lifecycle; no global cache shortcut.
2. Test a narrowly owner-aware reduction/overlap of independent read round trips,
   with current provider documentation and correctness tests. Do not parallelize
   the dependent subject/occurrence reads without preserving their semantics.
3. Add precise session-mutation and browser/React/paint attribution, then controlled
   hosted evidence. Navigation content-tail/non-regression/global request-bound
   gates and final release remain separate, open work.

## Limits and verification

The synchronous local provider trace adds overhead. DOM/control readiness and
the following frame are not React commit, exact paint, hydration or INP. Provider
span and browser-click metrics use different clocks; subtracting them does not
yield pure rendering time. The earlier frame batch used unchanged app source but
different provider/run conditions, so its higher timings are not an app gain.
No distinct hosted deployment was benchmarked in this slice.

Six new correlation tests passed red→green; full unit suite, typecheck,
production build and whitespace check pass. Lint passes with the pre-existing
`modal-frame.tsx:103` effect ref-cleanup warning. The 40-sample real-auth run
exercises diagnostic integration without modifying data or visual baselines.
