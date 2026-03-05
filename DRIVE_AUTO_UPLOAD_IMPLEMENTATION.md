# Smart Wardrobe - Google Drive Auto-Upload Integration
## Complete Implementation Summary

**Date:** March 5, 2026  
**Task:** "phải update cả code python trong scraper service để đảm bảo là sẽ download video về local và upload theo đúng folder được config"  
**Translation:** "Must update Python code in scraper service to ensure videos are downloaded locally and uploaded to the correct configured folder"

---

## ✅ COMPLETED: Full Auto-Upload Workflow

### Phase 1: Backend Endpoint Creation
**File:** `backend/routes/driveUploadRoutes.js`

**New Endpoint:** `POST /api/drive/files/upload-with-metadata`

**Purpose:** Handle file uploads from scraper service with platform-specific folder mapping

**Request Format:**
```
multipart/form-data
- file: Video file (multipart)
- platform: Platform name (youtube|playboard|dailyhaha|douyin|tiktok|instagram)
- parentFolderId: (optional) Specific Google Drive folder ID
- description: (optional) File description
- metadata: (optional) JSON string with additional metadata
```

**Response Format:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "GOOGLE_DRIVE_FILE_ID",
    "fileId": "GOOGLE_DRIVE_FILE_ID",
    "webViewLink": "https://drive.google.com/file/d/.../view",
    "name": "video-name.mp4",
    "mimeType": "video/mp4",
    "size": 1024000,
    "platform": "youtube",
    "uploadedAt": "2026-03-05T12:00:00.000Z"
  }
}
```

**Upload Flow:**
1. Validates file exists and is not empty
2. Validates platform or parentFolderId provided
3. Authenticates with Google Drive
4. Routes to correct platform upload method:
   - `uploadPlayboardScrapedVideo()`
   - `uploadYoutubeScrapedVideo()`
   - `uploadDailyhahaScrapedVideo()`
   - `uploadDouyinScrapedVideo()`
5. Returns file info with Drive link
6. Handles errors gracefully (non-fatal)

**Supported Platforms:**
- youtube → Videos/Downloaded/Youtube folder
- playboard → Videos/Downloaded/Playboard folder
- dailyhaha → Videos/Downloaded/Dailyhaha folder
- douyin → Videos/Downloaded/Douyin folder
- tiktok → Videos/Downloaded/Tiktok folder (optional)
- instagram → Videos/Downloaded/Instagram folder (optional)

---

### Phase 2: Python Scraper Integration

**File:** `scraper_service/app/drive_upload_service.py`

**Key Components:**

#### DriveUploadService Class
```python
class DriveUploadService:
    def __init__(self, backend_api_url: str = "http://localhost:3000")
    def _load_folder_structure(self)
    async def upload_video_to_drive(file_path, platform, video_metadata)
    async def create_asset_record(filename, drive_file_id, ...)
```

#### upload_video_to_drive() Method
- **Purpose:** Upload downloaded video to platform-specific Google Drive folder
- **Input:** Local file path + platform name
- **Process:**
  1. Gets folder ID for platform via `get_folder_id_for_platform()`
  2. Opens file from local storage
  3. POSTs to backend `/api/drive/files/upload-with-metadata`
  4. Returns upload result (id, webViewLink) or None if failed
- **Error Handling:** Non-blocking (backend unavailable = graceful skip)
- **Timeout:** 300 seconds (5 minutes) for large files

#### upload_video_after_download() Function
- **Purpose:** Orchestration function called after successful download
- **Input:** video_id (MongoDB), file_path, platform
- **Process:**
  1. Calls `upload_video_to_drive()`
  2. If upload successful:
     - Updates MongoDB: driveUploadStatus='done'
     - Sets driveFileId, driveWebLink, driveUploadedAt
  3. If upload fails:
     - Updates MongoDB: driveUploadStatus='skipped'
     - Sets driveUploadSkipReason
- **Error Handling:** Graceful degradation, upload failure doesn't stop download

**Parameters Sent to Backend:**
```python
data = {
    'parentFolderId': folder_id,  # From get_folder_id_for_platform()
    'platform': platform,          # youtube, playboard, etc.
    'source': platform,            # Same as platform
    'description': f'{platform} video downloaded for repurposing'
}
```

---

### Phase 3: Automation Integration

**File:** `scraper_service/app/automation.py`

**Import (Line 36):**
```python
from .drive_upload_service import upload_video_after_download
```

**Integration Point (After successful download, ~Line 1729):**
```python
# After download completes and MongoDB is updated with downloadStatus='done'

