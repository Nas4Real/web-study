# Navigation performance experiment ledger

Keep rejected and inconclusive ideas here so they are not mistaken for wins.
Each retained optimization requires comparable isolated before/after evidence
and green correctness gates. Retained candidates are not merged or deployed to
production. GitHub creates protected branch previews automatically; preview
existence is not evidence that hosted verification passed.

| Date | Experiment / hypothesis | Evidence | Verdict / next step |
| --- | --- | --- | --- |
| 2026-10-10 | Real-auth hosted/local baseline | 400 hosted + 160 local samples; overlapping runs | Exploratory only; repeat in isolation |
| 2026-10-10 | Isolated hosted empty-account repeat | 200 samples; warm-sidebar content p95 710–994 ms | Confirms budget failure; no optimization/gain claim |
| 2026-10-10 | Isolated hosted populated-account repeat | 200 samples; warm-sidebar content p95 792–1255ms; no observed long tasks; warm paint-after-readiness p95 <= 6.785ms | Confirms budget failure with populated data; different capture time means no isolated data-volume attribution or optimization/gain claim |
| 2026-10-10 | Read-only Session Details close | Ten hosted samples: same-route non-prefetch GET median 1; source calls refresh | Narrow 09-04 close/success separation experiment; preserve mutation refresh |
| 2026-10-10 | Separate read-only close from successful session mutations | Same local regression: 1 route GET before → 0 after; Calendar/Dashboard focus and immediate mutation reconciliation pass | Retain candidate for review; no latency/hosted gain claim. All 21 relevant browser checks pass after separately correcting existing mobile Calendar sizing |
| 2026-10-10 | Existing Session Details screenshot height mismatch | DOM geometry: 56px mobile header + 12px gap added above desktop-sized Calendar. Geometry regression fails at 320/768px before; responsive height correction restores 802/1026px document heights and all three unchanged detail snapshots | Retain narrow layout correction; no performance claim, no snapshot updates; desktop height unchanged |
| 2026-10-10 | Duplicate auth/profile reads | Sibling Tasks/Calendar: 1 profile, 0 auth-user. 100 initial documents: exactly 1 profile + 1 auth-user each | Not established in measured local scopes; defer speculative memoization, retain independent auth checks |
| 2026-10-10 | Deployment-region mismatch | Functions Virginia, database Frankfurt; no region change | Candidate; establish provider attribution and scoped experiment first |
| 2026-10-10 | Calendar subject/occurrence reads are sequential | All 20 local initial Calendar documents start occurrence calls after subject end; subject median 79–96ms; source confirms sequence | Supports scoped 09-02 parallel-read experiment; no measured candidate gain yet |
| 2026-10-10 | Parallel independent Calendar reads | Matching 20 local Calendar entries each: provider span median 437→348ms, observed-ready 650→495ms; overlap 0→84ms median; call counts unchanged; both 10-sample candidate batches faster | Retain narrow candidate; full units/typecheck/build and 27 browser/visual checks pass. Controls/provider tails vary; no hosted or whole-epic gain claim |
| 2026-10-10 | Missing loading feedback delays acknowledgement | Hosted warm-sidebar feedback p95 exceeds 200 ms | Pending 09-03 loading-boundary measurement |
| 2026-10-10 | Framework-owned sidebar/search pending feedback | 80 local production samples: both control batches >500ms feedback p95, both candidate batches <26ms; one post-input RSC each; 33 focused browser/visual checks pass | Retain narrow acknowledgement candidate for review, not release. Content tails/non-regression unresolved; loading boundary/all-route/hosted prefetch still pending. See navigation-feedback report |
| 2026-10-10 | Sustained client rendering explains delay | Warm-sidebar Paint after DOM readiness p95 4–25 ms; no long tasks | Not established for navigation; interaction traces pending |
| 2026-10-10 | Workspace loading boundary supplies useful prefetched fallback | Local production held Calendar response: candidate skeleton visible, interruption/mobile focus/anonymous redirect pass. Both desktop variants already send ten prefetch attempts in three seconds; no completed provider reads attributed to those requests. Repeat shell p95 43.2ms sidebar / 47.2ms search | Retain narrow feedback candidate for review, not release. Search content median/tail worse than control; content non-regression/all-route/hosted gates open. See workspace-loading report |
| 2026-10-10 | Loading boundary causes large content/rendering delay | 80 correlated local production warm Calendar samples in candidate/control/control/candidate order. Content medians nearly equal; provider/content correlation 0.989–0.996, same four provider calls and one destination RSC, no long tasks. Candidate content p95 still worse (sidebar 559.7 vs 542.7ms, search 597.1 vs 522.1ms) | Large rendering regression not established; no new product fix. Keep useful feedback candidate under review, not release, and leave content/all-route/hosted gates open. See correlated-content report |
| 2026-10-10 | Loading fallback across every workspace destination | Ten genuine-auth local production checks: five routes × desktop/sidebar or 320px/search; all fallback, interruption, completed-content, history and anonymous-entry assertions pass. Desktop initial prefetch attempts 9 each, search 1–2; correlated destination provider counts recorded | Functional coverage only, not latency/p95 or a global request bound. Search warms the destination first. Hosted authentication and content-tail gates stay open; see all-route-loading report |
| 2026-10-10 | Hosted candidate navigation smoke | Existing verified populated account signs into protected preview in the authorized in-app browser; all five desktop/sidebar and 320px/search destinations load. Correct mobile loading labels, focus/no page overflow, history and competing navigation; no captured warning/error logs | Smoke verified, not a controlled latency/p95/provider benchmark. No record edits, account creation or protection changes. Content-tail/controlled-hosted gates remain open; see hosted-loading-smoke report |
| 2026-10-10 | Assertion polling inflates detail latency measurements | 40 local real-auth read-only samples. Sampled-ready medians session/task open 604/489ms vs assertion-observed 1023/932ms; closes 10–11ms median and zero RSC/POST. Open tails remain substantial | Improved diagnostic precision only, no app speedup claim. Preserve assertion upper bounds, require provider/paint and session-mutation follow-up; see detail-frames report |
| 2026-10-10 | Sequential provider waits explain detail-open latency | 40 local real-auth read-only samples; all 20 opens attributed. Session/task ready median 489/405ms, provider span 456/356ms; 4/3 sequential reads with no overlap, correlations 0.981/0.979; no duplicate profile reads | Diagnostic evidence, not app speedup. Measure same-page warm reopen/freshness before cache changes; preserve effective occurrence and ownership when testing round-trip reductions. See detail-provider report |
| 2026-10-10 | Successful session writes leave known-stale detail cache | Both Calendar/Dashboard held-read regressions show the pre-write room after an occurrence edit. Remove only the series's cached detail prefix on success: both regressions pass, unchanged warm-cache checks pass | Retain narrow correctness candidate, not speedup/shared-cache migration. Related run 24/25 passes; 320×720 series-edit screenshot mismatch reproduces identically without all nine app lines. Preserve baseline and keep visual release gate open; see session-cache-freshness report |
| 2026-10-10 | Increasing detail freshness is required for fast warm reopening | 80 completed paired local read-only samples: warm DOM ready medians session/task 10.7/13.75ms, following frame 90/83ms; each still issues one POST with 4/3 provider calls. Three failed attempts preserved, including a 38.1s profile outlier and attribution-window/stream limits | No TTL/shared-cache change in this slice. Existing cache already acknowledges quickly; request reduction needs freshness/invalidation/actor evidence. Cold-open round-trip work and precise mutation/paint/hosted gates remain open; see detail-warm-reopen report |
| 2026-10-10 | Overlap required task-detail profile and owned task reads after authentication | Four isolated local production runs, 160 read-only samples. Task-ready medians 356.65→255.10ms and 369.65→245.40ms; provider spans 309.96→198.67ms and 331.99→206.59ms. Candidate overlaps 20/20, controls 0/20; same three reads/one POST. Full units/typecheck/build and 11 desktop browser checks pass | Retain narrow candidate; eager mutation context and dependent subject read preserved. Mobile deferred. Existing lint warning and build/lint dependency advisories need separate release triage. No hosted/whole-epic gain or deployment claim; see task-detail-parallel report |

