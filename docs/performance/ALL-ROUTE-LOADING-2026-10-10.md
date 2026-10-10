# All-route loading verification — 2026-10-10

## Scope and environment

Story 09-03 functional verification, not a latency comparison. Ten sequential
genuine-auth local production scenarios cover five destinations with desktop
sidebar (1440x900) and keyboard navigation search (320x812), reduced motion and
Africa/Tunis timezone. The dedicated populated synthetic account is used; no
real-user data or file bytes are modified.

Application HEAD: `e6c5b958e1e1b9f367cc6500bba309b0b7078dd1`, with the
diagnostic-only all-route extension subsequently committed alongside this report.
Chromium: `153.0.8010.12`; report timestamps: 20:43:06–20:45:17 UTC.
The local diagnostic provider preload is enabled in both input modes.

## Functional results

Every scenario verifies the destination-labelled fallback while its non-prefetch
RSC request is held, absence of the destination's real readiness control during
that hold, safe navigation to another destination, eventual destination content,
back/forward history and a fresh anonymous-entry redirect to app sign-in.
Search scenarios additionally verify retained focus and no horizontal overflow.

| Destination | Desktop | Search | Initial desktop/search prefetch attempts | Desktop/search destination prefetch observed |
| --- | --- | --- | --- | --- |
| Dashboard | Pass | Pass | 9 / 2 | Yes / Yes |
| Tasks | Pass | Pass | 9 / 1 | Yes / No |
| Calendar | Pass | Pass | 9 / 2 | Yes / No |
| Documents | Pass | Pass | 9 / 2 | Yes / No |
| Settings | Pass | Pass | 9 / 2 | Yes / No |

Search warms its destination with a prior visit before holding the subsequent
request. These results do not show hidden mobile sidebar links prefetching every
route. Desktop Settings uses the existing secondary navigation. Manually inspected
Dashboard desktop and Settings mobile screenshots show the expected skeleton,
retained shell and mobile focus outline; no completed-screen styling changed.

## Provider attribution

Each observed completed-navigation phase has one non-prefetch destination RSC
with the following correlated completed provider-call categories in both modes:

| Destination | Provider categories/counts |
| --- | --- |
| Dashboard | profile 1, subject 1, task 1, calendar 2 |
| Tasks | profile 1, subject 1, task 1 |
| Calendar | profile 1, subject 1, calendar 2 |
| Documents | profile 1, subject 1, document 3 |
| Settings | profile 1, subject 1, auth-user 1 |

Initial source documents each have one profile and one auth-user call, plus
their page reads. No completed provider rows are attributed to observed prefetch
requests. Missing IDs/rows do not prove zero in-flight or unobserved provider work.
The prefetch counts are finite initial-entry observation windows (three seconds
after readiness), not a proven global request bound.

The report's legacy `cancelled` flag means any Playwright `requestfailed`, not a
classified intentional abort. All destination streams in completed-navigation
phases report that flag despite UI readiness succeeding. Do not equate successful
UI completion with completed stream bodies or infer pure rendering time.

## Hosted status and remaining gates

The GitHub-triggered protected branch preview at application HEAD exists:
https://web-study-hnb1od8u3-nas-9c1f.vercel.app.
Codex's in-app browser reaches Web Study sign-in, proving its Vercel access;
the isolated profiler browser instead encounters Vercel login. Neither result
establishes authenticated hosted navigation. The existing verified synthetic
accounts need no duplicate creation. Hosted sign-in, smoke checks and comparable
timing remain pending; no protection changes, token/cookie export, merge or
production deployment were performed.

One functional sample per scenario is not a ten-sample timing matrix or p95
estimate. The content-tail non-regression gate from the correlated Calendar
repeat remains open. Initial-layout authentication is outside the loading boundary.
Story 09-03 remains in progress.

## Reproduction and quality checks

Start the genuine-auth local production runner with provider timing enabled.
For each allowlisted `PERF_DESTINATION=Dashboard|Tasks|Calendar|Documents|Settings`
and `PERF_INPUT=sidebar|search`, set `PERF_EXPECT_SHELL=1` and run:

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/check-shell-prefetch.mjs
```

Version-2 JSON reports and screenshots remain ignored under
`.performance-artifacts/`; never commit credentials or browser auth states.
The six scenario-selection tests cover all mappings and unknown-label rejection.
Full unit suite, typecheck and lint pass (lint retains its existing modal-frame
effect-cleanup warning). Prior 51 browser/visual checks belong to the boundary
slice and are not claimed as rerun here. Final genuine-auth local production build
and whitespace checks also pass.
