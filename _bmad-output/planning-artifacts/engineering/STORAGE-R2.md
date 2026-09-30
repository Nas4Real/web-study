# R2 Storage Engineering

## Constants

- max file bytes: 52,428,800 (50 MiB) unless product chooses decimal MB later
- default user quota: 2,147,483,648 bytes (2 GiB)
- allowed extensions: pdf, docx, xlsx, pptx, png, jpg, jpeg
- bucket: private

Keep these in server configuration/domain constants, not duplicated across components.

## Object keys

Use immutable opaque keys:

```text
users/{user_id}/files/{file_id}
users/{user_id}/avatars/{avatar_id}
```

Do not include subject/folder names in R2 keys. Moving or renaming files is metadata-only.

## Upload intent transaction

Within one database transaction/function:

1. lock the profile/quota row
2. assert `used + reserved + declared <= quota`
3. increment reserved bytes
4. create file metadata in pending state
5. create upload_intent

Only after the transaction commits is the presigned PUT URL generated.

## Presigned PUT

Bind key and expected Content-Type. Expiry target: 10 minutes. R2 CORS allows only production/local app origins and required PUT/HEAD/GET headers/methods.

## Complete upload

1. authenticate actor
2. load pending file + intent scoped to user
3. HEAD R2 object
4. require object exists
5. require actual size > 0 and <= 50 MB
6. compare expected MIME metadata where reliable
7. atomically decrement reserved bytes and increment used bytes by actual size
8. mark file ready and intent completed

If actual size exceeds reserved declaration, completion may only succeed if additional quota is still available inside the same locked transaction.

## Expiry cleanup

Scheduled cleanup selects expired incomplete intents, releases reservations once, marks failed/deleting, and deletes any orphan R2 object. Retries go through `file_cleanup_jobs`.

## Download

Authorized service checks file belongs to user and is ready, then returns a short-lived GET URL. Treat URL as a bearer token and do not log it.

## Deletion

UI delete marks the file unavailable, enqueues R2 cleanup, and ensures quota accounting changes exactly once according to the chosen policy. Recommended V1 behavior: decrement used bytes when the logical delete transaction commits, then retry R2 physical cleanup until successful. This prioritizes user-visible consistency while cleanup jobs prevent permanent orphaned bytes.
