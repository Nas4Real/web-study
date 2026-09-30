# Security Model - Web Study V1 (V4)

## Tenant isolation

Every user-owned row is scoped by `user_id`. RLS is mandatory on all exposed user-owned public tables. Policies use ownership predicates such as `(select auth.uid()) = user_id`; `TO authenticated` alone is never treated as authorization.

UPDATE policies use both `USING` and `WITH CHECK`.

## Foreign-reference isolation

Where practical, user-owned foreign keys are owner-aware composites. This prevents an attacker from inserting a row with their own `user_id` but a foreign user's `subject_id`, `task_id`, `series_id`, folder parent, etc.

New V4 example: `(task_id,user_id)` in `task_subtasks` references `(id,user_id)` in `tasks`.

## Data API grants

Supabase changed public-table exposure defaults in 2026. Production migrations explicitly `GRANT` only needed privileges to `authenticated` for user-facing Data API tables, then enable RLS and policies. Grants and RLS are separate defenses.

Internal tables such as rate counters/cleanup queues are not directly exposed to browser roles unless there is a proven need.

## Auth

- Use current Supabase SSR cookie guidance and PKCE-compatible flows.
- Use publishable key in public clients.
- Never expose secret/service-role credentials.
- Never use user-editable metadata as authorization claims.
- Account deletion should revoke/sign out sessions and treat existing token lifetime as a security consideration.

## Personal API keys

- cryptographically random token
- prefix identifies candidate row without logging the secret
- strong one-way secret hash
- full key shown once
- revoke/expiry checks
- rate limiting
- logs contain key id/prefix, never raw secret

## Detail dialogs

Task/session GETs and mutations are ordinary protected domain reads. A guessed ID must return not-found/forbidden semantics without exposing existence across tenants. Subtask IDs are also ownership checked.

## R2

Private bucket. Server credentials only. Presigned URL is a bearer capability with short expiry, exact object key and exact operation. Upload signing restricts expected content type; completion verifies object metadata/size before committing quota.

## Destructive actions

Task/session deletion and account deletion require approved confirmation/scope behavior. Recurring session delete distinguishes occurrence cancellation from series deletion. Account file cleanup is recoverable and observable.
