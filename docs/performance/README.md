# Navigation profiling (Epic 09)

As of 2026-10-11, remaining performance work is **deferred by user decision**.
Verified implementation and diagnostic evidence are preserved on
`codex/navigation-optimization-plan`; no further optimization is active. Stories
09-01 through 09-07 are not marked complete. See
[the retained work and resume checklist](DEFERRED-WORK-2026-10-11.md).
The instructions/results below describe historical work and how to resume,
not a request to run more profiling now. Pushing this branch is not a production
release; basic critical-flow verification is still required before deployment.

The tooling itself is diagnostic, not an application optimization. Story 09-01
is incomplete until the full interaction matrix and controlled repeats are complete.
No new design, authentication bypass, schema migration or production logging is added.

See the [exploratory baseline](BASELINE-2026-10-10.md),
[isolated empty navigation](ISOLATED-NAVIGATION-2026-10-10.md),
[isolated populated navigation](ISOLATED-POPULATED-NAVIGATION-2026-10-10.md) and
[experiment ledger](EXPERIMENTS.md) before proposing optimizations.

## Repeat a run

Use Node 24 and the committed dependencies. Credentials live in ignored
`.env.performance.local`; only dedicated `codex.perf.*` accounts are accepted.
Keep credentials, browser storage states, raw traces and response bodies out of Git.

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/profile-navigation.ts
```

Optional environment variables: `PERF_ORIGIN`, `PERF_DATASET=empty|populated`,
`PERF_SAMPLES` (default 10), `PERF_DESTINATIONS` (comma-separated route labels),
`PERF_MODES` (comma-separated `first-visit,warm`, defaults to both),
and `PERF_DEPLOYED_COMMIT`. Prefer setting these in the ignored environment file.
Use a single profiling process on an otherwise idle machine for comparison runs.
Do not run builds or the test suite alongside a controlled baseline/candidate run.

For local production, configure `.env.performance-server.local` with the real
public Supabase URL/key and `NEXT_PUBLIC_APP_ORIGIN=http://localhost:3100`.
No administrative key or fixture-auth setting is needed.

```text
rtk err node scripts/performance/run-production.mjs build
rtk proxy node scripts/performance/run-production.mjs start
```

Setting `PERF_PROVIDER_TIMING=true` in that server environment enables an explicitly
local-only diagnostic preload. It assigns numeric request IDs and records outbound
Supabase call categories/times, not credentials, raw paths, queries or bodies.
It is never imported by application code. Its synchronous output adds small overhead;
use it to investigate call counts/waterfalls, not to claim an uninstrumented latency.

The additive `populate-test-account.ts` script uses normal authenticated APIs for
the populated test account. It creates 3 subjects, 20 tasks with 40 subtasks and
8 session series (one weekly). R2 stays disconnected and there are no file bytes.
Chapter creation is excluded after an observed hosted 503; investigate separately.

## Measurement boundaries

- Desktop sidebar: 1440x900. Search: 375x812, because the approved current sidebar
  exposes search only in its mobile header. Do not compare their totals as a device benchmark.
- First visit means a fresh browser context with a genuine cookie session, not
  a guaranteed cold Vercel function, database, OS/browser binary or internet cache.
- Warm means visiting the destination and returning to the source in the same
  context. A warm route may still perform a fresh RSC request.
- Start is the actual click/Enter event. Feedback is sampled at animation frames
  from selected navigation/loading/content state. DOM readiness uses existing
  route controls; the following double animation frame is a content-frame proxy,
  not proof every control is hydrated or a React Profiler commit timestamp.
- CDP captures real Paint events after DOM readiness. They are browser paints,
  not an assertion that every pixel belongs to the destination.
- Network fields distinguish headers, first/last observed bytes, completed body
  and cancellation. Missing completed bodies stay missing. Next may cancel a
  stream after consuming the needed data. Headers are not complete page data.
