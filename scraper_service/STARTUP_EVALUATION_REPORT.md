# Scraper Service - Startup Evaluation & Data Scraping Report

**Generated:** March 9, 2026  
**Service Status:** ✅ Running (Port 8001)  
**Service Type:** FastAPI-based Shorts/Reels Automation Service  
**Environment:** Windows | Python 3.12.9 | Uvicorn

---

## 📊 EXECUTIVE SUMMARY

The `scraper_service` is a **FastAPI-based automation service** that discovers, downloads, and manages YouTube Shorts and Facebook Reels videos. On startup, it:

1. **Initializes database connections** to MongoDB (smart-wardrobe)
2. **Cleans invalid data** (1 corrupted YouTube record removed on this startup)
3. **Re-queues pending videos** (up to 300 videos sorted by view count)
4. **Starts background workers** to process download queue
5. **Configures automated schedulers** for periodic discovery and channel scanning
6. **Enables anti-detection measures** to avoid platform blocking

### **Current Database Status:**
- **169 Channels** actively monitored
- **1,515 Videos** indexed
  - 434 ✅ Successfully downloaded
  - 852 ⏳ Pending download
  - 224 ❌ Failed (requires retry)
  - 1 🔄 Currently processing
- **298 Videos** queued for immediate download

---

## 🔍 STARTUP INITIALIZATION PROCESS

### **Phase 1: Database Verification (On Startup)**
```
[startup] cleaned invalid youtube records: {'deleted': 1, 'matched': 1}
```

**What Happens:**
- Service queries MongoDB for corrupt/invalid YouTube records
- Removes test videos and malformed video IDs
- Uses regex validation: `^[A-Za-z0-9_-]{11}$` for YouTube video IDs
- Matches and deletes entries with:
  - Invalid video ID length (not 11 chars)
  - Test URLs (containing 'test_video')
  - Test titles (containing 'test' keyword)

### **Phase 2: Pending Videos Re-queue**
```
[startup] queued pending videos: {number_queued}
```

**What Happens:**
- Scans MongoDB for videos with `downloadStatus: 'pending'`
- Sorts by views (highest first) and discovery date
- Limits queue to `STARTUP_PENDING_ENQUEUE_LIMIT: 300`
- Assigns priority:
  - **Priority 1** = Videos > 1M views (high ROI)
  - **Priority 5** = Videos < 1M views (standard)
- Places videos into async download queue for processing

### **Phase 3: Scheduler Configuration**
```
Service schedules automated jobs based on cronTimes
```

**Configured Scheduler Jobs:**
| Job | Schedule | Purpose |
|-----|----------|---------|
| `discover` | 07:00 UTC daily | Run discovery across configured sources |
| `scan` | 08:30 UTC daily | Scan all active channels for new videos |

---

## 📡 DATA DISCOVERY SOURCES

### **1. PLAYBOARD (YouTube Shorts) - PRIMARY SOURCE**
**Status:** ✅ **ENABLED**

**Configuration Profiles:**
| Priority | Category | Country | Period | Active |
|----------|----------|---------|--------|--------|
| 10 | All | Worldwide | Weekly | ✅ |
| 8 | Howto & Style | Viet Nam | Weekly | ✅ |
| 7 | Comedy | Viet Nam | Weekly | ✅ |
| 6 | Entertainment | Worldwide | Weekly | ✅ |

**How It Works:**
- Connects to Playboard API (trending videos platform)
- Fetches most-viewed YouTube Shorts per category/region
- Filters videos with minimum views (default: 100,000)
- Creates discovery records with source tag: `playboard-{category}-{region}-{period}`

**Data Collected:**
- Video metadata (title, description, URL)
- View counts and engagement metrics
- Channel information (auto-discovers YouTube channels)
- Thumbnail URLs

---

### **2. DIRECT YOUTUBE DISCOVERY - SECONDARY SOURCE**
**Status:** ✅ **ENABLED**

**Topics Searched:**
| Topic | Keywords |
|-------|----------|
| `funny` | funny, comedy, hài, meme, joke, lol, laugh, viral, shorts |
| `hai` | funny, comedy, hài, meme, cười, hài hước, truyện cười |
| `dance` | dance, nhảy, vũ đạo, choreo, kpop, viral dance |
| `sexy dance` | sexy dance, hot dance, tiktok dance, gợi cảm |
| `cooking` | cook, recipe, nấu, món, bếp, food, chef, kitchen |