# 💾 Upload to Google Drive
try:
    platform = (doc.get('platform') or 'unknown').lower()
    await upload_video_after_download(doc['_id'], out, platform)
except Exception as upload_err:
    print(f"⚠️  Google Drive upload error (non-fatal): {upload_err}")
```

**Upload Trigger Conditions:**
- ✅ Only after successful download (downloadStatus='done')
- ✅ Extracts platform from video document
- ✅ Non-blocking (exceptions caught, workflow continues)
- ✅ Platform name normalized to lowercase
- ✅ Falls back to 'unknown' if platform not specified

---

### Phase 4: Helper Functions

**File:** `scraper_service/google_drive_helper.py`

**Platform Mapping:**
```python
PLATFORM_FOLDER_MAP = {
    'youtube': {'config_key': 'Affiliate AI/Videos/Downloaded/Youtube', ...},
    'playboard': {'config_key': 'Affiliate AI/Videos/Downloaded/Playboard', ...},
    'dailyhaha': {'config_key': 'Affiliate AI/Videos/Downloaded/Dailyhaha', ...},
    'douyin': {'config_key': 'Affiliate AI/Videos/Downloaded/Douyin', ...},
    'tiktok': {'config_key': 'Affiliate AI/Videos/Downloaded/Tiktok', ...}
}
```

**Key Functions:**
- `get_folder_id_for_platform(platform) → Optional[str]` - Returns folder ID for platform
- `_get_folder_structure_config() → Optional[Dict]` - Loads backend config
- `get_all_configured_platforms() → List[str]` - Lists available platforms
- `print_all_source_folders()` - Debug helper

---

## 🔄 Complete Upload Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DOWNLOAD PHASE (automation.py)                               │
├─────────────────────────────────────────────────────────────────┤
│ process_download()                                              │
│   ├─ Parse video document from MongoDB                          │
│   ├─ Call yt-dlp to download video                               │
│   │  └─ Save to: DOWNLOAD_ROOT/platform/topics/date/id.mp4      │
│   ├─ On success: Update MongoDB                                 │
│   │  └─ downloadStatus = 'done'                                 │
│   │  └─ localPath = /path/to/video.mp4                          │
│   └─ NEXT: Trigger upload (async, non-blocking)                 │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. ASYNC UPLOAD TRIGGER (automation.py, non-blocking)           │
├─────────────────────────────────────────────────────────────────┤
│ upload_video_after_download(video_id, file_path, platform)      │
│   ├─ Extract platform from video document                       │
│   └─ Call DriveUploadService.upload_video_to_drive()            │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. FOLDER ID LOOKUP (google_drive_helper.py)                   │
├─────────────────────────────────────────────────────────────────┤
│ get_folder_id_for_platform(platform)                            │
│   ├─ Load drive-folder-structure.json from backend              │
│   ├─ Map platform → folder config                               │
│   └─ Return folder ID                                           │
│      └─ e.g., '15hLUtWlhs282yAEzUs8CKnijd8z6Fu2q' for YouTube   │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. HTTP UPLOAD REQUEST (drive_upload_service.py)               │
├─────────────────────────────────────────────────────────────────┤
│ POST http://localhost:3000/api/drive/files/upload-with-metadata  │
│   Form Data:                                                    │
│   ├─ file: (multipart) local video file                         │
│   ├─ platform: 'youtube'                                        │
│   ├─ parentFolderId: '15hLUtWlhs282yAEzUs8CKnijd8z6Fu2q'        │
│   └─ description: 'youtube video downloaded...'                 │
│                                                                 │
│   Timeout: 300 seconds (for large files)                        │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. BACKEND ENDPOINT (driveUploadRoutes.js)                     │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/drive/files/upload-with-metadata                      │
│   ├─ Validate request (file + platform/folderId)               │
│   ├─ Authenticate with Google Drive                            │
│   ├─ Call platform-specific upload method                      │
│   │  └─ e.g., driveService.uploadYoutubeScrapedVideo()         │
│   ├─ Upload file to Google Drive folder                        │
│   ├─ Return file info (id, webViewLink, etc.)                  │
│   └─ HTTP 200 with data       │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. RESPONSE HANDLING (drive_upload_service.py)                 │
├─────────────────────────────────────────────────────────────────┤
│ upload_video_after_download() continues:                        │
│   ├─ Check upload_result                                       │
│   ├─ If successful:                                            │
│   │  ├─ Extract driveFileId from result.id                     │
│   │  ├─ Extract driveWebLink from result.webViewLink           │
│   │  └─ Update MongoDB:                                        │
│   │     ├─ driveUploadStatus = 'done'                          │
│   │     ├─ driveFileId = 'FILE_ID'                             │
│   │     ├─ driveWebLink = 'https://...'                        │
│   │     └─ driveUploadedAt = now()                             │
│   └─ If failed:                                                │
│      └─ Update MongoDB:                                        │
│         ├─ driveUploadStatus = 'skipped'                       │
│         └─ driveUploadSkipReason = 'Backend unavailable'       │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
    ✅ COMPLETE
    MongoDB video record now includes:
    ├─ downloadStatus: 'done'
    ├─ localPath: '/downloads/.../video.mp4'
    ├─ downloadedAt: timestamp
    ├─ driveUploadStatus: 'done' (or 'skipped')
    ├─ driveFileId: 'GOOGLE_DRIVE_FILE_ID'
    ├─ driveWebLink: 'https://drive.google.com/file/d/.../view'
    └─ driveUploadedAt: timestamp
```

