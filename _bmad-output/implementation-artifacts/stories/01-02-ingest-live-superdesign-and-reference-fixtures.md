# Story 01-02: Establish live design references and deterministic fixtures

Epic: epic-01
Status: ready-for-dev
Dependencies: 01-01

## Purpose

Inspect the live Web Study Superdesign project, record target states, and create typed fixture DTOs covering dashboard/calendar/tasks/documents/settings/auth plus Task Details and Session Details. Bundled V2/V4 images are regression evidence, not the primary design source.

## Expected implementation surface

`src/domain/dto/*`, `src/fixtures/*`, visual-baseline metadata/design docs.

## Engineering constraints

Fixtures contain no business logic and are replaceable by real services. Tailwind/font/icon assumptions come from the live project, not from a generic starter.

## Test plan

Fixture/schema tests and baseline-state smoke rendering.

## Done when

Live targets are identified, fixture DTOs cover approved states, and design precedence is recorded without requiring Nas to export Superdesign.
