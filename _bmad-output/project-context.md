# Project Context - Web Study V4

Owner: Nas
Platform: desktop web V1
Design authority: live Superdesign Web Study project

## Product

Private multi-user study workspace with Dashboard, Calendar, Tasks, Documents, Auth, Settings, in-app notifications and public API access.

## New V4 interaction context

- Task Details modal is approved. It shows high/normal priority semantics, subject, due, description and independent subtasks, with Complete/Delete actions.
- Session Details modal is approved. It opens from Calendar Day/Week and Dashboard Today's Classes and shows effective occurrence information including location, professor and Notes & Reminders.
- Older create/edit modals are not yet adapted to all these fields. Codex must update missing authoring states in the same live Superdesign project before coding them.

## Core engineering invariants

Read `AGENTS.md`, PRD, architecture, DATA_MODEL, ADRS and active story before implementation. Never redesign approved Superdesign UI. Web and external API share services. RLS + owner-aware FKs enforce tenant isolation. R2 is private. Recurrence occurrence identity is original start.
