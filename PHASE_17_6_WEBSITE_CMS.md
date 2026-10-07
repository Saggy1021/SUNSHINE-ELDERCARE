# Phase 17.6 — Website Content & Business Operations CMS

## Overview
This phase introduces a minimal, structured Content Management System (CMS) for managing the public-facing sections of Sunshine Eldercare's website. It allows authorized administrative users to modify public content without altering code or performing a deployment, while keeping the UI presentation code and application logic strictly preserved.

## CMS Entities
The system provides admin CRUD capabilities for the following entities:
1. **WebsitePage**: Represents static public pages (e.g., `about-us`, `faqs`). Provides a fallback mechanism for dynamic content overrides.
2. **SeoMetadata**: Associated with `WebsitePage` and handles dynamic metadata values like title, description, Open Graph tags, and indexing settings.
3. **FaqEntry**: Manages FAQ question/answer items, allowing sort ordering and publication status.
4. **Testimonial**: Handles the display of public reviews/testimonials with quote, author details, and publication status.
5. **WebsiteSetting**: A key/value store for public business parameters (e.g., public address, email, phone number).
6. **Employee Public Profiles**: Enhances the existing `Employee` model by introducing a public biography and `isPublic` flag, allowing selective exposure of employees on the public "Our Team" sections.

## RBAC Security
Access to CMS functionality is strictly governed by custom permissions:
- `CONTENT_VIEW`: Required to view CMS entities within the admin portal.
- `CONTENT_MANAGE`: Required to create, update, publish, or archive CMS entities.
These permissions are explicitly granted only to `OWNER` and `SUPER_ADMIN` roles. The API layer rigorously verifies permissions before any database mutation.

## Public Website Integration & Fallback Behavior
The CMS avoids acting as a raw HTML editor or dynamic router. Instead, it serves as a data layer that structurally feeds into the existing Next.js React components. 

- **Published Content Behavior**:
  - `WebsitePage`: If a page is `PUBLISHED`, its associated `SeoMetadata` will override the hardcoded metadata in routes like `/faqs` and `/about-us`.
  - `FaqEntry`: Only `PUBLISHED` FAQs are sent to the frontend `PhilosophyLibrary` component. Draft/Archived entries are withheld from public endpoints.
  - `Testimonial`: Only `PUBLISHED` testimonials are displayed in the `Testimonials` carousel.
  - `Employee`: Only employees marked as `isPublic: true` and `status: 'ACTIVE'` are shown in the public `Gurus` section.

- **Fallback Behavior**:
  - The UI components gracefully fallback to statically coded default values (e.g., `businessData`) if the CMS yields no content, mitigating the risk of blank UI sections.

- **Cache & Revalidation Behavior**:
  - Revalidation (`revalidatePath`) occurs across CMS server actions upon any creation or update, ensuring seamless content propagation across statically generated pages.

## Commercial Boundaries
The implementation strictly respects business boundaries:
- The CMS has zero access to manipulate pricing, care plans, invoices, receipts, member profiles, or sensitive application functionalities.
- `Pricing` remains securely within the commercial module's purview.

## Audit Logging
Complete tracking of state transitions (`WEBSITE_CONTENT_PUBLISHED`, `FAQ_UPDATED`, etc.) is recorded into `AuditLog`, ensuring an immutable historical footprint of all CMS administrative operations.

## Known Limitations
- The CMS does not support custom layouts or custom dynamic route generation. To add a new public route, code changes must be performed to construct the route first, before CMS-managed integration.
- The `WebsitePage` table currently focuses on metadata-level management for existing structured pages rather than arbitrary rich-text editing, in order to preserve existing UI designs.
