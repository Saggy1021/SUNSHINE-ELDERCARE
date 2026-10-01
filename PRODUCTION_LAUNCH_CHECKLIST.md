# PRODUCTION LAUNCH CHECKLIST

## Required Technical Pre-flight
- [ ] Next.js Build executes without TypeScript errors.
- [ ] Phase 19G tracking migration generated, reviewed, and successfully executed against the production database (`npx prisma migrate deploy`).
- [ ] Supabase Point-in-Time Recovery (PITR) enabled and verified.
- [ ] Distributed Rate-Limiting Store (e.g. Vercel KV, Redis) attached and tested for multi-instance deployment.
- [ ] Vercel Log Drains connected to an APM provider.

## External Providers
- [ ] Official canonical Email Provider configured (DKIM/DMARC).
- [ ] Official Payment Gateway integrated, verified, and webhook secrets injected.
- [ ] Official contact, WhatsApp, and emergency medical numbers injected into CMS/Settings.
- [ ] R2 Private Document Bucket verified.

## Operational Checks
- [ ] `/api/health` indicates `HTTP 200`.
- [ ] Server-only Secrets validated as safely isolated from Vercel preview environments.
- [ ] Security Headers validated actively via browser inspection.

## Smoke Testing & Audits
- [ ] Automated E2E Smoke Tests passed against an isolated Staging Database.
- [ ] Final Manual Smoke checklist completed against final production configuration.
- [ ] Legal content and privacy policies approved.

## Launch Authorization
- [ ] Explicit Owner approval received.
- [ ] **FINAL STEP:** Execute DNS Cutover (`sunshineeldercare.in`).
