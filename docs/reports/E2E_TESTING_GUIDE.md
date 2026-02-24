# End-to-End Testing Guide: Video Queue Scanner

## Overview
This guide provides step-by-step instructions for testing the complete video queue scanning and mashup generation workflow.

## Prerequisites
- ✅ Backend server running
- ✅ Frontend development server running  
- ✅ FFmpeg installed on system
- ✅ Sample videos placed in `/backend/media/` folders
- ✅ Node.js dependencies installed

## System Architecture

```
User Interface (Frontend)
    ↓
Mobile/Desktop → VideoProduction Page
    ├── Create Mashup Tab
    ├── Processing Tab
    ├── Queue Scanner Tab
    └── Media Library Tab
    ↓ 
API Endpoints (/api/queue-scanner/*)
    ↓
Backend Services
    ├── videoMashupGenerator (FFmpeg)
    ├── googleDriveIntegration (local filesystem)
    ├── queueScannerCronJob (scheduler)
    └── VideoQueueService (database)
    ↓
Storage Directories
    ├── /backend/media/main-videos/     (source videos)
    ├── /backend/media/sub-videos/      (overlay videos)
    ├── /backend/media/queue/           (videos to process)
    ├── /backend/media/completed/       (finished mashups)
    └── /backend/media/mashups/         (processing cache)
```

## Test Workflow

### Test 1: Create Mashup via UI

**Objective:** Upload videos manually using the VideoMashupCreator component

**Steps:**
1. Navigate to: http://localhost:5173 (or your frontend port)
2. Go to Tools → Video Production
3. Click on "Create Mashup" tab
4. **Step 1 - Upload Main Video:**
   - Drag and drop `/backend/test-videos/main-video.mp4`
   - Or click to browse and select
   - Verify file shows in upload area
5. **Step 2 - Select Sub Video:**
   - Click "Browse Media"
   - Select `sub-video.mp4` from gallery
   - Verify selection shows
6. **Step 3 - Configure:**
   - Duration: 30 seconds (default)
   - Platform: YouTube
   - Quality: High (1080p)
   - Aspect Ratio: 9:16
7. **Step 4 - Review & Queue:**
   - Click "Create Mashup"
   - Verify success toast notification
   - Check queue count increases

**Expected Results:**
- ✅ Video uploads to `/backend/media/main-videos/`
- ✅ Queue item created in database
- ✅ "Success" toast shown to user
- ✅ Queue count displays new item

---

### Test 2: Manual Scan Trigger

**Objective:** Manually trigger queue scanner via button in UI

**Steps:**
1. Go to VideoProduction → "Queue Scanner" tab
2. View current status (queue count, running state)
3. Click "▶ Trigger Scan Now" button
4. Wait for processing to complete
5. Review results displayed below

**Expected Results:**
- ✅ Scanner processes videos from queue
- ✅ Random sub-video selected (or specified one)
- ✅ FFmpeg generates mashup with 2/3 + 1/3 layout
- ✅ Output saved to `/backend/media/completed/`
- ✅ Results section shows success/failure for each video
- ✅ Thumbnail generated for mashup

**Monitoring:**
- Queue count should decrease
- Completed count should increase
- Results list shows processed video names

---

### Test 3: Real-Time Processing Monitor

**Objective:** Monitor mashup generation progress in real-time

**Steps:**
1. Go to VideoProduction → "Processing" tab
2. Create a new mashup (Test 1) or trigger scan (Test 2)
3. Click "Enable Auto-Refresh" toggle
4. Observe progress updates (every 1.5 seconds)
5. Watch progress bar fill as stages complete

**5 Processing Stages:**
1. 🔄 load-main (0-20%): Loading main video file
2. 🔄 load-sub (20-40%): Loading sub-video file
3. 🔄 merge-videos (40-60%): Merging with FFmpeg
4. 🔄 encode (60-90%): Encoding final video
5. 🔄 generate-thumbnail (90-100%): Creating thumbnail

**Expected Results:**
- ✅ Progress bar animates smoothly
- ✅ Status color changes (yellow → blue (animated) → green/red)
- ✅ Stage names update
- ✅ Download button appears when complete
- ✅ Error log shows if queue item fails
- ✅ Refresh responds quickly (< 2s per update)

---

### Test 4: API Endpoint Testing

**Objective:** Test QueueScanner API endpoints directly

