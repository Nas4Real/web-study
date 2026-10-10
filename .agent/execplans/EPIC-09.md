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
- A lightweight workspace route loading boundary is present below the layout;
  the layout's initial authentication/profile wait remains outside it.
- Details use separate page-mounted providers in `use-task-detail.tsx` and
  `use-session-detail.tsx`. Page close/success handlers sometimes refresh RSC
  content even without mutations.
- Existing resource APIs live under `src/app/api/v1`; shared adapters and
  services are under `src/server/api` and `src/server/study`.
- Previous local fixture timing is exploratory. Real-auth hosted/local exploratory
  timings are captured in `docs/performance/BASELINE-2026-10-10.md`.

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
- [x] 2026-10-10: First 09-01 slice: isolated real-auth accounts, sanitized browser
  profiler, local production runner and provider-call diagnostics implemented.
- [x] 2026-10-10: Captured 400 hosted and 160 local exploratory samples; saved
  sanitized aggregate report, limitations and experiment ledger. Quality gates passed.
- [x] 2026-10-10: Completed isolated hosted empty-account repeat (200 samples).
  Warm-sidebar content p95 remains 710–994 ms; see isolated report.
- [x] 2026-10-10: Completed isolated hosted populated-account navigation (200
  samples). Warm-sidebar content p95 792–1255ms; every route misses 700ms.
  No long tasks observed; warm paint-after-readiness p95 <= 6.785ms.
  See `docs/performance/ISOLATED-POPULATED-NAVIGATION-2026-10-10.md` for all groups
  and stream/readiness limits. Provider/precise interaction work remains pending.
- [x] 2026-10-10: Captured 80 real-auth interaction samples. Read-only Session
  Details close sends a same-route non-prefetch GET, unlike Task Details close.
  Assertion timings are upper bounds, not exact React/paint measurements.
- [x] 2026-10-10: Captured 100 local production initial-entry samples across both
  accounts. Every correlated document has 1 profile and 1 auth-user call; no
  duplicate-read evidence. All 20 Calendar samples serialize subject before
  occurrence calls; subject median 79–96ms. See initial-provider report.
- [x] 2026-10-10: Early independent 09-04 close-handler candidate: local browser
  regression failed with one route GET before and passes with zero after.
  Calendar/Dashboard read-only close restores focus; edit/delete still reconcile.
- [x] 2026-10-10: Resolved existing Session Details screenshot-height mismatch.
  Browser geometry identified the 56px mobile shell header plus 12px gap above
  a calendar still reserving desktop viewport height. Subtract that 68px only
  below `lg`; preserve desktop height and the 680px minimum for short screens.
  Direct geometry regression fails before (870/1094px), passes after
  (802/1026px). All 21 Calendar/session checks, including unchanged 320/768/1024px
  Session Details snapshots, pass. No snapshots updated or content hidden.
- [ ] 09-02 request reads optimized and measured.
- [x] 2026-10-10: Narrow 09-02 Calendar experiment retained: owner/window-aware
  subject and occurrence reads overlap; same five provider calls. Matching
  20-sample local production entries: provider-span median 437→348ms, observed
  readiness 650→495ms. Both ten-sample batches improve; controls vary. All 18
  loader tests, full units/typecheck/build and 27 browser/visual checks pass.
  See Calendar comparison report; hosted/warm-navigation gains remain unverified.
- [ ] 09-03 navigation feedback/prefetch verified and measured.
- [x] 2026-10-10: Narrow pending-feedback candidate: Next link status and search
  transition acknowledge Calendar navigation. Two 10-sample batches per input
  and variant (80 local real-auth production samples) reduce feedback p95 from
  >500ms to <26ms. One RSC request per sample remains. Content tail/non-regression
  is unresolved; no actual-content speedup or hosted claim. All 33 focused
  browser checks and unchanged visual baselines pass after replacing two flaky
  network-idle waits with explicit UI readiness, retaining all assertions.
  Loading boundary, initial-layout and production/hosted prefetch remain pending.
