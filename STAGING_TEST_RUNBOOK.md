# STAGING TEST RUNBOOK

## Staging Environment Isolation
To safely execute automated Playwright E2E tests, the Staging environment MUST be completely detached from Production.

### Strict Staging Requirements
1. **Isolated PostgreSQL:** Create a discrete Supabase Staging instance. **NEVER test against Production.**
2. **Isolated R2 Namespace:** Utilize a separate Bucket or explicitly segregated test folder prefix.
3. **Safe Credentials:** Utilize a separate `AUTH_SECRET`.
4. **Mock External Providers:** Ensure the environment utilizes `MockPaymentAdapter` and `MockEmailAdapter` rather than live production Stripe/Resend tokens.

## E2E Execution
1. E2E Fixtures will actively populate and truncate tables.
2. Run Playwright against the canonical Staging Vercel deployment URL.
3. If Staging tests pass, the identical immutable build hash is promoted to Production.