| 2026-10-11 | Overlap session-detail profile with owned effective occurrence | Five isolated local production runs, 200 samples. All 20 candidate opens overlap versus zero of 30 controls; four reads/one POST unchanged. Reverse-order control ready median 496.85ms vs candidate 451.95ms, but candidate ready/provider tails worse and unchanged-task medians also vary substantially | Rejected; restore seven candidate source/test files to HEAD 76dac6b. Stable gain beyond provider/run variability not established. Prior task/Calendar candidates unchanged; mobile and release gates remain open. See [session experiment](SESSION-DETAIL-PARALLEL-READS-2026-10-11.md) |

Session mutation follow-up: [local saves and timezone correction](SESSION-MUTATIONS-2026-10-11.md).
The [frame-sampled follow-up](SESSION-MUTATION-FRAMES-2026-10-11.md) completes 20
unchanged-app saves: pending-feedback p95 <=88ms and paired headers-to-ready
p95 <94ms. Useful readiness precedes all 19 known POST body completions; one
completion stays unknown. Diagnostic precision only, no speedup/hosted claim.
Location-only edits shifted timestamps when profile/series timezones differed.
Three regressions red→green; synthetic timestamp recovered; 20 guarded local
save samples complete with unchanged date/time/duration and one mutation POST/
one current-route reconciliation each. Correctness fix retained, not a speedup
or hosted/release claim. Incomplete first attempt preserved; mobile deferred.

Save provider follow-up: [equivalent-instant correction](SESSION-SAVE-PROVIDERS-2026-10-11.md).
Control/fixed have 20 saves each; pre-write Calendar GETs are three→two in every
sample. Two equivalent-format regressions fail before/pass after; real start
changes still reject with exceptions. Retain correctness/read reduction, not a
stable latency gain: post-write intervals vary substantially as well. Restore all
synthetic invariants; keep owner/CAS guards and refresh. Broad story/release gates
remain open.

Calendar reconciliation: [local request reduction](CALENDAR-RECONCILIATION-2026-10-11.md).
Same-budget 20-save control/candidate captures: extra current-route RSC GETs
one→zero in all samples, one POST each, fresh visible card/same-page details and
restored invariants. Zero-extra-request regression fails before/pass after.
Retain Calendar-only refresh removal for measured request efficiency; mixed
confirmation medians and worse provider tails do not establish a latency win.
Server revalidation/cache invalidation stay; Dashboard and release remain open.

Dashboard reconciliation: [separate local repeat](DASHBOARD-RECONCILIATION-2026-10-11.md).
Twenty saves per variant reduce extra current-route RSC GETs one→zero throughout;
all observed RSCs nine→eight, with eight background prefetches unchanged. Fresh
visible cards/details and restoration pass; new failure/retry and both deletion
scope tests pass. Retain only Dashboard's session refresh removal for request
efficiency, not stable latency: edit/restore medians move in opposite directions.
Keep server revalidation, detail invalidation and task refresh. Actor/rapid,
conditional querying and hosted release gates remain open.

References: [exploratory report](BASELINE-2026-10-10.md),
[isolated navigation repeat](ISOLATED-NAVIGATION-2026-10-10.md). Do not compare local and
hosted numbers as a measured optimization. Record commit, fixture, browser, sample
count, conditions and run-to-run variance for each future candidate.
