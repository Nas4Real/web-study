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
