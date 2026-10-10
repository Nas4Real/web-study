# Navigation profiling (Epic 09)

This is diagnostic tooling, not an application optimization. Story 09-01 remains
in progress until the full interaction matrix and controlled repeats are complete.
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
and reports that possibility. No sessions or real-user data are changed.

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

## Initial-entry provider attribution

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
attribution is complete (100 samples). Precise interaction readiness/React timing
and session-mutation coverage remain pending. Regions are recorded; hosted provider call counts remain
unavailable. Do not mark 09-01 complete based on sidebar timing alone.
