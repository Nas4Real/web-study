# Epic 07 - Public API and personal API keys

## Objective

Expose the application's domain through a versioned, user-scoped API without duplicating web business logic.

## Stories

- 07-01 Personal API key backend
- 07-02 API authentication, rate limit and error pipeline
- 07-03 Tasks/subjects/chapters/folders API including Task Details/subtasks
- 07-04 Calendar API including effective occurrence detail/operations
- 07-05 Files/notifications/profile/storage API
- 07-06 Developer/API Settings UI (Superdesign-first if missing)

## Exit criteria

Public API contracts match service semantics, API keys are secure/revocable/rate-limited, task/session V4 detail contracts are covered, cross-user access tests pass, and Settings UI is approved visually.
