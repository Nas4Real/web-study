# Calendar JSON timetable import

Date: 2026-10-13. User requests planning and complete implementation in this turn without approval pauses. This overrides skill review pauses and the older requirement to create missing states in Superdesign. Reuse existing Calendar/modal styles; do not redesign unrelated screens.

## Specification

Objective: Calendar has an **Import** button. A signed-in user selects a JSON timetable, sees validation and a preview, and imports all sessions through an authenticated API call. University, revision, exam, duration, location, professor, notes, timezone and existing RFC 5545 recurrence are supported. Missing named subjects are created; existing names match case-insensitively and retain their settings. This is additive, never a timetable replacement or account backup restore.

JSON v1: `{ "version": 1, "timezone": "Africa/Tunis", "subjects": [{"name":"Mathematics","color":"#06b6d4"}], "sessions": [{"kind":"university","title":"Calculus","subject":"Mathematics","date":"2026-10-19","start_time":"09:00","duration_minutes":90,"recurrence_rule":"FREQ=WEEKLY;COUNT=12"}] }`. Subjects are optional; a default color is supplied for new undeclared subject names. A session may instead use `subject_id` and/or offset-qualified `starts_at`; exactly one subject reference and one time representation are required. Timezone is required at document level. Unexpected fields, invalid times, foreign subjects, bad recurrence, empty or oversized batches are rejected. Max 1 MiB, 200 session series, 100 named subjects. Notes are content, not notification rules.

Architecture: portable validation reuses canonical Calendar/Subject schemas and date conversion; UI sends original JSON to `POST /api/v1/calendar/imports`; existing cookie/JWT/API-key authentication and same-origin protection remain. Adapter -> import application service -> Supabase repository -> one invoker SQL transaction. No R2 dependency, new package, auth change or second recurrence implementation.

Atomicity/retries: validate all rows before writing. A user-scoped normalized-payload SHA-256 receipt makes identical imports idempotent, including concurrent requests. Receipt, new subjects and sessions commit together or all roll back. Existing data is not edited. Changed payloads are new imports; this does not deduplicate manually-created sessions or merge changed exports. Receipt table has RLS and owner-only SELECT; writes and RPC execution are server-only. Owner-aware subject references are enforced inside the transaction.

Trust boundaries: hostile file/HTTP JSON, authenticated actor, server-only credentials, database ownership. Bound sizes and recurrence expansion, reject actor/id injection, escape text, no external URL imports, and return sanitized errors with row paths. Preserve retry state; disable repeated submits while pending. No raw file/credentials logged.

## Implementation tasks

- [x] 1. Portable contract/parser + failing-then-passing validation tests. Files: domain import schema/test and example JSON. Verify malformed JSON, limits, kinds, timezone, DST gaps, recurrence and unknown fields.
- [x] 2. Atomic import persistence + service tests. Files: import service/repository, generated migration, migration/SQL tests. Verify idempotency, rollback, owner references and minimal grants.
- [x] 3. Authenticated API adapter + endpoint/tests. Verify cookie/JWT/API-key integration, same-origin enforcement, bounded body, errors, import result and no writes on validation failure.
- [x] 4. Calendar Import button/modal/client tests. Reuse ModalFrame and Calendar tokens. Verify preview, invalid/oversize files, template download, pending/error/success and refreshed Calendar/Dashboard.
- [x] 5. Review, full regression gates, matching Supabase migration/advisors, real-browser imports/reimport/reload, documentation and preview publication.

Commands: `rtk pnpm exec vitest run <test files>`, `rtk pnpm lint`, `rtk pnpm typecheck`, `rtk pnpm test`, `rtk pnpm build`. Browser interactions through CUA only. SQL tests in explicit rollback transactions against the already linked Web Study project. Never modify the unrelated connector project or user records.

Code convention: strict TypeScript and Zod, `status: "success" | "error"` results, colocated Vitest tests, snake_case wire fields and camelCase domain fields. Example: `const result = await service.import(context.actor.userId, body);`.

Boundaries: always preserve existing work, user isolation and shared validation; no new external service, dependency, destructive migration, production merge, or unrelated UX fixes. Native Vercel git preview workflow only, not production. Rollback of additive schema: disable/remove new route/UI first; retain receipt rows until a separately authorized cleanup. No open product questions; conservative defaults above are chosen to execute without stopping.

## Progress and evidence

Planning complete; implementation begins immediately. Existing dirty `next-env.d.ts`, `.serena/`, and prior `docs/testing/` are preserved. Supabase connector targets a different project; authenticated CLI is verified linked to Web Study `qvqnztgpjludiahmboyd` and will be used instead.

Completed: backend commit `af5ba24`, UI commit `aa9d5a2`, followed by final validation-message polish and verification documentation. The additive migration was applied to the correct linked project. SQL rollback tests passed before and after deployment. Five-axis review found no outstanding feature blocker; canonical validation, atomic owner-checked persistence, bounded recurrence and lazy UI loading remain intact.

Full final local gates: 807 tests across 112 files, typecheck, production build, and lint with zero errors (one existing ModalFrame warning). Real hosted preview browser tests exercised invalid input, preview-before-write, all three kinds, details, recurrence, reload, dashboard refresh, subjects and duplicate-safe replay. Genuine JWT API checks passed anonymous 401, replay/concurrent replay 200, invalid subject/malformed JSON 422 and oversized body 413. See [verification report](../../docs/testing/CALENDAR-IMPORT-2026-10-13.md) and [feature contract](../../docs/CALENDAR-JSON-IMPORT.md).

Known limitations: no arbitrary export format/task/file imports or changed-timetable merging; production remains unchanged. The complete historical Playwright/visual suite was not run. Existing unrelated lint/security/development-dependency advisories are documented, not suppressed. Hosted browser verification used the existing authorized test account; three imported test series, one subject and one receipt remain for inspection. Vercel CLI generated a project automation bypass token during direct preview API testing; preview protection and app authentication remain enabled and the token was not logged or committed.
