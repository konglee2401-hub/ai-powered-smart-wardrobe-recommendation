# Download + Google Drive Upload Pipeline Setup Guide

## 📋 Overview

This document describes the complete download ➡️ upload to Google Drive ➡️ asset creation pipeline for YouTube Shorts and other platform videos.

## 🏗️ Architecture

```
Videos in Database (Pending)
        ↓
  [Download Worker]
        ↓
Files saved locally
        ↓
  [Upload Service]
        ↓
Google Drive: Videos/Downloaded/Youtube/
        ↓
  [Asset Service]
        ↓
Asset records in MongoDB
```

## 🔧 Components

### 1. Download Pipeline (Existing)
- **File**: `scraper_service/app/automation.py`
- **Function**: `process_download(video_id, attempts)`
- **Status**: Video recorded as `downloadStatus: done` with `localPath` set
- **Tech**: yt-dlp command-line tool

### 2. Google Drive Upload Service (New)
- **File**: `scraper_service/app/drive_upload_service.py`
- **Class**: `DriveUploadService`
- **Methods**:
  - `ensure_youtube_folder()` - Ensure YouTube folder exists
  - `upload_video_file()` - Upload file to Drive
  - `create_asset_record()` - Create asset in backend DB
  - `process_video_download()` - Complete pipeline for one video

### 3. Backend API Endpoints (New)
- **File**: `backend/routes/driveFolderManagementRoutes.js`
- **Endpoints**:
  - `POST /api/drive/folders/ensure-youtube-folder` - Create/get YouTube folder
  - `POST /api/drive/files/upload` - Upload file to Drive
  - `GET /api/drive/folders/:parentId/list` - List folders
  - `GET /api/drive/folders/structure` - Get folder structure

### 4. FastAPI Scraper Routes (New)
- **File**: `scraper_service/app/main.py`
- **Endpoints**:
  - `POST /api/shorts-reels/videos/upload-to-drive` - Upload all pending
  - `GET /api/shorts-reels/videos/upload-status` - Get status
  - `POST /api/shorts-reels/videos/{video_id}/upload-to-drive` - Upload one

## 📊 Google Drive Folder Structure

```
Affiliate AI (1m9evYnMp6EV1H4aysk6NMTWgC8p-HAlu)
├── Images/
├── Videos/
│   ├── Downloaded/
│   │   ├── Reels/
│   │   ├── Tiktok/
│   │   └── youtube/  (NEW - auto-created)
│   ├── Uploaded/
│   ├── Completed/
│   └── Queue/
```

## 🚀 Quick Start

### Prerequisites
```bash
# Backend (Node.js)
cd backend
npm install

# Scraper Service (Python)
cd scraper_service
pip install -r requirements.txt
python -m pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client

# Environment Setup
# Add to .env:
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
DRIVE_API_KEY=your_drive_api_key
```

### Step 1: Start Backend Server
```bash
cd backend
npm start
# Server runs on http://localhost:3000
```

### Step 2: Start Scraper Service
```bash
cd scraper_service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
# Service runs on http://localhost:8001
```

### Step 3: Run Download Pipeline
```bash
# Check current status
python test-status-check.py

# User can trigger download via API:
curl -X POST http://localhost:8001/api/shorts-reels/videos/upload-to-drive
```

## 🔄 Complete Workflow

### Automatic (Recommended)
1. Videos discovered by Playboard scraper → saved in DB with `downloadStatus: pending`
2. Download worker picks up pending videos → downloads via yt-dlp
3. When downloaded → `downloadStatus: done`, `localPath` set
4. Upload service detects done videos → uploads to Google Drive
5. YouTube folder auto-created if needed
6. Files uploaded to Videos/Downloaded/youtube/
7. Asset records created in backend
8. Video marked with `uploadStatus: done`, `assetId` set

### Manual Trigger (Testing)
```bash
# Download pending videos
POST /api/shorts-reels/videos/upload-to-drive
Body: {}

# Check upload status
GET /api/shorts-reels/videos/upload-status

# Upload specific video
POST /api/shorts-reels/videos/{video_id}/upload-to-drive
```

## 📊 Database Schema Updates

