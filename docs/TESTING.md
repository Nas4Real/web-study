# Testing Strategy V4

Testing is a delivery gate, not a post-build phase.

## Layers

- Vitest pure domain/service tests
- database integration/RLS/owner-aware-FK tests
- auth flow tests
- recurrence/timezone/exception tests
- R2 quota/upload/download/delete tests
- public API contract tests
- Playwright critical-journey E2E
- Playwright visual regression
- destructive-flow tests
- accessibility/performance tests
- dedicated task/session detail-dialog interaction suite

## Visual environment

Playwright documentation notes screenshots vary by host/browser/settings. Generate/compare baselines in the same pinned environment, with deterministic time/data and fonts loaded. Do not “fix” mismatches by broadly increasing thresholds.

## V4 modal gate

Task/Session Details must pass both pixel fidelity and behavioral accessibility. Exact Superdesign visuals and focus/inert/keyboard semantics are simultaneous requirements.

See `_bmad-output/implementation-artifacts/tests/TEST-INDEX.md` for all 11 suite specifications.