**How It Works:**
- Crawls YouTube using Playwright/Nodriver browser automation
- Searches for each topic in the above list
- Returns trending Shorts matching keywords
- Filters by minimum view threshold (100K)

---

### **3. DAILYHAHA (Comedy Video Platform) - OPTIONAL**
**Status:** ✅ **ENABLED**

**Home URL:** `https://www.dailyhaha.com/videos/`

**How It Works:**
- Auto-discovers trending humor videos
- Scrapes available title, views, and metadata
- Matches videos against configured topics
- Runs same topic search as YouTube

---

### **4. DOUYIN (TikTok China) - OPTIONAL**
**Status:** ❌ **DISABLED** (can be activated)

**Base URL:** `https://www.douyin.com/jingxuan/search/{keyword}`

**Supported Keywords:**
| English | Chinese |
|---------|---------|
| funny | 幽默 |
| hai | 搞笑 |
| dance | 舞蹈 |
| sexy dance | 热舞 |
| cooking | 美食 |

**How It Works:**
- Would search Douyin for trending short videos
- Currently disabled in discover sources config
- Can be enabled for Chinese market content

---

## 🎯 MONITORED CHANNELS

**Total Channels:** 169 active YouTube channels

**Sample Channels (by priority):**
```
1. Echoedtis (UC2m_CaDLe26ILODhiVb7fYg) - 23 videos
2. Sita gurjar official (UCum8FYW0kgtKnDVxw96-FJg) - 23 videos
3. Cantinho Da Tia Debora (UCgOuOPfGuptG8y3WpShINWA) - 25 videos
4. Koko & Golu (UCv7hVBHwEffL7BaJJdinokg) - 2 videos
5. ajmal786 (UCnksjxAuSn8UzosZ8Xjw5Zw) - 23 videos
... and 164 more channels
```

**Scanning Behavior:**
- Scans top 100 active channels daily at 08:30 UTC
- Fetches all Shorts from each channel
- Extracts video URLs and metadata
- Creates new video records if not already indexed

---

## 🚀 DOWNLOAD QUEUE MANAGEMENT

### **Queue Statistics:**
```
Queued: 298 videos
Running: 1 video (being downloaded now)
Started: true (worker active)
Engine: nodriver (primary browser automation)
```

### **Download Processing:**
1. **Queue Priority:** Videos sorted by view count (high ROI first)
2. **Concurrent Downloads:** Max 3 simultaneous (configurable)
3. **Download Tool:** `yt-dlp` (robust video downloader)
4. **Timeout:** 180 seconds per video
5. **Storage:** Videos saved to `backend/downloads/{platform}/{topic}/{date}/`

### **Download Status Tracking:**
- **Pending (852):** Awaiting download assignment
- **Done (434):** Successfully downloaded, ready for processing
- **Failed (224):** Download failed (network, format, deleted video)
- **Queued (298):** Assigned to download queue

---

## 🌐 ANTI-DETECTION MEASURES

**Configured Protections:**

| Setting | Value | Purpose |
|---------|-------|---------|
| **Primary Engine** | `nodriver` | Undetected Chrome automation (avoids bot detection) |
| **Fallback Engine** | `playwright` | Alternative if nodriver fails |
| **Headless Mode** | ✅ Always | No visible browser window |
| **Locale** | `vi-VN` | Vietnamese locale (matches regional targets) |
| **Timezone** | `Asia/Ho_Chi_Minh` | Vietnamese timezone |
| **User Agent** | Random rotation | 2x user agents rotated per request |
| **Request Delay** | 12-17 seconds | Random delay between Playboard scrapes |
| **Proxy Support** | Optional | Configurable proxy pool for rotation |

---

## ⚙️ SERVICE CONFIGURATION

### **Core Settings:**
```
IsEnabled: true (service is active)
Max Concurrent Downloads: 3
Min Views Filter: 100,000 (minimum views to index)
Discover Schedule: 07:00 UTC daily
Scan Schedule: 08:30 UTC daily
Auto Re-queue Pending: true
Pending Re-queue Limit: 300 videos max
```

