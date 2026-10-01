# DOCUMENT STORAGE RUNBOOK

## Architecture
- **Provider:** Cloudflare R2
- **Bucket:** `sunshine-documents-prod` (Private)
- **Interface:** `StorageProvider` abstract interface via S3-compatible `aws-sdk`.

## Security Boundaries
1. **No Public URLs:** Direct R2 endpoints are fully isolated.
2. **Signed URL Interception:** The Next.js application mints temporary, short-lived signed URLs exclusively for authorized members via `api/documents/download`.
3. **RBAC & IDOR Enforcement:** S3 Object Keys are tracked in the database and explicitly bound to `session.user.id`. A user cannot forge a request to access an object linked to another member.

## Metadata Integrity
Files generate SHA-256 hashes pre-upload to verify transport consistency. Validations explicitly reject malicious MIME types and path traversals in filenames.

## Credential Rotation
If `R2_SECRET_ACCESS_KEY` is compromised:
1. Revoke the key in the Cloudflare Dashboard.
2. Mint a new token.
3. Update Vercel Environment Variables.
4. Trigger a rolling re-deployment to reset the memory environment.