### Videos Collection
```javascript
{
  _id: ObjectId,
  // ... existing fields ...
  
  // Download Status (existing)
  downloadStatus: "pending|downloading|done|failed",
  localPath: "/downloads/youtube/All/2026-03-02/abc123.mp4",
  downloadedAt: ISODate,
  
  // Upload Status (NEW)
  uploadStatus: "pending|done|failed",  // Default: pending for backlog
  assetId: "asset-1704067200000-abc123", // From backend asset API
  driveFileId: "1abc123xyz",
  driveWebLink: "https://drive.google.com/file/d/1abc123xyz/",
  uploadedAt: ISODate,
  uploadError: "Error message if failed"
}
```

### Asset Creation
When uploaded, service calls:
```
POST http://localhost:3000/api/assets/create
Body: {
  filename: "abc123.mp4",
  mimeType: "video/mp4",
  fileSize: 1024000,
  assetType: "video",
  assetCategory: "youtube-Music",
  userId: "scraper-service",
  storage: {
    location: "google-drive",
    googleDriveId: "1abc123xyz",
    webViewLink: "https://drive.google.com/file/d/1abc123xyz/"
  },
  tags: ["downloaded", "youtube", "Music"],
  metadata: {
    title: "Video Title",
    channelName: "Channel Name",
    views: 1000000,
    uploadedDate: "2026-01-15",
    downloadedAt: "2026-03-02T13:01:02Z"
  }
}
```

## 🧪 Testing

### 1. Check Database State
```bash
python test-status-check.py
# Shows:
# - Pending videos: X
# - Downloaded: Y
# - Uploaded: Z
```

### 2. Test Individual Video Upload
```bash
# Get a pending video ID from status check
VIDEO_ID="<from status>"

# Upload it
curl -X POST http://localhost:8001/api/shorts-reels/videos/{VIDEO_ID}/upload-to-drive

# Check result
curl -X GET http://localhost:8001/api/shorts-reels/videos/upload-status
```

### 3. Batch Upload
```bash
# Upload all downloaded but pending-upload videos
curl -X POST http://localhost:8001/api/shorts-reels/videos/upload-to-drive

# Monitor status
curl -X GET http://localhost:8001/api/shorts-reels/videos/upload-status
```

## ⚙️ Configuration

### Environment Variables

```bash
# .env in root directory

# Backend (Node.js)
PORT=3000
MONGODB_URI=mongodb://localhost:27017/smart_wardrobe
NODE_ENV=development

# Google Drive OAuth
OAUTH_CLIENT_ID=xxxx-xxxx.apps.googleusercontent.com
OAUTH_CLIENT_SECRET=GOCSPX-xxxxx
DRIVE_API_KEY=AIzaXxxxxxx

# Scraper Service
PORT=8001
MONGO_URI=mongodb://localhost:27017/smart_wardrobe
DOWNLOAD_ROOT=downloads

# Enable auto-scheduler
ENABLE_SCHEDULER=true

# Playboard credentials (optional)
PLAYBOARD_USER_EMAIL=yourmail@gmail.com
PLAYBOARD_USER_PASSWORD=yourpassword
PLAYBOARD_COOKIES_FILE=backend/cookies.json
```

### Google Drive Setup

1. **Create OAuth 2.0 Credentials**
   - Go to https://console.cloud.google.com
   - Create new project: "Smart Wardrobe"
   - Enable Google Drive API
   - Create OAuth 2.0 Client ID (Desktop Application)
   - Download credentials JSON
   - Set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in .env

2. **Authenticate First Time**
   - Backend will provide auth URL
   - Visit URL and authorize
   - Token automatically saved to `backend/config/drive-token.json`

3. **Verify Folder Structure**
   - After authentication, backend detects existing folders
   - Creates missing folders automatically
   - YouTube folder created dynamically when needed

## 🔍 Monitoring & Logging

### Logs Location
```
Backend: 
- Server logs: console output
- Drive operations: logged with timestamps
- Errors: detailed error messages

Scraper Service:
- Download progress: console output
- Upload progress: console output
- API calls: detailed logging
```

### Status Endpoints

Get overall status:
```bash
GET http://localhost:8001/api/shorts-reels/stats/overview
Response: {
  channels: 7,
  videos: 7,
  pending: 7,
  failed: 0,
  done: 0,
  queue: {...},
  recent: [...]
}
```

