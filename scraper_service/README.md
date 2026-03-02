# Shorts/Reels Python Automation Service

FastAPI service quản lý discover/scan/download/upload YouTube Shorts + Facebook Reels.

## Features

### 📥 Discover & Download
- Auto-detect trending videos từ Playboard (YouTube Shorts, Facebook Reels)
- Smart queue management với worker pool
- Downloaded videos lưu tại `backend/downloads/`

### 🌐 Upload to Google Drive
- Async upload downloaded videos đến Google Drive
- Auto-create folder structure: `Videos/Downloaded/youtube/`
- Cập nhật metadata vào database (uploadStatus, driveWebLink)
- Resume support cho large files

### 🎬 Asset Generation
- Auto-generate captions từ video files
- Tạo video metadata và thumbnails
- Lưu assets tại `backend/generated-images/`

### 🛡️ Anti-detect
- Ưu tiên `nodriver` để tránh bị detect
- Fallback tự động sang Playwright
- Random UA, viewport jitter, stealth mode

---

## Quick Start

### 1️⃣ First time setup
```bash
cd scraper_service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

### 2️⃣ Configure (edit `.env`)
```env
BACKEND_URL=http://localhost:8000
PORT=8001
SCRAPER_ENGINE=nodriver
SCRAPER_HEADLESS=true
GOOGLE_DRIVE_ENABLED=true
ASSET_GENERATION_ENABLED=true
```

### 3️⃣ Run service
```bash
python run.py
```

Service sẽ start tại: `http://localhost:8001`

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/shorts-reels/status` | Service health check |
| POST | `/api/shorts-reels/discover` | Trigger discovery |
| GET | `/api/shorts-reels/discover/progress` | Get discovery status |
| GET | `/api/shorts-reels/videos` | List all videos |
| POST | `/api/shorts-reels/videos/{id}/upload-to-drive` | Upload single video |
| POST | `/api/shorts-reels/videos/upload-to-drive` | Batch upload to Drive |
| GET | `/api/shorts-reels/videos/upload-status` | Get upload statistics |

---

## Environment Variables

```env
# Backend connection
BACKEND_URL=http://localhost:8000
PORT=8001

# Browser automation
SCRAPER_ENGINE=nodriver|playwright  (default: nodriver)
SCRAPER_HEADLESS=true|false         (default: true)
SCRAPER_PROXY=http://user:pass@host:port

# Google Drive (optional)
GOOGLE_DRIVE_ENABLED=true|false
GOOGLE_DRIVE_FOLDER_ID=<your-drive-folder-id>

# Asset generation
ASSET_GENERATION_ENABLED=true|false
USE_FFMPEG=true|false

# Logging
LOG_LEVEL=INFO|DEBUG|ERROR
```

---

## Database Integration

Service tự động sync với backend MongoDB:
- **Videos collection**: metadata + download/upload status
- **Upload status fields**:
  - `downloadStatus`: pending | downloading | done | failed
  - `uploadStatus`: pending | done | failed
  - `driveWebLink`: link to Google Drive file (sau upload)
  - `localPath`: path to downloaded file

---

## Troubleshooting

### Service không connect được backend
```bash
# Kiểm tra backend running
curl http://localhost:8000/api/shorts-reels/stats/overview

# Nếu lỗi, update BACKEND_URL trong .env
```

### Browser automation lỗi
```bash
# Cài lại browser
playwright install chromium

# Hoặc dùng proxy
# SCRAPER_PROXY=http://proxy:port
```

### Upload failed
- Kiểm tra Google OAuth token hợp lệ
- Kiểm tra folder permission trên Drive
- Xem logs: `LOG_LEVEL=DEBUG`

---

## Monitoring

### Check service status
```bash
curl http://localhost:8001/api/shorts-reels/status
```

### View current queue
```bash
curl http://localhost:8001/api/shorts-reels/discover/progress
```

### Upload progress
```bash
curl http://localhost:8000/api/shorts-reels/videos/upload-status
```

---

## Related Services

- **Backend (Node.js)**: `cd ../backend && npm run dev`
- **Frontend (React)**: `cd ../frontend && npm run dev`
- **Database**: MongoDB (local hoặc cloud)

---

## Notes

- Service tự động restart nếu crash
- Downloads lưu tại `backend/downloads/`
- Logs tại console hoặc file (nếu configured)
- Upload async - không block discovery/download
