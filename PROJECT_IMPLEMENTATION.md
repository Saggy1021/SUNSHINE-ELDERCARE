# Sunshine Elder Care - Project Implementation

## Reference Website
* **URL Analyzed**: https://sunshineeldercare.com/
* **Scope**: Homepage, About Us, Services, Moments of Care, Membership, Contact Us, FAQs, Privacy Policy, Terms & Conditions.

## Complete Pages
* `/` - Homepage
* `/about-us` - About Us
* `/services` - All Services Overview
* `/services/[slug]` - Individual Service details
* `/moments-of-care` - Moments of Care / Testimonials
* `/membership` - Membership Plans and Checkout Initiation
* `/contact-us` - Contact Form
* `/faqs` - Frequently Asked Questions
* `/legal/terms-and-conditions` - Terms & Conditions
* `/legal/privacy-policy` - Privacy Policy
* `/login` - User Login
* `/signup` - User Registration
* `/dashboard` - User Dashboard for members
* `/checkout` - Membership Checkout Flow

## Complete Features
* Contact & Inquiry Forms
* User Authentication (Signup, Login, Password Reset, Profile Management)
* Membership Enrollment & Checkout
* Provider-Independent Payment Processing (Payment Abstraction Layer)
* Provider-Independent Email Notifications (Email Abstraction Layer)
* Responsive Mobile Menu & Navigation

## Architecture
* **Frontend**: Next.js 16 App Router, React 19, Tailwind CSS 4, existing visual components (adapted).
* **Backend**: Next.js Route Handlers and Server Actions.
* **Database**: PostgreSQL (via Prisma ORM).
* **Authentication**: Auth.js (NextAuth) using Prisma Adapter.

### Payment Architecture

* **Payment Gateway Interface**: Application relies strictly on the `PaymentService` abstraction.
* **Selected Provider**: **NO PAYMENT PROVIDER HAS BEEN SELECTED YET**.
* **Provider Independence**: The core application logic does not contain SDKs for Stripe, Razorpay, Cashfree, or PayU. These are only examples of future adapters. The architecture is:
  `Application -> PaymentService -> Selected Provider Adapter -> Future Payment Provider`

### Email Architecture

* **Email Service Interface**: Application relies strictly on the `EmailService` abstraction.
* **Selected Provider**: **NO EMAIL PROVIDER HAS BEEN SELECTED YET**.
* **Provider Independence**: The architecture is:
  `Application -> EmailService -> Selected Email Adapter -> Future Email Provider`

## Integrations
* Auth.js (Open Source Authentication)
* Prisma (Database ORM)
* Configurable Payment Provider (e.g. Stripe or Razorpay)
* Configurable Email Provider (e.g. SMTP or Resend)

## Environment Variables
(See implementation plan for detailed breakdown. All listed in `.env.example`)

## Development
```bash
npm install
npm run dev
```

## Testing
```bash
npm run test     # If jest/vitest configured
npm run lint     # Linting
```

## Production Build
```bash
npm run build
npm start
```

## Deployment
* **Hosting**: Vercel or similar Next.js-optimized host
* **Database**: Neon or Supabase (PostgreSQL)

## Credentials Required Later
* Production Database connection string.
* Production Auth.js Secret.
* Actual Payment Gateway Keys & Webhook Secrets.
* Actual Email Provider API Keys / SMTP credentials.
* Actual Domain Name configuration.

## Configuration
Business configurations (pricing, text, services list) are maintained in `lib/config/business-data.ts`.

## Known Limitations
* Analytics and error monitoring are completely optional and not enabled by default.
