# Isolated hosted navigation repeat — 2026-10-10

The full empty-account repeat completed at `2026-10-10T15:30:21.356Z` with
200 samples: 10 first visits and 10 warm visits for each of five destinations,
using desktop sidebar and mobile search separately. The harness commit is
`0ee23aa`; hosted application source is unchanged at
`739019549566d8ab753011d7a8d60fc70c5d1a71`.

Only one profiling process ran. No builds, tests or other browser benchmarks
ran alongside it. The existing local Next server was idle. This controls our
profiling concurrency, not all operating-system activity or provider latency.
Other browser tabs remained open. Conditions and fixture are otherwise those
in [the exploratory report](BASELINE-2026-10-10.md).

## Warm destination measurements

All values in ms, rounded; ten samples per row/input. Content-frame is the
double-animation-frame proxy, not proof of hydration or exact React commit.

| Destination | Sidebar content median / p95 | Sidebar feedback p95 | Search content median / p95 |
| --- | ---: | ---: | ---: |
| Tasks | 659 / 824 | 793 | 666 / 860 |
| Calendar | 859 / 994 | 966 | 650 / 954 |
| Documents | 625 / 827 | 800 | 533 / 856 |
| Settings | 537 / 710 | 688 | 488 / 686 |
| Dashboard | 677 / 923 | 893 | 633 / 1255 |

The sidebar misses the original 200 ms feedback and 700 ms content p95 targets
for every destination. This is a baseline failure, not permission to lower the
targets. Do not compare mobile search with desktop as a device benchmark.

First-visit sidebar content p95: Tasks 1121, Calendar 1822, Documents 970,
Settings 808, Dashboard 1053. First-visit means fresh browser context, not a cold
Vercel function or database. Do not omit these slower samples.

No >50 ms long tasks were observed in any of the 20 measured groups. Warm-sidebar
Paint after sampled DOM readiness p95 ranges from 4 to 13 ms. These observations
support investigating server/stream arrival and loading feedback first; they do
not categorically rule out rendering delays in unmeasured flows.

Warm-sidebar first-observed RSC headers median: Tasks 259, Calendar 196,
Documents 177, Settings 185, Dashboard 195. Warm-sidebar streams had no observed
successful full-body completion. As in the exploratory batch, cancellation
after consumption means headers are not a complete-data milestone. We cannot
derive a reliable complete-response-to-paint budget from those requests.

## Decision

Keep 09-01 in progress. The isolated repeat confirms that the delay is real,
but does not justify a broad client-fetch rewrite or region move. Finish
populated-account interactions, provider attribution and representative readiness
checks before retaining runtime changes. The differences from the exploratory
batch show meaningful run-to-run variation; candidate gains must beat that noise
under matching conditions.

Raw sanitized evidence: ignored `test-results/performance/hosted-empty.json`.
The original exploratory `empty.json` remains intact. No credentials, auth state,
user content or raw response bodies are included in this document.
