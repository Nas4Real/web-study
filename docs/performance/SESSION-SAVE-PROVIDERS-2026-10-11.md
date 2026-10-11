# Session-save provider attribution and equivalent-instant fix

## Outcome

Location-only edits incorrectly treated differently serialized but equivalent
start times as schedule rewrites. That performed an unnecessary exception read
and rejected content-only edits when recurring exceptions existed. Two regression
cases fail before/pass after reusing the existing instant-based `scheduleMatches`
helper. A third case confirms genuinely changed starts remain rejected with
exceptions. Owner checks, the consistency reread, and repository schedule-guarded
writes remain unchanged; no reconciliation or visual changes are bundled in.

An isolated real-auth browser repeat confirms one fewer pre-write Calendar GET
in all 20 saves. This is a retained correctness fix with measured read reduction,
not a controlled hosted latency improvement or completion of Story 09-04.

## Environment and procedure

Windows, Node 24.18.1, Chromium 153.0.8010.12, Next 16.3.8 production build,
localhost:3100, 1440×900, Africa/Tunis browser timezone. Each run has ten location
edit/restore cycles on existing synthetic one-time Performance session 2 only.
Both verify fresh same-page detail and unchanged date/start/duration, and restore
the original location. No fixture authentication, administrative key, concurrent
tests/builds/profilers or network/CPU throttling. Mobile remains deferred.

Control application `c10c645`, completed 2026-10-11 11:03:19 UTC. Fixed application
`8ff3d26`, completed 11:13:12 UTC. Both use the same working diagnostic patch:
version-7 reports with explicit local `PERF_SESSION_PROVIDER=true`, exact action
POST/request-ID/log-boundary attribution, and allowlisted provider methods.
The preload is never imported by application code and logs categories/numbers
only, not URLs, payloads, user identifiers or credentials.

Finish quality checks and production build first, start the traced server with
`PERF_PROVIDER_TIMING=true`, then run the existing interaction profiler with:

```text
PERF_ORIGIN=http://localhost:3100
PERF_SESSION_MUTATIONS=1
PERF_SESSION_PROVIDER=true
PERF_DETAILS_ONLY=0
PERF_DETAIL_REOPEN=0
PERF_CORRELATE_PROVIDER=false
PERF_SAMPLES=10
rtk proxy node --env-file=.env.performance.local scripts/performance/profile-interactions.ts
```

## Requests and source attribution

All 40 control/fixed saves have one POST, one current-route non-prefetch RSC GET,
one attributed Calendar PATCH, zero observed provider errors, and successful
restoration. Attribution covers provider calls in the POST, including its attached
page rerender; the separate RSC GET is counted but not provider-attributed here.

Before the PATCH, control has one profile GET and three Calendar GETs; fixed has
the same profile GET and two Calendar GETs. Source identifies the unchanged owned
master read for timezone conversion, service consistency reread, and removed
false-positive exception lookup. The form produces `.000Z`, while provider rows
can contain `+00:00`; string inequality is not an instant change.

Control records ten calls in 19 samples and nine in one edit sample; fixed records
nine in all 20. Do not claim every control captured ten calls. Median Calendar
counts are six→five (including PATCH), with profile two, auth-user one and subject
one unchanged. The finite observation window can omit later rerender work; early
pre-write Calendar counts are three→two in every sample. No cache/refresh removal
is justified solely by observing POST plus RSC GET.

## Timings

Median / nearest-rank p95 milliseconds; n=10 per group except control edit body
completion, n=9. Provider intervals are measured separately from browser clocks.
First-provider-start→PATCH-end is not pure write latency; PATCH-end→last-observed
provider-end includes attached rerender work and is not exact client rendering.

| Metric | Control edit | Fixed edit | Control restore | Fixed restore |
| --- | --- | --- | --- | --- |
| First provider start→PATCH end | 627.48 / 2769.79 | 346.96 / 464.82 | 571.68 / 1101.06 | 338.95 / 438.41 |
| PATCH end→last observed provider end | 403.25 / 1068.78 | 272.89 / 430.54 | 510.18 / 678.25 | 262.29 / 278.85 |
| Full observed provider span | 1081.24 / 3838.57 | 628.47 / 895.36 | 1135.68 / 1683.73 | 602.78 / 700.55 |
| Sampled editor dismissal/enabled invoker | 684.20 / 2814.00 | 409.95 / 538.40 | 657.25 / 1211.40 | 427.90 / 521.00 |
| Pending feedback | 9.90 / 85.30 | 9.00 / 50.70 | 8.45 / 10.70 | 11.75 / 76.70 |
| POST headers from click | 653.07 / 2793.33 | 373.76 / 491.96 | 603.77 / 1133.80 | 365.80 / 464.52 |
| Headers→sampled readiness, paired | 49.10 / 83.71 | 46.93 / 62.22 | 53.55 / 77.60 | 50.42 / 83.59 |
| POST body completion | 1062.29 / 1408.78 | 647.67 / 919.56 | 1163.24 / 1721.20 | 625.10 / 722.40 |

Retain the slow control edit (2814ms sampled readiness); do not remove outliers.
All 39 known POST bodies finish after sampled readiness; one control completion
remains unknown. The save is usable before full streamed-body completion. These
milestones are not React commit, paint, INP, full range reconciliation or proof
that every control is hydrated.

Fixed timings are lower in this repeat, but even post-write intervals change
substantially. Different capture time, provider/run variability, a single order
and synchronous trace overhead prevent assigning the entire latency delta to
one removed read. Retain the fix for correctness and deterministic read counts;
do not claim a stable latency percentage or a hosted/production improvement.

## Verification and next gate

All 717 unit tests, typecheck and final genuine-auth production build pass.
Lint has zero errors and the existing `modal-frame.tsx:103` warning. All 21 scoped
desktop session-edit/detail/cache browser checks pass, including unchanged visual
references; no retries or snapshot updates. The fixture browser server reports
an aborted request during delayed-cache testing; do not label that server log
universally clean. The separate real-auth mutation capture restores the synthetic
session with unchanged invariants and no observed provider errors. No real-user
records changed, database migration, dependency upgrade, merge or production
deployment. Local server stopped after capture.

Review: validated merged input precedes comparison; timezone/recurrence remain
strictly compared; actual changes still check exceptions; independent owner and
concurrent-edit protections remain. Diagnostic opt-in is local/mutation-only,
methods allowlisted, old logs excluded, missing attribution fails rather than
inventing zero work. Existing dependency advisories remain separate release work.

Ignored archives: `.performance-artifacts/09-04-session-mutation-providers.json`
and `09-04-session-mutation-providers-fixed.json`, with matching sanitized
provider-call JSONL files. Next: investigate action-attached rerender versus
explicit refresh only with a focused reconciliation experiment, then finish
failure/actor/cache lifecycle, conditional Calendar/Tasks decisions and hosted
release gates. No whole-story gate is closed by this slice.
