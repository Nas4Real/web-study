# Frame-sampled session save milestones

## Outcome

The existing session save UI acknowledges pending work promptly in this local
test, but confirmation still waits substantially for response headers. No
application optimization is introduced. This diagnostic separates assertion
polling from sampled DOM milestones and browser request timing.

Ten location edit/restore cycles produce 20 genuine-auth samples with unchanged
date, start time and duration, fresh same-page detail verification and successful
restoration. All 20 saves have one mutation POST and one current-route non-prefetch
RSC reconciliation. Other shell prefetch traffic remains separately counted.

## Environment and procedure

Windows, Node 24.18.1, Chromium 153.0.8010.12, 1440×900, Africa/Tunis browser
timezone, Next 16.3.8 production build at localhost:3100. Existing populated
synthetic account and one-time Performance session 2 only. Application code is
unchanged from `3f08112`; diagnostic changes are in the working tree above that
base. Report completed 2026-10-11 10:53 UTC. No CPU/network throttling, provider
tracing, concurrent builds/tests or other profilers. These are same-context visits,
not fresh-browser/cold-server samples. Use the guarded mutation command in
[the earlier session report](SESSION-MUTATIONS-2026-10-11.md).

Version-6 reports add `sampledFeedbackMs`, click-relative numeric network
milestones and `mutationMilestones` aggregates. The probe samples a laid-out
editor form with `aria-busy=true` as pending feedback. Readiness requires editor
dismissal and a laid-out enabled Calendar invoker. A subsequent animation frame
is recorded separately. This does not prove paint, React commit, viewport pixel
visibility, fresh range reconciliation or complete control hydration. Fresh
detail and invariant verification are separate functional checks after timing.

Request timing is mapped to the actual browser click using Playwright's epoch
request start plus relative response offsets and `performance.timeOrigin`.
Retain possible negative offsets and clock-resolution uncertainty. Persist only
numeric/category projections, never raw URLs, IDs, response bodies or auth state.
Cancelled/unavailable response completion stays unknown.

## Results

Each entry is median / nearest-rank p95 in milliseconds; n=10 per group unless noted.

| Milestone | Location edit | Original location restore |
| --- | --- | --- |
| Sampled pending feedback | 11.05 / 84.70 | 29.25 / 88.00 |
| POST headers from click | 699.30 / 911.40 | 944.61 / 2021.56 |
| Sampled editor-dismissal/control readiness | 730.80 / 926.80 | 1003.60 / 2102.30 |
| Following sampled frame from click | 782.10 / 944.50 | 1043.65 / 2190.20 |
| Headers to sampled readiness, paired per sample | 40.05 / 93.77 | 68.24 / 91.36 |
| Readiness to following frame, paired per sample | 16.90 / 104.00 | 15.75 / 87.90 |
| Existing assertion-observed upper bound | 905.90 / 1377.80 | 1187.25 / 2454.30 |
| POST completed response body | 1129.81 / 1482.93 | 1391.91 / 2494.70 (n=9) |

All 20 samples pair with one POST. POST completion is known for 19; the missing
completion stays missing. In every known pair, sampled readiness precedes body
completion: completion-to-readiness medians are -392.12/-370.85ms. Next consumes
useful streamed data before the entire response ends. Do not interpret a finished
request as the instant the UI should begin rendering, or negative differences as
bad timing to clamp away.

The tested saves do not exhibit an unexplained one-second post-header readiness
gap: paired p95 is below 94ms. This does not establish a general absence of
rendering problems on other routes or identify the exact provider bottleneck.
Headers include server/network wait; remaining stream processing and client work
are not separately attributed. This run is not a before/after speedup, controlled
hosted benchmark, INP/React/paint trace or production-wide reliability estimate.
Confirmation tails remain substantial; no existing budget has been relaxed.

Raw reports remain ignored in `.performance-artifacts/09-04-session-mutation-frames.json`
and `.performance-artifacts/09-04-mutation-probe-detail-smoke.json`.

## Verification and next gate

Eight added tests fail before/pass after: pending feedback vs readiness, missing
feedback, actual-click clock mapping, pre-click offsets and unavailable timings.
All 712 units pass. Typecheck, final production build and lint pass with only the
existing modal warning. The first build caught the browser-clock cast typing
error; the corrected build passes. A real-auth read-only smoke completes all four
existing session/task open/close scenarios after the mutation capture; it is a
functional smoke, not a benchmark. No styling/application changes or snapshot
updates, so the prior 21 desktop browser/visual checks remain scoped to the same
application revision. Dedicated session restoration verified; no real-user data
changed. Local production server stopped after verification.

Review: existing sampling behavior retained, optional criteria owned by diagnostic
tooling, numeric-only timing projection, no browser credential access, unchanged
ownership/auth/cache/reconciliation and no new runtime dependency. Mobile remains
deferred. Next gates are precise provider/client attribution, failure/actor/cache
lifecycle checks, conditional Calendar/Tasks decisions and hosted release. This
does not complete Story 09-01, 09-04 or the whole Epic 09.
