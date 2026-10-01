# DEPLOYMENT RUNBOOK

## Pre-Deployment Verification
1. Ensure the Git `main` branch is green and approved.
2. Verify all `TEST-ONLY` or `DEVELOPMENT-ONLY` environment variables are absent from Vercel Production Config.
3. Verify `DATABASE_URL` uses PgBouncer (pooler). Verify `DIRECT_URL` points directly to the DB for migrations.

## Database Migration Deployment
1. Do **NOT** run `npx prisma migrate dev`, `npx prisma db push`, or `npx prisma migrate reset` against production.
2. Within the CI/CD pipeline (e.g. Vercel Build Command), execute:
   ```bash
   npx prisma migrate deploy
   ```
   *Note: `DIRECT_URL` must be accurately defined in Prisma 5.22 for migration operations to succeed.*

## Build & Release (Vercel)
1. Trigger Vercel deployment of the canonical release tag.
2. Monitor Vercel build output. (Ignore known TS internal heap constraints if `tsc` previously passed externally).
3. Wait for Vercel edge propagation.

## Smoke Validation
1. Verify `https://sunshineeldercare.in/api/health` yields `HTTP 200`.
2. Execute manual Smoke Test Checklist (`PRODUCTION_LAUNCH_CHECKLIST.md`).

## DNS Cutover
**AUTHORIZED STEP ONLY**
Once smoke tests pass on the Vercel-generated canonical URL, modify DNS records to point `sunshineeldercare.in` to the Vercel project targets.

## Rollback Procedure
1. **Frontend Bug:** Use Vercel's "Rollback" feature to instantly restore the previous immutable build.
2. **Database Bug:** Prisma migrations are strictly forward-only. Do not attempt to reverse a schema change; write a new forward-rolling migration fixing the bug and re-deploy.
