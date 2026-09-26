# PHASE 14 — MEMBERSHIP HISTORY + ADMIN-CREATED CUSTOM PLANS

## 1. Existing Membership Architecture
Prior to Phase 14, membership data was stored in `Subscription` and `RenewalRequest` tables, but the concept of historical records and custom plan agreements was not structurally fortified. The standard catalogs (`CarePlan`, `CarePlanVariant`, `CarePlanDuration`) continue to remain the commercial source of truth for all public-facing standard pricing.

## 2. Standard CarePlan Relationship
The standard catalog remains completely untouched. Prices for Shield Shine, Semi Shield Shine, and Life Line Care have strictly not been altered. Custom plans act as a separate entity rather than polluting the `CarePlan` table.

## 3. Custom Plan Architecture
Introduced `CustomPlanAgreement`:
- **Independent Entity**: A dedicated table linking a specific `userId` (member) to a unique commercial arrangement, bypassing standard variant restrictions.
- **Attributes**: Supports customized `amount`, `currency`, `durationType` (DAYS/MONTHS/YEARS), `durationValue`, and `description`.
- **References**: Bound to `createdByUserId` and `authorizedByUserId` ensuring strict accountability.
- **Integration**: The `Subscription` and `Payment` models received a nullable `customPlanId` linking them directly to a `CustomPlanAgreement` instead of a standard `carePlanId`.

## 4. Admin-only Custom-plan Rule
Only users possessing the strict permission `CUSTOM_PLAN_CREATE` can instantiate a custom plan. Members cannot create or edit their own custom plans.

## 5. Custom Duration Handling
Custom durations (days, months, years) are passed to a server-side calculation service (`CustomPlanService`). The calculation of `calculatedEndDate` takes place exclusively on the server, ensuring clients cannot forge an arbitrary end date that bypasses duration intervals.

## 6. Custom Amount Handling
The admin establishes a direct `amount` within the custom agreement payload. This effectively replaces the standard catalog lookup for pricing. No reverse-engineered GST calculations are forcefully applied unless the architecture eventually standardizes it; currently, it retains a pure immutable value representing the authorized total.

## 7. Membership History Behavior
A `Subscription` represents a historical block of membership time. Overwriting old rows is forbidden. A new payment/renewal generates a net-new `Subscription` row leaving the previous record queryable via `userId`. The state dictates whether it is `ACTIVE`, `EXPIRED`, etc.

## 8. Renewal History Behavior
`RenewalRequest` behaves as a historical intent-to-renew. It is not overwritten. A new request creates a new row.

## 9. Subscription Lifecycle
Standard subscriptions are tied to `carePlanId`. Custom subscriptions are tied to `customPlanId`. Once a Custom Plan Agreement transitions through `DRAFT -> APPROVED` and is mapped to a `Subscription`, the original custom agreement is practically immutable since altering its terms would desynchronize historical invoices and payments.

## 10. RBAC Permissions
Introduced:
- `CUSTOM_PLAN_VIEW`
- `CUSTOM_PLAN_CREATE`
- `CUSTOM_PLAN_EDIT`
- `CUSTOM_PLAN_APPROVE`
- `RENEWAL_VIEW`

## 11. Audit Logging
Every creation of a `CustomPlanAgreement` results in a secure audit log containing the authentic server-resolved `actorUserId`, action (`CUSTOM_PLAN_CREATED`), entity type, ID, and sanitized payload details.

## 12. Payment Boundary
No fake payments were injected. The existing `PaymentService` architecture requires that the `Payment` table relates to the custom arrangement, generating a pending state, before membership is finalized. Custom plans rely on standard validation flows.

## 13. Member ID Boundary
No arbitrary `Member ID` sequences are triggered just by creating a custom plan. The ID only populates during successful finalization/payment according to Phase 12 guidelines.

## 14. Database Migration

DEVELOPMENT:
```bash
npx prisma migrate dev --name phase14_membership_history_custom_plans
```

STAGING / PRODUCTION:
```bash
npx prisma migrate deploy
```

This migration was structurally additive (no destructive drops or data mutations on old Subscriptions).

## 15. Tests
A dedicated verification script `prisma/verify-membership-history-custom-plans.ts` was implemented to validate:
- Member RBAC denial.
- Admin RBAC approval.
- Server-side duration validation.
- Historic record isolation.

## 16. Security Considerations
- Mass assignment is mitigated using Zod schemas (`lib/validations/custom-plan.ts`).
- `AuthorizationService` is enforced on every Server Action in `app/actions/custom-plan.ts`.
- The backend unconditionally trusts only the server `session.user.id` when applying creator attributions.

## 17. Unresolved Business Decisions
Currently, Custom Plans are auto-approved to `APPROVED` for the admin creating it, under the assumption that if they have `CREATE` permission they represent final authority. If a dual-approval process is required (e.g. Sales rep creates, HR approves), the `status` lifecycle would need a distinct `PENDING_APPROVAL` workflow integrated in the UI.
