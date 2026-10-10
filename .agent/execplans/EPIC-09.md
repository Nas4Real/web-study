# ExecPlan EPIC 09: Navigation and interaction performance

## Purpose / user-visible outcome

Navigation promptly acknowledges the destination, and its usable content arrives
sooner. Task/session actions update their relevant surfaces with fewer duplicate
reads. Calendar/Tasks may use client JSON queries if traces show they need them.

## Source contracts

Read `AGENTS.md`, `.agent/PLANS.md`, the architecture, Epic 09, its spec and the
active story. Relevant sources are:

- `_bmad-output/planning-artifacts/specs/spec-navigation-performance.md`
- `_bmad-output/planning-artifacts/epics/epic-09-navigation-and-interaction-performance.md`
- `docs/API-AUTHENTICATION.md`
- `_bmad-output/implementation-artifacts/tests/10-accessibility-performance.md`
- Existing Task Details, Session Details and recurrence contracts.

## Non-goals

No full SPA rewrite, automatic UI-through-API migration, new design drafts,
new dependency/framework migration, paid monitoring, broad security campaign,
notifications, developer settings, account deletion or storage activation.

## Current state

- Workspace layout: `src/app/(workspace)/layout.tsx` awaits settings context.
- Pages await loaders under `src/server/study/*-page-loader.ts`.
- Contexts: `settings-request-context.ts`, `task-request-context.ts`,
  `calendar-request-context.ts`; auth in `src/server/auth/request-auth.ts`;
  SSR client in `src/lib/supabase/server.ts` and refresh in `proxy.ts`.
- Sidebar Links and search live in `src/features/shell/`.
- No workspace route loading boundary is currently present.
- Details use separate page-mounted providers in `use-task-detail.tsx` and
  `use-session-detail.tsx`. Page close/success handlers sometimes refresh RSC
  content even without mutations.
- Existing resource APIs live under `src/app/api/v1`; shared adapters and
  services are under `src/server/api` and `src/server/study`.
- Previous local fixture timing is exploratory. Hosted timings remain unknown.

## Implementation plan

1. **09-01 baseline:** Create a repeatable trace/report procedure for a production
   build and real hosted auth. Save environment/sample metadata and a sanitized
   experiment ledger under `docs/performance/`. Mark suspects as hypotheses.
2. **09-02 reads:** Introduce the smallest shared request-scoped identity/profile
   helper. Preserve `auth.getUser()` semantics for email unless validated claims
   are explicitly shown to meet the same requirement. Do not equate proxy checks
   with render auth. Count actual outbound reads and parallelize Calendar's
   independent subject/occurrence reads. Remeasure this change alone.
3. **09-03 navigation:** Add a lightweight loading boundary below the reused
   workspace layout. Keep layout runtime waits outside the boundary in mind.
   Cover sidebar and search, stalled reads, interrupted navigation, and mobile.
   Validate built-in shell prefetch with `next build`/`next start`, since dev
   does not reproduce production automatic prefetch. Introduce full prefetch
   only when intent and measured costs justify it. Remeasure separately.
4. **09-04 synchronization:** Establish one authenticated workspace query cache
   if traces justify reuse, with actor-scoped keys and explicit freshness/clear
   rules. Hydrate initial server data where needed without an immediate duplicate
   query. Replace read-only-close refreshes with mutation-driven invalidation.
   Preserve server reconciliation and prevent race/rollback corruption.
5. **Decision checkpoint:** Measure Calendar date/view changes and task flows.
   For 09-05/09-06, write the evidence and implement/defer verdict before work.
   Rendering/JS issues require a targeted measured fix, not blind data migration.
6. **09-05 conditional Calendar:** Reuse shared bounded range projection and
   existing occurrence rules behind a read adapter. Cache range queries with
   actor/bounds/timezone/view identity. Ensure rapid date/view changes and browser
   history cannot show mismatched data. No duplicate RSC and JSON fetch per change.
7. **09-06 conditional Tasks:** Reuse server read models and API projections;
   preserve description, grouping, subject and timezone information. Seed the
   query from server data and confirm/rollback optimistic mutations. Do not
   reimplement business rules in browser code or break existing API consumers.
8. **09-07 release:** Compare identical baseline/candidate scenarios, retain only
   justified improvements, complete regression gates, update the report/ledger,
   deploy through the existing GitHub/Vercel flow, and verify hosted auth/navigation.

## Database / migration plan

No schema migration is planned. If traces identify a query bottleneck, first
inspect query counts, bounds and existing indexes. Any needed index change gets
a separate documented migration, query-plan evidence, RLS checks and rollback
strategy; avoid speculative indexes or dropping constraints.

## Security checks

Request memoization is bounded to a render request, never across users. Browser
cache ownership is bound to the verified workspace actor and reset on auth loss,
sign-out or account replacement. Each server operation independently enforces
auth and ownership. Public cache headers remain private/no-store as appropriate.
Keep Origin protection for cookie API writes and do not expose credentials in
bundles, traces or reports. Test account switching and negative owner references.

## UI parity checks

Reuse the current GetStudy sidebar and approved Dashboard/Tasks/Calendar/
Documents/Settings layout and tokens. The user's later direct-code preference
overrides older missing-state draft requirements: do not generate new designs.
Loading feedback should retain meaningful screen geometry, focus behavior and
reduced-motion support. Compare completed screens at 1440px and 320px with the
existing Playwright baselines. Do not update baselines to conceal a regression.

## Verification

After relevant implementation slices:

```text
rtk pnpm lint
rtk pnpm typecheck
rtk test pnpm test
rtk test pnpm exec playwright test tests/e2e/calendar-data.spec.ts --project=chromium
rtk test pnpm exec playwright test tests/e2e/task-details.spec.ts --project=chromium
rtk test pnpm exec playwright test tests/e2e/signed-in-usability.spec.ts --project=chromium
rtk err pnpm build
```

Confirm test filenames exist before invoking; add a focused navigation/cache
suite for delayed reads, cancellation, auth change and rollback. Run relevant
visual baselines and critical browser journeys at final integration. For timing,
use a production build and hosted account; report >= 10 samples/scenario with
commit and environment metadata. Do not enable development auth in production.

## Progress log

- [x] 2026-10-10: Plan/spec/epic and seven stories prepared; sprint index extended.
- [ ] 09-01 production baseline and reproducible report.
- [ ] 09-02 request reads optimized and measured.
- [ ] 09-03 navigation feedback/prefetch verified and measured.
- [ ] 09-04 cache freshness/mutation synchronization verified and measured.
- [ ] 09-05 implement/defer verdict and required work complete.
- [ ] 09-06 implement/defer verdict and required work complete.
- [ ] 09-07 final evidence, gates and hosted release.

## Decisions / discoveries

- Retain initial Server Component reads. Conditional client querying is an
  extension of the existing architecture, not proof that JSON is faster.
- Local fixture timings cannot establish a production root cause.
- Loading feedback and actual-content timing must be reported independently.
- This plan follows existing BMAD artifacts; no installed BMAD skill was found.
- Planning-only delivery does not start any runtime optimization automatically.

## Completion evidence

Planning artifacts are complete. Runtime measurements, implementation tests,
production improvements and release evidence are pending story execution.
