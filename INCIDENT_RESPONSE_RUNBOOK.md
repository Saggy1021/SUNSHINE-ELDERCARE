# INCIDENT RESPONSE RUNBOOK

## 1. Database Outage
- **Symptom:** Next.js throws `503 Service Unavailable` on `/api/health`.
- **Action:** Check Supabase status. If connection limit exceeded, check PgBouncer pool limits. Do NOT execute `prisma db push` to attempt recovery.

## 2. R2 Outage
- **Symptom:** Member Document uploads fail; pre-signed URLs return 404/503.
- **Action:** Verify Cloudflare R2 dashboard limits. The marketing site and checkout will remain operational; do not shut down the application.

## 3. Authentication Failure
- **Symptom:** Users cannot login or establish Auth.js sessions.
- **Action:** Verify `AUTH_SECRET` matches between instances. Verify Next.js middleware is actively forwarding cookies.

## 4. Payment Webhook Outage
- **Symptom:** Webhooks from payment gateway reject with 401.
- **Action:** Verify `PAYMENT_WEBHOOK_SECRET` matches Vercel production variables. Review gateway retry logs (events are strictly idempotent).

## 5. Duplicate Payment Reports
- **Action:** The system explicitly guards against duplicate receipts via `idempotencyKey` tracking. Extract the `providerTransactionId` from the dashboard and reconcile explicitly with the provider (e.g. Stripe) dashboard.

## 6. Email Outage
- **Symptom:** Clients do not receive password reset tokens.
- **Action:** Check the provider dashboard (e.g. Resend) for DKIM/DMARC suspension. Do not reset database records, email failures do not corrupt data.

## 7. Compromised Credentials
- **Action:** Immediately rotate `AUTH_SECRET`, `R2_SECRET_ACCESS_KEY`, or `DATABASE_URL` via respective provider dashboards. Trigger Vercel rebuild to purge environment memory.

## 8. Unauthorized Document Access
- **Action:** `AuthorizationService` bounds prevent IDOR. If logic fails, aggressively cycle `R2_SECRET_ACCESS_KEY` to instantly void all previously minted active S3 Signed URLs.

## 9. Failed Deployment
- **Action:** Click "Rollback" on the Vercel Dashboard to restore the prior immutable Edge deployment. Evaluate database schema backward compatibility before reverting code.
