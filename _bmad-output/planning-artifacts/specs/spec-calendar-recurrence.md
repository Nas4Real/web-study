# Feature Specification - Calendar, Recurrence and Session Details

## Scope

Day/Week/Month views; Exam/University/Revision authoring; recurrence; occurrence exceptions; Session Details; edit/delete scope.

## Detail interaction

Session cards in Day, Week and Dashboard Today's Classes open the approved Session Details modal. Week is also required by the user's current interaction. Month click behavior is not added unless live Superdesign defines it.

Session Details reads an effective occurrence and can display subject, time range, location, professor and ordered Notes & Reminders.

## Authoring gap

Older New Session forms do not expose every new detail field. Codex must create/iterate New/Edit Session states in the live project before implementation, including location+professor where relevant, Notes & Reminders authoring, recurrence controls and recurrence edit/delete scope.

## Recurrence

Persist series + RRULE and exceptions. One-occurrence modification/cancellation uses original-start identity. Whole-series edits are distinct operations.

### Creation controls (story 04-04)

The approved same-project recurrence draft is https://p.superdesign.dev/draft/74ce705b-0f0d-4a89-bd7e-36b09841a650 (v2). New sessions default to Does not repeat. Daily, Weekly and Monthly support an integer interval of 1-99. Weekly requires at least one unique weekday; the initial selection follows the chosen civil date, independent of the browser timezone.

Ends supports Never, On a date, or After occurrences (1-500 total occurrences, not additional repeats). An end date includes that entire profile-local date and cannot precede the start date. Monthly dates missing from a month are skipped rather than clamped. Recurrence controls retain their values after a rejected save and are disabled during a pending save; inactive controls are not submitted.

The authenticated profile is authoritative for timezone and identity. The action constructs RRULE from validated structured settings; client-supplied raw RRULE, identity and timezone are not trusted. Creation and expansion resolve an ambiguous autumn time to its earliest instant consistently across host timezones. A nonexistent initial local time is rejected; nonexistent generated spring occurrences are skipped without consuming COUNT. Existing bounded expansion limits still apply to never-ending series.

Occurrence-versus-series editing remains story 04-05; location/professor/notes authoring remains story 04-07.

## Acceptance

Day/Week/Month render from bounded occurrence read model. Detail surfaces show exception overrides. Recurrence tests cover moved/cancelled instances and scope. Visual/a11y checks protect the modal and existing views.
