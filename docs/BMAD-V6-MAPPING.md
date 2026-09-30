# BMAD V6 Workflow Mapping

This package follows the current BMAD artifact flow while remaining a project-specific handoff.

| BMAD phase | Web Study artifact |
|---|---|
| Analysis / brainstorm | `_bmad-output/analysis/brainstorming-report.md` |
| Analysis / research | `_bmad-output/analysis/research-findings.md` |
| Product brief | `_bmad-output/planning-artifacts/product-brief.md` |
| Planning / PRD | `_bmad-output/planning-artifacts/PRD.md` |
| UX | `_bmad-output/planning-artifacts/ux/DESIGN.md`, `EXPERIENCE.md`, live Superdesign |
| Solutioning / architecture | `architecture.md`, `DATA_MODEL.md`, `SECURITY.md`, engineering contracts/ADRs |
| Epics and stories | `planning-artifacts/epics/*`, `implementation-artifacts/stories/*` |
| Sprint gate/status | `readiness-report.md`, `sprint-status.yaml` |
| Implementation units | story files + `.agent/execplans/*` + Codex handoff |
| Validation | 11 test specifications, RLS/advisors, Playwright visual regression |

Current BMAD docs emphasize context flow and story-sized implementation. V4 deliberately keeps each implementation unit bounded instead of asking Codex to build the whole product in one pass.
