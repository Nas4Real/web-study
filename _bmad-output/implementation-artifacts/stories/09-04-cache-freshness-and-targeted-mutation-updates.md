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