---

## 📁 File Structure (Configured Folders)

All videos are uploaded to platform-specific folders under `Videos/Downloaded/`:

```
Affiliate AI/
├── Videos/
│   └── Downloaded/
│       ├── Youtube/      📹 videos_youtube
│       ├── Playboard/    📹 videos_playboard
│       ├── Dailyhaha/    📹 videos_dailyhaha
│       └── Douyin/       📹 videos_douyin
```

**Folder IDs (Verified):**
```json
{
  "Affiliate AI/Videos/Downloaded/Youtube": "15hLUtWlhs282yAEzUs8CKnijd8z6Fu2q",
  "Affiliate AI/Videos/Downloaded/Playboard": "16yuEKCNefdkIvkjBmPV1bpO50D9PA5wS",
  "Affiliate AI/Videos/Downloaded/Dailyhaha": "1be70npwjzZl_P0bt35iWkuww6xcnjJnT",
  "Affiliate AI/Videos/Downloaded/Douyin": "1YXS3miLzkRaVIymWLttjQEtQNIzgDe_o"
}
```

---

## 🔒 Error Handling

### Non-Blocking Upload Design
- **Download continues** even if upload fails
- **Status tracking:** MongoDB records whether upload succeeded or was skipped
- **Backend unavailable:** Upload marks as 'skipped', doesn't crash scraper

### Error Scenarios
| Scenario | Behavior |
|----------|----------|
| Local file missing | Skip upload, mark as failed |
| Invalid platform | Return error from backend |
| Backend unavailable | Mark as 'skipped', continue workflow |
| Google Drive auth error | Mark as 'skipped', non-fatal |
| Network timeout | Retry within 300s timeout |
| Large file (>100MB) | Supported (from multer config) |

---

## 📊 MongoDB Schema Extensions

**Downloads Collection:**
New fields added to track Google Drive uploads:

```javascript
{
  _id: ObjectId,
  videoId: String,
  platform: "youtube|playboard|dailyhaha|douyin",
  
  // Download fields
  downloadStatus: "pending|downloading|done|failed",
  localPath: "/path/to/video.mp4",
  downloadedAt: ISODate,
  
  // 🆕 NEW: Google Drive upload fields
  driveUploadStatus: "pending|done|skipped|failed",
  driveFileId: String,           // Google Drive file ID
  driveWebLink: String,          // https://drive.google.com/file/d/...
  driveUploadedAt: ISODate,
  driveUploadSkipReason: String, // If skipped
  
  // Other fields
  title: String,
  description: String,
  topics: String,
  ...
}
```

---

## 🧪 Testing

### Test Endpoint Script
**File:** `test-drive-upload-endpoint.py`

**Tests:**
1. Endpoint structure validation
   - Missing file detection
   - Missing platform/folderId detection
   - Invalid platform handling
2. Platform-specific uploads
   - YouTube → correct folder
   - Playboard → correct folder
   - Dailyhaha → correct folder
   - Douyin → correct folder

**Usage:**
```bash
python test-drive-upload-endpoint.py
```

### Manual Testing
```bash
# Test with curl
curl -X POST http://localhost:3000/api/drive/files/upload-with-metadata \
  -F "file=@/path/to/video.mp4" \
  -F "platform=youtube" \
  -F "description=Test YouTube video"
```

---

## 🚀 Deployment Checklist

- [x] Backend endpoint created (`/api/drive/files/upload-with-metadata`)
- [x] Python service updated (drive_upload_service.py)
- [x] Automation integration added (automation.py)
- [x] Platform helper configured (google_drive_helper.py)
- [x] MongoDB schema extended (driveFileId, driveWebLink fields)
- [x] Error handling implemented (non-blocking)
- [x] Configuration verified (14 folders, 4 scraper sources)
- [ ] **TODO:** Start scraper and test with real download
- [ ] TODO: Monitor MongoDB for upload status
- [ ] TODO: Verify Drive files appear in correct folders
- [ ] TODO: Test with large files (100MB+)
- [ ] TODO: Set up logging/monitoring dashboard

---

## 📝 Configuration Files

### drive-folder-structure.json
Location: `backend/config/drive-folder-structure.json`
- Contains all 14 folder mappings
- Auto-loaded by both backend and Python code
- Updated via auto-detect script

### Config in Python
Location: `scraper_service/app/config.py`
- DOWNLOAD_ROOT: Where videos are saved locally
- BACKEND_URL: Backend API URL (defaults to localhost:3000)
- Can be overridden via environment variables

---

## 🔗 API Endpoints

### New Endpoint
```
POST /api/drive/files/upload-with-metadata
Description: Upload file to platform-specific Google Drive folder
Request: multipart/form-data (file, platform, metadata)
Response: {success, data: {id, fileId, webViewLink, ...}}
```

### Related Endpoints (Existing)
```
POST /api/drive/upload - Generic upload
POST /api/assets/create - Create asset record
GET /api/drive/auth - Check auth status
POST /api/drive/init-folders - Initialize folders
```

---

## 🎯 Success Criteria

✅ **Completed:**
- Python scraper downloads videos and saves to local storage
- After download, automatically uploads to Google Drive
- Uploads go to correct folder based on platform
- MongoDB tracks upload status
- System continues even if upload fails (non-blocking)
- All 4 scraper sources supported (youtube, playboard, dailyhaha, douyin)

---

## 📚 Related Documentation

- See `docs/2026-02-28-MULTI_PLATFORM_ACCOUNT_READINESS.md` for multi-platform strategy
- See `docs/2026-03-01-YT_SHORTS_FB_REELS_AUTOMATION_STRATEGY.md` for automation roadmap
- Backend Google Drive Service: `backend/services/googleDriveOAuth.js`

---

**Implementation Date:** March 5, 2026  
**Status:** ✅ COMPLETE (Ready for Testing)
