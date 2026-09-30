# Architecture - Web Study V1 (V4)

Status: engineered implementation baseline
Date: 2026-09-29

## 1. Technology baseline

Pin exact dependency versions and commit `pnpm-lock.yaml`.

- Next.js 16.3.x Active LTS, latest patched 16.3 release available at bootstrap
- React 19.3.x
- TypeScript
- Node.js 24 LTS
- pnpm
- Tailwind: **match the live Superdesign major for the exact-port phase**; if the source is v3-style, start on Tailwind 3.4.x. Do not force a v4 migration into the parity work.
- Supabase PostgreSQL + Auth + RLS
- `@supabase/supabase-js` + `@supabase/ssr` (re-check current APIs at implementation time)
- Cloudflare R2 via S3-compatible SDK
- Zod + React Hook Form
- TanStack Query v5 where interactive server state benefits from caching/optimistic updates
- date-fns + RFC 5545 compatible recurrence library
- Vitest + React Testing Library where useful
- Playwright E2E + visual regression
- Vercel + Supabase + Cloudflare R2

## 2. Architectural shape

```text
Browser
  |-- Next.js Server Components for authenticated initial reads
  |-- Client Components for dialogs/calendar interactions/optimistic state
  |-- same-origin actions/route handlers
  |-- /api/v1 external API
                 |
                 v
        application/domain services
        |        |         |
        v        v         v
   Supabase   R2 adapter   recurrence engine
   Postgres
   + Auth
```

The web UI and public API are adapters around the same application services.

## 3. UI/detail-query architecture

List/calendar/dashboard queries return light summary rows sufficient to render approved cards. Opening a detail modal may reuse summary data immediately and then resolve the canonical detail record through a keyed query.

Recommended client query identities:

```text
['task', taskId]
['session-occurrence', seriesId, originalStart]
```

After mutations, invalidate/update the specific detail cache plus affected list/dashboard/calendar-range keys. Optimistic subtask completion is allowed with rollback on failure.

Do not ship duplicate task/session business rules in components.

## 4. Calendar architecture

- `calendar_series` stores the master event and optional RRULE.
- Occurrences are generated only for a bounded requested range.
- `calendar_exceptions` identifies an occurrence by the **original** start time and records cancellation or field overrides.
- Effective occurrence detail = series master + generated occurrence + matching exception override.
- `notes_items` is ordered session content stored on the series and replaceable in an occurrence override.
- Editing/deleting a recurring occurrence requires explicit scope.

## 5. Task architecture

- `tasks` stores parent state, priority, description.
- `task_subtasks` stores ordered independent subtask state.
- Parent complete/reopen never implicitly mutates subtask rows.
- A shared TaskService powers UI and `/api/v1`.

## 6. Supabase access model

Use cookie SSR for browser sessions. Supabase Data API access requires **both** explicit table grants and RLS policies. New-project defaults changed in 2026, so migrations explicitly grant only the operations needed by `authenticated` on intended user-facing tables.

Sensitive/internal tables such as rate-window/cleanup internals are not broadly granted to browser roles. Server-only privileged access must remain server-side and explicitly actor-scoped.

## 7. R2 upload path

For the 50 MB V1 limit, use a single presigned PUT. Cloudflare recommends single uploads for small/medium files under roughly 100 MB; multipart is unnecessary complexity for V1.

```text
client -> POST upload intent
       -> service validates actor/type/size/quota and reserves bytes
       -> short-lived presigned R2 PUT (content type restricted)
client -> R2 directly
client -> POST complete
       -> server HEAD/verifies object -> converts reserved -> used bytes
```

Private downloads use short-lived GET URLs after ownership checks.

## 8. Modal accessibility without redesign

Approved Superdesign visuals remain unchanged. Dialog implementation must make outside content inert, keep Tab/Shift+Tab within the dialog, support Escape where appropriate, expose an accessible name, and return focus to the invoker. Native `<dialog>` is optional only if it can match the approved styling exactly; Tailwind v4 dialog Preflight changes are another reason not to change styling frameworks during parity work.

## 9. Deployment/security boundaries

- `NEXT_PUBLIC_*`: only Supabase URL + publishable key.
- Supabase secret/server credentials and R2 credentials: server only.
- Authenticated/user-specific routes are not publicly cached.
- Create a new Supabase client per request where required by current SSR guidance.
- API key authentication resolves an actor first, then calls actor-scoped services.

## 10. Design workflow

Live Superdesign is queried at the start of each UI story. Approved states are implemented exactly. Missing states are created in the same Superdesign project first. Visual regression then locks the result.
