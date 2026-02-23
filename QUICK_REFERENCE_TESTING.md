# Video Queue Scanner - Quick Reference & Commands

## 🎯 Quick Testing URLs

### Frontend
- Main Page: http://localhost:5173
- Video Production: http://localhost:5173/video-production
- Direct Link: Navigate to Tools → Video Production

### Backend API
- Base URL: http://localhost:5000/api
- Queue Scanner: http://localhost:5000/api/queue-scanner

---

## 🚀 Quick Start Commands

### Terminal 1: Start Backend
```bash
cd /c/Work/Affiliate-AI/smart-wardrobe/backend
npm run dev
```

### Terminal 2: Start Frontend
```bash
cd /c/Work/Affiliate-AI/smart-wardrobe/frontend
npm run dev
```

### Terminal 3: Setup Test Videos (if not already done)
```bash
cd /c/Work/Affiliate-AI/smart-wardrobe/backend
node setup-test-videos.js
```

---

## 📡 API Testing Commands

### 1. Get Current Status
```bash
curl -s http://localhost:5000/api/queue-scanner/status | jq .
```

**Example Output:**
```json
{
  "success": true,
  "data": {
    "isRunning": false,
    "queueCount": 1,
    "videos": [
      {
        "name": "test-queue-video.mp4",
        "size": "1.92 MB",
        "addedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### 2. List Queue Videos
```bash
curl -s http://localhost:5000/api/queue-scanner/queue-videos | jq .
```

### 3. Get Random Sub-Video
```bash
curl -s http://localhost:5000/api/queue-scanner/random-sub-video | jq .
```

### 4. Trigger Manual Scan
```bash
curl -X POST http://localhost:5000/api/queue-scanner/scan-now
```

**Example Output:**
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

### 5. Initialize Scheduled Scanning
```bash
curl -X POST http://localhost:5000/api/queue-scanner/initialize \
  -H "Content-Type: application/json" \
  -d '{"intervalMinutes": 60}'
```

---

## 📁 File System Commands

### Check Video Directories
```bash
cd /c/Work/Affiliate-AI/smart-wardrobe/backend/media

# List all directories
ls -la

# Check each folder
echo "=== MAIN VIDEOS ===" && ls -lh main-videos/
echo "=== SUB VIDEOS ===" && ls -lh sub-videos/
echo "=== QUEUE ===" && ls -lh queue/
echo "=== COMPLETED ===" && ls -lh completed/
```

### Verify Test Videos
```bash
# Check if test videos copied
ls -lh /c/Work/Affiliate-AI/smart-wardrobe/backend/media/main-videos/
ls -lh /c/Work/Affiliate-AI/smart-wardrobe/backend/media/sub-videos/

# Check queue
ls -lh /c/Work/Affiliate-AI/smart-wardrobe/backend/media/queue/
```

### Copy Additional Test Videos (if needed)
```bash
cd /c/Work/Affiliate-AI/smart-wardrobe/backend

# Copy main video to sub-videos for more selection options
cp media/main-videos/sample-main.mp4 media/sub-videos/additional-sub-1.mp4

# Create more queue items
cp test-videos/main-video.mp4 media/queue/queue-item-2.mp4
cp test-videos/main-video.mp4 media/queue/queue-item-3.mp4
```

---

## 🎬 Video Verification Commands

### Check Generated Mashup Properties
```bash
# List completed mashups
ls -lh /c/Work/Affiliate-AI/smart-wardrobe/backend/media/completed/

# Get video properties
ffprobe /c/Work/Affiliate-AI/smart-wardrobe/backend/media/completed/mashup_*.mp4

# Expected output should show:
# Duration: ~30s
# Resolution: 1920x1080 or 1280x720 (9:16 aspect)
# Bitrate: 5000-8000 kbps
# Codec: h264, aac
```

### Check FFmpeg Installation
```bash
ffmpeg -version
ffprobe -version
```

---

## 💾 Database Commands (MongoDB)

### Connect to MongoDB Shell
```bash
# If MongoDB running locally
mongosh
```

### View Queue Items
```javascript
// In MongoDB shell
db.queues.find().pretty()

// Count total queue items
db.queues.countDocuments()

// Get completed items
db.queues.find({ status: "completed" }).pretty()

// Get failed items
db.queues.find({ status: "failed" }).pretty()
```

### Clear Queue (Testing Only)
```javascript
// Delete all queue items
db.queues.deleteMany({})

// Delete specific status
db.queues.deleteMany({ status: "completed" })
```

---

## 📊 Testing Workflows

### Workflow 1: Manual Mashup via UI
```
1. Open http://localhost:5173/video-production
2. Go to "Create Mashup" tab
3. Upload a video from /backend/test-videos/
4. Select sub-video from gallery
5. Configure settings (30s, YouTube, High, 9:16)
6. Click "Create Mashup"
7. Go to "Processing" tab
8. Enable auto-refresh
9. Watch progress (30-60s)
10. Download when complete
```

### Workflow 2: Automated Scan
```
1. Open http://localhost:5173/video-production
2. Go to "Queue Scanner" tab
3. View status (should show videos in queue)
4. Click "▶ Trigger Scan Now"
5. Wait for results (30-60s)
6. Review results list
7. Verify files in /backend/media/completed/
```

### Workflow 3: API Testing
```bash
# 1. Check status
curl http://localhost:5000/api/queue-scanner/status

# 2. Trigger scan
curl -X POST http://localhost:5000/api/queue-scanner/scan-now

# 3. Check status again
curl http://localhost:5000/api/queue-scanner/status

# 4. Initialize scheduler
curl -X POST http://localhost:5000/api/queue-scanner/initialize \
  -H "Content-Type: application/json" \
  -d '{"intervalMinutes": 60}'
