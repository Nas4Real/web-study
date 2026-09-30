# Design Contract - Web Study V4

## Primary authority

Nas's live Web Study Superdesign project is the primary visual and interaction source. Codex has direct access and must inspect it before UI work.

The bundled screenshots are regression references, not a replacement for the live project.

## Newly approved V4 detail states

### Task Details

Reference: `design-reference/screenshots/v4/17_TaskDetails.png`

The approved state contains:

- priority + subject eyebrow (`HIGH PRIORITY • ...` in the reference)
- task title
- due date/time
- Description block
- ordered Subtasks with independent checkboxes and completed styling
- Delete Task, Close, Complete actions
- blurred/dimmed modal backdrop

The underlying task authoring UI has not yet been adapted. Before implementing task creation/editing for priority/subtasks, Codex must create or iterate the corresponding New/Edit Task state in the same Superdesign project.

### Session Details

Reference: `design-reference/screenshots/v4/18_SessionDetails.png`

The approved state contains:

- subject eyebrow and subject semantic color
- session title and time range
- location
- professor
- Notes & Reminders ordered list
- Delete Session, Close, Edit actions
- blurred/dimmed modal backdrop

The modal opens from Calendar Day, Calendar Week, and Dashboard Today's Classes. The underlying New/Edit Session forms have not yet been fully adapted for every detail field. Codex must create/iterate those missing form states in Superdesign before implementation.

## Existing design language

- Dark, quiet desktop application.
- Poppins primary UI typeface.
- IBM Plex Mono for compact time/technical labels where already used.
- Thin neutral borders, low-elevation dark surfaces, restrained accents.
- Subject color is the semantic accent across calendar/tasks/documents/dashboard.
- White rounded primary actions on dark surfaces.

## Modal behavior contract

Visual appearance comes from Superdesign. Accessibility behavior is non-negotiable but must not restyle the modal: modal semantics, inert background, trapped keyboard focus, Escape close where appropriate, and focus returned to the invoking control.

## Intentional product corrections

- Apple auth excluded.
- 2 GB real quota, not historical 10 GB placeholder.
- Recurrence required.
- Developer/API key Settings required.
- Notification preferences required.
- Missing required UI is designed in live Superdesign first.

## Tailwind rule

Exact visual parity is more important than framework novelty. Pin the Tailwind major used by the live Superdesign source for the initial port. Do not silently migrate a v3-style design to v4 during implementation.
