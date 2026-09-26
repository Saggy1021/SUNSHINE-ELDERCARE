# PHASE 15 — INVOICE & RECEIPT SYSTEM UPGRADE

## Overview
Phase 15 implements an enterprise-grade financial documentation system for Sunshine Eldercare. It decouples the preliminary checkout documents from finalized official financial documents, introduces an Indian Financial Year-based sequence generation system, and creates an immutable snapshot mechanism for generated invoices and receipts.

## Architecture

### 1. Document Sequence Generator
- Introduced `InvoiceSequence` and `ReceiptSequence` models.
- Uses Prisma's concurrency-safe `upsert` mechanism with atomic `increment`.
- Formats numbers based on the Indian Financial Year (April 1 - March 31) (e.g. `SEC/1001/2026-27`).

### 2. Immutable Document Snapshots
- `Invoice` and `Receipt` models act as immutable records.
- When an Invoice is finalized (upon successful Payment Verification), the customer's identity (Name, Email, Address, Phone) is snapshotted into the `Invoice` row.
- `Receipt` is generated atomically upon Payment Verification and stores a snapshot of the Payment, customer details, and associated Invoice at that exact moment in time.

### 3. Payment Verification Lifecycle
The existing `adminVerifyPayment` workflow was refactored:
1. Validates Payment.
2. Finalizes Invoice (assigns `invoiceNumber`, copies customer details).
3. Creates a `Receipt` (generates `receiptNumber`).
4. Provisions the `Subscription`.
5. Closes the `RenewalRequest`.
6. Creates an `AuditLog`.
7. Sends Email Notifications post-commit.

### 4. Schema Updates
- `Invoice`: 
  - `invoiceNumber` (nullable, represents the official number once issued).
  - `referenceNumber` (unique, automatically generated at checkout for internal tracking).
  - Customer snapshot fields added (`customerName`, `customerEmail`, `customerAddress`, `customerPhone`).
- `Receipt`: New model linked to `Invoice`, `Payment`, and `User`.
- `InvoiceSequence` & `ReceiptSequence`: New models for FY-based numbering.

## Deployment Migrations
As established in Phase 14, production and staging databases must use tracked migrations:
```bash
npx prisma migrate deploy
```
`prisma db push` is strictly prohibited for production.

## Verification
- Run `npx tsx prisma/verify-invoice-receipt-system.ts` to test the sequence generation logic and FY calculations.
