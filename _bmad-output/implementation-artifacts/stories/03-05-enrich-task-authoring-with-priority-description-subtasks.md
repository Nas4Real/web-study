# Story 03-05: Enrich Task authoring with priority, description and subtasks

Epic: epic-03
Status: in-progress
Dependencies: 03-04

## Purpose

Bring the existing New Task authoring flow up to the data demonstrated by Task Details. If Nas's live Superdesign project contains or later adds an Edit Task flow, the same domain fields must round-trip there too. Do not invent a separate edit experience in code.

## Superdesign-first requirement

The current older New Task modal does not expose all fields. Before code changes, create/iterate the New Task state in Nas's existing Superdesign project. Preserve the established modal language. Only create an Edit Task state if the live product flow actually calls for one.

Required product capabilities to represent:

- normal/high priority
- canonical description (the old Notes concept should not become a duplicate database field)
- add/remove/edit/reorder subtasks with clear optional semantics
- due-date behavior consistent with the existing task UI and Task Details
- completed task detail/action state if a dedicated completed variant is needed by the live flow

## Engineering constraints

Use TaskService schemas shared with API. Initial subtask creation should be transactionally consistent with task creation where possible. Validate lengths/count limits in the service schema. Parent completion remains independent from subtask completion.

## Done when

The required Superdesign authoring state exists, implementation matches it, creating a task round-trips all fields shown in Task Details, any approved edit flow does the same, and visual/E2E tests pass.

## Superdesign checkpoint — 2026-10-03

- Inspected the current main live draft and fetched same-project New Task Modal Reproduction `1dab4a63-24e3-496e-ab8f-8be5b8101669` as the existing authoring anchor. No enriched authoring or Edit Task state exists in the project; no Edit flow is being invented.
- Created one separate extension branch for priority, optional canonical Description and ordered editable subtasks. First generation `010569d6-5945-4234-8cbd-9a15c0941da4` had uninitialized Petite Vue bindings and visible template text; do not implement it.
- Repaired same-project branch for review: https://p.superdesign.dev/draft/89cbf9bb-2e9e-4e0f-8321-b99ffeeb264b. Existing approved drafts remain unchanged. Uses source modal geometry, Poppins / IBM Plex Mono, dark neutral fields, white primary button and only a small red High-priority cue. Scrollable body preserves reachable header/footer. Subtask completion is intentionally absent during creation.
- Browser checks confirm Normal/High pressed state, editable subtask titles, Add/Remove, up/down reordering, disabled boundary controls and no raw templates. At 320px there is no horizontal overflow; subject/date stack and row inputs shrink. Keyboard focus reveals row controls; coarse-pointer visibility is specified in the exported CSS. Only the expected Tailwind CDN preview warning was observed, not application errors.
- Preview follows existing domain limits: title 240, description 10000, subtask title 300, at most 100 subtasks. Date-only/optional due-date behavior remains unchanged. Production must start with zero optional subtasks, not the two review sample rows.
- Await user approval before implementation per Superdesign workflow. No application code changed; 18/45 stories remain done. Next implementation slice: shared action parsing, ordered subtask authoring state, exact approved modal port, transactional creation round-trip and visual/E2E tests. Existing domain schemas and atomic creation already support these fields; current action adapter still hardcodes normal priority and empty subtasks.