- JavaScript evaluation and long tasks are collected separately. Clock mapping
  between page/CDP is sampled, so allow a few milliseconds of alignment error.
- Prefetch can start before capture or target another route. The first observed
  RSC is descriptive, not guaranteed to be the only critical response.

JSON reports and provider events remain under ignored `test-results/performance/`.
Playwright replaces `test-results` when running browser tests. Archive comparison
reports in ignored `.performance-artifacts/` before invoking it; never commit
raw profiling artifacts or auth state. The Calendar parallel-read comparison
uses this archive; see [experiment results](CALENDAR-PARALLEL-READS-2026-10-10.md).
The narrow pending-feedback comparison also uses the archive; see
[navigation feedback](NAVIGATION-FEEDBACK-2026-10-10.md). The profiler detects
visible destination-specific shell/search pending status in addition to the
existing active-link/content signals; it does not equate status with content.
Older reports' working JSON files may already have been overwritten or cleared;
their committed aggregates refer to the capture times recorded in those reports.
Only sanitized aggregates are promoted into documentation using nearest-rank p95.
`summarize-report.ts` reads the generated reports without printing raw sample data.

The [workspace loading verification](WORKSPACE-LOADING-2026-10-10.md) documents
the local production fallback, held-response/interruption and prefetch checks.
The profiler now records an optional destination-specific `shellFeedbackMs`
milestone and `shellSamples`; older reports without it did not measure it.
The shell milestone is separate from existing pending feedback and content.
Default Link prefetch remains unchanged; actual-content non-regression is open.

The [all-route loading verification](ALL-ROUTE-LOADING-2026-10-10.md) covers five
destinations with desktop sidebar and 320px keyboard search (ten functional
scenarios), including interruption/history and anonymous entry. Repeat the local
shell diagnostic with `PERF_EXPECT_SHELL=1`, `PERF_INPUT=sidebar|search` and
`PERF_DESTINATION=Dashboard|Tasks|Calendar|Documents|Settings`. Mobile search warms
the destination first; it is not evidence of hidden-sidebar prefetch. Hosted
[signed-in smoke checks](HOSTED-LOADING-SMOKE-2026-10-10.md) now pass in Codex's
authorized in-app browser for all five routes at desktop/320px, including history
and mobile competing navigation. Controlled hosted timing, global request bounds
and content non-regression remain open; this smoke check is not a benchmark.

The [correlated content repeat](LOADING-CONTENT-ATTRIBUTION-2026-10-10.md)
adds optional `PERF_CORRELATE_PROVIDER=true` for local production only. Start
the traced server first. It excludes pre-run log rows and fails incomplete when
a single destination RSC or its completed provider attribution is missing.
Reports separate provider span, headers-to-readiness and readiness-to-frame;
none is an exact client-rendering measurement. Both variants must use the same
diagnostic patch. Actual-content and hosted gates remain open after the repeat.

## Interaction checks

Run `profile-interactions.ts` with the same ignored credential environment after
other profiling/test/build processes finish. It accepts only the dedicated
populated test user and the same approved origins. It measures ten repetitions
by default of Calendar day-to-week and next-week changes, task/session detail
opening and read-only closing, and task completion followed by reopening.
It modifies only synthetic task 1; an interrupted/failed run can leave it completed
and reports that possibility. Default mode does not change sessions or real-user data.

The opt-in `PERF_SESSION_MUTATIONS=1` mode is local-only and exclusive of the
read-only/warm/detail-provider modes. It edits and restores only synthetic one-time
Performance session 2's location; same-page reopens verify date/start/duration
remain unchanged as well. Restoration runs in finally, and reports retain the
original failure stage. See [session mutations and timezone fix](SESSION-MUTATIONS-2026-10-11.md)
for the interrupted attempt, synthetic recovery, completed 20-sample run and
repeat commands. This covers one-time location saves, not the entire mutation matrix.

The [frame-sampled save follow-up](SESSION-MUTATION-FRAMES-2026-10-11.md) separates
pending feedback, editor dismissal/enabled invoker and the following frame from
assertion polling. Version-6 reports include numeric click-relative request
headers/completion and `mutationMilestones`; missing bodies stay unknown. Twenty
samples complete with unchanged session invariants. Useful streamed data arrives
before full response completion; header-to-ready is not exact client-render time.
This is diagnostic evidence, not a new app optimization or whole-story completion.

The [provider-attributed save repeat](SESSION-SAVE-PROVIDERS-2026-10-11.md)
adds `PERF_SESSION_PROVIDER=true` to guarded local mutation mode only. Version-7
reports retain allowlisted methods and exact POST provider attribution, including
action-attached page rerender work. Equivalent timestamp formats falsely triggered
schedule-rewrite checks; the correctness fix removes one pre-write Calendar GET
in all 20 repeated saves without removing reconciliation or consistency guards.
Timing changes are descriptive, not a stable hosted speedup. Read-only provider
mode remains separate; broader lifecycle and release gates stay open.

The [Calendar reconciliation repeat](CALENDAR-RECONCILIATION-2026-10-11.md)
adds optional `PERF_SESSION_EXPECT_RSC=0|1` in guarded local mutation mode.
Assertions run only after restoration. Visible card and same-page detail
verification remain separate from timed dismissal. Removing Calendar's explicit
post-session refresh reduces extra route requests one→zero in twenty repeated
saves, retaining Server Action revalidation and detail invalidation. Timings are
mixed; no latency/hosted win claim. Dashboard is tested separately below.

The [Dashboard reconciliation repeat](DASHBOARD-RECONCILIATION-2026-10-11.md)
extends version-9 reports with `PERF_SESSION_SURFACE=calendar|dashboard`; an
explicit surface requires guarded local mutation mode, and unset keeps Calendar.
Dashboard requires the existing one-time synthetic session to be visible today;
never move it just to run the benchmark. Twenty saves per variant reduce extra
current-route RSC GETs one→zero, keeping server revalidation, detail invalidation
and task refresh unchanged. Eight background prefetches remain; timings are mixed.
Same-page card/details and original synthetic invariants pass. Actor/rapid and
hosted release gates remain open; mobile deferred.

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/profile-interactions.ts
```

This supplementary harness records a click-to-assertion-observed frame **upper
bound**, not an exact DOM-ready time, React commit, paint, INP or optimistic
feedback metric. Enabled mutation controls are observed after pending work;
the mutation labels do not represent direct database-commit timestamps.
Each scenario also includes one second of network observation after readiness,
excluded from the frame metric. Network times use the harness clock from setup,
not the browser click clock. A session's repeat visits may reuse a query cache;
these are not fresh-context samples. Report all-RSC counts separately from
current-route requests without the non-sensitive prefetch flag. Unknown flags
stay unknown, and a GET count alone does not prove a forced router refresh.
No bodies, raw URLs, query strings, cookies or authorization headers are saved.
Screenshots contain only the dedicated synthetic workspace and remain ignored.

## Cache lifecycle checks

The [cache-lifecycle verification](CACHE-LIFECYCLE-2026-10-11.md) adds four
rapid-subtask fixture checks and a separate read-only genuine-auth local account
switch harness. After starting local production, run:

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/check-account-switching.mjs
```

It uses existing synthetic accounts only, warms Tasks/Calendar/Dashboard details,
signs out/in in one tab, checks empty-account sidebar/history revisits and returns
to populated details. A positive-control rendered-DOM probe retains only a stale-
marker boolean; the final observation is one second, with zero study writes.
The report also preserves startup/harness failures and calendar-date constraints.
No app change or timing gain; cross-tab/auth-loss, other freshness and release
checks remain open.

## Initial-entry provider attribution

