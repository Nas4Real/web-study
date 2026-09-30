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

## Acceptance

Day/Week/Month render from bounded occurrence read model. Detail surfaces show exception overrides. Recurrence tests cover moved/cancelled instances and scope. Visual/a11y checks protect the modal and existing views.
