# Story 08-01: Complete RLS and database advisors

Epic: epic-08
Status: complete
Dependencies: 02-04,03-01,04-01,05-04

## Purpose

Replace draft policies with explicit full policies, ownership-consistency checks and advisor cleanup.

## Expected implementation surface

supabase migrations/tests

## Engineering constraints

No table left exposed without intended policy.

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

## Test plan

Positive/negative RLS suite and advisors.

## Done when

- acceptance behavior matches PRD and engineering contract
- no cross-user access is possible
- errors use stable codes
- tests listed above pass
- visual regression passes for any changed approved UI
- no secret or provider-internal error is exposed

## Completion evidence

- Audited the live local schema catalog for every exposed public table, policy,
  DML grant, security-definer function, and ownership index/foreign key rather
  than relying only on migration text.
- All 11 public tables have RLS enabled; anon has no public-table DML access;
  policies explicitly target `authenticated`; and every UPDATE policy contains
  both `USING` and `WITH CHECK` ownership clauses.
- Removed broad legacy authenticated grants from `subjects`, replacing them
  with explicit insert/update column allow-lists. Removed the unused profile
  DELETE grant. RLS already prevented foreign-row access; the grant layer now
  also prevents writes to identity, ownership, and audit columns.
- Added a 27-assertion audit covering catalog-wide invariants, profile/subject
  privileges, positive owner access, and negative cross-user select, update,
  delete, and insert paths.
- Verification: fresh local database reset, 195 pgTAP assertions, and local
  database advisor pass except for the pre-existing calendar volatility
  warning, which is unrelated to access control.
