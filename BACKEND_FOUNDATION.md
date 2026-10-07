# Sunshine Eldercare — Backend Foundation Documentation

> Phase 1 Complete | Last Updated: September 2026

---

## Overview

This document describes the production backend foundation for Sunshine Eldercare. It covers architecture decisions, database configuration, local development setup, migration workflow, environment variables, and known limitations.

This is a **living document**. Each phase will update it.

---

## Architecture

```
Browser / Client
      │
      ▼
Next.js App Router (app/)
      │
      ├─ Server Components   — read-only data display
      ├─ Server Actions       — mutations, form handling
      └─ Route Handlers       — API endpoints (app/api/)
             │
             ▼
        Validation (Zod)
             │
             ▼
     Authorization Layer      ← Phase 2 (not yet implemented)
             │
             ▼
     Business Services (lib/services/)
        ├─ PricingService
        ├─ TaxService
        ├─ InvoiceService
        ├─ PaymentService
        └─ EmailService
             │
             ▼
       Prisma ORM (lib/db.ts)
             │
             ▼
       PostgreSQL Database
```

**Key Principle:** Business logic MUST NOT be placed directly in React components or Route Handlers. It belongs in the service layer.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| Language | TypeScript 5.7.3 (strict mode) |
| ORM | Prisma 5.22.0 |
| Database | PostgreSQL 16 |
| Auth Library | next-auth v5 (beta) + @auth/prisma-adapter |
| Validation | Zod 4.x |
| Styling | Tailwind CSS 4.x |
| Runtime | Node.js 24.x |

---

## Database

**Production Database:** PostgreSQL (managed provider recommended — Neon, Supabase, Railway, AWS RDS)  
**Local Development:** Docker Compose (see below)

### Connection

Set `DATABASE_URL` in your environment:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

The application will log a fatal error at startup if `DATABASE_URL` is missing in production. It will NOT silently fall back to any local or in-memory database.

---

## Prisma Setup

### Client Singleton

**All database access MUST go through the singleton client in `lib/db.ts`.**

```typescript
import { db } from '@/lib/db'
```

Do NOT create a `new PrismaClient()` anywhere else. This prevents connection pool exhaustion during Next.js hot reload in development.

### Schema Location

```
prisma/schema.prisma
```

### Seed Script

```
prisma/seed.ts
```

The seed script uses `upsert` (idempotent — safe to run multiple times). It seeds:
- Standard membership plans (Basic, Premium) from `lib/config/business-data.ts`
- A **development-only** test tax rule (`DEV_TEST_GST_18`)

> ⚠️ **IMPORTANT:** The seeded `DEV_TEST_GST_18` tax rule is for local development and testing ONLY. Production tax rules must be configured by a certified accountant based on Sunshine Eldercare's exact GST registration, service classifications, and applicable Indian tax law. **Do NOT activate the development tax rule in production.**

---

## Local Development Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- Node.js 18+
- pnpm

### Step-by-Step

**1. Start the local database:**

```bash
docker compose up -d
```

This starts PostgreSQL on port 5432 with:
- Database: `sunshineeldercare`
- User: `sunshineeldercare`
- Password: `localdevpassword`

**2. Copy the example environment file:**

```bash
cp .env.example .env
```

The `.env` file is pre-configured to connect to the Docker database. **Never commit `.env` to Git.**

**3. Apply database migrations:**

```bash
npx prisma migrate deploy
```

**4. Generate the Prisma client:**

```bash
npx prisma generate
```

**5. (Optional) Seed development data:**

```bash
npx prisma db seed
```

**6. Start the development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## Migration Workflow

### Development (creating new migrations)

When you change `prisma/schema.prisma`, create a new tracked migration:

```bash
npx prisma migrate dev --name your_migration_name
```

This command:
1. Compares your schema to the current database
2. Generates SQL migration files in `prisma/migrations/`
3. Applies the migration to your local development database
4. Runs the seed script (if configured)

> ⚠️ **NEVER run `prisma migrate dev` against a production database.**

### Production (deploying migrations)

