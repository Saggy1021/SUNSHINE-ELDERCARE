# PHASE 19G — GOOGLE DRIVE SETUP

This document provides instructions for securely configuring the Phase 19G Google Drive temporary storage integration.

## 1. Dedicated Storage Account
To prevent accidental personal file exposure, you MUST use a dedicated human Gmail account for this purpose (e.g. `storage@sunshineeldercare.in` or a dedicated Workspace account).
**DO NOT use a service account**, as this integration acts on behalf of the human account via OAuth 2.0 to access a specific existing folder.

## 2. Privacy & Restricted Setting
The user has already created a dedicated private Google Drive folder with ID: `1B1krvvoY6Ooh93_uAUirDNrMDTOPVZfK`.
1. Go to Google Drive.
2. Right-click the folder and select "Share".
3. Under "General access", ensure it is set to **Restricted**.
4. **DO NOT** use "Anyone with the link". The application handles secure download proxying.

## 3. Google Cloud Project Creation
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "Sunshine Storage Integration").
3. Navigate to **APIs & Services > Library**.
4. Search for "Google Drive API" and click **Enable**.

## 4. OAuth Configuration
1. Navigate to **APIs & Services > OAuth consent screen**.
2. Select **Internal** (if using Google Workspace) or **External** (if using standard Gmail).
3. Fill in the required application information.
4. **Required Scopes:**
   - Add the scope: `https://www.googleapis.com/auth/drive.file` (Recommended: only allows access to files created by the app).
   - *Note: If the application must access an externally created folder, you may temporarily need `https://www.googleapis.com/auth/drive` (Full Drive access), but we strongly recommend transferring ownership of the folder to the app or using a Shared Drive if possible to limit scope.*
5. Add the dedicated storage email address as a Test User (if in External testing mode).

## 5. Credentials Generation
1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Application type: **Web application** (or Desktop app, depending on how you obtain the initial token).
4. Add authorized redirect URIs (e.g., `https://developers.google.com/oauthplayground` for initial setup).
5. Copy the generated **Client ID** and **Client Secret**.

## 6. Authorization Procedure (Generating Refresh Token)
To allow the server to operate autonomously, generate a long-lived Refresh Token:
1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the gear icon (Settings) -> Check **Use your own OAuth credentials**.
3. Input your **OAuth Client ID** and **OAuth Client secret**.
4. Step 1: Input the scope `https://www.googleapis.com/auth/drive` and click **Authorize APIs**. Login with the dedicated storage Gmail account.
5. Step 2: Click **Exchange authorization code for tokens**.
6. Copy the **Refresh token**.

## 7. Environment Variables
Add these values to your production `.env` file in Vercel:

```env
STORAGE_PROVIDER="google-drive"
GOOGLE_DRIVE_FOLDER_ID="1B1krvvoY6Ooh93_uAUirDNrMDTOPVZfK"
GOOGLE_DRIVE_CLIENT_ID="<your-client-id>"
GOOGLE_DRIVE_CLIENT_SECRET="<your-client-secret>"
GOOGLE_DRIVE_REFRESH_TOKEN="<your-refresh-token>"
```

**WARNING:** NEVER commit these secrets to Git.

## 8. Verification & Rotation
- **Verification:** Upload a test document in the system and verify it appears in the specified Google Drive folder. Try downloading it as a member.
- **Rotation:** If credentials are compromised, revoke the app access from the dedicated Google account's Security settings, generate a new OAuth Client Secret in Google Cloud Console, and repeat the OAuth Playground steps for a new refresh token.

## 9. Migration to Cloudflare R2 / S3
When ready to migrate away from Google Drive:
1. Use the Phase 19G migration tracking fields (`sha256`, `storageObjectId`) to iterate through `MemberDocument`s.
2. Download each file using its Google Drive file ID.
3. Calculate the SHA-256 hash and compare it with the database.
4. Upload to Cloudflare R2/S3.
5. Verify the new upload hash.
6. Update the database `storageProvider` to `R2` and `storageObjectId` to the new S3 key.
7. Switch `.env` to `STORAGE_PROVIDER="r2"`.
