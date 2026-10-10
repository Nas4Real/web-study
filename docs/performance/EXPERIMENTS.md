# Navigation performance experiment ledger

Keep rejected and inconclusive ideas here so they are not mistaken for wins.
Each retained optimization requires comparable isolated before/after evidence
and green correctness gates. No runtime optimization is retained yet.

| Date | Experiment / hypothesis | Evidence | Verdict / next step |
| --- | --- | --- | --- |
| 2026-10-10 | Real-auth hosted/local baseline | 400 hosted + 160 local samples; overlapping runs | Exploratory only; repeat in isolation |
| 2026-10-10 | Isolated hosted empty-account repeat | 200 samples; warm-sidebar content p95 710–994 ms | Confirms budget failure; no optimization/gain claim |
| 2026-10-10 | Read-only Session Details close | Ten hosted samples: same-route non-prefetch GET median 1; source calls refresh | Narrow 09-04 close/success separation experiment; preserve mutation refresh |
| 2026-10-10 | Separate read-only close from successful session mutations | Same local regression: 1 route GET before → 0 after; Calendar/Dashboard focus and immediate mutation reconciliation pass | Retain candidate for review; no latency/hosted gain claim. Existing 320px snapshot mismatch reproduced on unchanged source; release gate remains open |
| 2026-10-10 | Duplicate auth/profile reads on sibling navigation | Local Tasks/Calendar: 1 profile, 0 auth-user per correlated request | Not established; inspect initial entry before memoization |
| 2026-10-10 | Deployment-region mismatch | Functions Virginia, database Frankfurt; no region change | Candidate; establish provider attribution and scoped experiment first |
| 2026-10-10 | Calendar subject/occurrence reads are sequential | Source sequence; timings not yet attributed | Pending isolated waterfall and 09-02 comparison |
| 2026-10-10 | Missing loading feedback delays acknowledgement | Hosted warm-sidebar feedback p95 exceeds 200 ms | Pending 09-03 loading-boundary measurement |
| 2026-10-10 | Sustained client rendering explains delay | Warm-sidebar Paint after DOM readiness p95 4–25 ms; no long tasks | Not established for navigation; interaction traces pending |

References: [exploratory report](BASELINE-2026-10-10.md),
[isolated navigation repeat](ISOLATED-NAVIGATION-2026-10-10.md). Do not compare local and
hosted numbers as a measured optimization. Record commit, fixture, browser, sample
count, conditions and run-to-run variance for each future candidate.
