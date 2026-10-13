# Cache lifecycle verification — 2026-10-11

## Outcome and scope

Four rapid-subtask browser regressions and three genuine-auth same-tab account
switch scenarios pass on the existing application. No new application defect was
reproduced, so this slice changes tests/diagnostics and documentation only. It
does not establish a performance improvement or complete story 09-04.

Application under test: `eb4d44c00db89e8ab8cda1e42355e75f9859ac65`, with this
slice's uncommitted diagnostic/tests. Account switching used a local production
build at `http://localhost:3100`, Chromium `153.0.8010.12`, 1440×900 and
`Africa/Tunis`. The successful report was captured at
`2026-10-11T15:25:40.846Z`. Credentials stayed in ignored local environment files;
no auth state, response bodies, tokens or raw errors were exported.

## Rapid mutation coverage

`tests/e2e/task-mutation-races.spec.ts` covers Tasks and Dashboard, each with a
successful or aborted first subtask write. It warms a different task's detail
before holding the write because Next serializes Server Actions. A double-click
produces exactly one pending write, optimistic completion and disabled mutation
controls. Closing and selecting the other task does not change its selection or
description when the first write settles. Reopening the originating task shows
the successful state or its rollback. A subsequent toggle/retry proves the lock
released; reload verifies persisted state.

All four checks pass without changing the existing synchronous mutation guard,
targeted cancellation or per-task rollback. These are deterministic fixture
checks, not genuine-auth rapid-write measurements or out-of-order server commits.

## Same-tab account replacement

`scripts/performance/check-account-switching.mjs` uses the existing dedicated
populated/empty synthetic accounts. For Tasks, Calendar and Dashboard it:

1. Opens/closes a populated account's detail twice to warm the page cache.
2. Uses the actual sidebar Sign Out, then signs into the empty account in the
   same browser context and page.
3. Revisits Tasks → Calendar → Dashboard through the sidebar and checks Back/
   Forward, exact route paths, established readiness selectors and absent
   synthetic task/session buttons/dialogs.
4. Observes rendered body text for prior-account synthetic markers, storing
   only a boolean. A positive control before the initial populated login must
   detect those known markers. The final observation lasts one second; it is
   neither a benchmark nor proof against arbitrarily late responses.
5. Returns to the populated account and successfully reopens details. Final
   sign-out completes.

All three scenarios pass: no observed previous-account markers and zero captured
page errors. The harness performs zero study-record writes. It does not verify
cross-tab auth synchronization, late auth-loss responses, invisible cache state,
every possible content marker or server/RLS isolation generally.

## Failed attempts retained

- The initial Playwright run timed out waiting for its web server at 60 seconds,
  before tests executed. A directly started dev server became ready in 1264ms;
  its first sign-in request compiled in about 23.2 seconds. After stopping it,
  the normal runner passed. The startup failure did not recur; its root cause
  is not conclusively established. No timeout/config/application change.
- The first account-switch attempt failed at `Tasks-empty-revisits` because the
  harness expected a Calendar heading that the approved screen does not have.
  It now reuses `getShellScenario()` path/readiness contracts rather than inventing
  headings. The repeated run passes. This was an assertion error, not reproduced
  data leakage. The failed sanitized report remains separately archived.

## Verification and repeat commands

Completed during this slice:

- 719 unit tests across 102 files pass; typecheck passes.
- Full lint has zero errors and the existing `modal-frame.tsx:103` ref-cleanup
  warning. Final diagnostic-script targeted ESLint and execution pass.
- 20 scoped browser checks pass without retries, including the four new races.
- Genuine-auth local production build passes; account-switch run completes all
  three scenarios. Local server stopped after verification.
- Expected aborted-held-request `ECONNRESET` and color warnings appeared in
  browser-test server logs; this is not a universally clean-log claim.

```text
rtk pnpm test:e2e tests/e2e/task-mutation-races.spec.ts tests/e2e/task-details.spec.ts tests/e2e/dashboard-task-details.spec.ts tests/e2e/session-detail-cache.spec.ts --workers=1
rtk err node scripts/performance/run-production.mjs build
rtk proxy node scripts/performance/run-production.mjs start
rtk proxy node --env-file=.env.performance.local scripts/performance/check-account-switching.mjs
```

Run the last command separately after starting genuine-auth local production;
never alongside fixture tests/builds. Calendar's synthetic session is explicitly
dated 2026-10-11; Dashboard needs that session visible today. Do not move records
to manufacture future coverage. Successful sanitized output remains ignored at
`.performance-artifacts/09-04-account-switching.json`; raw artifacts are not
committed. No snapshots, dependencies, approved UI, auth policy or schema changed.

## Remaining gates

Keep page-mounted providers; these checks do not justify a shared QueryClient
or auth/cache architecture change. Still pending: cross-tab/late auth-loss cases,
subject/profile/timezone freshness, remaining recurring genuine-auth mutation
coverage, conditional Calendar/Tasks implement-or-defer decisions, controlled
hosted comparisons and final release checks. Mobile and other agreed deferred
features remain deferred. No merge or production deployment in this slice;
formal completion stays 39/46 non-deferred stories (about 85%).
