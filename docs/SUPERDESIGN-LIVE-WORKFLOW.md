# Superdesign Live Workflow for Codex V4

Nas will not export the current project. Codex has direct Superdesign access and is responsible for reading the live project.

## UI-story startup

1. Run the Superdesign integration/CLI preflight and confirm auth.
2. Identify/reuse Nas's existing Web Study project. Do not create a replacement project.
3. Resume the newest relevant target/draft when possible.
4. If the approved state exists, inspect it and implement it.
5. If a required state is missing, create/iterate it in that same project, preserving design language, then implement from the result.
6. Record the draft/project reference in implementation notes when practical.

## V4 approved details

Task Details and Session Details now exist and are considered approved. The supplied V4 screenshots are local regression evidence, but the live project is authoritative.

## V4 missing/likely-to-need-iteration states

- New Task with priority, description, subtasks; Edit Task only if the live product flow requires it
- completed/reopen Task Details variant if absent
- New/Edit Session with type-appropriate location/professor + Notes & Reminders
- recurrence controls
- recurrence one-occurrence/entire-series scope state
- notification preferences
- Developer/API keys
- delete-account confirmation
- email verification result/pending and set-new-password if absent

## Source order

Live newest state > same-project draft created for missing state > V4 screenshots > V2 screenshots > written UX > historical preview HTML.

Creating one missing state never authorizes redesigning unrelated states.
