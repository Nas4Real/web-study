# Session detail first-open parallel-read experiment

## Decision

Reject the candidate for now and restore the application and candidate-only tests
to HEAD `76dac6b024f8f5f724efdcada7884ee26d4eeb45`. This is not a session speedup
or a completed 09-02 story. Earlier task/Calendar optimizations remain intact.

The candidate authenticated first, finished repository setup, then overlapped
the required profile/timezone read with the owned effective-occurrence read.
Series, exceptions and effective subject still followed their existing dependent
chain. Both profile and detail were required before success; Calendar mutation
and page contexts remained eager. No UI, auth, cache, API, schema or dependencies
were changed. Correctness alone does not justify retaining extra orchestration.

## Comparison conditions

- Local Next production builds with the existing genuine-auth populated synthetic
  account and hosted Supabase; no new accounts or study-data writes.
- Chromium 153.0.8010.12, 1440×900, Africa/Tunis, unthrottled CPU/network.
- Identical read-only detail harness and local diagnostic preload. No concurrent
  builds, tests or profiling runs during each capture.
- Ten samples each of session/task opens and closes per run: 200 total samples.
  Page remounts provide first-open detail-cache state, not guaranteed cold
  database/server/TLS caches.
- Control 1 uses the original session path. Controls 2 and 3 select the eager
  resolver while retaining candidate internals; they isolate resolver selection,
  not byte-identical original code.
- The first pair completed on October 10 UTC; the second pair and reverse-order
  control completed October 11 UTC. Do not pool them as one stable environment.
- Capture times UTC: `2026-10-10T22:02:44.488Z`,
  `2026-10-10T22:06:01.838Z`, `2026-10-11T10:07:59.667Z`,
  `2026-10-11T10:10:05.676Z`, `2026-10-11T10:12:40Z` (last rounded to seconds).
- Reports/logs archived before Playwright under ignored `.performance-artifacts/`
  as `09-02-session-parallel-{control,candidate,control-2,candidate-2,control-3}`.
  Credentials and raw artifacts are not committed.

## Session opens: median / nearest-rank p95, milliseconds

| Run | Sampled ready | Following frame | Provider span |
| --- | --- | --- | --- |
| Control 1 | 539.90 / 928.80 | 549.05 / 1016.70 | 477.13 / 881.92 |
| Candidate 1 | 372.95 / 468.00 | 397.70 / 500.60 | 294.14 / 418.77 |
| Control 2 | 801.30 / 1399.70 | 860.80 / 1403.80 | 734.95 / 1229.91 |
| Candidate 2 | 451.95 / 1323.60 | 529.85 / 1327.20 | 401.56 / 1277.34 |
| Control 3 (reverse order) | 496.85 / 844.90 | 566.85 / 849.50 | 453.76 / 679.15 |

Both initial pairs have lower candidate medians, but controls vary by 304ms.
The unchanged task-ready medians also move from 307.80→240.35ms and
630.55→312.80ms, then 288.70ms in Control 3. This demonstrates substantial
provider/run variability; do not attribute all of the session delta to the code.
Against the reverse-order control, Candidate 2 improves ready median by only
44.90ms (9.0%), inside observed run variability, while ready/provider p95 worsen.
A repeatable tail/non-regression improvement beyond that variability is not
established. Retaining the candidate would weaken the experiment's quality bar.

All 20 candidate opens overlap profile and first Calendar read, versus zero in
30 controls. Median overlaps are 99ms and 126ms. Calls remain profile 1,
Calendar 2, subject 1, and one POST per session open, with no attributed provider
errors. Concurrency is proven; a stable user-visible gain is not.

Frame-sampled DOM/enabled-control readiness and its following frame are not
exact paint, React commit, hydration or INP. Preload logging adds overhead to
both variants. Local timings are not hosted Vercel speedup measurements.
Mobile remains explicitly deferred; no screenshot baselines are updated.

## Verification and follow-up

The candidate's deferred/failing-profile and read-context tests failed before
implementation and passed afterward. Full unit suite, typecheck, lint and
genuine-auth production builds passed before the repeats; lint retained the
existing modal ref-cleanup warning. Candidate-only concurrency tests are removed
with their rejected implementation, not disabled to excuse a regression.

All 19 selected desktop browser checks pass on both the candidate and restored
code (Chromium, one worker, no retries): Day/Week/Dashboard effective details,
occurrence/series edits and deletion, sibling isolation, warm revalidation,
post-write stale-cache prevention, failed-read retry/focus, Calendar history,
empty/month states and the unchanged 1024px Session Details snapshot. Mobile
320/768px checks are excluded per the user's deferral, not silently marked done.
The Calendar Month screenshot was manually inspected. No baselines were updated.
Expected aborted-request errors in failure-path checks are not evidence of a
clean-console smoke test. Restored code also passes the full unit suite,
typecheck, lint and a final genuine-auth production build with the same
pre-existing lint warning; source diff is empty. Documentation/plan changes are
the only task-owned retained diff. No merge or production deployment.

Existing build/lint dependency advisories remain separate release
triage; this latency experiment neither fixes nor clears them. All Epic 09
story/release gates remain open. Future investigation should isolate provider
variability and cover session mutations/hosted integration before another
concurrency attempt; do not simply repeat the same experiment uncritically.
