# ExecPlan EPIC 07: Public API and personal API keys

## Purpose / user-visible outcome

External clients can use revocable personal API keys to access the same owner-scoped Web Study services as the website through the versioned `/api/v1` contract. The normal website continues to use Supabase sessions and existing Server Actions.

## Source contracts

- `_bmad-output/planning-artifacts/PRD.md`: FR-API-01 through FR-API-03 and NFR-SEC-02.
- `_bmad-output/planning-artifacts/specs/spec-public-api.md`.
- `_bmad-output/planning-artifacts/engineering/PUBLIC-API.md`.
- `_bmad-output/planning-artifacts/API.md` and `docs/openapi.yaml`.
- `_bmad-output/planning-artifacts/epics/epic-07-public-api-and-personal-api-keys.md`.
- Story files `07-01` through `07-06`.
- Existing task, calendar, document, profile, subject, and chapter application services remain the business-rule source of truth.

## Non-goals

- Do not duplicate domain rules in route handlers.
- Do not expose Supabase secret credentials, raw stored API keys, provider errors, or cross-user resource existence.
- Do not enable R2 file transfer without complete R2 configuration.
- Do not implement deferred notification generation or account deletion as part of the API.
- Do not redesign approved application screens. Story 07-06 remains Superdesign-first.

## Current state

- The production app exposes only `/api/health` and `/api/auth/callback` as stable HTTP routes.
- Website mutations use authenticated Next.js Server Actions over owner-scoped application services.
- `docs/openapi.yaml` defines the intended `/api/v1` surface, but the routes do not exist yet.
- `SUPABASE_SECRET_KEY` and `API_KEY_HASH_PEPPER` are already reserved as server-only environment values.
- The database has no applied `api_keys` or `api_rate_windows` migration; they exist only in the historical schema draft.

## Implementation plan

1. **07-01 Personal API key backend**
   - Add an imperative migration for private `api_keys` infrastructure with no browser-role grants.
   - Define key contracts and cryptographic token generation/verification.
   - Add a repository boundary, Supabase server-only adapter, and owner-scoped service for create/list/revoke/verify.
   - Add authenticated session-only management actions after service tests pass.
2. **07-02 API pipeline**
   - Add bearer parsing, request IDs, stable error envelopes, actor resolution, and an atomic Postgres rate-window adapter.
   - Add route-handler integration tests for missing, malformed, revoked, expired, and rate-limited keys.
3. **07-03 Core resources**
   - Add cursor-paginated subject/chapter/folder/task routes as thin adapters over shared services.
   - Add task detail, transition, and nested subtask contract tests.
4. **07-04 Calendar**
   - Add bounded occurrence reads, series CRUD, and explicit occurrence operations keyed by `series_id + original_start`.
5. **07-05 Remaining resources**
   - Add profile/storage and available document metadata routes.
   - Return a stable unavailable response for R2-dependent operations while storage is unconfigured.
   - Add notification routes only when the underlying Epic 06 service exists; otherwise record the contract as deferred instead of inventing a second implementation.
6. **07-06 Developer settings**
   - Inspect/create the missing state in the existing Superdesign project, then implement session-authenticated create/list/revoke controls with one-time secret display.

## Database / migration plan

- Use the existing imperative migration workflow.
- `api_keys`: UUID primary key, owner FK, normalized name, unique non-secret prefix, HMAC digest, optional expiry/revocation/last-used timestamps, created timestamp, and owner/active lookup indexes.
- `api_rate_windows`: key/window primary key with bounded non-negative counter and cascading key FK.
- Enable RLS on both tables, revoke `public`, `anon`, and `authenticated`, and grant only the minimum server role access required by the server-only adapter.
- Add atomic functions only where concurrency requires them; lock `search_path`, revoke `PUBLIC`, and grant explicitly.
- Migrations are additive. Rollback is dropping the new functions/tables after disabling `/api/v1`; no existing user data is rewritten.

## Security checks

- Generate at least 256 bits of random secret material; show it once.
- Persist only a short lookup prefix plus an HMAC-SHA-256 digest using `API_KEY_HASH_PEPPER`.
- Compare digests with constant-time comparison.
- Never log bearer tokens, raw keys, Supabase secret keys, or provider exception text.
- Every route resolves an `ActorContext` before parsing resource identifiers and every service query includes `userId`.
- Foreign and missing resources use the same non-enumerating response.
- Apply bounded input sizes, cursor/range limits, rate limiting, and stable error envelopes.

