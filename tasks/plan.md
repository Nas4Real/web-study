# Implementation Plan: Signed-in usability fixes

## Overview

Fix the five browser-confirmed defects without redesigning approved screens or enabling deferred production-only features. The changes will make fresh accounts usable, expose navigation on mobile, use the authenticated profile in the shell, turn shell search into functional navigation search, and make document organization honest and usable while R2 remains disconnected.

## Architecture decisions

- Reuse the existing owner-scoped `SubjectService`, `ChapterService`, Supabase repositories, request authentication, and server-action patterns.
- Keep all mutations behind server actions and existing service validation; client components never receive privileged credentials.
- Pass shell identity from the authenticated workspace layout instead of reading client-side auth state.
- Implement shell search as deterministic navigation search across available application sections. Do not add global user-data queries to every route.
- Keep uploads disabled until R2 is configured, while allowing metadata-only chapter organization through the existing chapter service.
- Preserve existing Superdesign-derived tokens and component styling; additions reuse current classes and interaction patterns.

## Task list

### Phase 1: Fresh-account foundation

- [ ] Task 1: Add subject-creation action and Settings UI
  - Create an authenticated server action backed by `SubjectService.create`.
  - Add a Subjects section that lists existing subjects and creates a new subject with validated name/color.
  - Add regression tests for success, invalid input, duplicate names, unauthenticated requests, and provider failures.
- [ ] Task 2: Guide empty Task and Session forms to subject creation
  - When no subjects exist, explain why submission is unavailable and link to `/settings#subjects`.
  - Keep normal task/session behavior unchanged when subjects exist.

### Checkpoint: Fresh accounts

- [ ] Focused action/component tests pass.
- [ ] A new account can create a subject and then create tasks and sessions.

### Phase 2: Workspace shell

- [ ] Task 3: Replace demo identity with authenticated profile data
  - Load display name and email in the workspace layout.
  - Use a safe fallback for profiles without a display name.
  - Remove hard-coded `Nas`, `Prépa MP`, and `nas@example.com` values.
- [ ] Task 4: Add mobile navigation and functional shell search
  - Keep the approved desktop sidebar.
  - Add an accessible mobile header/menu below the desktop breakpoint.
  - Make search filter known destinations; Enter opens the first result, Escape closes results, and Ctrl/Cmd+K focuses search.
  - Cover keyboard behavior and empty-result behavior with tests.

### Checkpoint: Shell

- [ ] Desktop navigation remains visually stable.
- [ ] Navigation is usable at 320px, 390px, 768px, and desktop widths.
- [ ] Shell search changes routes and exposes accessible result labels.

### Phase 3: Documents and polish

- [ ] Task 5: Make document actions honest and enable chapter creation
  - Replace the inert root `New` button with a visibly disabled upload control and explanation.
  - Add authenticated chapter creation from a subject view using `ChapterService.create`.
  - Refresh document data after successful creation; starter folders continue to come from the existing service.
  - Add regression tests for successful and failed creation.
- [ ] Task 6: Fix blank greeting and empty identity states
  - Render `Good Morning!` when no display name exists instead of `Good Morning, !`.
  - Verify saved profile changes are reflected in shell and calendar after refresh.

### Checkpoint: Complete

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Desktop and mobile browser regression checks pass with a clean console.
- [ ] Final five-axis code review has no required findings.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Subject/chapter actions accidentally bypass ownership | High | Resolve the verified actor server-side and call existing owner-scoped services only. |
| Shell data loading duplicates expensive page queries | Medium | Load only profile/email for the shell; search remains route-based. |
| Mobile navigation changes desktop parity | Medium | Render separate `lg:hidden` mobile UI and leave desktop sidebar structure/classes intact. |
| R2 remains unavailable | Low | Keep upload controls disabled with explicit explanatory copy. |
| Server-action errors leave stale UI | Medium | Return typed states, expose messages through `aria-live`, and revalidate affected routes on success. |

## Open questions

- None. The requested fixes and existing architecture provide enough direction to proceed.
