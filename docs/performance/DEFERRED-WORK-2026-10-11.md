# Performance work deferred — 2026-10-11

## User decision

Keep and push the verified work; leave remaining performance work for later.
The target remains a private desktop app for two users. No further profiling,
rewrites or infrastructure experiments are active. Deferral does not mean the
unfinished acceptance criteria passed, or guarantee a hosted latency improvement.

All implementation through `84adecd` is already on
`codex/navigation-optimization-plan`, associated with
[PR #8](https://github.com/Nas4Real/web-study/pull/8). This documentation records
the scope change without merging the branch or deploying production. Unrelated
local generated files and `.serena/` are excluded from this push.

## Retained work

- Independent Calendar reads and task-detail reads overlap where verified.
- Sidebar/search pending feedback and workspace loading boundary are retained.
- Read-only session detail close no longer forces route refresh.
- Successful session writes invalidate affected series detail caches.
- Session editing uses canonical series timezone; equivalent timestamp formats
  no longer trigger false schedule changes.
- Calendar/Dashboard session-success callbacks avoid duplicate route refreshes,
  preserving server revalidation and Dashboard task refresh.
- Profiling tools, sanitized reports and regression tests remain available.

Latest recorded verification: 719 unit tests, 20 scoped desktop browser checks,
typecheck and genuine-auth local production build pass; lint retains one existing
modal ref-cleanup warning. Three same-tab synthetic account-switch scenarios pass.
These results have their original limits; they are not a new full-release check.
See [cache lifecycle evidence](CACHE-LIFECYCLE-2026-10-11.md) and
[the experiment ledger](EXPERIMENTS.md). Rejected experiments stay rejected.

## Deferred stories / resumption

| Story | Remaining work saved for later |
| --- | --- |
| 09-01 | Complete interaction baseline/precise attribution and controlled hosted comparisons |
| 09-02 | Finish whole-story read-efficiency/non-regression evidence; no speculative auth memoization |
| 09-03 | Finish hosted content-tail/prefetch evidence beyond functional loading smoke |
| 09-04 | Remaining subject/profile/timezone freshness, cross-tab/late auth-loss and real-auth recurring mutation checks |
| 09-05 | Evaluate bounded Calendar client queries only if measurements justify them |
| 09-06 | Evaluate Tasks client queries only if measurements justify them |
| 09-07 | Complete the original performance release report, full integration gates and hosted release |

Region co-location is an untested hypothesis, not an approved infrastructure
change or a completed improvement. Existing server-rendered reads and page-mounted
providers remain; no full SPA or shared-cache migration is planned now.

Before any future deployment, run a bounded desktop check of sign-in/navigation,
tasks and sessions plus relevant quality checks. This basic release verification
is separate from the deferred extensive performance program. Do not treat an
actual data-loss or isolation defect as an optional speed optimization.

When the user asks to resume, inspect current Git/deployment state and the existing
Epic 09 ExecPlan/reports first. Refresh measurements only where needed; do not repeat
completed experiments blindly. Dedicated account credentials stay local/ignored;
synthetic session diagnostics have date constraints and must not move records just
to manufacture coverage. Mobile, other deferred product features and R2 activation
remain out of scope unless separately requested.
