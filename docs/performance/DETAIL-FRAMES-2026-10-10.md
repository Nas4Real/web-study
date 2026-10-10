# Frame-sampled detail interactions — 2026-10-10

## Scope and environment

40 read-only local production samples, ten per scenario, completed at
`2026-10-10T21:03:55.839Z`. Harness HEAD:
`7b1b53440b9359d71d13cbce24e84ddf9d5113de`, plus the diagnostic-only changes
committed with this report. The reused production build has the unchanged
application candidate from the prior local all-route verification. No application
source changes are part of this experiment.

Chromium 153.0.8010.12, 1440x900, Africa/Tunis, default unthrottled CPU/network,
genuine populated synthetic account (3 subjects, 20 tasks/40 subtasks, 8 series),
local Supabase-provider diagnostics enabled. One profiling process; no tests or
builds during capture. Each repetition loads Calendar/Tasks via full navigation
before opening its detail; the same browser context/auth session is retained.
This is not a same-page cached reopen, guaranteed cold provider or hosted benchmark.

## Results

All four groups complete with both the original assertion-observed upper bound
and the independent page-frame sample. Values below are median / nearest-rank
p95, milliseconds, rounded to one decimal.

| Scenario | Assertion-observed frame | Frame-sampled ready | Following sampled frame | Current-route non-prefetch RSC / POST median |
| --- | --- | --- | --- | --- |
| Session detail open | 1022.8 / 1499.3 | 604.1 / 1147.8 | 609.4 / 1154.8 | 0 / 1 |
| Session read-only close | 41.9 / 43.7 | 9.5 / 11.5 | 25.6 / 28.6 | 0 / 0 |
| Task detail open | 931.6 / 1005.0 | 488.9 / 667.9 | 530.0 / 672.9 | 0 / 1 |
| Task read-only close | 43.5 / 45.9 | 11.0 / 14.2 | 27.8 / 29.8 | 0 / 0 |

Every read-only close has zero captured RSC requests and POSTs, including the
fixed one-second post-readiness observation window. Each open has one POST and
zero current-route non-prefetch RSC requests. One task-open sample also records
a background prefetch (total-RSC p95 1). All prefetch flags resolve.

Paired readiness-to-following-frame gaps have median/p95: session open 6.7/93.4ms,
task open 4.8/78.6ms, session close 15.8/17.1ms, task close 16.7/18.4ms.
These are differences within each sample, not differences between aggregate
medians. The open tails warrant tracing; no long-task/CDP capture was added here.

## Measurement boundaries and verdict

The self-contained diagnostic probe captures the actual click in the page,
then checks the known detail dialog/control at animation frames. Open readiness
requires a visible detail dialog and its enabled Edit/Complete button. Close
readiness requires that dialog to be absent/hidden. The following animation
frame is sampled separately. Timeout stays incomplete/unknown, never zero.
The probe reads DOM and numerical clocks only; it does not modify application
state, read credentials or save DOM text/IDs in reports.

Frame-sampled readiness avoids assertion-polling delay, but is not exact React
commit, paint, INP, complete hydration, database confirmation or whole-dialog
content validation. The existing functional assertions still verify the loaded
synthetic dialog. DOM geometry/style sampling can force layout and contributes
diagnostic overhead; these are not uninstrumented application timings.
Network times retain the harness clock, not the page click
clock, so do not subtract them to infer pure rendering time.

The large gap between assertion and frame samples is measurement overhead,
not an app optimization. Do not compare these local numbers with the earlier
hosted baseline to claim a gain. Detail-open latency remains substantial. This
run supports the already implemented no-refresh read-only-close behavior without
justifying a shared workspace cache or an API migration by itself.

09-01 remains open for session mutations, broader precise interaction coverage,
React/paint attribution and hosted provider counts. 09-03 content non-regression
and 09-04 mutation/cache lifecycle gates also remain open.

## Reproduction and verification

With the genuine-auth local production runner running, set `PERF_ORIGIN` to
`http://localhost:3100`, `PERF_DETAILS_ONLY=1`, `PERF_SAMPLES=10`, then run:

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/profile-interactions.ts
```

Detail-only mode skips Calendar view changes and task mutations; default mode
retains the existing eight scenarios. Version-2 reports add separate optional
sampled metrics; unprobed scenarios keep nulls/empty summaries. A failed run
is not silently treated as successful.

Raw sanitized evidence is archived outside Playwright's replaceable output:
`.performance-artifacts/09-01-local-detail-frames-candidate.json` (ignored).
No credentials, raw bodies, URLs, headers or auth states are committed.

Four probe tests fail first on the missing module and pass after implementation;
they cover actual click/control readiness, close readiness, timeout and replacement
cleanup. Full unit suite/typecheck pass, lint retains its existing modal-frame
warning, and final local production build/whitespace checks pass. Browser runtime
verification is the completed 40-sample real-auth run, not a claimed rerun of the
earlier visual suite. No styles, baselines, auth/provider logic or study data changed.
