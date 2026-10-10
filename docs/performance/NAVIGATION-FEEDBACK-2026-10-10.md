# Navigation pending-feedback experiment

Story 09-03 remains in progress. This is a narrow, **unmerged and undeployed**
candidate: acknowledge sidebar/search navigation while the existing route loads.
It is not a content-speedup or whole-story completion claim.

## Change

Sidebar labels use Next's `useLinkStatus` to show a static, absolutely positioned
dot and accessible destination status. Search wraps its existing `router.push`
in a React transition and displays the pending destination. Neither adds timers,
manual prefetches, extra reads, authentication changes or application caches.
Completed-screen geometry/tokens are unchanged; static feedback supports reduced
motion. Next owns link interruption and modifier-click semantics.

The existing authenticated layout and default Link prefetch remain unchanged.
The workspace loading boundary, initial-layout wait and useful production-shell
prefetch are the next slice, not something this experiment establishes.

## Reproduction and conditions

- Base: `2e68a77`, branch `codex/navigation-optimization-plan`.
- Both builds use the same working-tree profiler patch (pending-status detection
  and `PERF_MODES=warm`). Control temporarily restores only the two original
  shell files; candidate includes only the pending-feedback changes.
- Genuine populated profiling account, synthetic data, no fixture authentication.
- Local `next build`/`next start`, Node 24, Next 16.3.8, React 19.3;
  Chromium 153.0.8010.12, Africa/Tunis, unthrottled CPU/network.
- Sidebar 1440×900; search 375×812. Fresh authenticated context per sample;
  Dashboard→Calendar→Dashboard warm-up before the recorded Calendar navigation.
- Two batches of ten samples per input per variant, **80 samples total**, in
  control/candidate/candidate/control order. No concurrent build/test/profiler.
- Local provider diagnostic preload enabled for both variants. Provider counts
  are not attributed here: request IDs reset across server processes and the
  provider log was subsequently cleared by Playwright.

Run the existing production runner, then set `PERF_ORIGIN=http://localhost:3100`,
`PERF_DATASET=populated`, `PERF_DESTINATIONS=Calendar`, `PERF_MODES=warm`,
`PERF_SAMPLES=10` and run:

```text
rtk proxy node --env-file=.env.performance.local scripts/performance/profile-navigation.ts
```

Completion timestamps (UTC): control 19:41:58.130; candidate 19:44:27.352;
candidate repeat 19:45:44.567; control repeat 19:48:23.941, all 2026-10-10.
All four captures are complete. Ignored archives are
`.performance-artifacts/09-03-{before,after}[-repeat]-populated.json`.
They were copied before browser tests could clear `test-results`.

## Results

Combined 20-sample groups, median / nearest-rank p95, milliseconds:

| Input | Control feedback | Candidate feedback | Control content-frame proxy | Candidate content-frame proxy |
| --- | --- | --- | --- | --- |
| Sidebar | 403.7 / 532.1 | 9.9 / 12.4 | 435.2 / 560.5 | 417.9 / 907.3 |
| Search | 395.2 / 525.1 | 3.7 / 11.1 | 428.6 / 557.5 | 389.9 / 589.0 |

Feedback p95 per ten-sample batch: control sidebar 615.6/532.1, search
508.5/617.0; candidate sidebar 13.1/12.4, search 25.4/11.1. Acknowledgement
improves far beyond batch variation and meets the local 200ms feedback target
for this one destination. Each sample still has one post-input RSC request.

**Content non-regression is not established.** Candidate sidebar tails worsen
in the first batch (1017/907ms samples), although its repeat p95 is 559.8ms.
Search content medians also vary substantially between batches (candidate
357.5/473.5ms versus control 431.3/406.6ms). Do not describe this as faster data
or dismiss its tails without further attribution. Retain the acknowledgement
candidate for review, but keep the content/release gate open.

Feedback is animation-frame-observed DOM state, not exact paint or INP. Content
uses DOM readiness followed by two frames, not a React commit or proof of every
control's hydration. Headers arrive well before needed RSC content; for the
two slow candidate samples they arrive after 44.6/25.1ms. That gap cannot be
labelled rendering time. No long tasks were recorded in those samples.
These are local synthetic results, not hosted/RUM evidence or all-route budgets.

## Correctness and visual verification

- Stalled sidebar and keyboard-search tests fail before the change with no
  destination status, then pass after. Tests also cover competing search,
  interruption, focus retention, 320px overflow and reduced motion.
- All 33 navigation/Foundation/workspace-surface tests pass **without retries**,
  including existing Dashboard, Tasks, Documents, Settings, profile-menu and
  task/session dialog screenshots. No baselines were updated.
- Initial broader runs had three network-idle timeouts before assertions; reruns
  passed two, and the first Dashboard case passed on retry. A temporary browser
  diagnostic reproduced the wait with no outstanding recorded requests.
  Replace only the two affected waits with explicit summary/New Task readiness;
  retain every functional assertion and screenshot. Installed Playwright 1.63
  documentation explicitly discourages network-idle as a test readiness signal.
  The diagnostic file was removed; no product code was changed to mask the waits.
- Interrupted development streams can log `The destination stream closed early`;
  this occurs in the deliberate cancellation scenario, not a hosted error finding.
- Full units, typecheck and production build pass. Lint has only the existing
  modal-focus-ref cleanup warning. No migration, new dependency or server changes.

## Remaining work

Add/test the lightweight workspace loading boundary separately. Verify initial
layout waits versus sibling navigation, production shell-prefetch counts, all
five destinations and hosted preview. Repeat/attribute content tails; do not
close the no-regression gate based on the feedback win. Epic 09 release and
09-01/09-02/09-04 completion gaps remain unchanged.