Get upload status:
```bash
GET http://localhost:8001/api/shorts-reels/videos/upload-status
Response: {
  downloaded: 0,
  uploaded: 0,
  uploadFailed: 0,
  pendingUpload: 0,
  withAssets: 0
}
```

## 🐛 Troubleshooting

### Issue: "Google Drive not configured"
**Solution**: 
- Check OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in .env
- Run backend server to generate auth URL
- Visit auth URL and authorize
- Restart scraper service

### Issue: "YouTube folder not found"
**Solution**:
- Auto-created when first video uploads
- Folder created under Videos/Downloaded/
- If creation fails, manually create folder and update config

### Issue: Download timeout
**Solution**:
- Check yt-dlp is installed: `yt-dlp --version`
- Increase timeout in automation.py
- Check internet connection
- Video URL might be invalid

### Issue: Upload fails with auth error
**Solution**:
- Check drive-token.json exists in backend/config/
- If missing, re-authenticate: delete token and restart backend
- Check OAuth scopes include Google Drive access

## 📈 Performance Metrics

### Expected Performance
- Download speed: depends on network (typically 1-50 MB/s)
- Upload speed: depends on network (typically 1-10 MB/s)
- Asset creation: <1 second per video

### Optimization Tips
1. **Batch uploads**: Run upload-to-drive endpoint once for all pending videos
2. **Parallel downloads**: Up to 5 concurrent with current settings
3. **Rate limiting**: 1 second delay between uploads to avoid API quota exceeded

## 🚦 Automation & Scheduling

### Automatic Discovery
```
Cron: 0 7 * * *  (Every day at 7 AM)
→ discover_all() discovers new videos
→ Videos saved with downloadStatus: pending
```

### Automatic Download
```
Continuous worker loop
→ Picks up pending videos
→ Downloads via yt-dlp
→ Sets downloadStatus: done
```

### Automatic Upload (Manual for now)
```
Manual trigger via API endpoint
→ Can be added to cron job if desired
→ Or run on demand
```

To make upload automatic, add to scheduler:
```python
scheduler.add_job(
    process_pending_uploads, 
    'cron', 
    hour='*/2',  # Every 2 hours
    id='upload_to_drive'
)
```

## 📝 Files Modified/Created

### New Files
- ✅ `scraper_service/app/drive_upload_service.py` - Upload service
- ✅ `backend/routes/driveFolderManagementRoutes.js` - API endpoints  
- ✅ `test-status-check.py` - Database status checker
- ✅ `test-pipeline-runner.py` - Pipeline test runner
- ✅ `backend/test-download-upload-pipeline.py` - Comprehensive test

### Modified Files
- ✅ `scraper_service/app/main.py` - Added upload endpoints
- ✅ `backend/server.js` - Registered new routes
- ✅ `backend/services/googleDriveOAuth.js` - Added helper methods

### Files Requiring Configuration
- `.env` - Add OAuth and Drive credentials
- `backend/config/drive-folder-structure.json` - Auto-populated

## ✅ Verification Checklist

- [ ] Backend server running on port 3000
- [ ] Scraper service running on port 8001
- [ ] MongoDB connected and populated with 7 test videos
- [ ] Google Drive OAuth configured
- [ ] Download worker processing videos
- [ ] Videos uploading to Google Drive successfully
- [ ] Asset records created in backend
- [ ] Upload status endpoint returning correct counts

## 🔜 Next Steps

1. **Monitor First Run**
   - Watch logs as first videos download
   - Verify files appear in Downloads folder
   - Check Google Drive for uploaded videos

2. **Optimize Performance**
   - Adjust download parallel limit if needed
   - Test upload rate limiting
   - Monitor database performance

3. **Scale Up**
   - Add more Playboard discovery configs
   - Increase concurrent downloads
   - Enable automatic upload scheduling

4. **Production Deployment**
   - Deploy backend to production server
   - Deploy scraper service separately or on same server
   - Configure persistent database
   - Setup monitoring and alerting
   - Enable auto-scheduling for all jobs

## 📞 Support

For issues or questions:
1. Check logs in console output
2. Run `test-status-check.py` to verify database state
3. Test individual endpoints with curl
4. Check Google Drive folder permissions
5. Verify .env configuration is correct