### **Supported Keywords (for topic matching):**
```json
{
  "hai": ["hài", "funny", "comedy"],
  "dance": ["dance", "nhảy", "choreography"],
  "cooking": ["cooking", "nấu ăn", "recipe"]
}
```

---

## 📋 API ENDPOINTS AVAILABLE

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **GET** | `/api/shorts-reels/status` | Health check |
| **GET** | `/api/shorts-reels/stats/overview` | Overview statistics |
| **GET** | `/api/shorts-reels/channels` | List monitored channels |
| **POST** | `/api/shorts-reels/channels/{id}/manual-scan` | Manually scan a channel |
| **GET** | `/api/shorts-reels/videos` | List videos (filterable) |
| **POST** | `/api/shorts-reels/videos/{id}/upload-to-drive` | Upload video to Google Drive |
| **POST** | `/api/shorts-reels/videos/upload-to-drive` | Batch upload videos |
| **GET** | `/api/shorts-reels/videos/upload-status` | Get upload statistics |

---

## 📊 CURRENT DATABASE STATISTICS

### **Video Platform Distribution:**
```
YouTube: 1,515 videos
├─ Downloaded (Done): 434
├─ Pending: 851
└─ Failed: 224
```

### **Recent Sample Videos (Last 10):**
```
1. pOZUQeMnwjQ - 100,001 views - Pending
2. xWr16igLImE - 100,001 views - Pending
3. Orh4VYNwics - 100,001 views - Pending
4. 2tPMlmU-4MA - 100,001 views - Pending
5. EsgWK4UXEWk - 100,001 views - Pending
... (all from Playboard discovery)
```

### **Topics Distribution:**
```
Primary Topic: playboard-All-Worldwide-weekly (latest discovered)
Topic-based Discovery: funny, hai, dance, sexy dance, cooking
```

---

## 🔧 TROUBLESHOOTING & LOGS

### **Startup Logs:**
```
[startup] cleaned invalid youtube records: {'deleted': 1, 'matched': 1}
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8001
```

### **Health Check:**
**Endpoint:** GET `/api/shorts-reels/status`

```http
Status: 200 OK
Response: Service is operational
```

---

## ✅ RECOMMENDATIONS

### **1. Performance Optimization:**
- Monitor queue size regularly (currently 298)
- Increase `maxConcurrentDownload` to 5-6 if bandwidth allows
- Consider adding retry logic for failed downloads (224 videos)

### **2. Data Quality:**
- Implement minimum engagement (comments/shares) filters
- Add duplicate detection (same video from multiple sources)
- Validate channel metadata regularly

### **3. Discover Sources Balance:**
- **Current:** Playboard + YouTube + DailyHaha (3 sources)
- **Recommendation:** Enable Douyin for broader Asian market coverage
- **Future:** Add TikTok direct integration if API access available

### **4. Monitoring:**
- Set up alerting for failed videos > 200
- Track discovery rate (videos/hour)
- Monitor queue processing speed

### **5. Storage Management:**
- Videos stored at: `backend/downloads/{platform}/{topic}/{date}/`
- Implement cleanup for old videos (older than 30 days)
- Monitor disk space usage

---

## 📈 NEXT AUTOMATED JOBS

**Next Discovery Run:** 07:00 UTC (Next scheduled time)  
**Next Channel Scan:** 08:30 UTC (Next scheduled time)

Both jobs will:
1. Execute the configured Playboard configs
2. Search all enabled topics
3. Scan all 169 active channels
4. Add new videos to pending queue
5. Re-queue highest-view videos

---

## 🎬 SERVICE HEALTH

| Component | Status | Details |
|-----------|--------|---------|
| **API Server** | ✅ Running | Uvicorn on 0.0.0.0:8001 |
| **MongoDB** | ✅ Connected | 1,515 videos indexed |
| **Download Queue** | ✅ Running | 1 processing, 298 queued |
| **Browser Automation** | ✅ Ready | Nodriver active |
| **Scheduler** | ✅ Active | Daily discovery & scanning |
| **Data Cleanup** | ✅ Completed | 1 invalid record removed |

**Service Uptime:** Fresh startup (all systems initialized)  
**Last Cleanup:** This session  
**Ready for Production:** ✅ Yes

---

**End of Report**
