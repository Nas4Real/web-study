# Workspace loading boundary: local production verification

## Verdict

Retain the narrow 09-03 loading-feedback candidate for review, not deployment.
The main area shows a destination-labelled skeleton while page data is pending;
the reused shell remains interactive. This is not an actual-content speedup.
Content non-regression, all-route coverage and hosted verification remain open.

The boundary uses existing tokens, has no animation or fake page controls, and
sits below the authenticated workspace layout. It does not cover that layout's
initial authentication/profile wait. Default Link prefetch is unchanged.

## Conditions and artifacts

Control: `edddcea92fcf56c001b48ec40ea3daea2a965bc6`, with existing sidebar/search
pending feedback but no loading boundary. Candidate: that commit plus the
uncommitted loading boundary and profiler milestone. Node 24.18.1, Next 16.3.8,
React 19.3, Chromium 153.0.8010.12; local production on localhost:3100 with genuine
populated profiling-account authentication and local provider diagnostics.
No concurrent build or test job during captures. No fixture auth or live-user
data; credentials and raw artifacts are ignored.

Artifacts under `.performance-artifacts/`:

- `09-03-shell-control.json`: complete desktop control, 20:03:22 UTC.
- `09-03-shell-candidate-sidebar.json`: complete desktop candidate,
  20:10:35 UTC, 1440×900, reduced motion.
- `09-03-shell-candidate-search.json`: complete mobile candidate,
  20:10:15 UTC, 320×812, reduced motion.
- `09-03-loading-before-populated.json`: timing control, 20:04:33 UTC.
- `09-03-loading-after-populated.json`: first candidate, 20:07:09 UTC.
- `09-03-loading-after-repeat-populated.json`: repeat candidate, 20:08:59 UTC.

The control's old `calendarPrefetch` boolean meant a *finished* request; the
current diagnostic means an observed 200 response. Its `cancelled` flag records
any Playwright `requestfailed` event, not a classified cancellation reason.
Compare request rows, not these differently defined booleans. Earlier captures lack the subsequently
added shell milestone; missing fields are not measured zeroes.

## Withheld-response and prefetch checks

Both control and candidate sent ten desktop automatic prefetch attempts across
the same routes in the three-second initial observation window. Calendar
prefetch received 200 responses in both; many streams reported `requestfailed`.
This change does not enable previously absent prefetch. No completed provider
reads were recorded against those prefetch request IDs. This finite window is
not proof of a global request bound or every possible in-flight call.

In both versions, fresh Tasks entry recorded one auth-user, one profile, one
task and one subject call. Candidate desktop showed the cached Calendar fallback
even with its non-prefetch RSC response held; actual Calendar controls were
absent. Control had no main-area busy skeleton. Candidate navigation to Documents
interrupted the stalled Calendar and left no stale loading state.

At 320px, hidden desktop links did not prefetch Calendar. A prior Calendar visit
supplied the fallback for the mobile search check. Search retained focus during
loading, there was no horizontal overflow, and Documents interruption succeeded.
Fresh anonymous Tasks entry redirected to sign-in in both candidate checks.
Desktop/mobile skeleton screenshots were manually inspected. Completed screens
are validated separately, not inferred from these loading screenshots.

## Natural warm Calendar timings

Each run has ten samples per input in fresh contexts with a warm destination;
sidebar is 1440×900 and mobile search is 375×812. Values are milliseconds,
median / nearest-rank p95. These are unthrottled local measurements.

| Input / run | Existing pending feedback | Main loading shell | Content-frame proxy |
| --- | --- | --- | --- |
| Sidebar control | 10.6 / 19.0 | Not measured | 375.5 / 492.4 |
| Sidebar candidate | 10.45 / 18.0 | Not measured | 369.65 / 568.0 |
| Sidebar repeat | 11.15 / 13.2 | 28.8 / 43.2 (10/10) | 401.0 / 470.2 |
| Search control | 2.5 / 9.8 | Not measured | 320.95 / 398.5 |
| Search candidate | 2.6 / 21.7 | Not measured | 398.55 / 521.6 |
| Search repeat | 3.3 / 13.5 | 32.15 / 47.2 (10/10) | 393.1 / 482.5 |

Pending feedback was already fast; the added shell supplies meaningful main-area
feedback within the local 200ms target. Search content median/tail worsened
relative to this control; sidebar variation is mixed. Do not claim content
non-regression, a speedup or a rendering root cause. Repeat attribution and
hosted/all-route checks are required before the story/release gate can close.

Feedback and shell are animation-frame DOM observations, not exact paint or INP.
Content is readiness plus a double-frame proxy, not a precise React commit or
proof of all-control hydration. RSC headers do not mean page data is complete.

## Reproduce

Start the existing local production runner with `PERF_PROVIDER_TIMING=true`.
Set `PERF_EXPECT_SHELL=0|1` and optional `PERF_INPUT=sidebar|search` in the ignored
profiling environment, then run:

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/check-shell-prefetch.mjs
```

The diagnostic uses genuine dedicated-account login, a fixed three-second
observation window, held navigation, interruption and anonymous redirect checks.
It excludes provider log rows predating the run and emits sanitized route/count
metadata only. An incomplete assertion run fails rather than becoming evidence.

## Correctness gates

Six rendering regressions pass (five named routes and unknown-path privacy),
following the initial missing-module failure. All 654 unit tests and typecheck
pass. Lint reports no errors and only the existing modal-focus cleanup warning.
All 33 focused navigation/Foundation/workspace checks pass without retries,
including unchanged completed-screen and dialog screenshots at existing widths.
No snapshots are updated. Deliberately interrupted development streams can log
`The destination stream closed early`; this is not a hosted error finding.
All 18 Calendar data/Session Details checks also pass without retries, including
date/view history, effective occurrence edits/deletes and unchanged responsive
detail snapshots. The local production build and genuine-auth fallback checks
passed before these regression gates; none of these correctness checks closes
the content-performance gate.
The final local production rebuild and staged whitespace check also pass.