```

---

## ✅ Testing Checklist

### UI Components
- [ ] VideoMashupCreator renders without error
- [ ] Drag-drop upload area appears
- [ ] Gallery picker opens
- [ ] Settings form populates
- [ ] Review screen shows video details

- [ ] ProcessingMonitor displays queue item
- [ ] Progress bar exists (0% initially)
- [ ] Auto-refresh toggle works
- [ ] Stage names update as processing
- [ ] Download button appears when complete

- [ ] QueueScannerPanel shows status
- [ ] Queue count displays
- [ ] "Trigger Scan" button clickable
- [ ] Results list appears after scan
- [ ] Status colors change appropriately

### API Endpoints
- [ ] GET /status returns JSON (not HTML)
- [ ] GET /queue-videos returns array
- [ ] GET /random-sub-video returns object with file path
- [ ] POST /scan-now processes and returns results
- [ ] POST /initialize accepts intervalMinutes parameter

### File System
- [ ] main-videos/ contains sample-main.mp4
- [ ] sub-videos/ contains sample-sub.mp4
- [ ] queue/ initially contains test-queue-video.mp4
- [ ] completed/ contains output video after processing
- [ ] mashups/ contains thumbnail image

### Video Quality
- [ ] Output video duration ~30 seconds
- [ ] Aspect ratio 9:16 (TALL, not wide)
- [ ] Resolution 1920x1080 (High) or 720x1280 (Standard)
- [ ] File size 3-15 MB (depends on duration/bitrate)
- [ ] Playable in standard video player
- [ ] Layout shows main video 2/3 left, sub video 1/3 right

### Performance
- [ ] UI loads in < 2 seconds
- [ ] Upload completes in < 5 seconds
- [ ] Processing takes 30-60 seconds
- [ ] Auto-refresh updates within 2 seconds
- [ ] Download starts immediately when complete

---

## 🔧 Troubleshooting Commands

### Backend Won't Start
```bash
# Check if port 5000 is in use
netstat -an | grep 5000

# Clear node modules and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### FFmpeg Not Found
```bash
# Windows (PowerShell)
.\install_ffmpeg.ps1

# Verify installation
ffmpeg -version
which ffmpeg  # or: where ffmpeg (Windows)
```

### Frontend Won't Connect to API
```bash
# Check backend is running
curl http://localhost:5000/api/health

# Check frontend API base URL
cat /c/Work/Affiliate-AI/smart-wardrobe/frontend/.env.local | grep VITE_API_BASE

# Should output something like:
# VITE_API_BASE=http://localhost:5000
```

### Videos Not Processing
```bash
# Check test videos exist
ls /c/Work/Affiliate-AI/smart-wardrobe/backend/test-videos/

# Verify they copied to media folder
ls /c/Work/Affiliate-AI/smart-wardrobe/backend/media/*/

# Re-run setup if needed
cd /c/Work/Affiliate-AI/smart-wardrobe/backend
node setup-test-videos.js
```

### Database Connection Issues
```bash
# Check MongoDB is running
mongosh --eval "db.version()"

# View connection string from .env
grep MONGODB_URI /c/Work/Affiliate-AI/smart-wardrobe/backend/.env
```

---

## 📈 Performance Monitoring

### Backend Logs
```bash
# Watch backend logs (if using PM2)
pm2 logs

# Or check Node console output
# Look at terminal running "npm run dev"
```

### Video Duration
```bash
# Check actual duration of test videos
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 \
  /c/Work/Affiliate-AI/smart-wardrobe/backend/test-videos/main-video.mp4
```

### CPU Usage During Processing
```bash
# Monitor system resources (macOS/Linux)
top

# Monitor processes (Windows PowerShell)
Get-Process | Where-Object {$_.ProcessName -like "*ffmpeg*"} | Format-Table Name, Handles, Memory
```

---

## 📞 Support References

### File Locations
- **Backend Server:** `/c/Work/Affiliate-AI/smart-wardrobe/backend/server.js`
- **Frontend App:** `/c/Work/Affiliate-AI/smart-wardrobe/frontend/src/App.jsx`
- **Video Production Page:** `/c/Work/Affiliate-AI/smart-wardrobe/frontend/src/pages/VideoProduction.jsx`
- **Test Videos:** `/c/Work/Affiliate-AI/smart-wardrobe/backend/test-videos/`
- **Media Folder:** `/c/Work/Affiliate-AI/smart-wardrobe/backend/media/`
- **Documentation:** `/c/Work/Affiliate-AI/smart-wardrobe/E2E_TESTING_GUIDE.md`

### Key Services
- **Queue Scanner:** `/backend/services/queueScannerCronJob.js`
- **Video Generator:** `/backend/services/videoMashupGenerator.js`
- **Google Drive:** `/backend/services/googleDriveIntegration.js`
- **API Routes:** `/backend/routes/queueScannerRoutes.js`

### Configuration Files
- **Frontend Env:** `/frontend/.env.local`
- **Backend Env:** `/backend/.env`
- **Docker Config:** `/docker-compose.yml`

---

## 🎉 Success!

When you see this sequence, your integration is working:

```
1. Frontend loads Video Production page ✅
2. Create Mashup tab renders form ✅
3. Upload accepts video file ✅
4. Processing tab shows real-time progress ✅
5. Video completes in /completed/ folder ✅
6. Thumbnail generates successfully ✅
7. Queue Scanner processes videos ✅
8. All statuses show accurate info ✅

🎬 COMPLETE! System working end-to-end!
```

---

**Happy testing! 🚀**

Generated: 2024-01-15
Status: Ready for production
