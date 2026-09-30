# Public API Engineering V4

## Boundary

`/api/v1` is an external adapter over the same application services used by the web UI. It must not become a second set of business rules.

## Authentication pipeline

1. Require Bearer token.
2. Parse non-secret prefix/key identifier without logging the secret.
3. Look up active key server-side.
4. Verify token using a secure hash/MAC strategy for high-entropy generated secrets.
5. Reject revoked/expired keys.
6. Create `ActorContext { userId, apiKeyId, ... }`.
7. Apply rate limit.
8. Validate request.
9. Call shared service.
10. Map domain result/error to stable HTTP envelope.

Raw API keys are shown once and never stored/logged.

## Ownership

Every service query includes actor user ID. URL IDs do not confer authorization. Foreign-owned task/subtask/session IDs use the project's non-enumerating error convention.

## Idempotency

Retry-prone create endpoints may accept `Idempotency-Key`. Persist actor/key + route/method + request hash + response/resource reference with expiry. Reusing a key with a different body is conflict.

## V4 task contract

Task API supports `description`, `priority: normal|high`, ordered initial subtasks, full detail GET, and nested subtask CRUD/toggle. Parent complete/reopen does not mutate subtask state.

## V4 calendar contract

Occurrence detail GET is keyed by `{series_id, original_start}` and returns the effective occurrence after exception overlay. Allowed occurrence overrides include supported title/time/duration/location/professor/focus/notes fields.

`original_start` in a URL is an RFC3339 timestamp encoded as a path segment. It is identity, not necessarily the effective start after a move.

## Rate limiting

V1 may use an atomic Postgres window counter behind a `RateLimiter` interface. The interface permits later migration to distributed infrastructure without rewriting handlers.

## API key management UI

API-key management is authenticated-account functionality, not a capability delegated to an arbitrary personal API key by default. If the Settings Developer/API UI is missing live, Codex creates/iterates it in the same Superdesign project first.
