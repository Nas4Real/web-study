# Loading boundary: correlated content repeat

## Verdict

The earlier search content median regression does not repeat consistently in
this candidate/control/control/candidate comparison. Provider spans closely
track content timing in both versions. No large client-rendering stall is
established, and no new application optimization is justified by this run.

Keep the useful loading-feedback candidate under review, not deployed. This is
not a content speedup: candidate combined content p95 remains worse, especially
search (597.1ms versus 522.1ms). The full no-regression, all-route and hosted
gates remain open. Do not lower the spec's budgets or dismiss these tails.

## Method and diagnostic change

Base commit `0f8b38d`, same working-tree profiler/metrics patch in both variants.
Control temporarily removes only `src/app/(workspace)/loading.tsx` and its
rendering test; both are restored byte-for-byte before the final candidate
build. No sidebar, search, Link, auth, page loader or database change.

Four isolated batches, ten warm Calendar samples per input per batch: 80 total.
Genuine populated synthetic account, local production localhost:3100, Node
24.18.1, Next 16.3.8, React 19.3, Chromium 153.0.8010.12, Africa/Tunis;
sidebar 1440×900, search 375×812, unthrottled CPU/network. Fresh browser context
per sample, source→Calendar→source warm-up; no concurrent build/test/profiler.
Candidate/control use separate production builds. The two control batches use
the same uninterrupted server; the final candidate uses a rebuilt/restarted
server. This order reduces simple time drift but does not isolate every cache,
provider, connection-pool or server-start effect.

`PERF_CORRELATE_PROVIDER=true` is local-only and requires exactly one recorded
non-prefetch destination RSC per sample and nonempty matching completed provider
events. Missing correlation fails the run, not a zero-call claim. Pre-run log
rows are excluded by character offset, because request IDs reset on restart.
The correlation helper has three red→green tests for old/colliding IDs, absent
attribution and sanitized output. Raw auth state and provider payloads are never
saved; raw numeric/category reports remain ignored.

Completion times (UTC on 2026-10-10), all complete:

- Candidate 1: 20:27:14.667.
- Control 1: 20:29:53.170.
- Control 2: 20:31:16.944.
- Candidate 2: 20:33:24.925.

Archives: `.performance-artifacts/09-03-correlated-{candidate,control}-{1,2}.json`.

## Results

Milliseconds, median / nearest-rank p95; ten samples per row.

| Batch | Input | Content-frame proxy | Recorded provider span |
| --- | --- | --- | --- |
| Candidate 1 | Sidebar | 392.3 / 559.7 | 322.9 / 490.4 |
| Control 1 | Sidebar | 403.1 / 542.9 | 342.0 / 466.6 |
| Control 2 | Sidebar | 436.7 / 542.7 | 376.2 / 474.4 |
| Candidate 2 | Sidebar | 444.3 / 578.1 | 382.1 / 509.2 |
| Candidate 1 | Search | 405.4 / 597.1 | 333.2 / 525.3 |
| Control 1 | Search | 469.1 / 521.9 | 394.5 / 452.6 |
| Control 2 | Search | 403.8 / 565.2 | 346.6 / 506.1 |
| Candidate 2 | Search | 432.5 / 638.0 | 366.1 / 567.2 |

Combined twenty-sample groups:

| Input | Control content | Candidate content | Control provider span | Candidate provider span |
| --- | --- | --- | --- | --- |
| Sidebar | 426.3 / 542.7 | 428.1 / 559.7 | 365.9 / 466.6 | 362.2 / 497.3 |
| Search | 430.6 / 522.1 | 426.1 / 597.1 | 366.7 / 467.2 | 360.9 / 525.3 |

All 80 samples have one destination RSC and the same recorded four provider
calls: profile 1, subject 1, calendar 2. No provider errors or observed browser
long tasks. Pearson correlation of provider span/content is 0.989–0.996 across
the four combined input/variant groups; correlation supports further server/
provider investigation, not proof of causality or an exact rendering diagnosis.

Arithmetic content-minus-provider-span medians are 65.8→69.1ms for sidebar and
61.4→67.4ms for search. Their p95 values are 76.3→93.9ms and 77.9→84.1ms.
These subtract durations from different observation intervals; they are not
pure client-rendering times, provider-end-to-paint or React commits. Readiness
to the profiler's double frame is about 32–33ms median in both versions, much
of which is intentionally part of that observation method.

The candidate main shell is observed in all forty candidate samples; combined
p95 is 43.8ms sidebar / 48.3ms search. Control has no main shell. Existing pending
feedback remains separate. That useful fallback—not faster data—is the retained
behavior, already covered by withheld-response/interruption checks.

## Limits and next work

These are local warm Calendar results with diagnostics enabled, not hosted,
all-route, cold-entry or population-wide guarantees. Completed provider events
are observed, not all possible in-flight work. Headers precede streamed content;
headers-to-readiness cannot be labelled rendering time. Content remains a DOM
readiness/double-frame proxy, not exact all-control hydration, React commit,
paint-after-complete-data or INP.

Next: cover all five destination fallbacks/initial entry separately and verify
the candidate on a hosted preview. Further content attribution must preserve
actual-response completion/cancellation distinctions. A broad cache, JSON
migration, speculative auth memoization or region move is not part of this slice.

## Reproduce

Use the existing local production runner with `PERF_PROVIDER_TIMING=true` and
the ignored credential environment. Set `PERF_ORIGIN=http://localhost:3100`,
`PERF_DATASET=populated`, `PERF_DESTINATIONS=Calendar`, `PERF_MODES=warm`,
`PERF_SAMPLES=10`, and `PERF_CORRELATE_PROVIDER=true`, then:

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/profile-navigation.ts
```

Archive the output before another capture or Playwright clears it. Keep the
same profiler patch in both builds and log the actual variant/build changes.

## Verification

All 657 unit tests and typecheck pass. Lint has no errors and the existing
modal-focus cleanup warning. Both control and restored candidate production
builds pass. The restored boundary/test have no diff against the prior commit;
no application code, snapshots, auth, schema or dependencies change here.
The prior 51 browser/visual checks are not rerun for this diagnostic-only slice.
All four genuine-auth production profiling batches finish with full attribution.
