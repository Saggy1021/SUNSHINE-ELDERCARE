# ENVIRONMENT SETUP & SEPARATION

## Environment Variables Inventory

*Note: No real values are printed here.*

### REQUIRED (Production & Staging)
- `DATABASE_URL` (Secret, Server-Only)
- `DIRECT_URL` (Secret, Server-Only)
- `AUTH_SECRET` (Secret, Server-Only)
- `NEXT_PUBLIC_APP_URL` (Public)

### PRIVATE STORAGE (R2)
- `R2_ACCOUNT_ID` (Secret, Server-Only)
- `R2_ACCESS_KEY_ID` (Secret, Server-Only)
- `R2_SECRET_ACCESS_KEY` (Secret, Server-Only)
- `R2_BUCKET_NAME` (Server-Only)
- `R2_ENDPOINT` (Server-Only)
- `R2_PRESIGNED_URL_TTL` (Server-Only)

### EXTERNAL PROVIDERS (Pending)
- `PAYMENT_PROVIDER_KEY` (Secret, Server-Only)
- `PAYMENT_WEBHOOK_SECRET` (Secret, Server-Only)
- `EMAIL_PROVIDER_KEY` (Secret, Server-Only)

## Environment Separation Policy
Vercel enforces strict separation of variables between `Production`, `Preview`, and `Development`.

1. **Development:** Uses local variables `.env.local` linking to local mock adapters and local/remote dev DBs.
2. **Preview (Staging):** MUST link to an isolated Staging PostgreSQL database. **Never** map Production `DATABASE_URL` to Preview branches. E2E automation must target Staging.
3. **Production:** Contains the live `DATABASE_URL` and real `R2_SECRET_ACCESS_KEY`. Validated strictly at startup.

## Startup Validation
If `DATABASE_URL` or critical `AUTH_SECRET` components are missing, the server process safely fails closed on initialization rather than defaulting to insecure mock behaviors.
