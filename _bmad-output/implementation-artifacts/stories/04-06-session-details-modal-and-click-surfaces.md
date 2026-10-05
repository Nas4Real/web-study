# Story 04-06: Session Details modal and approved click surfaces

Epic: epic-04
Status: done
Dependencies: 04-01,04-02,01-04,03-03

## Purpose

Implement the approved Session Details modal from Calendar Day, Calendar Week and Dashboard Today's Classes.

## Visual authority

Live Superdesign Session Details state, with `design-reference/screenshots/v4/18_SessionDetails.png` as regression reference.

## Expected implementation surface

Effective occurrence detail service/query, dialog behavior, click wiring, edit/delete routing, cache invalidation, tests.

## Engineering constraints

- identify occurrence by `{series_id, original_start}`
- detail fields are effective series + exception override values
- Notes & Reminders are ordered content strings, not notification jobs
- recurring edit/delete must use scope semantics from story 04-05
- Month interaction is unchanged unless live Superdesign defines it
- modal accessibility behavior must preserve approved visuals

## Acceptance scenarios

1. Open same effective session from Day.
2. Open from Week.
3. Open from Dashboard Today's Classes.
4. A modified recurring occurrence shows its override data while another occurrence retains series data.
5. Edit recurring occurrence enters approved scope/edit flow.
6. Delete recurring occurrence enters approved scope/delete flow.
7. Cross-user series/original-start lookup reveals no foreign data.
8. Visual comparison matches approved Session Details.

## Completion — 2026-10-05

Implemented an authenticated effective-occurrence detail service/action keyed by `{seriesId, originalStart}`, with owned subject joining, safe error normalization, ordered Notes & Reminders, and no foreign-data disclosure. Day, Week, and Dashboard Today's Classes now open the same approved Session Details component; Month remains non-clickable. Loading, retry, explicit invoker-focus restoration, recurring edit/delete routing, and post-mutation refresh are wired without redesigning the approved state.

Verification includes 11 serial Playwright scenarios for all three launch surfaces, effective override versus sibling data, occurrence/series/one-time edit and delete persistence, failure/retry/focus behavior, plus stable 320/768/1024 visual comparisons. Cross-owner and malformed-target behavior remains covered at service/handler level. Story 04-06 is complete.
