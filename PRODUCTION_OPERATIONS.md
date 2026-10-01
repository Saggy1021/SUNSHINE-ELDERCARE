# PRODUCTION OPERATIONS ARCHITECTURE

## Overview
Sunshine Eldercare uses a modern edge-compatible full-stack architecture built on Next.js App Router (React Server Components), hosted on Vercel.

## Core Stack
- **Frontend & API Framework:** Next.js (App Router) deployed to Vercel (Edge/Serverless).
- **Database:** PostgreSQL hosted on Supabase, interfaced via Prisma ORM.
- **Authentication:** Auth.js (NextAuth) integrated via JWT-based HttpOnly Secure cookies.
- **Private Storage:** Cloudflare R2 via `aws-sdk`, secured via pre-signed S3 object URLs.

## Dependency Injection Model
The backend heavily utilizes Adapter/Provider abstractions for external dependencies:
1. **PaymentService:** An abstract provider-independent layer. Currently relies on a `MockPaymentAdapter`. Production Stripe/Razorpay adapters remain pending.
2. **EmailService:** An abstract layer for SMTP/API email delivery. Currently relies on a `MockEmailAdapter`. Production integration (e.g. Resend, AWS SES) remains pending.
3. **StorageService:** Abstract layer configured via R2Adapter for Cloudflare private buckets.

## Security Boundaries
- **AuthorizationService:** A universal RBAC (Role-Based Access Control) engine protecting Server Actions from IDOR and unauthorized modifications.
- **Owner Protection:** A `SUPER_ADMIN` rank designed for ultimate business owners. The system guarantees an owner cannot be deleted if they are the sole owner.

## Rate Limiting
- A lightweight in-memory store governs API rates. **Important:** For true multi-instance Vercel edge/serverless scaling, a distributed store (e.g., Vercel KV, Redis) MUST be injected before launch.

## Monitoring & Logging
- JSON structured logging (`lib/logger.ts`) is emitted to `process.stdout`.
- Sensitive fields (passwords, `DATABASE_URL`, PII) are forcefully redacted via `safeSerialize()`. 
- External log ingestion via Vercel Log Drains to a third-party APM remains pending.
