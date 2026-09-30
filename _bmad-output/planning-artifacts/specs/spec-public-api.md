# Engineering Spec - Epic 07: Public API and personal API keys

## Contract sources

PRD, architecture, DATA_MODEL, `engineering/PUBLIC-API.md`, `engineering/ERROR-CATALOG.md`, and `docs/openapi.yaml`.

## Stories

07-01 through 07-06.

## V4 additions

- Task detail endpoint with priority/description/subtasks.
- Nested subtask create/update/delete/toggle.
- Effective session-occurrence detail endpoint including exception-overridden detail fields.
- Shared validation/service rules with web UI.

## Implementation rule

Build key authentication/rate/error middleware once. Route handlers stay thin. All user-owned operations are actor-scoped and database protected. UI work follows live Superdesign; Developer/API state is created there first if absent.

## Exit criteria

All external resource operations are documented/tested, personal key secrets are never persisted in plaintext, cross-user IDs are denied, retries/idempotency are safe where specified, and Developer/API Settings visually matches approved Superdesign.
