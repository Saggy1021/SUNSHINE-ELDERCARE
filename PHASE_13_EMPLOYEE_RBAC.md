# PHASE 13 — EMPLOYEE MANAGEMENT + PERMISSION-BASED ADMIN RBAC

## 1. Overview
This document details the implementation of Phase 13 of the Sunshine Eldercare platform. It establishes a secure, modular foundation for managing employees and enforcing granular, permission-based Role-Based Access Control (RBAC) across the administrative portal.

## 2. Employee Architecture
- **Distinction**: We maintained strict conceptual separation between `User` (authentication identity) and `Employee` (business personnel record). An Employee does not automatically receive login access unless a `User` account is explicitly associated.
- **Prisma Models Added**:
  - `Employee`: Stores core employee details including `firstName`, `lastName`, `designation`, `contactNumber`, `email`, `photoReference`, `status`, and an optional relation to `User`.
  - `EmployeeSequence`: An atomic, concurrency-safe counter used exclusively for auto-incrementing the numeric portion of the Employee ID, initialized at 100.

## 3. Employee ID Generation
- **Format**: `SEC/[Sequence]/[First 2 letters of First Name + First 2 letters of Surname]`. 
  - *Example*: Sagnik Kar becomes `SEC/101/SAKA`.
- **Logic**: Implemented in `EmployeeIdentityService`. The database utilizes Prisma's `.increment` method on the `EmployeeSequence` table, ensuring bullet-proof concurrency safety and eliminating `MAX()+1` race conditions. IDs are guaranteed to be unique via a unique constraint in the database.

## 4. Photo Storage Architecture
- A robust, extensible storage abstraction was designed in `lib/services/employee-photo.ts`.
- It dictates a strict server-side validation boundary (`MAX_SIZE = 1MB`, checking standard image MIME types).
- In the absence of an immediate S3/cloud production dependency in this phase, it implements a secure local mock structure, avoiding dumping vulnerable files into public assets. This establishes a clean interface `EmployeePhotoStorage` that can cleanly be substituted for an S3 provider adapter in the future.

## 5. RBAC Architecture
- Evolved away from broad `role === 'ADMIN'` conditional checks to a normalized Role-Permission model.
- **Models Introduced**:
  - `Permission`: Stores uniquely identified permission codes.
  - `Role`: Groups multiple permissions together.
  - `RolePermission`: Mapping table between roles and permissions.
  - `UserRole`: Associates users to multiple roles.
- **AuthorizationService**: Located in `lib/services/authorization.ts`, it offers strict server-side permission queries like `can(user, perm)` and `require(user, perm)`.

## 6. Permissions Established
A comprehensive list of permission codes has been strictly typed in `lib/auth/permissions.ts`:
- `MEMBER_VIEW`, `MEMBER_CREATE`, `MEMBER_EDIT`, `MEMBER_SENSITIVE_VIEW`
- `EMPLOYEE_VIEW`, `EMPLOYEE_CREATE`, `EMPLOYEE_EDIT`, `EMPLOYEE_DEACTIVATE`
- `PAYMENT_VIEW`, `PAYMENT_VERIFY`
- `INVOICE_VIEW`, `INVOICE_MANAGE`
- `PLAN_VIEW`, `PLAN_MANAGE`
- `RENEWAL_VIEW`, `RENEWAL_APPROVE`
- `INQUIRY_VIEW`, `INQUIRY_MANAGE`
- `FEEDBACK_VIEW`, `FEEDBACK_MANAGE`
- `AUDIT_VIEW`
- `ADMIN_USER_VIEW`, `ADMIN_USER_MANAGE`

## 7. Migration of Existing Admin Routes
Admin capabilities throughout `app/actions/admin.ts` have been retrofitted:
- Dashboard metrics require `MEMBER_VIEW`.
- Approving/Rejecting renewals requires `RENEWAL_APPROVE`.
- Managing addons requires `PLAN_MANAGE`.
- Accessing logs requires `AUDIT_VIEW`.
- Payment verification continues to use strict ID tracking but now demands `PAYMENT_VERIFY`.

## 8. Sensitive-Data Authorization
Accessing member profile information in `app/actions/admin.ts` (`getMemberDetails`) and `app/api/member/profile/route.ts` has been refactored. 
- General admins querying a member without `MEMBER_SENSITIVE_VIEW` will have critical fields explicitly nulled/hidden: `idProofNumber`, `policyNumber`, `coverageAmount`, `hospitalForSos`, `phone` (emergency), and `alternatePhone`. 

## 9. Audit Logging
Audit logs have been structurally expanded in `app/actions/employee.ts` and `admin.ts`. Crucially, audit records trace the exact `actorUserId` securely derived from `auth()`, never trusting client-provided `actor` inputs. 

## 10. Unresolved Business Decisions
- **Photo Storage Cloud Provider**: As mentioned in section 4, the abstraction is built, but an AWS S3, Cloudinary, or Vercel Blob API key and bucket will need to be configured for production.
- **Super-Admin Seeding**: For local development, there isn't a robust UI yet to bootstrap the very first admin who then creates other roles. Either a CLI script or an Oauth-admin override rule might be necessary depending on deployment.

## 11. Security Considerations
- Client-supplied roles and permissions are flatly ignored in server actions.
- Zod is strictly mapping employee inputs inside `lib/validations/employee.ts` preventing mass-assignment logic.
- IDOR protections from Phase 12 continue to remain intact and passed regression.
- Financial records from earlier phases were completely isolated and structurally untouched during this update.
