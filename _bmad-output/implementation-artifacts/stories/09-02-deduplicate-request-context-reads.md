# Story 09-02: Deduplicate request context reads

Epic: epic-09
Status: in-progress (independent Calendar-read experiment only)
Dependencies: 09-01
Scope: medium; shared request helper, context callers and focused tests

## User outcome

As a signed-in user, I want screens to load without redundant authentication
and profile reads delaying the response.

## Acceptance criteria

- [ ] Within a Server Component render request, callers share verified actor,
  client and profile results where semantically identical; outbound call counts
  prove deduplication. Proxy and write-operation verification remain independent.
- [x] Independent Calendar subject/occurrence reads overlap; owner, timezone and
  bounded-range prerequisites still hold. Measure this experiment separately.
- [ ] Comparable before/after measurements show a gain beyond variance; null
  actors, invalid claims, provider failures and user isolation remain correct.

## Expected implementation surface

`src/server/auth/request-auth.ts`, `src/lib/supabase/server.ts`, a narrow shared
read-context helper, and the settings/task/calendar context callers. If this
exceeds five implementation files, split context adoption into small commits.

## Engineering constraints

Use supported request-scoped memoization; no global private-data/client cache.
Do not trust metadata or browser-supplied identity. Preserve verified email
semantics and SSR refresh behavior. Keep mutation auth fresh and RLS intact.

## Verification / done when

Tests prove repeated equivalent reads are shared within one render scope and
not reused across actors/requests. Auth redirects and profile/timezone reads
work with real sessions. Run focused context/loader tests, lint, typecheck and
build; attach before/after call counts and timing to the ledger.

## Execution decision — 2026-10-10

User authorized the independent Calendar-read experiment next. Full 09-01 remains
open. Initial and sibling traces do not show duplicate outbound auth/profile
reads, so do not implement speculative memoization. Test Calendar reads in
isolation after verified actor/timezone/window resolution, preserving fixture
behavior, bounded owner reads and fail-closed projection. Capture comparable
production measurements before retaining the candidate. No whole-story completion
or hosted speedup claim until its remaining gates are addressed.

## Calendar experiment result

Retained narrow candidate: `Promise.all` after actor/timezone/window resolution,
both result/error checks before projection; fixture branch remains subject-only.
Concurrency regression fails before and passes after. All 18 loader tests, full
units/typecheck/build and 27 relevant browser/visual checks pass; lint retains
the existing modal-ref warning. No auth, cache, recurrence or UI change.

Matching 20-sample local populated initial entries show provider-span median
437→348ms and observed-ready 650→495ms. All candidate reads overlap versus none
before; same five calls. Both ten-sample batches improve, but control/tail
variation remains. See `docs/performance/CALENDAR-PARALLEL-READS-2026-10-10.md`.
No hosted/warm-navigation budget claim. Speculative memoization stays deferred
for lack of duplicate outbound reads; remaining story/release gates stay open.
