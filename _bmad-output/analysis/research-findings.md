# Technical Research Findings V4

Research date: 2026-09-29

Only official/primary documentation is used for architecture-changing claims. Re-check time-sensitive docs when implementation starts.

## BMAD Method V6

The current BMAD workflow map organizes larger-product work as Analysis -> Planning -> Solutioning -> Implementation. Artifacts flow from brainstorming/research/product brief into PRD/UX, then architecture + epics/stories + sprint gate/status, then story-sized build/review/retrospective work.

- https://docs.bmad-method.org/workflow-map-diagram.html
- https://docs.bmad-method.org/plan/break-work-into-stories-and-track-it/
- https://docs.bmad-method.org/build/test-completed-work/

This package mirrors that artifact flow while adding project-specific engineering details needed by Codex. It is not a copy of BMAD's installed framework files.

## Next.js / React / Node

- Next.js 16.x is Active LTS. As of 2026-09-29, the official Next.js blog says 16.3.6 is the current security-patched Active-LTS release and 16.3.7 is scheduled for 2026-09-30. Therefore bootstrap on the latest patched 16.3.x available on the implementation day rather than freezing this package to 16.3.6.
- React docs report latest version 19.3.
- Node official release table shows v24 (Krypton) as LTS; 24.21.0 is a current September 2026 LTS patch.

Sources:
- https://nextjs.org/support-policy
- https://nextjs.org/blog
- https://nextjs.org/docs
- https://react.dev/versions
- https://nodejs.org/en/about/previous-releases
- https://nodejs.org/en/blog/release

## Tailwind visual-parity finding

Tailwind's official v3->v4 upgrade guide explicitly describes v4 as a major release with breaking changes. Relevant UI-parity changes include renamed utilities, ring width/color changes, placeholder color changes, button cursor behavior and `<dialog>` margin reset.

Therefore: do not force a v4 migration during Superdesign porting. Detect the live design's Tailwind major and pin it for the parity phase. If it is v3-style, use v3.4.x first and migrate only as a separately reviewed change.

Source: https://tailwindcss.com/docs/upgrade-guide

## Supabase 2026 findings

- Supabase recommends cookie-oriented SSR integration for Next.js via `@supabase/ssr` and current docs describe publishable keys for browser clients.
- Supabase announced a 2026 breaking change: newly created public tables are not automatically exposed to the Data/GraphQL API by default; explicit Postgres `GRANT`s are required. Grants are separate from RLS.
- RLS remains mandatory for row isolation. Use current Supabase skill rules: ownership predicates, UPDATE USING + WITH CHECK, no user_metadata authorization, no secret key in frontend.

Sources:
- https://supabase.com/docs/guides/auth/server-side
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/choosing-a-server-package
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

## Cloudflare R2

R2 presigned URLs are temporary bearer capabilities for object-specific operations. Official docs allow expiries from seconds to days. The upload guidance says single PUT is appropriate for small/medium files under roughly 100 MB; multipart is mainly for larger/resumable/parallel uploads. With Web Study capped at 50 MB, single presigned PUT is the simpler V1 fit.

Sources:
- https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- https://developers.cloudflare.com/r2/objects/upload-objects/

## Calendar recurrence

RFC 5545 says RECURRENCE-ID identifies a specific recurrence instance using its original DTSTART. If the occurrence moves, the recurrence identifier remains the original time. EXDATE removes instances from the recurrence set. This supports Web Study's series + exception model keyed by `original_start`.

Source: https://www.rfc-editor.org/info/rfc5545/

## Modal accessibility

W3C APG says modal content outside the dialog is inert, keyboard focus remains within the dialog, Escape closes, and focus generally returns to the invoker. The dialog needs `role=dialog`/equivalent semantics, `aria-modal=true`, and an accessible label. These are behavioral requirements and do not justify visual redesign.

Source: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

## Visual regression

Playwright supports `expect(page).toHaveScreenshot()`. Its docs warn rendering varies by OS/browser/settings and recommend comparing in the same environment as the generated baseline. Web Study uses deterministic environment/data/font loading and human-reviewed diffs.

Source: https://playwright.dev/docs/test-snapshots

## Codex execution planning

OpenAI's current modernization cookbook recommends setting up `AGENTS.md` + `PLANS.md`/ExecPlan conventions for multi-phase codebase work. The older dedicated ExecPlans recipe is archived but still explains the living-plan pattern. V4 keeps the convention while treating current repository state/tests as the proof of completion.

Sources:
- https://developers.openai.com/cookbook/examples/codex/code_modernization
- https://developers.openai.com/cookbook/articles/codex_exec_plans
- https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex
