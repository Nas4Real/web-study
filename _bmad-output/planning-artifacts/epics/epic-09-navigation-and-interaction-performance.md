# Epic 09: Navigation and interaction performance

Status: planned
Date: 2026-10-10

## Objective

Make the private-beta workspace respond promptly when changing screens,
dates/views, or task/session state. Improve usable-content timing with measured
changes to request reads, streaming, prefetch, and cache synchronization.

## Source contracts

- `../specs/spec-navigation-performance.md`
- `../architecture.md`
- `.agent/execplans/EPIC-09.md` from repository root
- Existing Epic 03/04 behavioral contracts and `AGENTS.md`

## Core stories

| ID | Outcome | Dependencies |
| --- | --- | --- |
| 09-01 | Establish authenticated production navigation baseline | None |
| 09-02 | Share actor/profile reads within each render request | 09-01 |
| 09-03 | Show immediate destination feedback and prefetch route shells | 09-02 |
| 09-04 | Synchronize caches and remove redundant page refreshes | 09-03 |
| 09-07 | Verify measured gains and release the optimized workspace | Core stories and conditional verdicts |

## Conditional stories

| ID | Outcome | Trigger |
| --- | --- | --- |
| 09-05 | Fetch/cache bounded Calendar ranges through shared services | Calendar budgets still fail after core changes and trace supports this approach |
| 09-06 | Fetch/cache Tasks read state through shared services | Tasks budgets still fail after core changes and trace supports this approach |

These are alternatives to evaluate independently, not a mandatory conversion
of the website to a client-only SPA. Each has a written implement/defer verdict.

## Exit criteria

- Five core stories complete, two conditional stories resolved with evidence.
- Production before/after results distinguish feedback, content and paint time.
- Failed optimization experiments are recorded and not retained without benefit.
- Existing visual and domain behavior passes relevant regression checks.
- Authentication, cache ownership and user isolation remain enforced.
- No deferred product features or paid services are introduced.

## Planning provenance

The installed skill catalog has no BMAD skill/workflow runner. This extension
uses the repository's BMAD V6 artifact mapping and existing story/ExecPlan
conventions with the installed planning-and-task-breakdown workflow. It does
not claim a BMAD command was invoked. Planning is complete; coding is pending.
