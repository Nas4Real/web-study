# Same-page detail reopen — 2026-10-10

80 completed local read-only samples, ten each for initial/warm task/session open
and their closes. This compares cache states, not an application before/after win.

## Conditions and reproduction

- Genuine populated synthetic account; no study-data writes, tests/builds or
  other profiling processes during capture.
- Traced production build; Chromium 153.0.8010.12, 1440×900, Africa/Tunis,
  default unthrottled CPU/network. Finished `2026-10-10T21:36:51.928Z`.
- Capture HEAD `cf6d532c167e49d29cd0fd3b24a34b1ef5b23bd0` plus warm diagnostic
  changes and the nine-line session-success cache fix, subsequently committed as
  `1713d7cfb5b61c92283a3d174a50edbf0d7b3a5d`. That fix only runs after writes;
  this read-only run does not exercise it. No distinct hosted deployment measured.
- A full navigation precedes each initial visit. Then close/reopen the same
  record without navigating, editing or remounting its page cache. These are
  paired same-page visits, not cold-function/DB samples or shared-route cache tests.
- Version-4 complete report archived in ignored
  `.performance-artifacts/09-01-detail-warm.json`.

Set `PERF_ORIGIN=http://localhost:3100`, `PERF_DETAILS_ONLY=1`,
`PERF_DETAIL_REOPEN=1`, `PERF_CORRELATE_PROVIDER=true`, `PERF_SAMPLES=10` in the
profiler environment. Start the existing traced production runner first, then:

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/profile-interactions.ts
```

The reopen option rejects mutation mode and invalid values; original default
flows are unchanged. Warm reports have a separate `-warm.json` filename.
Readiness is recorded before waiting for action attribution. Opens allow up to
30 seconds for the response/action ID after the one-second observation window;
closes retain the fixed one-second network window. Missing attribution still
fails incomplete. Consumed/cancelled response streams do not need a successful
full-body completion to correlate their action ID with provider events.

## Results

Milliseconds, median / nearest-rank p95. Each row has ten samples.

| Open | Sampled DOM/control readiness | Following frame | Provider span |
| --- | --- | --- | --- |
| Session initial | 446.35 / 1117.60 | 452.25 / 1123.60 | 401.41 / 974.53 |
| Session warm | 10.70 / 12.80 | 89.95 / 117.10 | 451.73 / 633.63 |
| Task initial | 330.25 / 443.30 | 405.95 / 445.80 | 289.73 / 380.46 |
| Task warm | 13.75 / 24.10 | 82.70 / 119.10 | 326.46 / 673.70 |

All 40 opens have exact provider attribution, one POST and zero current-route
non-prefetch RSC requests. Each session open (initial or warm) has one profile,
two calendar and one subject read; each task open has one profile, one task and
one subject read. No provider errors. Task initial total-RSC p95 is one
(background prefetch); the other open groups have total-RSC p95 zero.

Warm readiness precedes completion of the background provider work: it is cached
content readiness, not confirmation that freshly read data has rendered. The
following-frame median is 83–90ms, materially later than the sampled DOM metric;
do not equate 11–14ms DOM readiness with exact visible paint or INP. These probes
do not identify that gap's browser/React cause.

All 40 closes capture zero RSC/POST. Close-ready medians are 9.65–11.65ms,
p95 <=17.90ms; following-frame p95 <=29.90ms. Provider fields for closes are
unattributed/null, not proof of zero provider work.

## Interrupted attempts and decision

Three incomplete attempts are preserved separately in ignored archives, not
pooled into this completed report. The first stopped during a later navigation:
the trace records a profile read lasting about 38.1 seconds. The second's warm
background read exceeded the former one-second attribution window (one subject
call took about 1.53 seconds). The third's request-body completion condition was
not satisfied despite all three provider calls completing. It does not prove a
particular transport failure; successful body completion is not a reliable
prerequisite for a consumed/cancelled Next stream. The final harness waits for response/action
attribution, reports failure stage/category without raw errors, and completes.
These failed attempts remain reliability caveats; do not erase their evidence or
claim the final repeat proves provider tails are always small.

Keep the current read-only cache reuse and fresh background read. Increasing
`staleTime` is not needed to fix measured warm visibility in this slice; request
reduction requires explicit invalidation/freshness/actor-lifecycle evidence first.
Cold opens still have substantial provider waits, so prioritize a correctness-
preserving read-round-trip experiment rather than speculative cache broadening.
The separate [successful-write fix](SESSION-CACHE-FRESHNESS-2026-10-10.md) prevents
known pre-write data from being reused after edits/deletes.

Five visit-policy tests pass red→green. Full units/typecheck/production build
pass; lint retains its existing modal cleanup warning. Browser freshness checks
and the unrelated mobile visual gate are recorded in the successful-write report.
Precise session-mutation timing, browser/React attribution, hosted provider costs,
shared actor lifecycle and final integration remain open; 09-01/09-04 are not done.
