# Hosted interaction baseline — 2026-10-10

80 samples completed at `2026-10-10T15:38:33Z`, ten repetitions per scenario.
Dedicated populated profiling user only; Chromium 153.0.8010.12, 1440×900,
Africa/Tunis, unthrottled CPU/network, no concurrent browser benchmark/build/test.
Hosted app source remains `739019549566d8ab753011d7a8d60fc70c5d1a71`.
The new `profile-interactions.ts` harness was an uncommitted addition atop
`0ee23aa` during capture. No app runtime optimization was present.

| Scenario | Observed-ready frame median / p95 (ms) | Current-route non-prefetch RSC GET median | POST median |
| --- | ---: | ---: | ---: |
| Calendar day → week | 1373 / 1858 | 1 | 0 |
| Calendar next week | 1134 / 1406 | 1 | 0 |
| Session detail open | 1469 / 1524 | 0 | 1 |
| Session read-only close | 43 / 45 | 1 | 0 |
| Task detail open | 1083 / 1488 | 0 | 1 |
| Task complete | 1637 / 1911 | 1 | 1 |
| Task reopen | 1385 / 1926 | 1 | 1 |
| Task read-only close | 43 / 44 | 0 | 0 |

Timing is a click-to-assertion-observed frame **upper bound**. Playwright assertion
polling can materially inflate these values; they must not be described as exact
React commit, browser paint, hydration, INP or database-commit times. This harness
is most useful for successful flows and request counts. Use animation-frame/CDP
traces for fine-grained before/after latency attribution. Mutations wait for the
new status control to be enabled; each completion is followed by reopening.

Requests include a fixed one-second window after readiness, excluded from the
frame metric. Several scenarios show 6–9 total RSC requests, but most are background
prefetches. All observed prefetch flags resolved; counts above restrict to current
route GETs without the prefetch flag. These counts alone do not prove the caller.

Source inspection independently confirms Calendar `closeDetail()` and Dashboard
`closeSession()` call `router.refresh()` on any non-fixture close. The modal uses
the same callback for edit/delete success. A narrow 09-04 experiment can split
read-only close from successful mutation, eliminating the close refresh while
preserving reconciliation after edits/deletions. Task close already avoids it.
No broad workspace cache or auth change is required for this experiment.

The first smoke attempt required a specific synthetic note and timed out; the
second used the loaded dialog's enabled Edit control and passed all eight flows.
The missing-note observation is not diagnosed as an app defect or silently claimed
to be fixed. Session-content correctness still belongs to its existing regression
tests and a separate reproduction if the fixture discrepancy persists.

Raw sanitized evidence remains ignored at
`test-results/performance/hosted-interactions.json`. A synthetic Tasks screenshot
was inspected; no UI source, design tokens or visual baselines changed during
capture. Credentials, request bodies, raw URLs and auth headers are not saved.

09-01 remains open: populated navigation repeat, initial/provider attribution,
precise interaction/React timing and session-mutation coverage remain pending.
