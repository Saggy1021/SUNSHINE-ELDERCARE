# Sunshine Eldercare — Mobile Member App (PWA)

## Architecture & Development Guide

This is an independently runnable, mobile-first Progressive Web App (PWA) for Sunshine Eldercare members, residing completely in this isolated `/member-app/` directory.

### Core Invariants

1. **Strict Codebase Isolation:** All components, pages, styles, configurations, and assets reside exclusively inside `/member-app/`. The production website (`/app/`, `/components/`, `/lib/`, `/prisma/`, `/public/`) remains 100% untouched.
2. **One Account, One Password:** Uses the existing member accounts and passwords.
3. **Dual Identifier Login:** Members can log in using either their business **Member ID** (`SEC/S/XXXX/XXXX`) or their registered **Email** along with their original website password.
4. **Offline Capability:** The digital membership card and emergency information are cached locally via Service Worker (`public/sw.js`) so elders and families can access critical details even without network connectivity.

---

### Key Features

* **Interactive 3D Digital Membership Card:**
  * Front: Member Name, Member ID, Active Plan Tier, Expiry Date, Dynamic QR Code.
  * Back: Emergency Contact (direct tap-to-call link), Blood Group, Hospital Preference, and Medical conditions.
  * Web Share API integration to share card details via WhatsApp or Email.
* **Care Tracking & Visits:**
  * Primary Caregiver profile with direct phone dialer.
  * Timeline of scheduled upcoming visits and past vital signs.
* **Documents & Money Receipts:**
  * Direct one-tap PDF download for verified payment receipts and tax invoices.
* **One-Tap Emergency SOS:**
  * Persistent red SOS button in header dialing Sunshine 24/7 Helpline, Family Sponsor, or National Ambulance (108).
* **Care Plan Renewal & Upgrades:**
  * Mobile-friendly plan selection with instant GST price breakdown and Razorpay checkout readiness.

---

### Running the Member App Locally

From the repository root:

```bash
cd member-app
pnpm install
pnpm dev
```

The Member App will launch at:
`http://localhost:3001`

---

### Testing Credentials

| Identifier Type | Value | Password |
| :--- | :--- | :--- |
| **Member ID** | `SEC/S/1001/SAKR` | `Password123!` |
| **Email** | `sakuntala.roy@example.com` | `Password123!` |

*(Quick-fill buttons are provided on the login screen for testing convenience).*