## UI parity checks

- Stories 07-01 through 07-05 have no approved-screen changes.
- Story 07-06 is explicitly Superdesign-first and must reuse the existing project without changing unrelated states.

## Verification

- Focused Vitest command for every RED/GREEN slice.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` at every story boundary.
- Supabase migration tests plus positive/negative key ownership checks and database advisors for migration stories.
- HTTP contract tests for every `/api/v1` route, including unauthenticated, malformed, cross-user, provider-failure, and retry cases.
- Production smoke tests only after a complete story is merged and deployed.

## Progress log

- [x] Reconcile BMAD Epic 07, stories, engineering contract, OpenAPI draft, and current implementation.
- [x] 07-01 Personal API key backend.
- [x] 07-02 API authentication, rate limit, and error pipeline.
- [x] 07-03 Tasks/subjects/chapters/folders API.
- [x] 07-04 Calendar API including occurrence operations.
- [ ] 07-05 Files/notifications/profile/storage API.
- [ ] 07-06 Developer/API Settings UI.

## Decisions / discoveries

- The previous private-beta decision deferred all of Epic 07; the user explicitly restored it on 2026-10-08.
- The OpenAPI file is a contract draft, not evidence of implemented routes.
- Supabase's current server guidance prefers `SUPABASE_SECRET_KEY` over the legacy service-role JWT; the server-only adapter will follow that guidance.
- Current Supabase Data API defaults do not auto-expose new public tables. The API infrastructure tables intentionally remain unexposed to browser roles.
- The initial public API policy is 120 requests per 60-second fixed window per personal API key. The adapter boundary permits later replacement without changing route handlers.
- Error payloads follow `docs/openapi.yaml`: `request_id` is nested inside `error`, and every response also carries `X-Request-ID`.
- Task creation does not advertise `Idempotency-Key` until a durable actor/key/request-hash store exists; explicit complete/reopen and subtask completion mutations remain retry-safe.
- Session-series creation likewise does not advertise `Idempotency-Key` without durable persistence. Occurrence modification/cancellation uses the canonical atomic upsert and is retry-safe by original occurrence identity.

## Completion evidence

- **07-01:** migration `20261008172409_personal_api_keys.sql` applied to hosted Supabase project `qvqnztgpjludiahmboyd`; 35 focused tests plus the full unit suite, typecheck, and build pass; lint has zero errors and one unrelated pre-existing warning; hosted security/performance advisors show no new finding. Vercel Production and Preview have the paired server-only Supabase secret key and API-key hash pepper. Local pgTAP remains unavailable while Docker Desktop is stopped.
- **07-02:** migration `20261008175956_api_rate_windows.sql` applied after a clean dry run; hosted SQL proved atomic allow/allow/reject behavior, invalid-input rejection, and browser-role denial. Twenty-one focused tests plus the full unit suite, typecheck, lint, and production build pass. Performance advisors are clean; security advisors show no finding from the new invoker function.
- **07-03:** subject, chapter, folder, and task `/api/v1` resources are implemented with strict validation, deterministic keyset pagination, owner-scoped services, normalized errors, full Task Details, explicit complete/reopen operations, and nested subtask create/update/delete. Migration `20261009100201_allow_server_api_service_operations.sql` was dry-run and applied to hosted project `qvqnztgpjludiahmboyd`; hosted rollback probes proved service-role Task/Chapter creation, invoker security, locked search paths, and anon denial. Forty-one focused tests, the full unit suite, typecheck, lint, and production build pass; lint retains one unrelated pre-existing modal warning.
- **07-04:** session-series CRUD, bounded effective occurrence listing, effective occurrence detail, and one-occurrence modify/cancel routes are implemented over the existing Calendar and Session Detail services. Migration `20261009174015_allow_server_api_calendar_exceptions.sql` was dry-run and applied to the hosted project; metadata verification proved invoker security, an empty search path, service-role execution, and anon denial, while a rolled-back service-role occurrence write returned one row. Fifty-three focused tests, the full unit suite, typecheck, lint, and production build pass. Advisors report no new Calendar finding; existing file-function and leaked-password warnings remain outside this story.
