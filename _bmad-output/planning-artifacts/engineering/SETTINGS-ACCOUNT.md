# Settings and Account Engineering

## Profile

Visible approved Settings fields:

- avatar control
- full name
- email (read-only unless a separate verified email-change flow is designed)
- Save Changes

Store display name in profile. Email source of truth remains Supabase Auth.

## Password

"Update Password" starts the authenticated password-update flow. Do not ask users for or store their current password in application tables.

## Notification preferences

If the detailed notification-preference surface is absent in the live project, create/iterate it in Superdesign first, then implement it from that draft.

## Storage usage

Render `used / quota` from backend bytes, formatted in UI. V1 quota is 2 GB even though the mock shows 10 GB. Progress percent must be computed from actual values.

## Developer/API

Required by product decision. Backend supports list/create/revoke keys. If the Developer/API UI is absent in the live project, Codex creates/iterates it in the same Superdesign project before implementation.

Required states:

- empty/no keys
- key list with name, prefix, created, last used, status
- create key
- one-time secret reveal/copy
- revoke confirmation

## Sign out

Both Settings and profile dropdown use the same action.

## Delete account

The current Settings row is not sufficient to safely execute immediate deletion. Require an approved confirmation step. If absent live, Codex creates/iterates it in the same Superdesign project. Backend deletion orchestration can be implemented independently, but the destructive call is not wired to a one-click row.
