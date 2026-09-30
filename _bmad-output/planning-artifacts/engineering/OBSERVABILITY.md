# Observability Contract

## Request IDs

Generate or accept a safe request ID at the Next.js boundary and include it in logs and API errors.

## Structured event fields

- timestamp
- level
- request_id
- user_id
- auth_kind
- api_key_id when applicable
- route or service_operation
- duration_ms
- result
- normalized_error_code

Never log secrets, tokens, presigned URLs, passwords, or file contents.

## Product/ops counters

Track at minimum:

- auth failures by class
- API 4xx/5xx counts
- upload-intent created/completed/expired
- upload verification failures
- R2 cleanup retry backlog
- notification job inserted/deduped/failed
- calendar range expansion duration and occurrence counts
- rate-limit rejections

## Alerts

Initial operational alerts should cover sustained 5xx rate, failed cleanup backlog, auth callback failures, and database connectivity errors.
