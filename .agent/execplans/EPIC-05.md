# ExecPlan EPIC 05: Documents folders and R2 storage

This ExecPlan is intentionally executable story-by-story. Do not collapse it into one giant implementation.

## Context

Read `AGENTS.md`, the PRD, architecture, engineering index, this epic, and each story before coding.

## Milestones

1. `05-01` Chapters and hierarchical folders
2. `05-02` R2 client private bucket configuration
3. `05-03` Atomic quota reservation and upload intents
4. `05-04` Upload completion verification and cleanup
5. `05-05` Documents UI search sort recent and navigation

## Verification

At every story boundary run the relevant lint, typecheck, unit/integration, E2E, build, RLS, and screenshot gates. Make a small coherent commit only after verification.

## Design-block rule

If a story is marked `ready-superdesign-first`, inspect the live Superdesign project first. If the required state is absent, create/iterate it in that same project, then implement from the resulting draft.

## Progress

- `05-05` complete on 2026-10-06: preserved the approved Documents root baseline and wired authenticated ready-file data, search, type filtering, deterministic sorting, recent files, and Documents → Subject → Chapter/folder navigation. Added owner-scoped list/move/download/delete service and Supabase adapters plus idempotent logical deletion that releases quota once and queues physical R2 cleanup. All 500 application tests, 168 pgTAP assertions, production build, responsive checks, interaction E2E, and the approved visual baseline pass. Live R2 upload/download E2E remains deferred until credentials are connected. Count is now 29/45 complete, 16 remaining. Next: `06-01` Dashboard aggregation service.

- `05-04` complete on 2026-10-06: added idempotent R2 HEAD verification, locked reserved-to-used quota finalization, stable expiry/verification/quota error mapping, and a private bounded cleanup queue with skip-locked claims and capped retries. Authenticated completion remains owner-scoped; global expiry and cleanup functions are service-role only. A real two-connection test proves concurrent completion retries count actual bytes exactly once. All 152 pgTAP assertions, the 28 focused tests, production dependency audit, and `pnpm check` with 490 tests/build pass. Live R2 integration remains deferred until credentials are available. Count is now 28/45 complete, 17 remaining. Next: `05-05` Documents UI search, sort, recent, and navigation.

- `05-03` complete on 2026-10-06: added strict upload validation, private file/intent metadata, owner-aware location constraints, and a least-privilege security-definer reservation RPC that locks each profile quota row before atomically reserving bytes and creating pending metadata. Added the provider-validating Supabase repository and `DocumentService.createUploadIntent`, which signs exact-Content-Type 10-minute PUT URLs only after the reservation transaction commits and exposes stable sanitized errors. All 124 pgTAP assertions, the real two-connection quota race, production dependency audit, and `pnpm check` with 478 tests/build pass. Live R2 remains deferred until credentials are available. Count is now 27/45 complete, 18 remaining. Next: `05-04` upload completion verification and cleanup.

- `05-02` complete on 2026-10-06: added the server-only R2 object-store adapter with pinned AWS SDK v3 dependencies, strict server-environment validation, opaque UUID object keys, exact Content-Type-bound PUT signing, at-most-10-minute GET/PUT bearer URLs, and sanitized HEAD/delete operations for later completion and cleanup stories. Documented private-bucket exact-origin CORS without browser delete access or wildcard origins. The 12 focused tests, dependency audit, and `pnpm check` with 468 tests/build pass. No R2 credentials are configured locally, so the optional dev-bucket integration was unavailable. Count is now 26/45 complete, 19 remaining. Next: `05-03` atomic quota reservation and upload intents.

- `05-01` complete on 2026-10-06: added owner-scoped chapters and hierarchical folders with atomic editable `Cours`/`TD`/`Resume` starter rows, owner-aware composite foreign keys, restrictive dependency deletion, case-insensitive scoped names, explicit Data API grants, and full RLS. Per-owner advisory locking plus an invoker trigger prevents self/ancestor cycles and inconsistent subject/chapter moves under concurrent writes. Strict domain contracts, application services, and provider-validating Supabase repositories expose stable non-enumerating and conflict errors. The focused 18-test suite, local migration reset, all 103 pgTAP assertions, and `pnpm check` with 460 tests/build pass. Database lint adds no finding; the existing Calendar immutable/stable warning remains. Count is now 25/45 complete, 20 remaining. Next: `05-02` private R2 client configuration.
