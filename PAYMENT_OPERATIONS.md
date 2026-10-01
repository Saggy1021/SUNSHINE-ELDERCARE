# PAYMENT OPERATIONS

## Architecture
Financial operations rely on the `PaymentService` adapter abstraction. The application strictly segregates internal database accounting (`Invoice`, `Payment` tables) from external gateway state.

## Current State
**PENDING PROVIDER:** The production environment is currently unconfigured and relies on `MockPaymentAdapter`. Real payment capabilities (e.g. Stripe, Razorpay) are a strict prerequisite for production launch.

## Transaction Safeguards
1. **Idempotency:** Webhook ingestion endpoints require verified signatures. Ingested events utilize strict idempotency keys to prevent double-charging or duplicate record-generation on network retries.
2. **State Machine:** Invoices begin as `PENDING`. They only grant Membership benefits upon crossing into the `VERIFIED` state. Network failures degrade to `FAILED` safely without locking the system.
3. **Offline Verification:** All financial state changes are processed offline via server webhooks rather than trusting client-side successful redirects.
