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

The adapter calls `save_calendar_exception`, a SECURITY INVOKER RPC with empty search path, authenticated-only execution and JWT/actor equality. It locks the owned master before writing the exception and compares the exact `starts_at`, timezone and RRULE used by application membership validation. A changed schedule fails with normalized `INVALID_INPUT`; an invisible/missing master returns no row. Comparing schedule fields avoids timestamp precision/transaction-start assumptions.

Inside that transaction, insert uses `ON CONFLICT DO NOTHING`, followed only when necessary by an owned, original-identity-filtered UPDATE of `action` and `override_payload`. This avoids widening immutable-column UPDATE grants. Modification updates exclude already-cancelled rows so cancellation wins over a stale edit. Existing owner RLS and composite foreign keys remain authoritative; direct foreign writes retain their established RLS/FK failures.

Master schedule updates reject any schedule change while exceptions exist. Exception insert/update triggers lock the owned master, so direct inserts also participate in serialization. If the occurrence write wins, a competing schedule rewrite waits and is rejected; if the schedule rewrite wins, the stale RPC waits and rejects its old schedule. The application-level precheck remains an early validation, not the concurrency guarantee. RPC writes use parent-before-child lock order and hold no lock across application/network work. Concurrent partial modifications remain last-write-wins; this is not general optimistic version protection for metadata edits.

Migration `20261004124427_calendar_mutation_serialization.sql` adds only functions/triggers and a narrowly scoped RPC execution grant, not columns, data rewrites, table privileges or elevated execution. Deploy the migration before the adapter. Rollback reverts the adapter first, then drops the two new triggers and three functions without deleting stored data. Local database tests cover the invoker path, grants and foreign/anonymous rejection. Run `node --test tests/database/calendar-concurrency.test.mjs` against the existing `supabase_db_STUDY_APP` Docker database for three real two-connection lock-order proofs; disposable fixtures are removed afterward.

## Single-occurrence delete

Write `action='cancelled'`. Preserve the original series master.

## Whole-series edit/delete

Update/delete series master. Existing exceptions need an explicit reconciliation policy if a recurrence-rule edit makes an exception no longer addressable. V1 service should either preserve valid exceptions and reject unsafe schedule rewrites, or deterministically clean orphaned exceptions in one transaction. Do not silently misapply an exception to a different occurrence.

## Detail-modal edit/delete UX

For recurring occurrences, obtain scope before mutation. For one-time sessions, no scope question is needed. The scope UI must be approved in live Superdesign.

### Deletion action boundary

`deleteSessionAction(input)` resolves the existing authenticated calendar context on every call and delegates to `deleteSessionMutationHandler`, which validates a strict discriminated target before using the shared service:

- `{ scope: 'occurrence', seriesId, originalStart }` writes a cancellation through `CalendarService.saveException`. The identity is the original generated start, not an effective moved start. Retry succeeds with the stable cancellation record; siblings and the master remain unchanged.
- `{ scope: 'series', seriesId }` calls `CalendarService.delete`. One-time sessions use this path too. Stored exceptions cascade through the existing owner-aware FK. A retry after successful series deletion returns `NOT_FOUND`; it cannot delete a different record.

There is no default scope or fallback from an invalid occurrence to series deletion. Missing/extra target fields, client actor ownership and mixed series/occurrence identity are rejected. Actor and repository/test scope are derived only from the existing context resolver, not mutation arguments. Successful responses contain only `SESSION_DELETED`; failures contain a fixed safe message and stable error code. The Supabase delete adapter requires the returned ID to match the requested owned series before reporting success. Only successful actions invalidate `/calendar` and `/`; no UI binding is claimed by this backend checkpoint.

## Testing

DST/timezone boundaries, moved occurrences, cancelled occurrences, overridden notes/location/professor, range limits, and original-start stability are mandatory test classes.
