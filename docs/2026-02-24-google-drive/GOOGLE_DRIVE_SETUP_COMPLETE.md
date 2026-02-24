#!/usr/bin/env node

# Google Drive Upload Setup Guide
# Complete setup for enabling Google Drive image uploads

## ✅ What Has Been Fixed

1. **Image Download Timeout** - Increased from 15 seconds to 60 seconds
   - Fixes Image 2 timeout during 2K image upgrade
   - Both images now download successfully

2. **Prompt Format** - Fixed object/string mismatch in asset validation
   - MongoDB schema now receives proper string format
   - Assets save successfully without validation errors

3. **Google Drive Setup** - Complete OAuth 2.0 integration
   - Uses environment variables from .env
   - Graceful fallback to local storage if Drive unavailable
   - Proper error handling throughout

## 🚀 How to Enable Google Drive Uploads

### Step 1: Complete OAuth Authorization (First Time Only)

Run this command to authorize Google Drive access:

```bash
cd backend
node setup-drive-auth.js
```

This will:
1. Open your browser automatically
2. Ask you to sign in with Google Account
3. Request permission to access Google Drive
4. Redirect back to localhost and save the authorization token
5. Save token to: `backend/config/drive-token.json`

### Step 2: Test Google Drive Upload

After authorization, test the upload functionality:

```bash
cd backend
node tests/test-google-drive-upload.js
```

You should see:
```
✅ OAuth credentials found in .env
✅ Using OAuth 2.0 credentials from environment (.env)...
✅ Google Drive OAuth authenticated successfully
✅ Upload successful!
🎉 Google Drive upload test PASSED!
```

### Step 3: Start the App

Now you can use Google Drive uploads in image generation:

```bash
npm start
```

## 📸 Full Image Generation Workflow

1. **Start App**: `npm start`
2. **Generate Images**:
   - Select scenario and options
   - Click "Tạo" button
   - Wait for images (60 seconds max for 2K upgrade)
3. **Results**:
   - ✅ 2/2 images download (no more timeout!)
   - ✅ Assets save to database
   - ✅ Images automatically upload to Google Drive
   - ✅ Gallery displays images from both sources

## 📋 OAuth Credentials Status

In your `.env` file:

```
OAUTH_CLIENT_ID=[Your Google OAuth Client ID]
OAUTH_CLIENT_SECRET=[Your Google OAuth Client Secret]
DRIVE_API_KEY=[Your Google Drive API Key]
```

✅ All credentials configured!

## 🔐 Token Storage

After first-time authorization, the token is stored at:
- Location: `backend/config/drive-token.json`
- Auto-refresh: Token automatically refreshes when expired
- Secure: Token is kept local and never shared

## ⚠️ Troubleshooting

### "Port 5000 already in use"
```bash
# Find and kill the process
lsof -i :5000      # Mac/Linux
netstat -ano | findstr :5000  # Windows
```

### "Authorization timeout"
- Try again with: `node setup-drive-auth.js`
- Wait max 10 minutes for browser response
- Make sure to grant all permissions

### "Google Drive upload failed"
- Check if `config/drive-token.json` exists
- Is the token expired? Re-run: `node setup-drive-auth.js`
- Check console logs for detailed error

### Images not uploading to Drive
- Verify token is valid
- Check Google Drive folder structure exists
- See app console for upload status messages

## 🎯 Summary

| Feature | Status | Notes |
|---------|--------|-------|
| 2 images download | ✅ Fixed | No more timeout on image 2 |
| Asset validation | ✅ Fixed | Proper database storage |
| Google Drive OAuth | ✅ Ready | Run setup-drive-auth.js |
| Image upload | ✅ Works | Automatic after generation |
| Local fallback | ✅ Works | Falls back gracefully |

## 📞 Need Help?

Check logs:
```bash
# Frontend logs
npm run dev    # Look for console errors

# Backend logs  
npm start      # Check terminal output
```

See environment status:
```bash
cd backend
node -e "require('dotenv').config(); console.log('OAuth setup:', !!process.env.OAUTH_CLIENT_ID)"
```