```bash
npx prisma migrate deploy
```

This command applies only pending tracked migrations. It is safe for production. Run it as part of your deployment pipeline before starting the application.

> ⚠️ **NEVER use `prisma db push` as your production migration strategy.** It does not create tracked migration files and can cause data loss.

### Available npm Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run db:migrate` | `prisma migrate deploy` | Apply tracked migrations (production) |
| `npm run db:dev` | `prisma migrate dev` | Create + apply new migration (dev only) |
| `npm run db:generate` | `prisma generate` | Regenerate Prisma client after schema changes |
| `npm run db:seed` | `npx tsx prisma/seed.ts` | Seed the database |
| `npm run db:studio` | `prisma studio` | Open Prisma Studio browser UI |
| `npm run db:reset` | `prisma migrate reset --force` | Reset database (dev only — DESTROYS DATA) |

---

## Environment Variables

All required environment variable **names** are documented in `.env.example`. **Never put real secrets in `.env.example` or commit `.env` to Git.**

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Required | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ Required (Phase 2) | NextAuth secret — generate with `npx auth secret` |
| `NEXT_PUBLIC_APP_URL` | ✅ Required | Public base URL (e.g., `https://sunshineeldercare.in`) |
| `EMAIL_PROVIDER` | Phase 3 | `mock`, `smtp`, or `resend` |
| `EMAIL_API_KEY` | Phase 3 | API key for email provider |
| `EMAIL_FROM` | Phase 3 | Sender email address |
| `CONTACT_EMAIL_RECIPIENT` | Phase 3 | Admin notification recipient |
| `SMTP_HOST` | Phase 3 | SMTP server hostname |
| `SMTP_PORT` | Phase 3 | SMTP server port |
| `SMTP_USER` | Phase 3 | SMTP username |
| `SMTP_PASS` | Phase 3 | SMTP password |
| `PAYMENT_PROVIDER` | Phase 4 | `mock`, `razorpay`, or `stripe` |
| `PAYMENT_PUBLIC_KEY` | Phase 4 | Payment provider public/publishable key |
| `PAYMENT_SECRET_KEY` | Phase 4 | Payment provider secret key |
| `PAYMENT_WEBHOOK_SECRET` | Phase 4 | Webhook signature verification secret |
| `LOG_LEVEL` | Optional | `debug`, `info`, `warn`, `error` (default: `debug` in dev, `info` in prod) |

---

## Health Check

**Endpoint:** `GET /api/health`

**Purpose:** Confirms the application and database are reachable.

**When DB is available:**

```json
{
  "status": "ok",
  "timestamp": "2026-09-13T01:00:00.000Z",
  "responseTimeMs": 12,
  "services": {
    "database": { "status": "ok" }
  }
}
```

**When DB is unavailable:**

```json
{
  "status": "degraded",
  "timestamp": "2026-09-13T01:00:00.000Z",
  "responseTimeMs": 5001,
  "services": {
    "database": {
      "status": "unavailable",
      "reason": "Database is currently unreachable"
    }
  }
}
```

**Security:** This endpoint does not expose credentials, SQL, connection strings, stack traces, or any internal information.

---

## Files Created / Modified in Phase 1

### New Files

| File | Purpose |
|---|---|
| `lib/logger.ts` | Structured server-side logging utility |
| `lib/errors.ts` | Typed application error classes + safe API serialization |
| `app/api/health/route.ts` | Public health check endpoint |
| `docker-compose.yml` | Local development PostgreSQL (development only) |
| `BACKEND_FOUNDATION.md` | This document |

### Modified Files

| File | Change |
|---|---|
| `.gitignore` | Added `.env` and `.env.local` — **critical security fix** |
| `lib/db.ts` | Added DATABASE_URL runtime guard, structured log config |
| `lib/services/pricing/index.ts` | Replaced `new PrismaClient()` with `db` singleton |
| `lib/services/tax/index.ts` | Replaced `new PrismaClient()` with `db` singleton |
| `lib/services/invoice/index.ts` | Replaced `new PrismaClient()` with `db` singleton |
| `lib/services/payment/index.ts` | Replaced inline `require('@prisma/client')` with `db` singleton |
| `package.json` | Added `db:generate`, `db:seed`, `db:studio`, `db:reset` scripts + `prisma.seed` config |
| `.env` | Updated DATABASE_URL to match Docker Compose credentials |

