# Story 02-06: Set-new-password UI

Epic: epic-02
Status: done
Dependencies: 02-03

## Purpose

Port the password-recovery completion form after Superdesign supplies it.

## Engineering constraints

SUPERDESIGN-FIRST. If the set-new-password state is absent live, create/iterate it in the existing project; do not invent it directly in code.

## Done when

The approved screen is ported exactly and connected to Supabase recovery-session password update.

## Superdesign-first prerequisite

Before coding this UI, inspect the live Web Study Superdesign project. If the required state is absent, create or iterate the missing draft in that same project, preserve the established design language, and then implement from that draft. No user export is required.

## Implementation checkpoint

- Inspected the user-supplied full interactive Superdesign prototype (`3b6767a8-0995-4cc2-82b4-1d2798feea98`, version 96) and confirmed it does not expose a separate set-new-password state.
- Added `/set-new-password` by mechanically reusing the approved split auth shell, Forgot Password card treatment, and existing password-field styling; no approved screen was redesigned.
- Wired matching new-password fields, independent visibility controls, pending/error/success states, and the existing recovery-session `updatePasswordAction`.
- Added route, accessibility, browser-error, responsive, fixture, and visual-regression coverage. All 14 focused auth checks and all 51 deterministic Playwright checks pass.
- Lint, TypeScript, 95 unit tests, and the Next.js production build pass.
- Verified the real local Supabase + Mailpit flow end to end: signup, email verification, reset request, PKCE recovery callback to `/set-new-password`, password update, old-password rejection, and new-password sign-in.
