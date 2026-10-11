# Session mutation diagnostic and timezone correction

## Outcome

Local genuine-auth location edits exposed a correctness bug, not a performance
optimization. The editor converted timestamps and recurrence dates using the
profile timezone; the server interpreted submitted civil values in the owned
series timezone. A location-only edit could therefore move a session in time.

The editor now uses `session.timezone` for dates, start time, recurrence and scope
summary. Calendar/detail display still uses the profile timezone. Recurrence copy
identifies the session timezone when editing; creation copy stays unchanged.
Server ownership reads, validation, auth and mutation reconciliation are unchanged.

## Reproduction and recovery

The first interrupted local run used only the existing populated synthetic user
and one-time `Performance session 2`. It measured two writes before verification
failed. Original location restoration succeeded, but timestamp restoration had
not been checked: the expected 09:00 UTC start became 07:00 UTC after both writes.
Do not treat that attempt as a valid baseline or full-record restoration.

Three component regressions failed before the fix and pass afterward: series and
occurrence civil dates/times across midnight, and recurrence UNTIL date conversion
when profile UTC differs from series Africa/Tunis. The known synthetic record was
recovered through the corrected authenticated editor to 10:00 Africa/Tunis
(09:00 UTC). Its title, date, duration, empty location, one-time recurrence and
synthetic note were verified before and afterward. No real-user records changed.
The attempted authenticated API lookup returned local 503 and made no writes;
API configuration/provider verification is separate from this diagnostic.

## Completed local capture

Windows, Node 24.18.1, Next 16.3.8 production build, Chromium 153.0.8010.12,
1440×900, `http://localhost:3100`, populated synthetic account. Capture began
2026-10-11 10:38 UTC on working-tree changes above base `141a1e3` (not that
unchanged commit). Provider tracing disabled. No builds/tests/other profilers ran
alongside capture. Ten edit/restore cycles produced 20 samples.

| Assertion-observed save frame | Samples | Median | p95 |
| --- | --- | --- | --- |
| Temporary location saved | 10 | 907.05ms | 1402.40ms |
| Original location restored | 10 | 914.50ms | 1924.10ms |

Each measured write has one POST and one current-route non-prefetch RSC in its
one-second post-readiness observation window. Total RSC count is ten per sample,
including shell prefetch traffic; that is not ten duplicate reconciliations.
Every same-page detail reopen verifies location, date, start time and duration.
All cycles finish restored. Raw sanitized reports remain ignored in
`.performance-artifacts/09-04-session-mutations-attempt-1.json` and
`.performance-artifacts/09-04-session-mutations-fixed.json`.

These times are assertion-observed upper bounds, not exact paint, React commit,
INP, provider spans or database commit timestamps. There is no comparable valid
pre-fix run and no speedup/hosted claim. Recurring mutations, failures/races,
account switching, precise interaction timing and hosted release remain open.
Mobile stays user-deferred. This slice does not complete Story 09-04 or Epic 09.

## Verification and review

All 704 unit tests pass, including 13 profiling safeguard tests and the three
timezone regressions. Typecheck and the final genuine-auth production build pass.
Lint has zero errors and the pre-existing modal ref-cleanup warning. All 21
desktop Calendar/session checks pass: recurrence scopes, one-time edits/deletes,
effective occurrences/sibling isolation, delayed fresh-detail reads, focus and
unchanged scope/edit/delete/detail screenshots. No snapshot updates. Deliberately
held/cancelled E2E responses logged two server `ECONNRESET`/aborted messages; the
corresponding browser assertions passed. Do not call the test-server logs clean.

Review covers correctness (matching server conversion), minimality (no handler
or business-rule rewrite), architecture (timezone from existing DTO), security
(unchanged ownership/auth, local synthetic-only tooling), and performance
(no new application reads or cache policy). Existing dependency advisories and
the full hosted/failure/actor-switching release gates are not resolved here.

## Repeat safely

Finish the production build first, start the existing local production runner
with provider tracing disabled, then use the ignored credential file:

```powershell
$env:PERF_ORIGIN='http://localhost:3100'
$env:PERF_SESSION_MUTATIONS='1'
$env:PERF_DETAILS_ONLY='0'
$env:PERF_DETAIL_REOPEN='0'
$env:PERF_CORRELATE_PROVIDER='false'
$env:PERF_SAMPLES='10'
rtk proxy node --env-file=.env.performance.local scripts/performance/profile-interactions.ts
```

Mutation mode is explicit, local-only and mutually exclusive with detail-only,
warm-reopen/provider modes. It skips unrelated task mutations. Restoration runs
in `finally`, verifies the original form values, and records the first failed
stage separately from cleanup. Archive reports before running Playwright, which
clears `test-results`. Credentials, raw responses and browser auth state are never
committed. The narrow recovery script refuses unknown timestamps/content and is
not a general fixture reset tool.
