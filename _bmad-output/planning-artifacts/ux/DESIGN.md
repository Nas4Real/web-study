# DESIGN - Immutable Live-Superdesign UI Contract V4

Owner: Nas
Design authority: existing live Web Study Superdesign project
Reference platform: desktop web

## 1. Non-negotiable rule

Approved live Superdesign states are the visual source of truth. Codex must not redesign, replace with a preferred component library, “modernize” spacing/colors/radii/typography, substitute icons, or make unrelated changes for coding convenience.

Nas is not required to export markup. Codex reads the live project directly.

## 2. Porting model

1. Inspect newest relevant live draft/state.
2. If missing, create/iterate the required state in the same project before code.
3. Translate approved structure/styles to React/TSX mechanically.
4. Replace demo data/runtime behavior only after visual parity.
5. Extract reusable components only when output remains equivalent.
6. Remove preview/runtime infrastructure from production.

## 3. Established visual foundations

Dark quiet desktop UI; Poppins primary font; IBM Plex Mono where already used for compact labels; black/near-black surfaces; thin neutral borders; restrained subject accents; rounded cards/modals; existing Iconify/Lucide/provider icon identity.

The old exported preview contains historical token evidence but never overrides live Superdesign.

## 4. Approved state inventory

Live project includes the core Dashboard, Calendar Day/Week/Month, Tasks, Documents, Settings/profile dropdown, task/session creation variants and auth screens. Bundled V2 screenshots preserve regression evidence.

V4 additionally approves:

- Task Details (`design-reference/screenshots/v4/17_TaskDetails.png`)
- Session Details (`design-reference/screenshots/v4/18_SessionDetails.png`)

## 5. Superdesign-first states still required if absent live

- auth after Apple removal spacing, email-verification states, set-new-password
- recurrence controls and occurrence-vs-series scope
- notification panel/preferences
- Developer/API key states
- delete-account confirmation
- file progress/error/quota/empty states
- enriched New/Edit Task: priority, description, subtasks, completed/reopen variants
- enriched New/Edit Session: type-appropriate location/professor, Notes & Reminders, recurrence/edit state
- treatment/removal of AI Suggestion/AI summary labels while AI backend remains out of V1

Codex is authorized to create/iterate these in the same project. “Design required” does not mean waiting for Nas to export files.

## 6. V4 detail interaction semantics

Task row/card body opens Task Details on supported surfaces; direct checkbox actions do not bubble. Subtasks are independently checkable. Parent Complete can remain available with incomplete subtasks.

Session cards in Calendar Day/Week and Dashboard Today's Classes open Session Details; Week also opens details. Detail represents the effective occurrence. Month interaction is whatever live Superdesign defines, not assumed.

## 7. Modal accessibility

Preserve approved appearance while implementing modal semantics: outside content inert, focus enters/remains in dialog, Escape closes appropriate details, accessible label, focus restoration.

## 8. Visual regression

Use deterministic Playwright screenshots in a pinned rendering environment. Any intentional visual change requires a matching approved live Superdesign update. Do not broaden diff thresholds to conceal mismatches.

## 9. Tailwind parity

Detect the live project's styling/Tailwind major before bootstrap. If it is v3-style, initial production port uses v3.4.x. Tailwind v4 migration is separate because official upgrade documentation contains visual-impacting breaking changes.
