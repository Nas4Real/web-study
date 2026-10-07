# Private-beta deployment

This runbook deploys Web Study for two users with Supabase and Vercel. The
public developer API, notifications, account deletion, and live R2 file bytes
remain deferred. Document organization works, but the Upload control stays
disabled until storage is connected and the upload UI is enabled in a later
story.

Current production URL: `https://web-study-pearl.vercel.app`

## 1. Create and migrate Supabase

1. Create one hosted Supabase project in the closest practical region.
2. Copy its project reference, API URL, and publishable key from the Supabase
   dashboard. Do not expose the secret/service-role key to the browser.
3. From this repository, authenticate and apply the committed migrations:

   ```powershell
   npx --yes supabase@2.119.0 login
   npx --yes supabase@2.119.0 link --project-ref <project-ref>
   npx --yes supabase@2.119.0 db push
   ```

4. In Supabase Authentication URL configuration, set the production Site URL
   to the final Vercel URL and add this exact redirect URL:

   ```text
   https://<production-domain>/api/auth/callback
   ```

5. Keep email/password enabled. Add Google credentials only if Google sign-in
   is needed for the two beta users. Apple stays disabled.

## 2. Import the repository into Vercel

Import `Nas4Real/web-study` as a Next.js project. Vercel should use the
repository defaults (`pnpm`, Node 24, `pnpm build`). Configure these variables
for Production and Preview:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Hosted project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Hosted publishable/anon key |
| `NEXT_PUBLIC_APP_ORIGIN` | Exact deployed origin, without a trailing slash |

Do not add R2 variables yet. If storage is configured later, all four
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET`
values must be supplied together and only as server-side variables.

## 3. Pre-deploy checks

Run locally before promoting the deployment:

```powershell
pnpm check
pnpm test:launch-critical
npx --yes supabase@2.119.0 db lint --linked --level warning
```

The known calendar volatility warning is not an access-control failure. Any new
RLS, privilege, or security-definer warning blocks the deployment.

## 4. Production smoke check

1. `GET https://<production-domain>/api/health` returns `200` and
   `{ "status": "ok" }` with `Cache-Control: no-store`.
2. Create the first verified email/password account, sign out, and sign back in.
3. Create the second verified account in a private browser context.
4. As each user, create a distinct subject and task. Confirm neither account can
   see the other account's task, subject, calendar session, or document metadata.
5. Create, complete, reopen, and delete a task with a subtask.
6. Create one calendar session, reload it, and open Session Details.
7. Open Documents and confirm organization/navigation works while the visible
   `Upload unavailable` control is disabled.
8. Confirm browser console and Vercel function logs show no new errors.

## 5. Rollback

Use Vercel's previous production deployment to roll back application code. Do
not roll back database migrations destructively. If a migration causes a
problem, ship a forward corrective migration, then rerun the health and
two-account isolation checks.
