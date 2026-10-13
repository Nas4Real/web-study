# Calendar JSON import verification — 2026-10-13

Feature: `calendar-json-import-v1`. Scope: additive timetable imports through Calendar and `POST /api/v1/calendar/imports`. Existing UI tokens, authentication, recurrence and tenant isolation are preserved; no new dependencies, R2 setup or production merge.

## Automated verification

- Final focused import suite: 65 tests across seven files.
- Full Vitest suite: 807 tests across 112 files, all passing.
- Typecheck: no errors. Lint: zero errors, one existing `modal-frame.tsx:103` cleanup-ref warning.
- Next.js production build: passed, including `/api/v1/calendar/imports`.
- Regression tests prove the downloadable example matches the parser and invalid local dates point at `sessions.0.date`, not a missing `starts_at` field.
- Database rollback suite passed both with the candidate migration and after applying it to linked Web Study project `qvqnztgpjludiahmboyd`. Checks transaction rollback (including a later invalid row), ownership, receipts/RLS/grants, concurrent-safe replay, existing subject retention and foreign-subject rejection. Synthetic SQL accounts/data were rolled back.
- Import RPC/receipt table: no new security advisor finding. Existing five unrelated file-RPC warnings and leaked-password protection warning remain. Performance advisors at WARN level: none.
- Production dependency audit: clean. Full audit retains existing high `braces` and moderate `postcss-selector-parser` development-tool advisories. No dependency or lockfile change.

## Real browser verification

Target: [existing Vercel branch preview](https://web-study-git-codex-navigation-optimization-plan-nas-9c1f.vercel.app/calendar). Existing populated test account, profile timezone Africa/Tunis. Default 1280×720 browser viewport; no mobile or historical visual-baseline claim.

1. Invalid JSON/session fixture is rejected before saving.
2. Valid file previews three sessions; database count was zero before confirmation.
3. Confirmed import saves three series (university, revision, exam) and one new subject.
4. University details preserve 16:00 local start, duration, location, professor and ordered notes; revision preserves focus and notes.
5. Reload retains imported sessions. Next-week recurring class and exam are visible.
6. Reimporting the unchanged file returns Already imported; no duplicate series or subjects.
7. Dashboard Today's Classes includes the effective imported occurrence; Settings includes the new subject.
8. Unavailable `subject_id` returns a useful error, retaining retry state and saving nothing.
9. Example JSON downloads successfully. Escape closes the modal and restores focus to the Import button.
10. No captured browser error/warning logs during the checks.

Evidence screenshots (local, intentionally not committed):

- `C:/Users/itsna/AppData/Local/Temp/web-study-json-import-success-2026-10-13.png`
- `C:/Users/itsna/AppData/Local/Temp/web-study-json-import-replay-2026-10-13.png`
- `C:/Users/itsna/AppData/Local/Temp/web-study-calendar-before-import-2026-10-13.png` (feature UI before data import, not an old-code baseline).

## Genuine HTTP authentication/boundary checks

The ignored local runner uses existing test credentials in memory, obtains a genuine Supabase user JWT, and supplies it through curl stdin, never process arguments or logs. Authenticated Vercel CLI access is required because ordinary external requests to the preview meet Vercel protection before reaching the app.

| Request | Observed status |
| --- | --- |
| Anonymous import | 401 |
| Authenticated JWT same-file replay | 200 |
| Two concurrent authenticated replays | 200, 200 |
| Unavailable/foreign subject | 422 |
| Malformed JSON | 422 |
| Body over 1 MiB | 413 |

Browser success also exercises cookie auth; existing API-key integration is covered by boundary unit tests, not a new live API-key credential. Vercel CLI automatically generated a project automation bypass token for direct preview API verification. App authentication and preview protection remain enabled; neither token nor JWT was printed, stored in the runner, or committed.

## Retained test data and limitations

The authorized populated test account retains three series titled `UX IMPORT 2026-10-13 — Weekly workshop`, `UX IMPORT 2026-10-13 — Practice session`, and `UX IMPORT 2026-10-13 — Physics quiz`; subject `UX Import 2026-10-13` and one receipt. No existing user data was edited or permanently deleted. Physics retains its original `#facc15` color. Invalid-row title count is zero.

The importer accepts its documented v1 schema, not arbitrary JSON exports. It does not import tasks/files, replace a timetable, or deduplicate changed files against manually created sessions. Recurring series count toward the 200-row limit, not expanded occurrences. An unchanged file remains a receipt replay even after deleting its imported sessions.

The full historical Playwright suite and deterministic pixel comparisons were not run; real interactive browser checks were through CUA. A local env-loader server launch was blocked by tool policy, so real runtime checks used the hosted preview. Production at `https://web-study-pearl.vercel.app` is unchanged. Unrelated `next-env.d.ts`, `.serena/` and the earlier UX report remain untouched.
