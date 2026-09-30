# Story 02-06: Set-new-password UI

Epic: epic-02
Status: ready-superdesign-first
Dependencies: 02-03

## Purpose

Port the password-recovery completion form after Superdesign supplies it.

## Engineering constraints

SUPERDESIGN-FIRST. If the set-new-password state is absent live, create/iterate it in the existing project; do not invent it directly in code.

## Done when

The approved screen is ported exactly and connected to Supabase recovery-session password update.

## Superdesign-first prerequisite

Before coding this UI, inspect the live Web Study Superdesign project. If the required state is absent, create or iterate the missing draft in that same project, preserve the established design language, and then implement from that draft. No user export is required.
