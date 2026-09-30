# Web Study - BMAD Engineered Handoff V4

Status: implementation-ready engineering package
Date: 2026-09-29
Owner: Nas

This package is the coding handoff for Web Study V1. It combines BMAD planning artifacts with project-specific engineering contracts, story-sized implementation units, Codex ExecPlans, security/data/API specifications, test specifications, and a live Superdesign workflow.

It is not the BMad framework itself and it does not contain the finished application. Executable application and test code must be created by Codex story-by-story against the real repository.

## Source of truth

1. Nas's **live Superdesign Web Study project**, newest relevant approved draft/state.
2. A required draft/state Codex creates or iterates in that same Superdesign project when the product behavior is specified but the UI state is missing.
3. `design-reference/screenshots/v4/` for the newly approved Task Details and Session Details states.
4. `design-reference/screenshots/v2/` for older approved regression snapshots.
5. `DESIGN.md` and `_bmad-output/planning-artifacts/ux/*` for written interaction contracts.
6. `design-reference/superdesign-preview-source.html` is historical only.

Nas does not need to export Superdesign. Codex is expected to inspect the live project directly.

## V4 additions

- Task Details modal with priority, description, subtasks, complete/delete actions.
- Session Details modal opened from Calendar Day, Calendar Week, and Dashboard Today's Classes.
- Session detail data includes subject, time, location, professor, and ordered Notes & Reminders.
- New Task must be extended in Superdesign to author the new task detail fields. Any Edit Task flow is implemented only if it exists or is approved in the live product design.
- New/Edit Session must be extended in Superdesign to author the new session detail fields.
- Task subtasks are modeled relationally with independent completion state.
- Recurring session details are resolved from the effective occurrence, including occurrence overrides.
- API, schema, RLS, OpenAPI, stories, tests, traceability, and ExecPlans are updated for these behaviors.

## Locked product decisions

- Desktop web V1, multi-user and private by default.
- Email/password plus Google authentication. Verified email required for password signup. Apple is excluded.
- User-managed subjects. Every task, calendar session, and study file belongs to a subject.
- Tasks support Pending, Completed, Someday, normal/high priority, description, and subtasks.
- Calendar supports Exam, University, Revision, Day/Week/Month, recurrence, and one-occurrence vs whole-series edits/deletes.
- App-owned storage only. PDF, DOCX, XLSX, PPTX, PNG, JPG/JPEG, maximum 50 MB/file.
- Default storage quota is 2 GB/user, configurable later.
- In-app notifications only in V1.
- Versioned `/api/v1` for the whole application with personal API keys.
- AI Suggestion backend is out of scope for V1.

## Start here

1. `AGENTS.md`
2. `_bmad-output/project-context.md`
3. `_bmad-output/planning-artifacts/PRD.md`
4. `_bmad-output/planning-artifacts/architecture.md`
5. `_bmad-output/planning-artifacts/DATA_MODEL.md`
6. `_bmad-output/planning-artifacts/engineering/ENGINEERING-INDEX.md`
7. `docs/SUPERDESIGN-LIVE-WORKFLOW.md`
8. `docs/TRACEABILITY.md`
9. `_bmad-output/implementation-artifacts/tests/TEST-INDEX.md`
10. the active epic/story and its `.agent/execplans/*`

Use `docs/BMAD-V6-MAPPING.md` to see how the package maps to the current BMAD workflow.
