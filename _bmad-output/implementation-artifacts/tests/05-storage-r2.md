# Storage and R2 Test Specification

## Cases

- STOR-001: upload-init requires authenticated owner and mandatory subject.
- STOR-002: 50 MB file limit is enforced server-side.
- STOR-003: unsupported MIME/extension is rejected.
- STOR-004: quota reservation is atomic under two concurrent uploads near the 2 GB limit.
- STOR-005: presigned PUT uses private R2 object and short expiry.
- STOR-006: completion verifies object existence and authoritative byte size before marking ready.
- STOR-007: failed/stale upload intent releases reserved quota.
- STOR-008: download presign is denied for non-owner.
- STOR-009: move/rename updates metadata without requiring unsafe cross-user object access.
- STOR-010: delete updates logical state and retries physical R2 cleanup safely on provider failure.
- STOR-011: account deletion removes/reconciles all owned R2 objects.
