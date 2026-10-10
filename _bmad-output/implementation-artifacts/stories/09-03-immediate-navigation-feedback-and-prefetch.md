# Story 09-03: Immediate navigation feedback and prefetch

Epic: epic-09
Status: in-progress
Dependencies: 09-02
Scope: medium; route loading boundary, shell/search and browser checks

## Progress

The narrow sidebar/search pending-feedback candidate is implemented. Stalled-read
regressions fail before and pass after; completed visual baselines are unchanged.
Two local production batches per variant/input (80 samples) show feedback p95
above 500ms before and below 26ms after. Content tails vary/worsen in one batch,
so content non-regression remains open. See
`docs/performance/NAVIGATION-FEEDBACK-2026-10-10.md`.
A lightweight destination-labelled workspace loading boundary is implemented
below the existing authenticated layout; default Link prefetch is unchanged.
Local genuine-auth production withheld-response checks verify a useful cached
Calendar fallback, desktop/mobile interruption, retained search focus, 320px
overflow and anonymous redirect. Both desktop variants already prefetch; no
completed private provider reads were recorded for the observed prefetch IDs.
The repeat's loading-shell p95 is 43.2ms sidebar / 47.2ms search. Search content
timing worsens relative to this control, so content non-regression remains open.
See `docs/performance/WORKSPACE-LOADING-2026-10-10.md` for limits and reproduction.
The boundary does not cover the initial-layout auth wait; all-route and hosted
gates remain pending. Nothing is deployed.

## User outcome

As a user changing screens, I want immediate destination feedback while its
content loads and navigation to remain responsive to my next click.

## Acceptance criteria

- [ ] Warm sidebar/search navigation shows destination feedback within the
  spec's p95 200 ms target while delayed reads are pending; sidebar stays usable.
- [ ] Production traces show useful route-shell prefetch with bounded request
  counts. Initial layout waits and sibling transitions are tested separately.
- [ ] Completed screens retain their approved appearance, usable-content time
  does not regress, and interrupted navigation cannot show the wrong destination.

## Expected implementation surface

`src/app/(workspace)/loading.tsx`, an optional lightweight loading component,
`src/features/shell/study-sidebar.tsx`, `navigation-search.tsx`, and a focused
navigation E2E suite. Add route-specific shells only when a generic boundary
cannot provide meaningful feedback without confusing the destination.

## Engineering constraints

Consult installed Next.js loading/Link/layout docs. A loading boundary does not
wrap its layout or make full private data available in the prefetch. Use existing
design tokens and approved geometry under the user's direct-code preference.
No arbitrary minimum delay, animation timer, polling prefetch loop or paid service.

## Verification / done when

Trace `next build`/`next start` and the hosted preview with cold/warm navigation.
Test stalled reads, keyboard/search navigation, rapid competing clicks, reduced
motion and 320px layout. Compare completed-screen visual baselines; report
feedback and usable-content timing separately, then run normal code quality gates.
