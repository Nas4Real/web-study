# Calendar session mutation reconciliation

## Outcome and retained scope

Calendar's successful session mutation callback no longer calls `router.refresh()`.
Edit/delete Server Actions already call `revalidatePath("/calendar")` and
`revalidatePath("/")`; the bundled Next 16.3.8 reference states that a Server
Function updates the currently viewed affected path immediately. Keep those
server calls, affected-series detail-cache removal and dialog dismissal intact.
Dashboard's separate client callback is unchanged and needs its own experiment.
No styling, authentication, business-rule, schema or transport migration.

A real-auth production browser regression fails before/pass after: twenty
control saves each send one additional current-route non-prefetch RSC GET;
twenty candidate saves each send zero. Every save still has one mutation POST.
Visible Day cards and same-page reopened detail forms show the saved location,
and original location/date/start/duration are restored. Retain this candidate
for measured request efficiency, not a stable latency win or release approval.

## Reproduction and environment

Windows, Node 24.18.1, Next 16.3.8 production build, Chromium 153.0.8010.12,
1440×900, Africa/Tunis, localhost:3100. Existing populated synthetic account;
one-time Performance session 2 location only, ten edit/restore cycles per variant.
No fixture authentication, administrative credential, real-user edits, throttling,
concurrent tests/builds/profilers or production deployment. Mobile stays deferred.

Both variants have version-8 diagnostic code above base `a03369f`, using the same
provider preload and guarded save procedure. Control uses unchanged application
code, completed 2026-10-11 11:23:05 UTC. Candidate removes only Calendar's explicit
refresh (plus its explanatory comment), completed 11:28:58 UTC. Both raw JSON
reports name base HEAD, not the uncommitted candidate; this report identifies the
application delta explicitly.

Start the traced server after production build and quality checks. Use the
command/environment in [save provider attribution](SESSION-SAVE-PROVIDERS-2026-10-11.md),
adding `PERF_SESSION_EXPECT_RSC=0`. Optional expected counts accept only `0|1`,
only in guarded local mutation mode. The assertion executes **after all saves
and restoration**, so intentional regression failure cannot skip cleanup.

Control report has `complete=false`, failure stage
`session-reconciliation-request-count`, with all twenty save samples and
`sessionRestored=true`. This is the expected RED assertion, not an interrupted
save, suppressed failure or successful whole-run claim. Candidate is complete
with restoration confirmed and the zero-extra-request assertion passing.

Visible card verification occurs after the timed save's finite observation
window, before opening details on the same page; it does not reload to conceal
stale cache. The timed editor-dismissal/enabled-invoker milestone is unchanged
and is not relabelled as fresh range readiness.

## Results

Each group has ten samples. Median / nearest-rank p95 milliseconds for timings.

| Measurement | Control edit | Candidate edit | Control restore | Candidate restore |
| --- | --- | --- | --- | --- |
| Additional current-route non-prefetch RSC GETs | 1 / 1 | 0 / 0 | 1 / 1 | 0 / 0 |
| Mutation POSTs | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 |
| Sampled dismissal/enabled invoker | 527.40 / 921.40 | 501.50 / 863.90 | 512.30 / 856.50 | 530.05 / 848.70 |
| Pending feedback | 10.85 / 88.40 | 7.35 / 14.60 | 10.90 / 82.20 | 9.45 / 88.90 |
| POST headers from click | 464.79 / 874.60 | 475.43 / 834.34 | 487.90 / 793.30 | 483.80 / 827.03 |
| Headers→sampled readiness, paired | 51.31 / 74.08 | 30.87 / 52.95 | 38.48 / 67.04 | 36.25 / 74.88 |
| POST-attributed provider span | 913.17 / 1468.73 | 795.84 / 1952.85 | 743.33 / 1607.16 | 788.92 / 1811.72 |

Every sample's POST has nine observed provider calls: two profile GETs, one
auth-user GET, one subject GET, four Calendar GETs and one Calendar PATCH. No
observed provider errors; no unknown RSC prefetch flags. The POST span includes
attached page reconciliation, not just the write. The separate control RSC GET
is counted but its provider calls are not separately attributed in this harness;
do not invent a total database-read reduction from the POST-only provider counts.

Preserve every sample, including the candidate's slow first edit and fourth
restore (assertion-observed approximately 1360/1355ms). Candidate edit readiness
median is slightly lower, restore median slightly higher; provider tails are
worse. Single-order local captures and provider variability do not establish a
latency improvement, full content-tail non-regression or hosted benefit. The
retained objective is the deterministic extra-request reduction with fresh data,
not a speed percentage. The finite one-second observation window is not a global
bound on later background activity, and no metric is exact React commit/paint/INP.

## Verification, review and next gate

All 718 unit tests, typecheck and genuine-auth production build pass. Lint has
only the existing modal cleanup warning. All 22 scoped desktop session-edit,
detail and cache browser checks pass, including unchanged visual references;
no retries or snapshot updates. New failed-edit/retry coverage verifies that
rejected input retains the original card and successful retry produces exactly
one updated card with fresh details. Existing tests cover occurrence/series edits,
deletes, failed deletion, focus, warm reopens and delayed-cache invalidation.
Fixture server logs include aborted held requests and runner color warnings;
do not claim universally clean server logs.

Real-auth capture covers one-time location edits/restoration only, not recurring
deletion, Dashboard mutation reconciliation or rapid/out-of-order writes. Existing
Server Action tests independently cover success revalidation for occurrence and
series edit/delete, and no revalidation on failures. Auth/owner checks and cache
ownership are unchanged. The regression guard is local/opt-in; diagnostic data
stays category/numeric, without credentials, raw URLs or payloads.

Ignored archives: `.performance-artifacts/09-04-calendar-reconciliation-control.json`
and `09-04-calendar-reconciliation-candidate.json`, with matching provider JSONL.
The local production server is stopped after capture. No merge or production
deployment; existing dependency advisories remain separate release triage.

Next: verify Dashboard reconciliation separately, then complete actor/cache
lifecycle, rapid/failure mutation coverage, conditional Calendar/Tasks decisions
and hosted release evidence. Story 09-04 and the Epic 09 gates remain open.
