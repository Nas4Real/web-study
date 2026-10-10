# Local initial-entry provider attribution — 2026-10-10

100 production-build initial entries completed: ten per page for each dedicated
test account. Empty completed at `2026-10-10T19:05:38.391Z`; populated at
`2026-10-10T19:06:42.729Z`. Runtime source: `f5e366c`; the initial-entry harness
and timeline reducer were working-tree additions. No auth/read-path optimization
was present. Existing session-close/mobile-sizing candidates were present.

## Conditions and boundaries

Local production server on port 3100, genuine cookie sign-in, hosted Supabase,
Chromium 153.0.8010.12, 1440×900, Africa/Tunis, unthrottled CPU/network. Fresh
browser context per entry, auth state only in memory. Both runs were sequential
on the same traced server, with no builds/tests/concurrent benchmarks. Ordinary
OS/provider activity and function/database warmth are not fully controlled.

Each document's numeric `x-perf-request` ID correlates only newly appended
provider rows with the same ID/allowlisted route. Background prefetch IDs and
previous log rows are excluded. Missing attribution fails incomplete, not zero.
The preload observes Node Undici calls, not all possible proxy/auth work in other
contexts. Synchronous diagnostic output adds overhead. This is local provider
evidence, not hosted Vercel latency or an uninstrumented performance gain.

## Call counts

Every measured document has exactly **one profile and one auth-user read**.
No duplicate outbound read was observed. This does not prove source helpers run
only once or justify removing independent authorization checks.

| Page | Empty total calls | Populated total calls | Other categories |
| --- | ---: | ---: | --- |
| Tasks | 4 | 4 | 1 subject, 1 task |
| Calendar | 4 | 5 | 1 subject; 1 empty / 2 populated calendar |
| Documents | 6 | 6 | 1 subject, 3 document |
| Settings | 3 | 3 | 1 subject |
| Dashboard | 5 | 6 | 1 subject, 1 task; 1 empty / 2 populated calendar |

Counts are identical in all ten samples per group. All traced calls succeeded.
The extra populated calendar call is not itself evidence of duplication.

## Timings

Milliseconds, rounded median / nearest-rank p95, ten samples per group.
Provider span runs from first call start to last call end; the saved busy metric
uses interval union instead of summing overlapping calls.

| Page | Empty provider span | Populated provider span | Empty observed-ready | Populated observed-ready |
| --- | ---: | ---: | ---: | ---: |
| Tasks | 224 / 297 | 197 / 469 | 415 / 534 | 402 / 657 |
| Calendar | 291 / 477 | 387 / 566 | 465 / 652 | 561 / 725 |
| Documents | 237 / 411 | 263 / 295 | 433 / 643 | 440 / 496 |
| Settings | 252 / 679 | 198 / 737 | 431 / 846 | 368 / 912 |
| Dashboard | 244 / 400 | 288 / 655 | 428 / 575 | 474 / 837 |

Observed-ready includes document/asset/client readiness and automation detection
delay after DOMContentLoaded. It is not exact paint, React commit, INP or proof
of every control's hydration. Do not subtract provider span and call the remainder
client rendering. Document headers are saved separately, not full response data.

## Calendar waterfall and decision

All 20 Calendar samples start occurrence calls after the subject call ends.
Subject duration median/p95: empty **96/193ms**, populated **79/158ms**. The
subsequent gap to the first calendar call is **4/8ms** and **4/5ms**, respectively.
`loadCalendarPageData` source matches this sequence. After actor/timezone/window
resolution, these reads can be independent; projection still requires both.
This supports the scoped 09-02 parallel-read experiment, not a guaranteed gain.

Defer speculative auth/profile memoization: measured sibling and initial-entry
scopes lack duplicate outbound reads. Preserve authorization semantics. Prioritize
Calendar independent reads and loading feedback, each measured separately.

09-01 remains in-progress: precise interaction/React attribution, session-mutation
coverage and hosted provider attribution remain incomplete. Local evidence does
not establish the sole cause of the user's delay.

Ignored evidence: `test-results/performance/local-initial-empty.json` and
`local-initial-populated.json`. Six metric/privacy tests pass, including new
overlap/unknown/malformed tests that failed before implementation. Full units,
typecheck and production build pass; lint retains the existing modal-ref warning.
Smoke and all 100 real-auth entries succeed. No application source, visuals,
credentials or schema changed in this diagnostic slice.
