# PHASE 19G — CLOUDFLARE R2 PRODUCTION SETUP

This document provides instructions for securely configuring the Phase 19G Cloudflare R2 production storage integration.

## 1. Cloudflare Account & Bucket Creation
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **R2**.
2. Click **Create bucket**.
3. Name the bucket (e.g., `sunshine-documents-prod`).
4. Select the appropriate location/region (or leave it as Auto).
5. Ensure the bucket is **PRIVATE**. Do NOT enable public access or custom domains for this bucket, as all access must run through authenticated presigned URLs.

## 2. R2 API Credentials Generation
To allow the application to generate presigned URLs and upload documents securely:
1. In the Cloudflare R2 dashboard, click **Manage R2 API Tokens** on the right side.
2. Click **Create API token**.
3. Provide a name (e.g., `Sunshine Document Manager`).
4. **Permissions:** Select **Object Read & Write**.
5. **Specify buckets:** Select your specific bucket (`sunshine-documents-prod`).
6. Click **Create API Token**.
7. Copy the **Access Key ID**, **Secret Access Key**, and **Account ID** (available on the dashboard or token screen).

## 3. Environment Variables
Add these values to your production `.env` file in Vercel:

```env
STORAGE_PROVIDER="r2"
R2_ACCOUNT_ID="<your-cloudflare-account-id>"
R2_ACCESS_KEY_ID="<your-access-key-id>"
R2_SECRET_ACCESS_KEY="<your-secret-access-key>"
R2_BUCKET_NAME="<your-bucket-name>"
```

**WARNING:** NEVER commit these secrets to Git.

## 4. Verification & Testing
- **Verification:** Upload a test document in the system and verify it appears in the Cloudflare R2 bucket interface. Try downloading it as a member and confirm that a direct, short-lived presigned URL is correctly generated and functions.
- **Rotation:** If credentials are compromised, revoke the API token in the Cloudflare Dashboard and generate a new one, then update Vercel Environment Variables.

## 5. Security Posture
- The R2 bucket is unconditionally private.
- Files cannot be listed or accessed without a cryptographic signature from the backend server.
- The presigned URL expires within 1 hour (3600 seconds) by default.
- No public "Anyone with the link" permissions exist.
- Vercel limits are natively bypassed because the presigned URL offloads download bandwidth directly to Cloudflare edge nodes.
