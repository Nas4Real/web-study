# Story 06-06: Delete-account confirmation UI

Epic: epic-06
Status: ready-superdesign-first
Dependencies: 06-05

## Purpose

Wire account deletion after an approved destructive confirmation state exists; if missing, create/iterate it in the existing Superdesign project first.

## Engineering constraints

SUPERDESIGN-FIRST. The Settings row alone must not perform irreversible deletion in one click. Create/iterate a clear confirmation state in the existing project if absent, then call the deletion orchestration.

## Done when

Approved confirmation UI is ported exactly and E2E verifies cancel and confirmed deletion initiation.

## Superdesign-first prerequisite

Before coding this UI, inspect the live Web Study Superdesign project. If the required state is absent, create or iterate the missing draft in that same project, preserve the established design language, and then implement from that draft. No user export is required.
