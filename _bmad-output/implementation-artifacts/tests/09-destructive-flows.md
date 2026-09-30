# Destructive Flow Test Specification

## Cases

- DEST-001: delete one recurrence occurrence does not delete series.
- DEST-002: delete whole series removes expected occurrences/read models.
- DEST-003: deleting a file cannot delete another user's R2 object.
- DEST-004: delete-account flow requires the designed confirmation state.
- DEST-005: account deletion revokes API keys and sessions as designed.
- DEST-006: account deletion reconciles Postgres rows and R2 objects even if one external operation transiently fails.
- DEST-007: retrying deletion is idempotent.
- DEST-008: destructive API actions return stable results for already-deleted resources.
