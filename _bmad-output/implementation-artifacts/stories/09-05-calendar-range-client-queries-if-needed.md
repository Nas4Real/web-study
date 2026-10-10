# Story 09-05: Calendar range client queries if needed

Epic: epic-09
Status: conditional
Dependencies: 09-01, 09-02, 09-03, 09-04
Scope: medium per slice; shared read contract, then client range query

## Decision gate

Implement only if Calendar date/view changes still miss the spec's budgets and
traces identify repeated route roundtrips/cache behavior as the cause. Record
the evidence and implement/defer verdict in EPIC-09 and the performance ledger.

## User outcome

As a user browsing my calendar, I want cached dates/views to appear quickly and
new ranges to load without waiting for unrelated workspace data.

## Acceptance criteria

- [ ] Initial data seeds the actor/bounds/timezone/view query without a duplicate
  request; ranges are bounded and limited adjacent-range prefetch is measured.
- [ ] Rapid date/view changes and browser back/forward retain the correct URL,
  effective occurrences and explicit pending state; old responses cannot replace
  newer ranges. A range change does not fetch both RSC and JSON unnecessarily.
- [ ] Occurrence/series writes invalidate all affected ranges and details;
  errors/auth loss stay safe and representative timing improves beyond variance.

## Expected implementation surface

Shared Calendar read service/projection, a bounded same-origin read adapter
only if existing session API output is insufficient, a range query hook and
`src/features/calendar/calendar-page.tsx`. Decide the route contract before code.

## Engineering constraints

Keep recurrence expansion and timezone conversion in shared services. Reuse
existing cookie/JWT verification; no user API-key prerequisite. Preserve
`(seriesId, originalStart)` identity, exceptions and edit/delete scope. Cancel
superseded reads where supported; otherwise isolate results by query identity.

## Verification / done when

Calendar data/detail/edit tests pass with empty, recurrent, overridden and
timezone-boundary data. Add delayed-response/history regression checks. Compare
the same dated ranges before/after in production conditions. A defer verdict
counts as resolving this conditional story, not as implementing its behavior.
