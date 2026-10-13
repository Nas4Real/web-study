# Task detail first-open parallel reads

## Scope and decision

Retain the narrow local-production candidate for review: authenticate first,
then overlap the required profile/timezone read with the owner-scoped task
read. Subject lookup still depends on the owned task. Both reads must succeed
before returning detail; no fallback timezone or private error payload is sent.
Mutation/page contexts still await the profile before exposing their services.

Three application files change: `task-request-context.ts`,
`task-detail-handlers.ts`, and `task-detail-actions.ts`. No UI, cache policy,
public API response, auth method, recurrence, schema or dependency changes.
Session detail adoption is a separate follow-up. Mobile is deferred by the user;
this experiment does not close the remaining desktop/hosted release gates.

## Comparison conditions

- Base HEAD: `a61e121f4e855218266a3d91f60d63068fec1c2d`, plus the described candidate.
- Local Next production builds, genuine existing populated synthetic account,
  hosted Supabase, identical diagnostic preload and browser harness.
- Chromium 153.0.8010.12, 1440×900, Africa/Tunis, default unthrottled CPU/network.
- Four sequential runs: control, candidate, eager-resolver control, candidate.
  Ten samples per task/session open/close per run: 160 completed samples.
- Full navigation remounts each detail page before its open: first-open cache
  state, not same-page warm cached DOM. Not guaranteed cold server/database/TLS.
- No concurrent builds/tests/profilers or study-data writes during captures.
  Credentials and raw reports stay ignored; no new test accounts were created.
- Control 1 uses the original application. Control 2 switches only the read
  action back to the eager resolver, retaining shared construction/handler code;
  it isolates resolver selection rather than claiming byte-identical source.
- Completed capture UTC times: 21:47:40.883, 21:51:10.032, 21:53:32.653,
  21:55:43.578 on 2026-10-10.
- Archived in `.performance-artifacts/09-02-task-parallel-{control,candidate}.json`
  and their `-2.json` repeats. Matching provider logs are archived alongside.
  Archive before Playwright clears `test-results`.

## Task opens: median / nearest-rank p95 (milliseconds)

| Run | Sampled detail/control ready | Following frame | Provider span |
| --- | --- | --- | --- |
| Control 1 | 356.65 / 577.50 | 375.75 / 653.70 | 309.96 / 539.29 |
| Candidate 1 | 255.10 / 382.00 | 286.55 / 445.90 | 198.67 / 349.02 |
| Control 2 | 369.65 / 606.90 | 416.30 / 610.90 | 331.99 / 484.70 |
| Candidate 2 | 245.40 / 449.90 | 297.20 / 460.20 | 206.59 / 401.36 |

Task readiness medians improve by 28.5% and 33.6%; provider-span medians improve
by 35.9% and 37.8%. Both candidate medians are separated from both controls.
All 20 candidate task opens overlap profile/task calls (median overlap 91.0ms
and 83.5ms); all 20 controls have zero such overlap. Each task open still makes
exactly one POST and three provider calls: profile 1, task 1, subject 1.
No attributed task-open provider errors or current-route non-prefetch RSC.

These are frame-sampled visible DOM/enabled-control readiness and a following
frame, not exact paint, React commit, INP or proof every control is hydrated.
The older assertion-observed upper bound is retained in the raw reports but
not substituted for these metrics. The local provider preload has synchronous
logging overhead in both variants; do not claim these are uninstrumented timings.

## Controls and limits

Session-ready medians, with its algorithm unchanged, vary across runs:
459.4, 510.15, 416.2 and 442.6ms. This is provider/run variability, not a session
speedup or regression attribution. Session reads remain profile 1, calendar 2,
subject 1, one POST each. All 80 opens are attributed without provider errors.
All 80 closes capture zero POST and zero current-route non-prefetch RSC in the
fixed one-second observation window. Close provider fields remain unattributed;
they do not prove zero backend work.

This is a narrow first-open gain, not an application-wide 30% gain, warm-navigation
budget closure, hosted Vercel measurement or a production deployment. Tail
variation and previous interrupted runs remain in their separate reports.

## Correctness and verification

Two handler tests fail before the candidate: unresolved timezone leaks into a
successful result, and failed required timezone is ignored. They pass afterward.
New context/action coverage checks pending profiles, different actor timezones,
missing/unavailable profiles, unauthenticated requests, read-only resolver
selection and preservation of eager mutation/revalidation behavior.
Existing services retain owner-aware reads and foreign-ID rejection.

Full unit suite, typecheck and genuine-auth production builds pass. Lint passes
with its pre-existing `modal-frame.tsx:103` ref-cleanup warning. All 11 focused
desktop browser checks pass (task details, Dashboard task details, task actions,
modal accessibility; Chromium, one worker, no retries). They cover canonical
selection, independent subtask/parent changes, deletion synchronization, delayed
deletion races, failed-write rollback and focus/background isolation. The
desktop Task Details screenshot was manually inspected; no pixel-baseline
update or mobile layout work. Expected aborted-request diagnostics from
failure-path tests are not a clean-console smoke result.

Native dependency audit is **not green**: high `braces`
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
(no patched version reported), and moderate `postcss-selector-parser`
[GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)
(patched >=7.1.6). `pnpm why braces` locates it in the existing ESLint/Tailwind
development toolchain. No manifest/lockfile changes were made in this experiment.
Do not declare it harmless merely because it is a development dependency:
triage build/lint reachability and safe mitigation before release (review by
2026-10-11). Dependency remediation is separate from the latency change.
