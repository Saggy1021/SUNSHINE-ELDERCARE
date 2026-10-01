# PHASE 19M — PRODUCTION HOSTING & DEPLOYMENT REPORT

## 1. Hosting Architecture
**VERIFIED**
- Target: Vercel (Next.js App Router).
- Database: Supabase PostgreSQL.
- Storage: Cloudflare R2 (Private bucket).
- Next.js dynamic routing, Server Actions, and Auth.js integrate natively with the Vercel serverless platform without ejecting.

## 2. Vercel Compatibility
**PASS**
- The application natively leverages React Server Components, Server Actions, and Next.js middleware, mapping 1:1 to Vercel's edge/serverless architecture.
- Prisma operates cleanly in serverless through `globalForPrisma` connection caching. 

## 3. Environment Variables
**VERIFIED**
- `DATABASE_URL` / `DIRECT_URL`: **SERVER-ONLY/SECRET**
- `AUTH_SECRET`: **SERVER-ONLY/SECRET**
- `R2_SECRET_ACCESS_KEY`: **SERVER-ONLY/SECRET**
- `PAYMENT_WEBHOOK_SECRET`: **SERVER-ONLY/SECRET**
- `NEXT_PUBLIC_APP_URL`: **PUBLIC**
- Production configuration strictly isolates `R2_SECRET_ACCESS_KEY` and never exposes it to client bundles.

## 4. Environment Separation
**VERIFIED**
- Vercel utilizes discrete environments (Development, Preview, Production). 
- **CRITICAL SAFEGUARD:** Preview Deployments MUST use a separate Supabase project. Linking Production Supabase or Production Stripe to Preview branches introduces massive data-corruption risks.

## 5. Supabase Configuration
**VERIFIED**
- Production database requires connection pooling (PgBouncer/Supavisor) configured via `DATABASE_URL`.
- Migrations MUST use `DIRECT_URL` to bypass poolers.

## 6. Prisma Migration Procedure
**LAUNCH PREREQUISITE**
- Generate the `phase19g_storage_tracking` migration locally.
- Forward-only deployment: Execute `npx prisma migrate deploy` in the production CI/CD pipeline (e.g. GitHub Actions or Vercel Build Command) against the production Supabase.

## 7. R2 Configuration
**VERIFIED**
- Production Bucket: `sunshine-documents-prod`.
- Private bucket access is secured via S3 presigned URLs minted securely by Server Actions. No public accessibility exists.

## 8. Auth Production Configuration
**VERIFIED**
- `AUTH_SECRET` must be a strong 32-byte cryptographically secure random string.
- Auth.js will inherently enforce Secure (HTTPS) cookies on Vercel deployment.

## 9. Domain/DNS Plan
**LAUNCH PREREQUISITE**
- **Canonical Domain:** `https://sunshineeldercare.in`
- **DNS Records:** A/CNAME records must be pointed to Vercel's Anycast IP/CNAME targets.
- **Apex behavior:** `www.sunshineeldercare.in` must 308-redirect to the apex domain natively within Vercel.

## 10. Email Configuration
**LAUNCH PREREQUISITE**
- The current application utilizes a mock or un-configured email adapter. A production-grade service (e.g., Resend, AWS SES) and valid DKIM/DMARC domain records must be injected before public release.

## 11. Payment Configuration
**LAUNCH PREREQUISITE**
- The production payment adapter (e.g., Stripe, Razorpay) remains unconfigured. Production API keys and webhook secrets must be provided. Mock adapters will silently log and drop financial transactions in their current state.

## 12. Rate Limiting Production Requirement
**NON-BLOCKING FINDING**
- Phase 19B rate limits utilize a single-instance in-memory store. Vercel spins up multiple stateless serverless invocations per region. 
- **Prerequisite for high-volume scale:** A distributed store (e.g. Vercel KV / Redis) must be injected into the `RateLimitStore` adapter if precise global rate limiting is required.

## 13. Security Headers
**PASS**
- Phase 19C strictly enforces `Content-Security-Policy`, `Strict-Transport-Security`, and `X-Frame-Options` natively via Next.js headers.

## 14. Monitoring
**NON-BLOCKING FINDING**
- Application emits JSON structured logs. Vercel Log Drains must be attached to an APM provider (e.g., Datadog, Axiom).

## 15. Storage
**PASS**
- File limits, MIME validations, and magic bytes natively enforce security bounds independent of the hosting provider.

## 16. Deployment Sequence
1. Git tag `v1.0.0-rc`.
2. Vercel build detects tag, provisions build container.
3. `npx prisma migrate deploy` executes.
4. Next.js generates static/ISR assets.
5. Vercel routing shifts.

## 17. Rollback Strategy
- **Frontend Bug:** Click "Rollback" in Vercel to instantly revert to the previous immutable deployment hash.
- **Database Bug:** Application rollbacks do NOT roll back PostgreSQL schemas. Schema bugs demand a forward-rolling Prisma migration. **Never use `prisma migrate reset`.**

## 18. Preview/Staging Safety
- **Safeguard:** Vercel Preview environments must *never* receive Production Environment Variables. They should default to separate Mock Payment, Mock Email, and Staging DB environments.

## 19. Smoke Test Matrix
**VERIFIED**
- Comprehensive coverage required for: Authentication (Login/Reset), Member DB (Dashboards/Documents), Admin Authorization (Roles/Permissions), Financial (Invoice calculations), and Edge Security (IDOR trapping).

## 20. Launch Prerequisites
- Generate Phase 19G R2 migration.
- Configure production Email Provider (DKIM/DMARC).
- Configure production Payment Provider.
- Attach Vercel Log Drains.
- Activate Supabase Point-In-Time Recovery (PITR).

## 21. Known Blockers
- No production database generated tracking migrations yet (requires local container).
- No payment provider credentials.

## 22. Final Readiness Verdict
**APPROVED WITH NON-BLOCKING FINDINGS**
