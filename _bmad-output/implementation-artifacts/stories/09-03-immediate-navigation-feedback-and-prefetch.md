# Story 09-03: Immediate navigation feedback and prefetch

Epic: epic-09
Status: planned
Dependencies: 09-02
Scope: medium; route loading boundary, shell/search and browser checks

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
