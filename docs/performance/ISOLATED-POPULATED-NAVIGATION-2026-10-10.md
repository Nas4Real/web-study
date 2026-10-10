# Isolated populated hosted navigation — 2026-10-10

200 samples completed at `2026-10-10T18:56:41.958Z`: ten first visits and ten
warm visits per destination/input, five destinations, desktop sidebar and mobile
search. Every group is complete. Harness commit:
`6e1179055f0063341f1d4dccb2c3f2139b4b0e24`. Hosted source is recorded as
`739019549566d8ab753011d7a8d60fc70c5d1a71`, unchanged from the earlier baseline;
this run did not independently revalidate the deployment source. No candidate
runtime change was deployed by this run.

## Conditions and boundaries

- Genuine cookie sign-in to the dedicated populated test account; no fixture auth.
- Synthetic dataset: 3 subjects, 20 tasks, 40 subtasks, 8 session series (one
  weekly). No chapters or file bytes. This run is read-only.
- Chromium `153.0.8010.12`; timezone Africa/Tunis; CPU/network unthrottled.
- Desktop sidebar 1440×900; mobile search 375×812. These are distinct scenarios,
  not a controlled desktop-versus-mobile comparison.
- Only one profiling process ran; no builds, tests or other benchmarks ran
  alongside it. Other desktop/browser activity and provider latency are not
  fully controlled.
- First visit means a fresh browser context with authenticated cookies, not a
  guaranteed cold function/database. Warm means visiting and returning within
  the same context before the measured navigation.
- Content-frame is sampled DOM readiness followed by two animation frames,
  not proof that every control is hydrated or an exact React commit/INP.
- Values below are rounded milliseconds; median and nearest-rank p95, ten
  samples per row/input. With ten samples p95 is the largest observed value.

## Warm navigation

| Destination | Sidebar content median / p95 | Sidebar feedback median / p95 | Search content median / p95 | Search feedback median / p95 |
| --- | ---: | ---: | ---: | ---: |
| Tasks | 784 / 993 | 761 / 961 | 488 / 743 | 454 / 709 |
| Calendar | 788 / 1255 | 757 / 1228 | 710 / 882 | 680 / 851 |
| Documents | 673 / 970 | 647 / 940 | 476 / 668 | 443 / 639 |
| Settings | 485 / 792 | 455 / 764 | 483 / 596 | 452 / 564 |
| Dashboard | 714 / 957 | 684 / 932 | 656 / 890 | 630 / 857 |

All warm sidebar groups miss the 700ms content p95 target. Mobile search misses
it for Tasks, Calendar and Dashboard, but meets it for Documents and Settings.
All ten warm input/destination groups miss the 200ms feedback p95 target.
Budgets remain unchanged; this is not an optimization result.

## First visits

| Destination | Sidebar content median / p95 | Sidebar feedback median / p95 | Search content median / p95 | Search feedback median / p95 |
| --- | ---: | ---: | ---: | ---: |
| Tasks | 966 / 1244 | 941 / 1225 | 694 / 2471 | 666 / 2437 |
| Calendar | 961 / 1561 | 931 / 1529 | 925 / 1373 | 897 / 1340 |
| Documents | 734 / 911 | 711 / 901 | 618 / 797 | 587 / 763 |
| Settings | 612 / 861 | 581 / 834 | 528 / 619 | 498 / 586 |
| Dashboard | 759 / 960 | 735 / 943 | 967 / 1374 | 946 / 1354 |

The 2471ms Tasks-search sample is retained. No outlier filtering is applied.

## Network and client observations

| Warm sidebar destination | First observed RSC headers median / p95 | Paint after sampled DOM readiness p95 | Successful full-body observations / 10 |
| --- | ---: | ---: | ---: |
| Tasks | 231 / 349 | 4 | 1 |
| Calendar | 187 / 284 | 7 | 0 |
| Documents | 183 / 305 | 5 | 0 |
| Settings | 180 / 275 | 7 | 0 |
| Dashboard | 246 / 357 | 6 | 0 |

No long tasks were observed during any of the 200 measured navigation windows.
Warm script evaluation was zero in every group; first-visit group p95 evaluation
ranged from 0.944 to 7.450ms. This is EvaluateScript time, not all client work.
Warm paint-after-readiness p95 was at most 6.785ms across both inputs; first-visit
p95 was at most 10.382ms. These observations do not show a sustained one-second
main-thread blockage in the measured navigation windows. They do not rule out
rendering issues in other interactions or before instrumentation begins.

Only 8/200 first-observed RSC streams had an observed successful body completion.
Next can cancel streams after consuming needed data. Header arrival is not
complete page data, and the first observed stream is not proven to be the only
critical stream. Do not subtract headers from readiness and call the difference
rendering time. The completed-data-to-paint budget remains unattributed.
Hosted provider call counts are unavailable in this browser harness.

## Decision and next experiment

Both this run and the [isolated empty-account run](ISOLATED-NAVIGATION-2026-10-10.md)
reproduce slow navigation without an observed long-task explanation. Their
different collection times/provider conditions do not isolate the cost of added
data. Differences between runs are not candidate gains or regressions.

Prioritize request/stream attribution and visible loading feedback over a broad
client-fetch rewrite. Finish initial-entry provider counting and precise
interaction/session-mutation coverage before closing 09-01. Then measure the
independent Calendar-read parallelization and loading-boundary candidates
separately under matching conditions. No new cache, region change or application
runtime change is justified by this report alone.

Evidence: ignored `test-results/performance/hosted-populated.json`, inspected
with `scripts/performance/summarize-report.ts`. Credentials, auth state, request
bodies, raw URLs/query strings and user content are not included in this report.
