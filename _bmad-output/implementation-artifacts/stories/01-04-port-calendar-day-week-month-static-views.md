# Story 01-04: Port Calendar Day Week Month static views

Epic: epic-01
Status: ready-for-dev
Dependencies: 01-02

## Purpose

Port the approved live Calendar Day, Week and Month states with deterministic fixture data and view/date navigation state.

## Expected implementation surface

`src/features/calendar/views/*`

## Engineering constraints

No real recurrence engine yet. Preserve live current-session/in-progress styling. Session Details may be represented as an approved static fixture state for visual baseline, but real effective-occurrence behavior belongs to Epic 04.

## Test plan

Visual tests for Day/Week/Month and stable view toggles.

## Done when

All three views match live Superdesign and V2 regression references without styling reinterpretation.