---

## Database Schema Summary

The `prisma/schema.prisma` contains the following models. **The schema structures exist. The corresponding backend implementations are NOT complete unless explicitly stated.**

| Model | Schema Exists | Implementation Status |
|---|---|---|
| `User` | ✅ | ⏳ Phase 2 — Authentication not fully verified end-to-end |
| `Account` | ✅ | ⏳ Phase 2 — NextAuth OAuth adapter (structure only) |
| `Session` | ✅ | ⏳ Phase 2 — NextAuth session storage (structure only) |
| `VerificationToken` | ✅ | ⏳ Phase 2 — Email verification (structure only) |
| `Plan` | ✅ | ✅ Seeded from businessData |
| `AddOn` | ✅ | ⏳ No add-ons seeded yet |
| `PlanAddOn` | ✅ | ⏳ No plan-addon links seeded yet |
| `TaxRule` | ✅ | ⚠️ DEV_TEST_GST_18 rule only — production rules require CA configuration |
| `Elder` | ✅ | ⏳ Phase 2+ — Not implemented |
| `CareAssessment` | ✅ | ✅ Form submission captures to DB via `/care-assessment` |
| `Invoice` | ✅ | ⏳ Phase 4 — InvoiceService exists but flow not fully tested end-to-end |
| `InvoiceLineItem` | ✅ | ⏳ Phase 4 |
| `Subscription` | ✅ | ⏳ Phase 4 — Structure only |
| `Order` | ✅ | ⏳ Phase 4 — Structure only |
| `Inquiry` | ✅ | ✅ Contact form submission |

---

## Known Technical Debt

### MANDATORY PRE-LAUNCH Items

> [!CAUTION]
> **`typescript.ignoreBuildErrors: true`** is currently set in `next.config.mjs`. This means TypeScript errors do NOT fail the production build. A passing build does NOT prove there are no TypeScript errors. Before production launch, this flag MUST be removed and a clean `tsc --noEmit` typecheck pass must be performed and all errors resolved.

> [!WARNING]
> **No tracked migration files exist.** `prisma/migrations/` does not yet exist because no live database was available during Phase 1 setup. Before any deployment, you MUST:
> 1. Start a PostgreSQL database (via Docker or a cloud provider)
> 2. Run `npx prisma migrate dev --name commercial_foundation`
> 3. Commit the generated `prisma/migrations/` folder to Git
> 4. From then on, use `npx prisma migrate deploy` for all production deployments

> [!WARNING]
> **Production tax rules are not configured.** The `TaxService` will throw `TAX_CONFIGURATION_PENDING` until real tax rules are seeded by an administrator with proper CA guidance. The `DEV_TEST_GST_18` rule must NOT be used in production.

### Other Debt

- Auth.js is wired but end-to-end authentication flow is not fully tested (Phase 2)
- Payment provider adapters are mock-only (Phase 4)
- Email provider adapters are mock-only (Phase 3)
- No rate limiting on public API endpoints (Phase 5 — security hardening)
- No CSRF protection audit (Phase 5)
- No end-to-end test suite (future)

---

## Phase 2 Readiness

The codebase is **READY WITH MINOR ISSUES** for Phase 2: Authentication + User Accounts.

**Ready:**
- Database schema has all Auth.js required models (`User`, `Account`, `Session`, `VerificationToken`)
- `auth.ts` has NextAuth configured with CredentialsProvider and PrismaAdapter
- `lib/db.ts` singleton is properly set up for Auth.js adapter
- `.gitignore` now correctly excludes secrets
- Validation (Zod) is installed

**Minor Issues (resolve before Phase 2 completes):**
- Migration files must be created against a live database before authentication can be tested end-to-end
- `typescript.ignoreBuildErrors` must be resolved before launch
