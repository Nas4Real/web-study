# Calendar Recurrence Engineering Contract V4

## Model

A calendar series has `starts_at`, timezone, optional RRULE and shared fields. Generated occurrences are not persisted by default. `calendar_exceptions` stores modified/cancelled instances keyed by `(series_id, original_start)`.

## RFC-aligned identity

RFC 5545 defines RECURRENCE-ID as the original DTSTART value for a recurring instance and keeps that identity even when the occurrence moves. Web Study uses `original_start` for the same purpose.

## Range expansion

- require `from` and `to`
- enforce maximum span and occurrence-count safeguards
- expand in the series timezone
- apply matching exception after generation
- cancelled instances disappear
- modified instances keep `original_start` while exposing effective start/end

## Detail resolution

Session Details must call/derive the effective occurrence, not read `calendar_series` alone. Returned fields include optional location, professor, focus text and `notes_items` after occurrence override.

## Single-occurrence edit

Write `action='modified'` with an allowlisted override payload. Payload may override the fields supported by the product, including `notes_items`. Never store arbitrary client JSON without schema validation.

`CalendarService.saveException(actorId, input)` validates the owned master and generated original-start membership before accepting a modification/cancellation. It canonicalizes identity to UTC, validates the merged effective fields against the stored session kind, and merges partial modifications with an existing override. One-time sessions use series mutation instead. A cancelled occurrence cannot be silently restored by an edit; repeated cancellation succeeds without adding another exception.

Domain overrides use camelCase; the Supabase adapter translates `startsAt`, `durationMinutes`, `focusText` and `notesItems` to/from the database JSON keys `starts_at`, `duration_minutes`, `focus_text` and `notes_items`. Unknown keys are preserved for strict validation to reject, not silently dropped.

The adapter inserts first and retries only a unique-key conflict with an owned, original-identity-filtered UPDATE of `action` and `override_payload`. This avoids widening immutable-column UPDATE grants. Modification updates additionally exclude already-cancelled rows so a concurrent cancellation wins over a stale edit. Existing owner RLS and composite foreign keys remain authoritative.

Before exposing schedule-changing whole-series actions alongside occurrence mutations, complete the atomic schedule/exception reconciliation review: the existing application-level read/check alone does not serialize concurrent schedule rewrites and exception insertion. Concurrent partial modifications currently use last-write-wins semantics; no optimistic version protection is claimed by this checkpoint.

## Single-occurrence delete

Write `action='cancelled'`. Preserve the original series master.

## Whole-series edit/delete

Update/delete series master. Existing exceptions need an explicit reconciliation policy if a recurrence-rule edit makes an exception no longer addressable. V1 service should either preserve valid exceptions and reject unsafe schedule rewrites, or deterministically clean orphaned exceptions in one transaction. Do not silently misapply an exception to a different occurrence.

## Detail-modal edit/delete UX

For recurring occurrences, obtain scope before mutation. For one-time sessions, no scope question is needed. The scope UI must be approved in live Superdesign.

## Testing

DST/timezone boundaries, moved occurrences, cancelled occurrences, overridden notes/location/professor, range limits, and original-start stability are mandatory test classes.
