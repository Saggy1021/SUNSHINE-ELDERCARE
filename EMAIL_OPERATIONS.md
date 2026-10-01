# EMAIL OPERATIONS

## Architecture
Email notifications (Authentication tokens, Care alerts, Invoice receipts) utilize the `EmailService` abstraction layer.

## Current State
**PENDING PROVIDER:** The application defaults to a `MockEmailAdapter` which `console.log`s payloads. A real provider (e.g., Resend, AWS SES) and valid domain DKIM/DMARC alignment is a strict launch prerequisite.

## Safe Delivery Characteristics
1. **Transactional Decoupling:** Email dispatch failures (`try/catch` in the email adapter) NEVER revert the primary Prisma database transaction. Missing an invoice receipt will not delete the invoice.
2. **Sender Control:** Sender domains (`INFO.SUNSHINEELDERCARE@GMAIL.COM`) are strictly parameterized and must be migrated to an authorized canonical domain (`contact@sunshineeldercare.in`) prior to launch.