#### 4a. Get Scanner Status
```bash
curl http://localhost:5000/api/queue-scanner/status
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": false,
    "queueCount": 2,
    "videos": [
      {
        "name": "video1.mp4",
        "size": "1.92 MB",
        "addedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### 4b. Trigger Manual Scan
```bash
curl -X POST http://localhost:5000/api/queue-scanner/scan-now
```

**Expected Response:**
```json
{
  "success": true,
  "processed": 1,
  "results": [
    {
      "queueVideo": "test-queue-video.mp4",
      "subVideo": "sample-sub.mp4",
      "mashupId": "mashup_20240115_103000",
      "status": "success"
    }
  ]
}
```

#### 4c. Initialize Scheduled Scanning
```bash
curl -X POST http://localhost:5000/api/queue-scanner/initialize \
  -H "Content-Type: application/json" \
  -d '{"intervalMinutes": 60}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Queue scanner scheduled every 60 minutes"
}
```

#### 4d. Get Random Sub-Video
```bash
curl http://localhost:5000/api/queue-scanner/random-sub-video
```

**Expected Response:**
```json
{
  "success": true,
  "file": "sample-sub.mp4",
  "path": "/backend/media/sub-videos/sample-sub.mp4"
}
```

---

## Video Output Verification

### Check Generated Mashup

After processing completes:

1. **File Location:**
   ```bash
   ls -lh /backend/media/completed/
   ls -lh /backend/media/mashups/
   ```

2. **Video Properties:**
   ```bash
   ffprobe /backend/media/completed/mashup_*.mp4
   ```

   **Expected:**
   - Duration: ~30 seconds
   - Resolution: 1080x1920 or 720x1280 (9:16 aspect)
   - Codec: h264 (video), aac (audio)
   - Bitrate: 5000-8000 kbps
   - Frame Rate: 30fps

3. **Thumbnail Check:**
   ```bash
   ls -lh /backend/media/mashups/*_thumb.png
   ```

4. **Manual Inspection:**
   - Download from "Processing" tab
   - Play in video player
   - Verify layout: main video on left (2/3), sub-video on right (1/3)
   - Confirm YouTube Shorts aspect ratio (tall, thin)

---

## Troubleshooting

### Issue: "FFmpeg not found"
**Solution:**
```bash
# Windows
.\install_ffmpeg.ps1

# Mac/Linux
ffmpeg -version
```

### Issue: "Videos not copying to queue"
**Solution:**
```bash
# Verify directories exist
ls -la backend/media/

# Re-run setup
node backend/setup-test-videos.js
```

### Issue: Processing takes > 5 minutes
**Solution:**
- Check CPU usage (encoding is CPU-intensive)
- Reduce quality setting to "standard" (720p)
- Try with shorter video (< 60 seconds)

### Issue: "Failed to get random sub-video"
**Solution:**
```bash
# Verify sub-videos exist
ls backend/media/sub-videos/

# Add additional test videos if empty
cp backend/test-videos/main-video.mp4 backend/media/sub-videos/test-sub.mp4
```

### Issue: Frontend can't connect to API
**Solution:**
- Check VITE_API_BASE in frontend/.env.local
- Verify backend running: `curl http://localhost:5000/api/health`
- Check CORS settings in server.js

---

## Performance Benchmarks

**Expected Performance (with sample videos):**

| Operation | Time | Notes |
|-----------|------|-------|
| Load main video | 0.5s | File reading |
| Load sub video | 0.3s | File reading |
| FFmpeg merge | 15-30s | Depends on duration & bitrate |
| Encoding | 10-20s | Variable based on CPU |
| Thumbnail | 2-3s | PNG generation |
| **Total Process** | **30-60s** | Per mashup |

---

## Database Verification

### Check Queue Items
```javascript
// Check MongoDB queue collection
db.queues.find().pretty()

// Expected document:
{
  "_id": ObjectId(...),
  "mainVideoPath": "/backend/media/main-videos/...",
  "subVideoPath": "/backend/media/sub-videos/...",
  "status": "completed",
  "createdAt": ISODate(...),
  "completedAt": ISODate(...),
  "output": {
    "mashupPath": "/backend/media/completed/...",
    "thumbPath": "/backend/media/mashups/..._thumb.png"
  }
}
```

---

## Success Criteria Checklist

After completing all tests, verify:

- [ ] **UI Components Render Correctly**
  - [ ] VideoMashupCreator loads without errors
  - [ ] ProcessingMonitor displays progress
  - [ ] QueueScannerPanel shows status
  - [ ] All tabs clickable and functional

- [ ] **Video Upload & Processing**
  - [ ] Upload accepts main video file
  - [ ] Gallery picker shows sub-videos
  - [ ] Queue item created in database
  - [ ] Processing monitor shows stages

- [ ] **Queue Scanner**
  - [ ] Manual trigger processes videos
  - [ ] Random sub-video selected
  - [ ] FFmpeg generates mashup
  - [ ] Output in completed folder

- [ ] **Real-Time Features**
  - [ ] Auto-refresh updates status every 1.5s
  - [ ] Progress bar animates smoothly
  - [ ] Download button works for completed videos
  - [ ] Error messages display clearly

- [ ] **API Endpoints**
  - [ ] /status returns queue info
  - [ ] /scan-now processes queue
  - [ ] /initialize sets up schedule
  - [ ] /random-sub-video returns file

- [ ] **File System**
  - [ ] main-videos/ contains uploaded videos
  - [ ] sub-videos/ contains overlay videos
  - [ ] queue/ contains pending videos
  - [ ] completed/ contains finished mashups
  - [ ] mashups/ contains temp files & thumbnails

---

## Next Steps

After successful testing:

1. **Enable Automation:**
   - Call `POST /api/queue-scanner/initialize` to enable scheduled scanning
   - Configure interval (default 60 minutes)

2. **Integrate with Upload:**
   - Setup Google Drive upload after completion
   - Configure auto-distribution to social media

3. **Performance Optimization:**
   - Implement batch processing for multiple videos
   - Add video quality selection UI
   - Cache template overlays

4. **Production Deployment:**
   - Replace local filesystem with Google Drive API
   - Add database persistence
   - Implement error recovery and retry logic

---

## Support

For issues or questions:
1. Check error logs in browser console
2. Review backend logs: `tail -f backend/logs/server.log`
3. Run diagnostics: `node backend/setup-test-videos.js`
4. Verify FFmpeg: `ffmpeg -version && ffprobe -version`
