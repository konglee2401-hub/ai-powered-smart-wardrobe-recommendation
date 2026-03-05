# Google Drive OAuth2 Setup Guide

## Overview
This guide explains how to set up Google Drive OAuth2 integration for uploading images directly from the Smart Wardrobe app to your Google Drive account.

## Prerequisites
- Google account with Drive access
- OAuth 2.0 credentials JSON file downloaded from Google Cloud Console
- Backend and Frontend running

## Step 1: Set Up Google Cloud Credentials

### 1.1 Create/Obtain OAuth 2.0 Credentials
You should have already downloaded the credentials file from Google Cloud Console. It looks like:
```
client_secret_445819590351-s0oqsu0bu9t7lsmttfd16q8rohqlohkc.apps.googleusercontent.com.json
```

### 1.2 Place Credentials File
Copy the JSON file to: `backend/config/client_secret_*.json`

**⚠️ Important**: This file contains secrets and is **NOT** tracked by git. Keep it secure!

## Step 2: Initialize Backend Service

### 2.1 Start Backend
```bash
cd backend
npm run dev
```

### 2.2 Check Authentication Status
The service will attempt to authenticate on first use. If no token exists, it will provide an authorization URL.

### 2.3 Authenticate (First Time Only)
Visit the authentication endpoint:
```
GET /api/drive/auth
```

This will return an authorization URL. Visit it in your browser to grant permissions.

### 2.4 Handle OAuth Callback
After authorizing, the callback will be processed and a token saved to:
```
backend/config/drive-token.json
```

## Step 3: Initialize Folder Structure

### 3.1 Create Folders on Drive
```
POST /api/drive/init-folders
```

This automatically creates:
```
Affiliate AI (root folder: 1ayZjev8zPy-k0NT5e4-yiP7gggRD6CVV)
├── Videos
└── Images
    └── Uploaded
        └── App  ← Your images upload here
```

### 3.2 Verify Folder Creation
Visit Google Drive and verify the structure was created.

## Step 4: Use the Feature

### 4.1 In Image Generation
1. Go to **Image Generation → Step 4: Generation**
2. Check "☁️ Upload to Google Drive"
3. Generate images
4. Images automatically upload to Drive folder

### 4.2 View in Gallery
1. Go to **Gallery**
2. Filter by "Cloud Drive"
3. See all uploaded images with Drive badge ☁️

## Step 5: API Endpoints

### Authentication
```
GET  /api/drive/auth
POST /api/drive/auth-callback
```

### Folder Management
```
POST /api/drive/init-folders
```

### File Operations
```
POST   /api/drive/upload              # Upload file
GET    /api/drive/files               # List files
GET    /api/drive/file/:fileId        # Get file details
DELETE /api/drive/file/:fileId        # Delete file
GET    /api/drive/download-url/:fileId
```

## Troubleshooting

### Issue: "Not authenticated"
**Solution**: Visit `/api/drive/auth` and complete OAuth authorization

### Issue: Folders not created
**Solution**: Call `POST /api/drive/init-folders` explicitly

### Issue: Upload fails
**Solution**: 
1. Check backend logs
2. Verify OAuth token validity
3. Ensure Drive has storage space

### Issue: Token expired
**Solution**: The service auto-refreshes tokens. If issues persist, delete `backend/config/drive-token.json` and re-authenticate.

## File Structure Reference

### Root Folder ID
```
1ayZjev8zPy-k0NT5e4-yiP7gggRD6CVV
```

### Upload Destination
```
Affiliate AI → Images → Uploaded → App
```

### File Metadata
Uploaded files include:
- `name`: filename
- `contentType`: 'drive' (for filtering in gallery)
- `source`: 'google-drive'
- `webViewLink`: direct Drive link
- `createdTime`: upload timestamp
- `size`: file size bytes

## Security Notes

⚠️ **DO NOT** commit credentials file to git:
- Added to `.gitignore`: `backend/config/*.json`
- Token stored locally: `backend/config/drive-token.json`
- Both files are not tracked by version control

## Environment Variables
Optional - currently hardcoded in `googleDriveOAuth.js`:
```env
GOOGLE_DRIVE_FOLDER_ID=1ayZjev8zPy-k0NT5e4-yiP7gggRD6CVV
```

## Future Enhancements

- [ ] Multi-user support (different Drive accounts)
- [ ] Batch upload with progress tracking
- [ ] Drive-to-Drive sync
- [ ] Shared folder integration
- [ ] Automatic cleanup of old files
- [ ] Bandwidth throttling for large uploads

## Support

For issues, check:
1. Backend logs: `npm run dev` console output
2. Browser console: F12 → Console tab
3. Google Drive quota status
4. OAuth token expiry

---

**Last Updated**: Feb 22, 2026
**Version**: 1.0
**Status**: Production Ready
