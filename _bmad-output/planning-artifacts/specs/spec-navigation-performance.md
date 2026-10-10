# Engineering Spec - Epic 09: Navigation and interaction performance

Status: planned; implementation has not started
Date: 2026-10-10

## Purpose and scope

Make authenticated navigation feel responsive for the private two-user beta,
and reduce the time until destination data is usable. Preserve the existing
Next.js Server Component foundation and use client queries selectively when
measurements justify them. This is an optimization milestone, not a new feature
or a production-hardening expansion.

The user requested planning after observing roughly one second between seeing
request output in DevTools and seeing the destination screen. The user has also
requested direct coding rather than generating new Superdesign drafts. Future
loading states reuse the existing approved structure and design tokens; they
must not redesign completed screens.

## Contract sources

- `../architecture.md`, especially sections 2, 3, 4, 5, 6 and 9.
- `../engineering/DOMAIN-SERVICES.md` and `CALENDAR-RECURRENCE.md`.
- `../../../docs/API-AUTHENTICATION.md`.
- `../../implementation-artifacts/tests/10-accessibility-performance.md`.
- `../../../AGENTS.md` and `../../../.agent/PLANS.md`.
- Next.js 16.3.8 bundled docs: `loading.md`, `link.md`, `prefetching.md`,
  `layout.md`, and React request memoization guidance available at implementation.

## Evidence and uncertainty

Observed source facts:

- All five workspace route pages await server loaders before returning content.
- `src/app/(workspace)/layout.tsx` awaits `resolveSettingsRequestContext()`.
- No workspace `loading.tsx` is currently present; sidebar Links use defaults.
- Without Cache Components, Next.js normally skips full automatic prefetch of
  dynamic routes without a loading boundary. A boundary enables shell prefetch,
  not guaranteed full-data prefetch or faster database queries.
- Layout and page contexts construct separate clients and load profiles;
  the settings context also calls `auth.getUser()`. Count actual calls in
  profiling: repeated source calls do not prove separate outbound requests.
- Calendar reads subjects before occurrences even though those reads can be
  independent after context and range resolution.
- Task and session detail queries use page-mounted QueryClient providers.
- Several dialog close and mutation paths call `router.refresh()`; Calendar
  detail close refreshes even after a read-only visit.
- `/api/v1` supports cookie sessions, verified bearer JWTs, and personal keys.
  Existing web detail queries currently use Server Actions.

Earlier exploratory measurements used local development and fixture auth/data,
after warming the routes. They reported 162-261 ms total navigation and 26-83 ms
between RSC completion and a polling assertion detecting the next heading.
They are not production paint traces, do not include hosted Supabase latency,
and do not rule out the user's rendering issue. The exploratory script was
removed. No production timing baseline is available yet.

## Measurement contract

Story 09-01 must capture at least ten samples per tested transition and separate
first visits from warm repeat visits. Cover Dashboard, Tasks, Calendar,
Documents and Settings, sidebar and search navigation, Calendar date/view
changes, and task/session mutation flows. Use an empty and a modest populated
test account without changing either real user's data.

Record commit, environment, browser/version, viewport, CPU/network settings,
dataset size, Vercel/Supabase regions, and cold/warm conditions. Dev fixture
results verify behavior only. Use a production build locally for controlled
traces and an authenticated hosted run for real server/network costs. Never
enable the development authentication bypass on a production deployment.

Capture these separate milestones:

1. User click/input and first visible destination feedback.
2. RSC/API headers, first byte, and completed response body.
3. Route JS download/parse/evaluation, long tasks, React commit, and next paint.
4. Destination content ready for the intended task (not just a heading).
5. Authentication/profile/provider call counts and sequential dependencies.

A request-finished event plus a heading assertion is useful exploratory data,
but must not be labelled a paint trace. Do not log tokens, cookies, emails,
query strings, document names, or raw response bodies in performance reports.

## Initial performance budgets

These are acceptance targets to validate in 09-01, not existing guarantees.
Report median and nearest-rank p95 per scenario; ten samples are an initial
engineering sample, not a claim about population-wide reliability.

