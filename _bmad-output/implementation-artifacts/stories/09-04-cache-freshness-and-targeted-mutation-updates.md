# Story 09-04: Cache freshness and targeted mutation updates

Epic: epic-09
Status: planned
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