The [frame-sampled detail run](DETAIL-FRAMES-2026-10-10.md) adds an opt-in
`PERF_DETAILS_ONLY=1` read-only mode to `profile-interactions.ts`. It measures
task/session open and close with an actual page click, frame-sampled visible
detail/enabled-control readiness and a following frame. Version-2 reports retain
the older assertion-observed upper bound separately. Default mode still runs
all eight original scenarios; unprobed flows do not acquire invented timings.
This is DOM/frame sampling, not exact React commit, paint, INP or hydration.

The [detail provider follow-up](DETAIL-PROVIDERS-2026-10-10.md) adds optional
`PERF_CORRELATE_PROVIDER=true` to local read-only detail mode. Version-3 reports
require one exact fresh action attribution per open and retain sanitized provider
spans/counts separately from browser readiness. Missing attribution fails the run;
close null/empty provider fields are not zero-work evidence. All 20 opens in the
40-sample run have sequential provider reads. Same-page warm reopen, mutation
freshness and hosted attribution remain separate follow-ups, not measured gains.

The [same-page reopen repeat](DETAIL-WARM-REOPEN-2026-10-10.md) adds
`PERF_DETAIL_REOPEN=1` to read-only mode (80 samples with initial/warm visits and
their closes). Warm DOM readiness is 11–14ms median, following frame 83–90ms;
each warm open still performs one fresh POST. Opens now await response/action
attribution separately from readiness rather than truncating slow background
reads or requiring a successfully completed Next stream. No TTL change in this
slice: cached readiness is not freshly revalidated data or exact paint.

The [session cache freshness fix](SESSION-CACHE-FRESHNESS-2026-10-10.md) removes
only an affected series's cached details on successful writes. Four delayed-read
checks pass; read-only cache reuse and existing page reconciliation stay intact.
The 320×720 series-edit screenshot mismatch reproduces without the fix. The user
has now deferred mobile work; retain it as a mobile follow-up, not completed work.
This is correctness work, not a cache latency win or story completion.

The [task first-open experiment](TASK-DETAIL-PARALLEL-READS-2026-10-10.md)
overlaps required profile/timezone with owner task reads after verified auth.
Two local-production comparisons improve ready medians by 28.5%/33.6%, with
three provider calls and one POST unchanged. Eager mutation context and dependent
subject read remain intact; full units/typecheck/build and 11 desktop browser
checks pass. Mobile is deferred. No hosted/deployment or whole-story claim;
the report also records existing build/lint dependency advisories for release triage.


The [session first-open experiment](SESSION-DETAIL-PARALLEL-READS-2026-10-11.md)
is rejected after five controlled runs: overlap is proven, but provider/run
variability and a worse reverse-control tail prevent a stable speedup claim.
The application and candidate-only tests are restored; prior task/Calendar
optimizations remain. Mobile and story/release gates stay open.

With local production and `PERF_PROVIDER_TIMING=true`, run sequentially for
`PERF_DATASET=empty` and `populated` (ten samples per page by default):

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/profile-initial-entry.ts
```

Finish builds/tests first; do not restart the traced server during a run. The
read-only harness is local-only with genuine test-account auth. It correlates
document IDs, excludes old log rows/prefetches, and fails incomplete when traces
are missing. Busy time is interval union; readiness is an observed upper bound,
not exact paint/React/INP. See [initial provider report](INITIAL-PROVIDER-2026-10-10.md).

## Pending to finish 09-01

Empty and populated isolated hosted navigation repeats are complete (200 samples
each). Calendar date/view and task/detail flows have a supplementary 80-sample
assertion-timing report, not exact interaction timing. Local initial-entry/provider
attribution is complete (100 samples). A 40-sample read-only local detail run now
separates frame-sampled readiness from assertion polling; a second 40-sample run
attributes all opens to sequential provider calls. Broader precise
interaction/React timing and session-mutation coverage remain pending.
Regions are recorded; hosted provider call counts remain
unavailable. Do not mark 09-01 complete based on sidebar timing alone.
