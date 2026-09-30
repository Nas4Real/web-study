# Story 04-07: Enrich session authoring with detail fields

Epic: epic-04
Status: ready-superdesign-first
Dependencies: 04-03,04-04,04-05,04-06

## Purpose

Update New/Edit Session UI so users can author the fields displayed by Session Details.

## Superdesign-first requirement

Create/iterate required states in Nas's existing Superdesign project before coding. Reuse current Exam/University/Revision modal patterns.

Product capabilities to represent as appropriate per type:

- University: location + professor + Notes & Reminders
- Exam: location + Notes & Reminders
- Revision: focus/chapter + Notes & Reminders
- recurrence controls
- edit one occurrence / entire series behavior

The underlying model may keep optional shared fields for forward compatibility, but the UI exposes only what the approved type-specific design calls for.

## Engineering constraints

`notes_items` is an ordered validated string array. Occurrence-only edit can replace notes/location/professor/focus via exception override. Whole-series edit changes the master.

## Done when

New/Edit forms round-trip to Session Details and recurrence semantics remain correct across Day/Week/Month/Dashboard.
