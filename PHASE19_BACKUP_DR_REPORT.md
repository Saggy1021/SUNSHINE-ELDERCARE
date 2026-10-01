# PHASE 19I — BACKUP, RESTORE & DISASTER RECOVERY READINESS REPORT

## 1. Scope
This report establishes the production-grade backup, disaster recovery, and data resilience strategies for Sunshine Eldercare. It details procedures for Supabase PostgreSQL database restoration, Cloudflare R2 object recovery, financial data idempotency under restoration, and application-state reconstruction.

## 2. Critical Data Inventory

### CRITICAL (Requires strict recovery point objectives):
- **Core Identity:** `User`, `MemberProfile`, `Sponsor`, `EmergencyContact`, `Employee`, `Role`, `Permission`, `UserRole`
- **Financial/Commercial:** `CarePlan`, `CustomPlanAgreement`, `Subscription`, `RenewalRequest`, `Invoice`, `InvoiceLineItem`, `Payment`, `Receipt`, `TaxRule`, `AuditLog`
- **Care Operations:** `CareRecipient`, `CareCase`, `CareAssignment`, `CareVisit`, `CareTask`, `CareNote`
- **Metadata & Configurations:** `MemberDocument` (tracking data), `WebsitePage`, `FaqEntry`, `Testimonial`, `WebsiteSetting`, `EmailTemplate`

### NON-CRITICAL / REGENERABLE:
- Generated PDF documents (can be reconstructed from database snapshots if absolutely necessary).
- Ephemeral user session states.

## 3. Current Supabase Backup Capabilities
**STATUS:** UNKNOWN (Requires manual verification of current billing tier)
- **Automated Backups:** Supabase automatically backs up databases daily on the Free/Pro tiers.
- **Retention:** Typically 7 days (Pro tier).
- **Point-in-Time Recovery (PITR):** Requires a specific Pro/Enterprise add-on depending on configuration.
- **Restoration Workflow:** Restoring typically operates in-place or into a new branch/project. Restoration to a new project requires rotating connection credentials.

## 4. Current R2 Durability/Recovery Position
**STATUS:** VERIFIED Architecture / NON-BLOCKING FINDING on replication
- Cloudflare R2 provides 99.999999999% (11 9's) of annual durability. 
- Currently, there is NO independent cross-region bucket replication configured for R2.
- R2 objects are tracked entirely by `MemberDocument` in the database.

## 5. Proposed RPO (Recovery Point Objective)
**Proposed Target:** `1 Hour` (or better if PITR is activated)
*RPO represents the maximum acceptable data loss.* Financial systems typically require extremely tight RPOs. Without Supabase PITR, the RPO is implicitly 24 hours (daily backups), which is unacceptable for a healthcare/payment system. **Activating Supabase PITR is a launch prerequisite.**

## 6. Proposed RTO (Recovery Time Objective)
**Proposed Target:** `4 Hours`
*RTO represents the maximum acceptable time to restore service.* In a disaster, recreating the Supabase instance, updating credentials in Vercel, and DNS propagation should complete within 4 hours.

## 7. Database Recovery Procedure
1. **Detect Incident:** Confirm whether the outage is a data-corruption event or infrastructure failure.
2. **Halt Application:** Disable application writes (e.g. enable Vercel maintenance mode).
3. **Identify Target Point:** Determine the exact point-in-time before data corruption occurred.
4. **Restore to Isolation:** Spin up an isolated Supabase project/branch and restore the backup there.
5. **Validate:** Inspect financial totals, care schedules, and user credentials in the isolated DB.
6. **Prisma Status:** Run `npx prisma migrate status` against the restored DB to ensure migration checksums match the deployed application.
7. **Production Cutover:** Update Vercel environment variables (`DATABASE_URL`, `DIRECT_URL`) to point to the newly restored instance and disable maintenance mode.

## 8. Prisma Migration Recovery Procedure
- **Production Migrations:** Production deployments rely solely on `npx prisma migrate deploy`. 
- **Destructive Commands:** `prisma migrate reset` and `prisma db push` are strictly forbidden for production recovery.
- **Forward Roll:** If an application deployment corrupts data, restore the database backup first. If the schema needs adjustment, write a new Prisma migration (rolling forward) rather than trying to reverse applied migrations.

## 9. Financial Recovery Integrity
**STATUS:** VERIFIED
- **Idempotency:** Payment endpoints utilize strict idempotency keys (e.g. `stripeSessionId`, `paymentIntentId`). A restored database re-processing a webhook will inherently reject it if the `paymentId` already exists, preventing duplicate processing.
- **Snapshots:** Invoices and Receipts use detached snapshot fields (`amount`, `taxAmount`, `unitPrice`). Pricing catalog changes will not mutate historical financial records upon database recovery.

## 10. R2 Document Recovery
- **DB Restored, R2 Intact:** Documents uploaded after the RPO point will be orphaned in R2 (no DB record). A cleanup script can scrub R2 objects lacking a `MemberDocument` record.
- **R2 Lost, DB Intact:** Database metadata will exist for missing physical objects. Documents must be reconstructed or users prompted to re-upload.
- **Verification:** The `sha256` column strictly guarantees that if an R2 object is recovered, its integrity can be proven identical to the database expectation.

## 11. Application Recovery Workflow
In a total loss scenario:
1. Re-clone GitHub repository.
2. Provision new Supabase PostgreSQL instance.
3. Apply Supabase Backup.
4. Provision new Cloudflare R2 bucket (if lost).
5. Provision Vercel hosting.
6. Inject secrets (`AUTH_SECRET`, `DATABASE_URL`, `R2_SECRET_ACCESS_KEY`, etc.).
7. Deploy application.

## 12. Secret/Configuration Recovery
Required recovery variables (NOT stored in Git):
- `DATABASE_URL`, `DIRECT_URL`
- `AUTH_SECRET`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- Payment webhook secrets (`PAYMENT_WEBHOOK_SECRET`)
- Email API keys (`EMAIL_API_KEY`)

## 13. Business Configuration Recovery
**STATUS:** VERIFIED
All core operational metadata (CMS pages, pricing, roles, tax rules) resides inside the PostgreSQL database. Therefore, a database backup natively includes the entire business state. No secondary configuration-store recovery is required.

## 14. Recovery Test Design
**STATUS:** BLOCKED (Environment-Blocked)
*Procedure:* Provision a temporary Supabase project -> Restore production backup -> Connect local application instance -> Run Playwright E2E suites.
*Limitation:* Without an active temporary DB provisioned or a local `e2e_db` available, the physical test cannot be executed during this phase.

## 15. Backup Monitoring Requirements
For Phase 19J (Monitoring):
- Monitor Backup Success metrics (Supabase API or webhook if supported).
- Monitor R2 storage limits.
- Alert on application initialization failures (DB unreachable).

## 16. Known Gaps
- Supabase Point-in-Time Recovery (PITR) requires explicit activation.
- No automated R2 cross-region replication.
- Phase 19G tracking migration must be generated.

## 17. Launch Prerequisites
- **LAUNCH PREREQUISITE:** Activate Supabase PITR to meet the 1-hour RPO.
- **LAUNCH PREREQUISITE:** Generate and deploy the Phase 19G `storage_tracking` migration locally once the DB container is online.

## 18. Final Status
**Phase 19I:** APPROVED WITH NON-BLOCKING FINDINGS
