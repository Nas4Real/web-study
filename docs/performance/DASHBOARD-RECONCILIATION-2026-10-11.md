# Dashboard session mutation reconciliation

## Outcome and scope

Dashboard's session-success callback no longer explicitly calls `router.refresh()`.
Successful edit/delete Server Actions already revalidate `/` and `/calendar`.
The bundled Next 16.3.8 `revalidatePath` reference states that Server Functions
immediately update the viewed affected path. Retain that server reconciliation,
affected-series detail-cache removal and dialog dismissal. Dashboard's separate
task-mutation refresh is unchanged. No UI, auth, schema or transport changes.

All twenty control saves send one extra current-route non-prefetch RSC GET;
all twenty candidate saves send zero. Each still sends one mutation POST.
Visible Today's Classes cards and same-page reopened editors show fresh location
data, and original synthetic location/date/start/duration are restored. Retain
for deterministic request efficiency, not a stable latency or hosted speedup.

## Reproduction and environment

Windows, Node 24.18.1, Next 16.3.8 production, Chromium 153.0.8010.12,
1440×900, Africa/Tunis, localhost:3100. Existing populated synthetic account and
one-time Performance session 2, already visible today. Ten location edit/restore
cycles per variant. No real-user writes, fixture auth, admin credentials,
throttling, concurrent tests/builds/profilers, mobile work or production deploy.

Both reports use version-9 diagnostic tooling above base `3b2c169`. Control
completed 2026-10-11 11:40:55 UTC; candidate completed 11:46:42 UTC. JSON reports
name base HEAD; candidate app delta is the working-tree Dashboard session refresh
removal, not a separate commit at capture time. Prior Calendar changes remain.

Build/start with `scripts/performance/run-production.mjs` and local provider
preload as documented in [save attribution](SESSION-SAVE-PROVIDERS-2026-10-11.md).
Run `profile-interactions.ts` with the same guarded local mutation settings,
adding `PERF_SESSION_SURFACE=dashboard` and `PERF_SESSION_EXPECT_RSC=0`.
The surface flag accepts only Calendar/Dashboard in local guarded mutation mode;
unset preserves Calendar behavior. Dashboard setup verifies the session's date
is today in Africa/Tunis before writes; never move a session to manufacture coverage.

The zero-extra-RSC assertion runs after all restoration checks. Control is
intentionally RED (`complete=false`, `session-reconciliation-request-count`),
with twenty captured saves and `sessionRestored=true`; candidate is complete,
restored and GREEN. Visible-card checks precede same-page detail reopening and
do not reload to conceal stale data. Their time is not the timed dismissal metric.

## Results

Ten samples per group; timings are median / nearest-rank p95 milliseconds.

| Measurement | Control edit | Candidate edit | Control restore | Candidate restore |
| --- | --- | --- | --- | --- |
| Extra current-route non-prefetch RSC GETs | 1 / 1 | 0 / 0 | 1 / 1 | 0 / 0 |
| All observed RSC GETs | 9 / 9 | 8 / 8 | 9 / 9 | 8 / 8 |
| Mutation POSTs | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| Sampled dismissal/enabled invoker | 697.50 / 2276.00 | 596.65 / 680.20 | 557.45 / 947.70 | 597.95 / 823.70 |
| POST headers from click | 660.88 / 2185.89 | 539.49 / 608.14 | 498.36 / 933.04 | 548.49 / 801.90 |
| POST-attributed provider span | 1163.11 / 2573.42 | 947.33 / 1075.88 | 937.17 / 1933.76 | 928.32 / 1174.76 |

Eight prefetch-flagged RSC requests remain in every save observation window in
both variants. Do not equate zero extra current-page reconciliation with zero
background traffic or claim this fixes prefetch costs. No unknown prefetch flags
or observed attributed provider errors. Candidate POSTs each have ten observed
provider calls: profile GET×2, Calendar GET×4/PATCH×1, auth-user GET×1,
task GET×1 and subject GET×1. Control has ten calls in nineteen samples; one
restore has nine, without an attributed subject call. Preserve that discrepancy.
The action span includes attached Dashboard rerender, not pure write time.
The removed separate RSC's provider work is not attributed here; do not infer a
total database-read saving from POST-only counts.

Timing is mixed: candidate edit median improves, restore median worsens. Retain
all outliers, including the control's final edit (sampled 2276ms, assertion-observed
2465ms). Single-order local captures and provider variation do not establish a
stable latency improvement or content-tail/hosted non-regression. The finite
one-second network window is not a global request bound. Frame-sampled DOM
milestones are not exact React commit, paint or INP.

## Verification and remaining gates

All 719 units, typecheck and genuine-auth production build pass. Lint reports
only the existing modal cleanup warning. All 25 scoped desktop browser/visual
checks pass without retries or snapshot updates. New Dashboard failure/retry
coverage retains the original card on rejected input and produces one updated
card/fresh details after retry. New Dashboard occurrence/series deletion checks
verify immediate card removal and correct Calendar sibling preservation/removal.
Existing checks cover delayed-cache invalidation, warm reopens, focus and edits.
Fixture logs include aborted held requests and runner color warnings; no claim
of universally clean logs. No styling or authorization rules changed.

Ignored archives are `.performance-artifacts/09-04-dashboard-reconciliation-{control,candidate}.json`
and matching `-providers.jsonl`. No server is listening on port 3100 after capture.
No merge or production deployment; mobile and dependency advisory triage deferred.
Real-auth capture covers one-time location saves only, not recurring deletion.
Actor/sign-out lifecycle, rapid/out-of-order mutations, conditional Calendar/Tasks
decisions and hosted release gates remain open. This does not close story 09-04.
