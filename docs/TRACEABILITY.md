# Requirement Traceability Matrix V4

## New V4 requirements

| Requirement | Engineering | Stories | Tests |
|---|---|---|---|
| FR-TASK-01/02 description + priority | DATA_MODEL, DOMAIN-SERVICES | 03-01, 03-05 | 01, 06, 07 |
| FR-TASK-03/04 subtasks + independent completion | DETAIL-VIEWS, DATA_MODEL | 03-01, 03-04, 03-05 | 01, 02, 06, 07, 11 |
| FR-TASK-06/07 Task Details | DETAIL-VIEWS, DESIGN | 03-04 | 07, 08, 10, 11 |
| FR-CAL-04/05 detail fields/notes | CALENDAR-RECURRENCE, DETAIL-VIEWS | 04-01, 04-06, 04-07 | 01, 04, 06, 07, 11 |
| FR-CAL-06/07 Session Details/effective occurrence | DETAIL-VIEWS | 04-02, 04-06 | 04, 07, 08, 10, 11 |
| FR-CAL-08 recurrence scope | CALENDAR-RECURRENCE | 04-05, 04-06, 04-07 | 04, 07, 09, 11 |
| NFR-SEC-01 owner isolation | SECURITY, schema owner-aware FKs | 03-01, 04-01, 08-01 | 02, 06 |
| NFR-UI-01 visual fidelity | VISUAL-PORT, SUPERDESIGN workflow | all UI stories | 08, 11 |
| NFR-A11Y-01 modal behavior | DETAIL-VIEWS | 03-04, 04-06 | 10, 11 |

All other requirements remain mapped through their owning epic/spec/test artifacts. Any future PRD change must update this matrix before implementation begins.

## Navigation performance extension - 2026-10-10

These criteria supplement the private-beta implementation without changing
the original V4 feature requirements. Source: Epic 09 performance spec.

| Requirement | Stories | Verification |
| --- | --- | --- |
| PERF-NAV-01 production baseline, separate feedback/content/paint timing | 09-01, 09-07 | Matched production-build/hosted traces and sanitized sample report |
| PERF-NAV-02 share request-scoped reads without weakening auth | 09-02 | Provider call counts, context tests and two-user/auth checks |
| PERF-NAV-03 immediate destination feedback and bounded prefetch | 09-03 | Delayed-read navigation, production prefetch, keyboard/mobile and visuals |
| PERF-NAV-04 cache freshness and targeted write synchronization | 09-04 | Read-only close request count, rollback/race/auth-switch tests |
| PERF-NAV-05 conditional Calendar/Tasks client querying | 09-05, 09-06 | Written trace-backed verdict; if implemented, range/history/list/mutation tests |

Stories are planned, not evidence that the targets are already met.
