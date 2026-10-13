# Import a JSON timetable

Feature: `calendar-json-import-v1` (2026-10-13).

Open **Calendar → Import → Download example JSON**. Edit the example with your timetable, choose the `.json` file, inspect the preview, and select **Import sessions**. Use **View Calendar** after success to open the first imported date. Nothing is saved merely by choosing a file.

This imports university classes, revision sessions and exams, including duration, subject, location/professor where applicable, ordered Notes & Reminders, timezone and recurring series. It does not import tasks, files, preferences or passwords, and it never replaces existing sessions. JSON imports do not need R2 storage.

## Format

```json
{
  "version": 1,
  "timezone": "Africa/Tunis",
  "subjects": [{ "name": "Mathematics", "color": "#06b6d4" }],
  "sessions": [
    {
      "kind": "university",
      "title": "Calculus lecture",
      "subject": "Mathematics",
      "date": "2026-10-19",
      "start_time": "09:00",
      "duration_minutes": 90,
      "location": "Room 204",
      "professor": "Dr. Ben Salem",
      "notes_items": ["Bring the formula sheet"],
      "recurrence_rule": "FREQ=WEEKLY;COUNT=12"
    }
  ]
}
```

- `version`: required, currently `1`.
- `timezone`: required IANA timezone, e.g. `Africa/Tunis`, used for all session recurrence and local date/time interpretation. Calendar still displays in your profile timezone.
- `subjects`: optional, at most 100 definitions. Each has a name and optional six-digit hex color; default `#06b6d4`. New session subject names are created automatically even without a definition. Existing subjects match case-insensitively and keep their existing color, icon and position.
- `sessions`: required, 1–200 session **series**, not occurrence count. A recurring lecture is one row. Exact duplicate rows within a file are rejected.
- `kind`: `university`, `revision`, or `exam`.
- `title`: required, up to 240 characters, normalized like ordinary sessions.
- Exactly one of `subject` (name) or `subject_id` (an existing UUID owned by your account).
- Exactly one time representation: `date` (`YYYY-MM-DD`) plus `start_time` (`HH:mm`), or `starts_at` (ISO datetime with UTC `Z`/an explicit offset). Naive datetimes, invalid dates and nonexistent DST times are rejected. Ambiguous DST times use the existing earliest-occurrence policy.
- `duration_minutes`: integer 1–1440; required for university/revision, optional/null for exams.
- `location` and `professor`: optional university fields; exam may have location but not professor. Revision may not have either.
- `focus_text`: optional revision field; not allowed on university/exam rows.
- `notes_items`: optional ordered array of up to 50 non-empty strings, each up to 500 characters. These are notes, not scheduled notifications.
- `recurrence_rule`: optional/null RFC 5545 RRULE. Examples: `FREQ=WEEKLY;BYDAY=MO,WE;COUNT=24`, `FREQ=DAILY;COUNT=5`, or `FREQ=MONTHLY;COUNT=3`. Daily, weekly, monthly and yearly frequencies are accepted; sub-day expansion fields are rejected. No DTSTART/TZID, multiline rules or simultaneous COUNT/UNTIL. Maximum COUNT 10000. Recurrence uses the application's existing expansion safeguards.
- Unknown fields are rejected so data is not silently discarded. At most 100 distinct named subjects overall. UTF-8 JSON, maximum file/request size 1 MiB.

## API

`POST /api/v1/calendar/imports`, body: the same JSON document, `Content-Type: application/json`.

Authentication reuses the existing API boundary: the website's same-origin Supabase session cookie, a Supabase user JWT bearer token, or an existing personal API key. Users do **not** need to create API keys to use the button. Cookie mutations require the matching Origin; bearer authentication follows the existing contract. Credentials never belong in the JSON file.

```bash
curl --request POST 'https://YOUR_APP_DOMAIN/api/v1/calendar/imports' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data-binary '@timetable.json'
```

Successful response (`201` for a new import):

```json
{
  "import_id": "11111111-1111-4111-8111-111111111111",
  "session_count": 1,
  "subjects_created": 0,
  "already_imported": false,
  "first_date": "2026-10-19"
}
```

Errors use the existing `{ "error": { "code", "message", "request_id", "details" } }` envelope. Codes/statuses: invalid or expired authentication `401`; disallowed cookie origin `403`; file/body too large `413`; non-JSON content type `415`; validation/foreign subject `422`; provider unavailable `503`. Validation details include zero-based paths such as `sessions.2.duration_minutes`. API-key rate limiting remains unchanged.

## Atomicity and retries

The entire file is validated before persistence. A single database transaction creates/reuses subjects, creates sessions and records the import receipt. A failing row or invalid foreign subject rolls back all new records. The server supplies verified ownership; SQL also checks subject ownership.

A per-account SHA-256 fingerprint of the normalized document prevents duplicate imports, including concurrent submissions. Formatting and equivalent date/time representations normalize to the same import. A replay returns `200`, `already_imported: true`, original `session_count` and `first_date`, and `subjects_created: 0`. No existing data is updated.

This is **not** arbitrary timetable merging: changing content/session order or subject spelling can produce a new import; manually-created matching sessions are not deduplicated. Reimporting an unchanged file after deleting its sessions still returns the original receipt and does not recreate them. Adjust the file if you deliberately want a new import.

Network/timeouts may happen after a transaction commits. The UI keeps the selected file and explicitly allows safely retrying it. Post-write revalidation failure does not turn a committed import into a false failure response. Calendar, Dashboard and subject-dependent screens are revalidated; Calendar also refreshes client-side.

## Implementation and verification

- Portable parser: `src/domain/timetable-import.ts`; canonical Calendar/Subject schemas and local time converter are reused.
- Route: `src/app/api/v1/calendar/imports/route.ts` → adapter → application service → Supabase repository → `import_calendar_timetable`.
- Migration: `20261013123750_calendar_json_import.sql`. Receipts have owner-only SELECT RLS; receipt writes and invoker RPC execution are server-only. No new dependencies, auth flow, CORS expansion or R2 integration.
- Unit tests were written red-first for contract, service, repository, API and client/UI initial states.
- Database test: `rtk npx --yes supabase@2.119.0 db query --linked --file supabase/tests/calendar_import.test.sql`. It rolls back all synthetic accounts/data and checks atomicity, idempotency, unchanged existing subject, foreign-reference rejection, receipt RLS and restricted grants.
- Full checks: `rtk pnpm lint`, `rtk pnpm typecheck`, `rtk pnpm test`, `rtk pnpm build`.

The existing ModalFrame lint warning and existing Supabase warnings on unrelated file-management definer RPCs/leaked-password protection are not introduced by this feature. The import RPC/table have no new security advisor finding. Existing advisor details: [definer function warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Verified on 2026-10-13: **807 passing tests** across 112 files, TypeScript, lint (zero errors) and production build. Real browser imports and genuine JWT API checks passed; SQL atomicity/RLS checks passed before and after the linked migration. Runtime dependency audit is clean; existing development-tool advisories for `braces` and `postcss-selector-parser` remain outside this feature. Detailed evidence and test limits: [verification report](testing/CALENDAR-IMPORT-2026-10-13.md).

Preview: [Calendar with JSON import](https://web-study-git-codex-navigation-optimization-plan-nas-9c1f.vercel.app/calendar). Production is unchanged. Vercel preview protection may require your Vercel login before the separate Web Study login. Direct preview API tests used authenticated `vercel curl`, which generated a project automation protection-bypass token; no token was logged or committed and app authentication remained required. For ordinary external integrations, use your application's accessible deployment domain, not a protected preview.