- [x] 2026-10-10: Narrow 09-03 loading boundary: genuine-auth local production
  held Calendar response shows a useful cached fallback; desktop/mobile
  interruption, search focus, 320px overflow and anonymous redirect checks pass.
  Both desktop control/candidate already send ten prefetch attempts in a finite
  three-second window; no completed provider reads attributed to those IDs.
  Repeat shell p95 43.2/47.2ms (sidebar/search), but search content worsens against
  this control. Keep content/all-route/hosted gates open; no deployment claim.
  Full 654 units/typecheck pass, lint has only its existing warning; all 51
  focused navigation/workspace/Calendar/session checks pass without retries or
  snapshot updates. Six boundary rendering tests include unknown-path privacy.
  Final local production build and staged whitespace check also pass.
  See `docs/performance/WORKSPACE-LOADING-2026-10-10.md`.
- [x] 2026-10-10: 80-sample correlated candidate/control/control/candidate
  Calendar repeat: content medians nearly equal, provider/content correlation
  0.989–0.996, one destination RSC and four provider calls per sample, no errors
  or long tasks. Candidate content tails remain worse; no new product fix or
  no-regression/release claim. Preserve useful fallback candidate under review.
  Three diagnostic red→green tests cover old-log collision, missing correlation
  and sanitized projection. Boundary/test restored exactly after controls.
  Full 657 units/typecheck pass; lint has only its existing warning. Control
  and restored candidate production builds pass; no application diff.
  See `docs/performance/LOADING-CONTENT-ATTRIBUTION-2026-10-10.md`.
- [ ] 09-04 cache freshness/mutation synchronization verified and measured.
- [x] 2026-10-10: Extended the local genuine-auth shell diagnostic across all
  five routes and desktop/320px keyboard search. All ten scenarios pass held
  fallback, interruption, completed content, back/forward and anonymous entry;
  search also retains focus without overflow. Six allowlist tests and full units,
  typecheck and lint pass (existing warning). Inspected Dashboard desktop and
  Settings mobile screenshots. Captured finite prefetch windows/provider counts;
  no global bound, timing/p95 or hosted-success claim. The protected automatic
  preview reaches app sign-in in Codex but Vercel login in the isolated profiler.
  Existing synthetic accounts are verified; hosted authenticated checks remain
  pending. No duplicate accounts, merge or production deployment. See
  `docs/performance/ALL-ROUTE-LOADING-2026-10-10.md`. Final genuine-auth local
  production build and whitespace check pass; local production server stopped.
- [ ] 09-05 implement/defer verdict and required work complete.
- [x] 2026-10-10: Hosted signed-in smoke completed in Codex's authorized browser
  with the existing verified populated synthetic account; no duplicate account
  creation or protection changes. All five routes load via desktop sidebar and
  320px keyboard search; destination-labelled mobile loading, focus/no overflow,
  desktop/mobile history and mobile competing navigation pass. Console checks
  capture no warnings/errors. No record edits or cookie/token exports. Viewport
  reset afterward. This is not controlled hosted timing or content non-regression;
  09-03 remains open. See hosted-loading-smoke report.
- [ ] 09-06 implement/defer verdict and required work complete.
- [ ] 09-07 final evidence, gates and hosted release.

## Decisions / discoveries

- 2026-10-10: Extend the genuine-auth production shell diagnostic to all five
  destinations, desktop sidebar (including secondary Settings) and 320px
  keyboard search. Keep route/source/interruption selection allowlisted and
  test it before running. Hold only destination non-prefetch RSC; check fallback,
  interrupted destination, mobile focus/overflow and fresh anonymous entry.
  Inspect the existing GitHub-triggered preview read-only before hosted checks;
  do not merge, redeploy production or weaken deployment protection.