| Scenario | Initial target under the recorded reference conditions |
| --- | --- |
| Warm sidebar/search click to visible destination feedback | p95 <= 200 ms |
| Completed destination data and required JS to next meaningful paint | p95 <= 200 ms |
| Warm repeat navigation to usable content | p95 <= 700 ms; if baseline exceeds this, first require >= 30% improvement beyond observed variance |
| Task optimistic completion/subtask feedback, where introduced | p95 <= 100 ms, followed by confirmation or rollback |
| Read-only detail close | No data mutation or forced full-page refresh |
| Client work on measured navigation path | Investigate individual tasks > 50 ms; no unexplained sustained ~1 s main-thread blockage |

Cold serverless/database costs are reported separately; do not hide them by
comparing a cold baseline with a warmed candidate. A baseline failure is not
permission to lower the targets silently. Record any unmet target and the
remaining bottleneck. Skeleton timing and actual-content timing are separate.

## Architecture decisions

1. Keep authenticated initial reads in Server Components. Loading boundaries
   below the shared layout allow destination feedback while data streams.
   Address blocking layout reads explicitly; `loading.tsx` does not wrap its
   own layout. Verify both sibling navigation and initial entry.
2. Deduplicate actor/profile/client work within one server render request using
   supported request-scoped memoization. Do not use process-wide promises,
   module-global Supabase clients, or public/shared caches for user data.
   Proxy auth and Server Component auth remain separate trust boundaries.
3. Parallelize independent reads only. Preserve the subject/range/ownership
   prerequisites of dependent operations.
4. Start with built-in shell prefetch. Measure intent-based full prefetch only
   if needed; cap work to likely destinations. Do not fetch all Calendar
   ranges or every screen's complete data in a background loop.
5. Share browser query state only within the authenticated workspace session.
   Query identities include actor plus task ID, or actor plus series ID and
   original start; range keys also include bounds, timezone and view as needed.
   Set an explicit freshness policy, update/invalidate on successful mutations,
   and clear on sign-out, auth loss, or actor replacement. Never persist this
   cache across users. In-memory caching is not public HTTP caching.
6. Retain verified actor resolution and owner-scoped services on every server
   operation. Browser cache keys and cached authorization are not security
   controls. Existing cookie mutation Origin checks continue to apply.
7. Calendar/Tasks JSON fetching is conditional. Reuse existing APIs where their
   contracts fit. If a page projection is missing, add a bounded first-party
   read adapter around a shared application read service; don't duplicate
   grouping, timezone, recurrence or ownership rules in a hook. Keep external
   API responses backward compatible. Document the adapter decision before code.

## Delivery sequence and decision gates

Five core stories: 09-01 baseline, 09-02 request reads, 09-03 navigation shell,
09-04 cache/mutation synchronization, 09-07 final evidence and release.

After 09-02 and 09-03, remeasure against 09-01 using the same conditions.
After 09-04, assess Calendar and Tasks separately. Execute 09-05 or 09-06 only
when a representative flow still misses the budgets and tracing indicates
the route roundtrip/cache behavior is the relevant cause. A rendering bottleneck
instead requires its own measured component fix, not automatic API migration.
Record a justified deferred verdict when a conditional story is unnecessary.

Do not adopt Cache Components, Partial Prefetching, route stale-time experiments,
global private-data caches, paid infrastructure or deployment-region changes
as default solutions. If profiling proves a need, document a scoped follow-up.
Notifications, developer settings, account deletion and R2 activation stay deferred.

## Correctness and release requirements

- Screen structure, tokens, task/subtask independence, effective occurrence
  details, occurrence-vs-series scope, and URL back/forward behavior remain true.
- A stale response cannot overwrite a newer date/view or a confirmed mutation.
- Failed optimistic mutations roll back only their own change; controls must
  not allow racing requests to corrupt the final state.
- A profile/timezone/subject change invalidates all affected cached projections.
- Fresh accounts, populated accounts, expired sessions, sign-out/in with a
  second account, failed reads, and slow responses are explicitly verified.
- No user-specific HTML/RSC/API data enters a public cache or report artifact.
- Relevant lint, TypeScript, unit, E2E, visual and build gates pass. Auth/cache
  changes need focused isolation tests, not a new exhaustive security audit.
- Keep an experiment ledger, including reverted or inconclusive attempts.
  Every retained optimization needs comparable before/after evidence.
- Ship one story at a time and finish with a hosted smoke test and Vercel Ready
  confirmation. Story 09-07 records actual metrics, not predicted improvements.
