# Private beta operations

This runbook covers the intentionally small operating surface for the two-user
private beta. It does not introduce alerting, tracing, scheduled jobs, or a
third-party monitoring service.

## Production references

- Application: <https://web-study-pearl.vercel.app>
- Health check: <https://web-study-pearl.vercel.app/api/health>
- Supabase project ref: `qvqnztgpjludiahmboyd`
- Expected health response: HTTP 200 with `{"status":"ok"}`

Cloudflare R2 is not configured. Document upload and download remain disabled;
that is an expected limitation, not an incident.

## What can be diagnosed from logs

The auth callback emits one structured error event when a callback cannot be
completed:

```json
{"level":"error","event":"auth_callback_failed","requestId":"...","route":"/api/auth/callback"}
```

The callback response also contains the same `x-request-id` header. The event
intentionally excludes the OAuth code, query string, email address, provider
error, raw exception, cookies, and tokens.

When sign-in redirects to `?error=CALLBACK_FAILED`:

1. In the browser network panel, copy `x-request-id` from the callback response.
2. Open the `web-study` project in Vercel, then open **Logs**.
3. Search first for the exact request ID. If it is unavailable, search for
   `auth_callback_failed` and narrow the time range.
4. Check Supabase Auth logs for the same time window. Do not paste tokens,
   callback URLs, database passwords, or user email addresses into incident
   notes.

## Incident checklist

1. Record the UTC time, affected flow, deployment commit, and request ID.
2. Confirm `/api/health` returns 200.
3. Check the latest Vercel deployment is **Ready** and inspect runtime logs.
4. Check the Supabase project is healthy and inspect Auth or Postgres logs for
   the affected time window.
5. Reproduce with a private test account; never ask a user for a password or
   token.
6. If the newest deployment caused the problem, revert its commit and redeploy.
7. If data may be corrupt or missing, stop writes and take a fresh logical dump
   before attempting repair.
8. Validate any data repair or restore in a separate project first. Never restore
   over production merely to test whether a backup works.
9. After recovery, smoke-test sign-in, tasks, calendar, and document metadata,
   then record the cause and action taken.

## Database backup policy

Supabase's current backup documentation says managed daily backups are available
on paid plans and recommends that free-plan projects regularly export data with
`supabase db dump`. For this private beta:

- Create a logical backup weekly and immediately before a risky schema or data
  operation.
- Store it outside the repository and outside the computer running the app.
- Never commit a dump or database connection string to Git.
- Retain at least the three most recent known-good backup sets.

The commands below use the pinned CLI version already used by this repository.
First obtain the database connection string from Supabase **Connect**. It must be
percent-encoded. Prefer an interactive terminal and clear the command history if
the connection string was entered directly.

```powershell
New-Item -ItemType Directory -Force -Path .private-backups | Out-Null
npx --yes supabase@2.119.0 db dump --db-url "<DATABASE_URL>" --role-only --file .private-backups/roles.sql
npx --yes supabase@2.119.0 db dump --db-url "<DATABASE_URL>" --file .private-backups/schema.sql
npx --yes supabase@2.119.0 db dump --db-url "<DATABASE_URL>" --data-only --use-copy --file .private-backups/data.sql
```

Move the three files to encrypted off-device storage and remove the local copies
after verifying their sizes are non-zero. `.private-backups/` is intentionally
not a permanent project directory.

## Recovery procedure

1. Preserve the production database. Do not perform an in-place restore first.
2. Create a separate Supabase project in the same region when practical.
3. Recreate project-level configuration that database dumps do not contain,
   including Auth redirect URLs, API keys/environment variables, extensions,
   and any Realtime settings.
4. Follow Supabase's supported restore guide to load `roles.sql`, `schema.sql`,
   then `data.sql` into the separate project. Use a current `psql` client and
   stop on the first error.
5. Apply any newer repository migrations in order.
6. Run the tenant-isolation tests and the critical-flow smoke tests against the
   restored project.
7. Compare row counts for user-owned tables and manually verify one account's
   tasks, sessions, and document metadata without accessing the other account's
   rows.
8. Only after validation, decide whether to switch application environment
   variables to the recovered project or contact Supabase support for an
   in-place managed restore.

Supabase database backups contain database records and Storage metadata, not
the underlying stored file objects. This app uses R2 for file bytes, so R2 needs
its own backup plan after it is connected.

## Official references

- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase CLI `db dump`](https://supabase.com/docs/reference/cli/supabase-db-dump)
- [Backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Restore a dashboard backup](https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore)
