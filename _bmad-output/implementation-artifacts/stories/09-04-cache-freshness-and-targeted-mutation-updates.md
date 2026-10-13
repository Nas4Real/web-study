# Story 09-04: Cache freshness and targeted mutation updates

Epic: epic-09
Status: deferred (2026-10-11 user decision; verified correctness/request-efficiency work retained)
Dependencies: 09-03
Scope: medium per slice; cache lifecycle, then read-only close/mutation handlers

## User outcome

As a user inspecting or updating a task/session, I want related data to update
without unnecessarily reloading the entire screen or showing stale information.

## Acceptance criteria

- [ ] Read-only detail close triggers no forced page refresh. Successful writes
  reconcile affected detail/list/dashboard/range state exactly once; failed writes
  expose an error and roll back only their own optimistic change.
- [ ] Any shared workspace QueryClient has actor-scoped keys, explicit freshness,
  no immediate duplicate fetch after initial data seeding, and auth-change reset.
- [ ] Counted requests decrease in the affected flows; rapid mutations, revisits,
  subject/profile/timezone changes and account switching remain correct.

## Expected implementation surface

A workspace query provider/lifecycle helper if measured reuse warrants it,
`use-task-detail.tsx`, `use-session-detail.tsx`, and affected Task/Calendar/
Dashboard handlers. Split provider lifecycle and feature adoption into focused
slices rather than changing all mutation paths in one commit.

## Engineering constraints

Do not remove reconciliation merely to improve a benchmark. Cached queries
must never authorize a request. Preserve independent subtasks and effective
recurrence identities. Start with explicit freshness of 15 seconds for summaries
and 5 seconds for details, plus mutation invalidation and focus refetch where
useful; record adjustments against measured request and correctness results.
No disk persistence or shared server singleton for authenticated query state.

## Verification / done when

Use task/session detail and mutation browser tests with delayed/out-of-order
responses. Test sign-out and second-user sign-in before stale content paints.
Measure close/reopen/update request counts and timing. Run focused cache/state
tests, relevant visuals, lint, typecheck, unit suite and build.

## Session mutation follow-up — 2026-10-11

Local location-only edits exposed a profile/series timezone mismatch. The editor
now uses the owned session timezone consistently with server conversion, while
detail/calendar display remains profile-based. Three timezone regressions fail
before/pass after. The affected synthetic record's original time was recovered;
no real-user data changed. Ten edit/restore cycles verify location/date/start/
duration on the same page; every measured save has one POST and one current-route
non-prefetch reconciliation. See `docs/performance/SESSION-MUTATIONS-2026-10-11.md`.
This is a correctness correction and diagnostic, not a latency win or acceptance
of the broad cache/mutation lifecycle. All existing story gates remain open;
mobile is deferred. No merge or production deployment.

The subsequent frame-sampled diagnostic completes 20 saves: pending-feedback
p95 84.7/88ms; POST-header-to-ready p95 93.77/91.36ms. All 19 known POST bodies
finish after sampled readiness; one completion remains unknown. All 712 units,
typecheck/final build and a four-scenario genuine-auth read-only smoke pass;
existing lint warning remains. No app optimization or precise React/paint claim.
See `docs/performance/SESSION-MUTATION-FRAMES-2026-10-11.md`. This narrows measurement
uncertainty, not the remaining cache lifecycle/failure/actor/release gates.

## Provider-attributed save follow-up — 2026-10-11

Equivalent provider/form timestamp
serializations were treated as schedule changes, needlessly reading exceptions
and rejecting recurring content edits with exceptions. Two tests reproduce the
bug red→green; a true-start-change test retains rejection. The shared service now
reuses its instant-based schedule comparison, retaining independent owner reads
and repository concurrent-schedule guards. All 717 units/typecheck/build and 21
desktop browser/visual checks pass, existing lint warning. Twenty real-auth saves
remove one pre-write Calendar GET each, verify fresh same-page detail and restore
the synthetic session's original location/date/time/duration. Timing variability
prevents a hosted latency claim; refresh/cache lifecycle gates remain open. See
`docs/performance/SESSION-SAVE-PROVIDERS-2026-10-11.md`. Mobile remains deferred;
no merge or production deployment.

## Calendar reconciliation follow-up — 2026-10-11

Calendar's explicit post-session client refresh is removed while retaining
Server Action revalidation and affected-series detail-cache invalidation. A
real-auth production count regression fails before/pass after: twenty control
saves have one extra current-route RSC GET each, twenty candidate saves have zero.
Both verify fresh visible cards and same-page details and restore original
synthetic invariants. All 718 units/typecheck/build and 22 desktop browser/visual
checks pass, including a failed-edit/retry test; existing lint warning. Timings
are mixed, so retention is for request efficiency, not a stable latency gain.
See `docs/performance/CALENDAR-RECONCILIATION-2026-10-11.md`. Dashboard is unchanged;
real-auth recurring deletion, rapid/actor/cache lifecycle and hosted release
remain open. No merge/production deployment; mobile deferred.

## Dashboard reconciliation follow-up — 2026-10-11

Dashboard's session-success refresh is removed separately; task refresh remains.
Matching twenty-save real-auth local production captures reduce extra current-route
RSC GETs one→zero in every sample, with fresh visible cards/same-page details and
restored synthetic location/date/start/duration. Eight prefetch-flagged requests
remain in every save window; zero-extra-reconciliation is not zero traffic.
All 719 units/typecheck/build and 25 desktop browser/visual checks pass, including
new Dashboard failed-edit/retry and occurrence/series deletion coverage. Existing
lint warning remains. Mixed timing results do not establish stable hosted speedup.
See `docs/performance/DASHBOARD-RECONCILIATION-2026-10-11.md`. Server revalidation,
detail invalidation and auth remain; actor/rapid/real-auth recurring deletion and
release gates remain open. No merge/production deployment; mobile deferred.

## Cache-lifecycle verification — 2026-10-11

Four rapid-subtask fixture regressions pass on existing app code: Tasks/Dashboard
double-click serialization, successful settlement or originating-task rollback,
selection preservation and retry/unlock/persistence. All 20 scoped browser checks
pass without retries. Three genuine-auth local production same-tab switches pass
after warming task/session details, empty-account sidebar/history revisits and
returning to the populated account. A positive-control rendered-DOM detector
observes no prior-account synthetic markers; final observation is one second,
zero study writes/page errors. Initial runner startup failure did not recur;
the first auth run's Calendar-heading harness error was corrected using canonical
readiness selectors. All 719 units/typecheck/build pass; existing lint warning.
See `docs/performance/CACHE-LIFECYCLE-2026-10-11.md`. No app change/speedup or story
closure; cross-tab/late auth-loss, subject/profile/timezone freshness, remaining
real-auth recurring mutations and release gates remain open. Mobile deferred;
no merge/production deployment.

## Early independent experiment — 2026-10-10

The ExecPlan permits a narrow close-handler slice while the full 09-01 baseline
remains open. Ten hosted Session Details closes each produced a current-route
non-prefetch GET; source confirmed unconditional refresh on Calendar/Dashboard.
The new browser regression failed with one route read before implementation.

`SessionDetailsModal` now has separate required `onClose` and `onMutated`
callbacks. Calendar/Dashboard dismiss without refreshing for read-only closes;
edit/delete success still closes and refreshes. No visual styling, shared query
cache, auth lifecycle, optimistic mutations or recurrence rules changed.

The focused close/focus test passes with zero route reads on Calendar and
Dashboard (before: one Calendar read, failing assertion). The combined session/
calendar run passed 15 functional/Calendar visual tests, including immediate
post-edit/delete reconciliation; Session Details at 320px failed on screenshot
height (802px expected, 870px actual). Temporarily restoring all three application
files to their pre-change contents reproduced the identical 21,670-pixel/height
mismatch. The candidate was restored afterward. No baselines were updated.
The candidate's independent 768px visual check also failed by the same additional
68px document height (1026px expected, 1094px actual). Full unit suite, typecheck, lint
(one existing modal ref-cleanup warning), production build and diff check pass.
Subsequent browser geometry localized the mismatch to the mobile shell: its 56px
header and 12px gap were added above a Calendar retaining desktop viewport height.
A separate responsive height correction subtracts those 68px below `lg`, retaining
desktop height and the short-screen minimum. The direct document-height regression
fails on the original source at 320/768px and passes after. All 21 Calendar/session
browser checks now pass, including the unchanged 320/768/1024px Session Details
snapshots. Full units, typecheck, lint (same existing warning), build and diff check
pass for this correction. No snapshots updated; no dialog styling changed.
The candidates are for review, not merged or deployed. Remaining Epic 09
measurements and final integration checks still gate release.
This experiment does not complete the whole story or bypass the cache lifecycle
and release gates; its remaining work still depends on 09-03.

## Narrow session cache freshness fix — 2026-10-10

Same-page warm inspection uncovered a correctness defect: after editing an
occurrence, Calendar and Dashboard repaint the pre-write room from detail cache
while the new read is pending. Both delayed-read regressions failed before the
fix. Success handlers now remove only the changed series's detail query prefix,
then close and keep the existing route refresh. Read-only closes and failed
writes retain their cache; unrelated series/task entries are untouched.

All four new cache browser checks pass, including warm cached rendering during
revalidation. Related run passes 24/25; the 320×720 entire-series edit screenshot
height mismatch reproduces identically with the cache change removed. No visuals
or baselines were altered. Full units/typecheck/production build pass, lint's existing warning
remains. See `docs/performance/SESSION-CACHE-FRESHNESS-2026-10-10.md` for reproduction,
constraints and the remaining visual release gate. This is correctness work, not
a cache latency gain or completion of the shared-cache lifecycle story.
