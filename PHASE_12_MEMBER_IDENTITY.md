# Phase 12 — Member Registration & Identity Foundation

## Overview
The Sunshine Eldercare Member Identity Foundation establishes a secure, validated, and normalized data model to capture member information at registration and assign a formal Member ID once a membership is approved.

## 1. Updated Data Models

The following new models and relationships were added to the Prisma schema (`prisma/schema.prisma`):

- **`MemberProfile`**: Core member data including personal details (name, DOB, gender), contact info, service address, ID proof, and the unassigned `memberId`. Linked `1:1` with the core `User` model.
- **`Sponsor`**: Contact and relationship details of the member's sponsor. Linked `1:1` with `MemberProfile`.
- **`EmergencyContact`**: A standalone emergency contact stored at the `User` level.
- **`InsuranceDetails`**: Details about the member's health insurance provider, policy number, and coverage. Linked `1:1` with `MemberProfile`.
- **`MedicalAuthorization`**: Contains SOS hospital preference and authorization to shift the patient during an emergency. Linked `1:1` with `MemberProfile`.
- **`MemberSequence`**: A special table used exclusively to generate sequential Member IDs safely. Seeded at `1000`.

## 2. Member ID Schema & Service

The `MemberIdentityService` (`lib/services/member-identity.ts`) handles the generation of the business Member ID.

**Format**: `SEC/[S or D]/[Sequence]/[First Two Initials][Last Two Initials]`
- `SEC`: Fixed prefix
- `S` or `D`: Single or Couple designation
- `Sequence`: Database-backed counter ensuring atomic incrementation (starts at 1001)
- `Initials`: Derived server-side based on First Name and Surname. Example: Sagnik Kar -> `SAKA`.

**Lifecycle Rules**:
- Member ID is `NULL` (UNASSIGNED) upon registration.
- ID is only generated upon a valid and confirmed membership.
- The dashboard successfully handles the `NULL` state, rendering `Member ID: UNASSIGNED`.

## 3. Registration UI Implementation

The registration form (`app/signup/signup-form.tsx`) was rebuilt to capture the complete set of required fields mapped to the following sections:
- **Section A**: Member Details (First Name, Surname, DOB, Gender, Service Address, Mobile)
- **Section B**: Emergency Contact (Name, Relationship, Mobile)
- **Section C**: Sponsor Details (Name, Relationship, Mobile)
- **Section D**: Health Insurance (Provider, Policy Number)
- **Section E**: Medical Alert / Hospital Authorization (SOS Hospital, Shift Authorization)

## 4. Security & Validation Rules

- **Server-Side Validation**: Built completely typed Zod schemas (`lib/validations/member.ts`) that mirror the Prisma requirements. These are evaluated server-side securely.
- **Transaction Safety**: Registration happens atomically within a Prisma `$transaction`, ensuring `User`, `MemberProfile`, `Sponsor`, `EmergencyContact`, `InsuranceDetails`, and `MedicalAuthorization` are created together or rolled back.
- **IDOR Protection**: The `GET /api/member/profile` endpoint completely prevents unauthorized access (IDOR) by forcing retrieval against the authenticated user's `session.id`, circumventing arbitrary ID lookups.
- **Audit Logging**: `MEMBER_REGISTERED` event accurately logs the registration action against the `actorUserId`, fully isolating sensitive fields.

## 5. Test Results

The testing script (`prisma/verify-member-identity.ts`) passed comprehensively on the following verifications:

✅ **A. Registration**: Valid registration succeeds, invalid input is rejected via `safeParse`, duplicate emails safely bounce, and password remains securely hashed.
✅ **B. Authorization**: Endpoints correctly authorize requests against `session.id` only.
✅ **C. Sensitive Data**: Sensitive inputs are deliberately scrubbed from `auditLog` payloads, and `db.auditLog` works smoothly.
✅ **D. Member ID Foundation**: Sequences increment securely starting from `1001`, duplicates are physically impossible via Prisma's `increment` transaction, format preserves exactly `SEC/S/1001/SAKA`, and initials compute server-side seamlessly.

**Prisma & Build Validity**:
- `npx prisma validate`: The schema at prisma\schema.prisma is valid 🚀
- `npm run build`: Production build finishes successfully with `0` type errors.
