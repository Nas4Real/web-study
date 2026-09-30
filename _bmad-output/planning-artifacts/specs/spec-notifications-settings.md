# Engineering Spec - Epic 06: Notifications and settings

## Contract sources

- `../PRD.md`
- `../architecture.md`
- `../DATA_MODEL.md`
- `../engineering/NOTIFICATIONS.md`
- `../engineering/SETTINGS-ACCOUNT.md`

## Stories

- `06-01` under `_bmad-output/implementation-artifacts/stories/`
- `06-02` under `_bmad-output/implementation-artifacts/stories/`
- `06-03` under `_bmad-output/implementation-artifacts/stories/`
- `06-04` under `_bmad-output/implementation-artifacts/stories/`
- `06-05` under `_bmad-output/implementation-artifacts/stories/`
- `06-06` under `_bmad-output/implementation-artifacts/stories/`

## Implementation rule

Implement story-by-story. Shared business logic belongs in services, not UI or HTTP adapters. All user-owned operations remain user-scoped and RLS protected. Visual work must preserve the newest approved live Superdesign state; bundled screenshots are regression evidence. Missing visual states must be created/iterated in the live Superdesign project first, then implemented from that draft.

## Epic exit criteria

- every ready story complete and tested
- Superdesign-first stories have an approved live draft before implementation
- database/security checks pass where applicable
- visual regressions reviewed for UI work
- documentation reflects final implementation decisions