- 2026-10-10: Investigate the loading candidate's content-timing gap with a
  candidate/control/control/candidate local production repeat, ten warm Calendar
  samples per input per batch. Extend only the ignored/local diagnostic path
  with per-request provider correlation, excluding pre-run log rows and missing
  attribution rather than calling it zero. Keep the same profiler patch in
  both builds; temporarily remove only the boundary and its rendering test for
  control, then restore exactly. No tests/builds alongside timing captures.
  Attribute waits before any new product optimization; retain content/hosted
  gates unless the resulting evidence supports closure.

- Continue 09-03 with a generic, destination-labelled skeleton below the existing
  authenticated layout. Add rendering tests first, then verify the boundary with
  real-auth production shell prefetch and a held Calendar navigation response.
  Keep layout/context/Link defaults unchanged. Count prefetch resource reads and
  report initial entry separately; do not infer that this boundary covers auth.

- 2026-10-10: Start 09-03 with a narrow pending-feedback slice. Test withheld
  RSC responses before changing shell/search. Use Next's link pending state and
  a React transition for search rather than maintaining a second navigation
  router. Add the lightweight workspace boundary separately, keeping initial
  layout authentication outside it. Default Link prefetch remains unchanged;
  production request-count and timing evidence are still required before closing
  the story. Completed geometry must remain identical; no artificial delay.

- User authorized the next narrow 09-02 Calendar parallel-read slice after the
  initial-provider findings. Full 09-01 remains open; this independent experiment
  does not close its interaction/hosted-attribution gaps. Keep context/auth reads
  unchanged because measured duplicate outbound reads are absent. Compare local
  production baseline/candidate with real populated auth, repeat samples and
  provider overlap evidence; preserve visual-fixture early return and all errors.

- While full 09-01 remains open, isolate the independent read-only session-close
  defect as an early, narrow 09-04 experiment. Split close from edit/delete success
  on Calendar and Dashboard; require a failing browser regression and preservation
  of mutation reconciliation. This does not start broad cache/auth changes or
  mark 09-02/09-03/09-04 complete. Initial hosted request-count baseline is captured.

- Retain initial Server Component reads. Conditional client querying is an
  extension of the existing architecture, not proof that JSON is faster.
- Local fixture timings cannot establish a production root cause.
- Loading feedback and actual-content timing must be reported independently.
- This plan follows existing BMAD artifacts; no installed BMAD skill was found.
- Planning-only delivery does not start any runtime optimization automatically.
- The current approved sidebar exposes navigation search only in the mobile
  header; profile sidebar at 1440x900 and search at 375x812 separately.
- Supabase connector project access was denied; the existing dashboard session
  allowed explicitly approved test-account creation and reading the public key.
- Real-auth production runs reproduce slow navigation. Some RSC streams are
  cancelled after consumption: headers/first byte are not full-body completion.
- Initial profiling runs overlap each other and some quality checks. Keep them
  exploratory and repeat in isolation before making optimization gain claims.
- Hosted test-account chapter creation returned 503. No unrelated API fix is
  bundled into the profiling slice; record it for investigation.
- Deployment inspection confirms Vercel `iad1`; Supabase Infrastructure confirms
  `eu-central-1`. Co-location is a hypothesis, not a default infrastructure change.
- Local sibling navigation traces show one profile read and no auth-user call
  per observed Tasks/Calendar RSC request. Initial-entry follow-up now records
  one profile and one auth-user call across all five routes/both accounts.
  Defer speculative identity/profile memoization; first test Calendar independent
  reads in 09-02. Local instrumentation is not hosted-provider attribution.

## Completion evidence

Planning and the first diagnostic tooling slice are complete. Story 09-01 is
in progress; controlled baseline/interaction coverage, production improvements
and release evidence remain pending. See `docs/performance/README.md`.

The independent session-close candidate passes its red→green browser regression,
15 relevant functional/Calendar checks, full units, typecheck, lint (existing
warning), production build and diff check. Calendar/Dashboard close callbacks no
longer refresh; mutation-success callbacks preserve refresh. No styling/auth/cache
changes in that slice. A subsequent responsive Calendar sizing correction resolves
the pre-existing visual mismatch; all 21 relevant browser checks now pass. No
production speedup or release claim; full Epic 09 integration gates remain pending.
