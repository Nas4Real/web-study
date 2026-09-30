# V3 Changelog - Live Superdesign + Test Specifications

- Live Superdesign project is now the primary UI source of truth.
- Nas no longer needs to export or send Superdesign source.
- Codex is authorized to create/iterate missing UI states inside the existing project.
- Existing approved screens remain protected from redesign.
- Previous `blocked-design` stories are now `ready-superdesign-first`.
- Added a dedicated live Superdesign workflow and updated Codex handoff/AGENTS rules.
- Added 10 detailed test specification files covering unit, RLS, auth, recurrence, storage, API, E2E, visual, destructive, accessibility/performance cases.
- Clarified that executable tests are generated alongside implementation code, not pre-generated in the planning package.
