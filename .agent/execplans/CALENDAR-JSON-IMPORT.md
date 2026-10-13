# Calendar JSON timetable import

Date: 2026-10-13. User requests planning and complete implementation in this turn without approval pauses. This overrides skill review pauses and the older requirement to create missing states in Superdesign. Reuse existing Calendar/modal styles; do not redesign unrelated screens.

## Specification

Objective: Calendar has an **Import** button. A signed-in user selects a JSON timetable, sees validation and a preview, and imports all sessions through an authenticated API call. University, revision, exam, duration, location, professor, notes, timezone and existing RFC 5545 recurrence are supported. Missing named subjects are created; existing names match case-insensitively and retain their settings. This is additive, never a timetable replacement or account backup restore.

JSON v1: `{ "version": 1, "timezone": "Africa/Tunis", "subjects": [{"name":"Mathematics","color":"#06b6d4"}], "sessions": [{"kind":"university","title":"Calculus","subject":"Mathematics","date":"2026-10-19","start_time":"09:00","duration_minutes":90,"recurrence_rule":"FREQ=WEEKLY;COUNT=12"}] }`. Subjects are optional; a default color is supplied for new undeclared subject names. A session may instead use `subject_id` and/or offset-qualified `starts_at`; exactly one subject reference and one time representation are required. Timezone is required at document level. Unexpected fields, invalid times, foreign subjects, bad recurrence, empty or oversized batches are rejected. Max 1 MiB, 200 session series, 100 named subjects. Notes are content, not notification rules.

Architecture: portable validation reuses canonical Calendar/Subject schemas and date conversion; UI sends original JSON to `POST /api/v1/calendar/imports`; existing cookie/JWT/API-key authentication and same-origin protection remain. Adapter -> import application service -> Supabase repository -> one invoker SQL transaction. No R2 dependency, new package, auth change or second recurrence implementation.

Atomicity/retries: validate all rows before writing. A user-scoped normalized-payload SHA-256 receipt makes identical imports idempotent, including concurrent requests. Receipt, new subjects and sessions commit together or all roll back. Existing data is not edited. Changed payloads are new imports; this does not deduplicate manually-created sessions or merge changed exports. Receipt table has RLS and owner-only SELECT; writes and RPC execution are server-only. Owner-aware subject references are enforced inside the transaction.

Trust boundaries: hostile file/HTTP JSON, authenticated actor, server-only credentials, database ownership. Bound sizes and recurrence expansion, reject actor/id injection, escape text, no external URL imports, and return sanitized errors with row paths. Preserve retry state; disable repeated submits while pending. No raw file/credentials logged.

## Implementation tasks

- [ ] 1. Portable contract/parser + failing-then-passing validation tests. Files: domain import schema/test and example JSON. Verify malformed JSON, limits, kinds, timezone, DST gaps, recurrence and unknown fields.
- [ ] 2. Atomic import persistence + service tests. Files: import service/repository, generated migration, migration/SQL tests. Verify idempotency, rollback, owner references and minimal grants.
- [ ] 3. Authenticated API adapter + endpoint/tests. Verify cookie/JWT/API-key integration, same-origin enforcement, bounded body, errors, import result and no writes on validation failure.
- [ ] 4. Calendar Import button/modal/client tests. Reuse ModalFrame and Calendar tokens. Verify preview, invalid/oversize files, template download, pending/error/success and refreshed Calendar/Dashboard.
- [ ] 5. Review, full regression gates, matching Supabase migration/advisors, real-browser imports/reimport/reload, documentation and preview publication.

Commands: `rtk pnpm exec vitest run <test files>`, `rtk pnpm lint`, `rtk pnpm typecheck`, `rtk pnpm test`, `rtk pnpm build`. Browser interactions through CUA only. SQL tests in explicit rollback transactions against the already linked Web Study project. Never modify the unrelated connector project or user records.

Code convention: strict TypeScript and Zod, `status: "success" | "error"` results, colocated Vitest tests, snake_case wire fields and camelCase domain fields. Example: `const result = await service.import(context.actor.userId, body);`.

Boundaries: always preserve existing work, user isolation and shared validation; no new external service, dependency, destructive migration, production merge, or unrelated UX fixes. Native Vercel git preview workflow only, not production. Rollback of additive schema: disable/remove new route/UI first; retain receipt rows until a separately authorized cleanup. No open product questions; conservative defaults above are chosen to execute without stopping.

## Progress and evidence

Planning complete; implementation begins immediately. Existing dirty `next-env.d.ts`, `.serena/`, and prior `docs/testing/` are preserved. Supabase connector targets a different project; authenticated CLI is verified linked to Web Study `qvqnztgpjludiahmboyd` and will be used instead.
