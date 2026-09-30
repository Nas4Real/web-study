# Database and RLS Test Specification V4

## Required coverage

- Every exposed user-owned table has RLS enabled.
- Authenticated user can access own rows according to operation policy.
- User A cannot select/insert/update/delete User B task, subtask, subject, calendar series/exception, file/folder, notification/preferences.
- `task_subtasks` cross-user task reference fails at database constraint layer even if attacker supplies their own `user_id`.
- Task/calendar/file/chapter/folder foreign subject ownership is enforced by owner-aware FK/constraint.
- UPDATE policies contain both USING and WITH CHECK so `user_id` cannot be reassigned.
- `authenticated` has explicit intended grants for Data API tables and no broad grant to internal cleanup/rate tables.
- anon receives no private study-data access.
- security advisor/database advisor findings are reviewed before release.

## Negative-ID enumeration

Repository/service integration must not leak another user's task/subtask/session existence through materially different public error content.
