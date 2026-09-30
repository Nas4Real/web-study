# Stable Error Catalog V4

Public adapters map provider failures to stable codes. Do not expose raw SQL, R2, Supabase or stack traces.

Core codes:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_FAILED`
- `SUBJECT_NOT_FOUND`
- `TASK_NOT_FOUND`
- `SUBTASK_NOT_FOUND`
- `SESSION_NOT_FOUND`
- `OCCURRENCE_NOT_FOUND`
- `OCCURRENCE_CANCELLED`
- `RECURRENCE_RANGE_INVALID`
- `RECURRENCE_SCOPE_REQUIRED`
- `FOLDER_CYCLE`
- `FILE_TYPE_NOT_ALLOWED`
- `FILE_TOO_LARGE`
- `STORAGE_QUOTA_EXCEEDED`
- `UPLOAD_INTENT_EXPIRED`
- `UPLOAD_VERIFICATION_FAILED`
- `API_KEY_INVALID`
- `API_KEY_REVOKED`
- `RATE_LIMITED`
- `CONFLICT`
- `PROVIDER_UNAVAILABLE`
- `INTERNAL_ERROR`

Cross-user guessed IDs should normally collapse to a non-enumerating not-found/forbidden strategy consistently across UI and public API.
