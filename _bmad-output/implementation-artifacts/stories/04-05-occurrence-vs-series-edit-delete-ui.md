# Story 04-05: Occurrence-vs-series edit delete UI

Epic: epic-04
Status: in-progress
Dependencies: 04-02

## Purpose

Implement single occurrence and whole series mutations after approved scope-selection UI exists.

## Expected implementation surface

calendar edit/delete controls

## Engineering constraints

SUPERDESIGN-FIRST for confirmation/scope selection: create/iterate the missing state in the existing project before coding.

## Implementation sequence

1. Read AGENTS.md, project context, active epic and matching engineering contract.
2. Define/confirm Zod/TypeScript contracts before wiring UI.
3. Implement repository/storage boundary, then application service.
4. Add route/action adapter only after service tests pass.
5. Wire approved UI without changing visual structure.
6. Run negative security/error paths, not only happy path.
7. Run required quality and visual gates.

## Failure cases to handle

- unauthenticated/invalid actor
- foreign-owned referenced IDs
- malformed or stale client input
- duplicate/retried request
- provider/database error mapped to normalized domain error
- race conditions relevant to this feature

## Superdesign-first prerequisite

Before coding this UI, inspect the live Web Study Superdesign project. If the required state is absent, create or iterate the missing draft in that same project, preserve the established design language, and then implement from that draft. No user export is required.

## Test plan

E2E modify/cancel one occurrence vs series.

## Reference checkpoint — 2026-10-04

- Re-fetched primary live draft v96 and all project nodes; no recurring scope/confirmation state exists. Existing detail actions do not select occurrence-versus-series scope.
- Created credit-free same-project authored reference: https://p.superdesign.dev/draft/9745a914-49b8-43da-a0fe-c072b4e53417 (v4). Approved existing screens remain unchanged.
- Reuses existing modal backgrounds/borders/typography/neutral controls and session-type selected tokens. Edit scope defaults to This session only; Continue selects the scope without mutating. Delete combines scope and explicit confirmation, names the series action distinctly, warns about exceptions/irreversibility, and skips scope for one-time sessions.
- Prototype-only failure checkbox exercises disabled pending controls, dismissal guard, accessible Deleting label, retained scope on error and corrected retry; do not port the simulator into production.
- Browser inspected desktop and 320x720; mobile panel client/scroll width both 286px and footer is reachable. Tab wraps to Close; Escape restores the launching button. Pending focus stays inside the dialog. Saved ignored desktop/mobile proof under `.superdesign/tmp/`.
- Await approval before production implementation. This reference covers scope/confirmation only: the edit-form authoring state must also be inspected/approved before UI wiring. No application code, schema, dependency or screenshot baseline changed; persistence acceptance is not claimed. Count stays 21/45 done, 24 remaining.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed
