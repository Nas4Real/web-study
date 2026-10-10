# Story 09-02: Deduplicate request context reads

Epic: epic-09
Status: planned
Dependencies: 09-01
Scope: medium; shared request helper, context callers and focused tests

## User outcome

As a signed-in user, I want screens to load without redundant authentication
and profile reads delaying the response.

## Acceptance criteria

- [ ] Within a Server Component render request, callers share verified actor,
  client and profile results where semantically identical; outbound call counts
  prove deduplication. Proxy and write-operation verification remain independent.
- [ ] Independent Calendar subject/occurrence reads overlap; owner, timezone and
  bounded-range prerequisites still hold. Measure this experiment separately.
- [ ] Comparable before/after measurements show a gain beyond variance; null
  actors, invalid claims, provider failures and user isolation remain correct.

## Expected implementation surface

`src/server/auth/request-auth.ts`, `src/lib/supabase/server.ts`, a narrow shared
read-context helper, and the settings/task/calendar context callers. If this
exceeds five implementation files, split context adoption into small commits.

## Engineering constraints

Use supported request-scoped memoization; no global private-data/client cache.
Do not trust metadata or browser-supplied identity. Preserve verified email
semantics and SSR refresh behavior. Keep mutation auth fresh and RLS intact.

## Verification / done when

Tests prove repeated equivalent reads are shared within one render scope and
not reused across actors/requests. Auth redirects and profile/timezone reads
work with real sessions. Run focused context/loader tests, lint, typecheck and
build; attach before/after call counts and timing to the ledger.
