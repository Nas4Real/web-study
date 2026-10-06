# Environment Contract

## Public/browser-safe

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_ORIGIN=
```

## Server-only

```text
SUPABASE_SECRET_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
API_KEY_HASH_PEPPER=
CRON_SECRET=
```

Names may be adjusted to current provider conventions at implementation time, but server secrets must never use `NEXT_PUBLIC_`.

Validate environment at startup using a server-only schema. Fail fast in production when required values are missing.

`R2_ACCOUNT_ID` is the 32-character Cloudflare account ID. `R2_BUCKET` is the private bucket name. The access key must be an R2 S3 API credential scoped only to the required bucket operations; none of these four values may use a `NEXT_PUBLIC_` prefix.
