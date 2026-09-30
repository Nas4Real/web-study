# V2 Engineering Package Changelog

## Added from new Superdesign screens

- Calendar Day, Week, Month as explicit visual baselines.
- Current/in-progress session treatment.
- Type-specific New Session forms for Exam, University, Revision.
- New Task modal.
- Settings page.
- Profile dropdown.
- Updated auth baselines.

## Locked corrections

- Apple auth remains out of V1 and will be removed.
- Storage quota is 2 GB, not the 10 GB mock value.
- Recurrence remains required but its controls are design-blocked until added in Superdesign.
- Developer/API keys remain required but their Settings UI is design-blocked until added in Superdesign.

## Engineering depth added

- 41 story-level implementation artifacts.
- 8 per-epic Codex ExecPlans.
- domain service contracts.
- state machines.
- recurrence engineering.
- R2 upload/quota/cleanup engineering.
- API auth/rate-limit/idempotency engineering.
- normalized error catalog.
- observability contract.
- expanded OpenAPI draft.
- deeper Supabase schema draft with hierarchical folders, upload intents, cleanup jobs, API rate windows, and recurrence exceptions.
