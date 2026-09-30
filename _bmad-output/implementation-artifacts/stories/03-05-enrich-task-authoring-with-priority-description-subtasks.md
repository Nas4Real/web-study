# Story 03-05: Enrich Task authoring with priority, description and subtasks

Epic: epic-03
Status: ready-superdesign-first
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
