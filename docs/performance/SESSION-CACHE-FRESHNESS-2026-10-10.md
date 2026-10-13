# Session detail freshness after writes — 2026-10-10

Narrow 09-04 correctness slice, not a latency optimization or release.
Approved UI, per-mounted-surface QueryClients, auth and recurrence rules are unchanged.

## Reproduction and root cause

On both Calendar and Dashboard: open a session (Room 401), edit that occurrence
to Room 499, then reopen without navigating/reloading. Hold the new detail POST.
Both new regression tests failed: the old Room 401 was rendered from query cache
while waiting for the server. Existing warm read-only reopen tests passed.

The success handler closed the dialog and called `router.refresh()`, which merges
new server data while preserving unaffected client state. It does not clear this
page's TanStack detail cache. Reopening therefore reused a known pre-write value.
See the installed Next 16.3.8 `useRouter` guide and TanStack QueryClient's
`removeQueries` implementation; no server caching or authentication change is needed.

## Fix and boundaries

Calendar/Dashboard success handlers remove only `['session-detail', seriesId]`
before closing and retaining the existing route refresh. The series prefix clears
cached siblings too, since an entire-series edit/delete can affect each occurrence.
Unrelated series and task keys stay cached. Removing a query destroys/cancels its
old query instance, rather than triggering a second reconciliation fetch.

Read-only close and failed writes do not invoke the success handler, so keep their
cache. There is no global cache, new persistence, TTL change or authorization
shortcut. On next open, the existing loading state replaces known-stale details
until the normal independently authorized service read returns. Refresh still
reconciles the underlying page; it has not been removed to improve a benchmark.

## Verification and remaining gate

- Both pre-edit stale-content regressions failed before and pass after the fix.
- All four new Calendar/Dashboard cache tests pass with a held background POST;
  unchanged read-only reopens still show cached content and issue a fresh read.
- Related browser run: 24/25 pass, including read-only close/focus, occurrence
  and series edits/deletes, immediate page reconciliation, and unchanged Session
  Details visuals at 320/768/1024px.
- The existing 320×720 entire-series edit screenshot fails: expected image height
  722px, actual 774px, 16,370 differing pixels. Temporarily removing all nine
  application lines of this cache fix reproduced the exact same mismatch in
  isolation. Candidate restored afterward; no baseline updates or layout changes.
  This pre-existing short-viewport visual issue remains a release gate, not a
  cache regression. Do not label the whole browser suite green.
- Full unit suite, typecheck and genuine-auth production build pass; lint has the pre-existing
  `modal-frame.tsx:103` effect cleanup warning.

Broader shared-cache actor lifecycle, mutation reconciliation/request reductions,
precise session mutation timing and final integration remain open. This does not
complete 09-04 or authorize a production merge/deployment.
