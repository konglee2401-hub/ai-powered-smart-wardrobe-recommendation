# Scraper Service - Quick Start Summary

## 🚀 Quick Start Video Scraping Guide

### Service is Running ✅
```
URL: http://localhost:8001
Status: API responding
Workers: Active and downloading
```

### What Gets Scraped On Each Startup?

1. **Invalid Data Cleanup** 
   - Removes corrupted YouTube records
   - Validates video IDs

2. **Re-queue Pending Videos** (up to 300)
   - Sorted by popularity (highest views first)
   - Downloads highest value content first

3. **Start Background Workers**
   - Download queue processes videos
   - Max 3 concurrent downloads
   - Uses yt-dlp for reliable downloading

### Automated Jobs (Daily)

| Time | Job | What It Does |
|------|-----|--------------|
| 07:00 UTC | **Discover** | Finds new videos from all sources |
| 08:30 UTC | **Scan Channels** | Checks all 169 channels for new uploads |

### Where Videos Come From

1. **Playboard** (YouTube Shorts index)
   - 4 priority configs (All/Comedy/Entertainment + Vietnam targeting)
   - Trending weekly videos

2. **YouTube Search** (Direct API)
   - Topics: funny, hai, dance, sexy dance, cooking
   - Minimum 100K views

3. **DailyHaha** (Comedy videos)
   - Trending humor content

4. **Douyin** (disabled - can enable for China)
   - TikTok equivalent content

### Database Overview

```
Channels: 169 active
Total Videos: 1,515
├─ Downloaded: 434 ✅
├─ Pending: 852 ⏳  
├─ Failed: 224 ❌
└─ Queued Now: 298
```

### View Current Status

```bash
# Overview statistics
curl http://localhost:8001/api/shorts-reels/stats/overview

# List channels
curl http://localhost:8001/api/shorts-reels/channels?limit=10

# List videos by status
curl http://localhost:8001/api/shorts-reels/videos?status=pending&limit=20

# Manually scan a channel (by ID from channels list)
curl -X POST http://localhost:8001/api/shorts-reels/channels/{channel_id}/manual-scan
```

### Download Mechanics

```
Videos are stored at:
backend/downloads/{platform}/{topic}/{date}/{videoId}.mp4

Example:
backend/downloads/youtube/playboard-All-Worldwide-weekly/2026-03-09/pOZUQeMnwjQ.mp4
```

### Key Filters

- **Minimum Views:** 100,000 (filters out low-engagement content)
- **Priority System:** Videos > 1M views = Priority 1 (download first)
- **Auto-re-queue:** Up to 300 pending videos on startup

### Anti-Detection

- **Browser:** Nodriver (undetected automation)
- **Locale:** Vietnamese (matching regional targets)
- **User Agent:** Random rotation
- **Delays:** 12-17 second intervals between requests

### Failed Videos (224)

Investigate with:
```bash
curl http://localhost:8001/api/shorts-reels/videos?status=failed&limit=20
```

Possible issues:
- Video was deleted
- Age-restricted content
- Regional blocking
- Network timeout

### Next Actions

1. **Monitor Queue:** Check if downloadqueue is progressing
   ```bash
   curl http://localhost:8001/api/shorts-reels/stats/overview | grep queue
   ```

2. **Check Failed Videos:** Review what failed and why
   ```bash
   curl "http://localhost:8001/api/shorts-reels/videos?status=failed"
   ```

3. **Manual Channel Scan:** If you want to force scan a channel
   ```bash
   POST http://localhost:8001/api/shorts-reels/channels/{id}/manual-scan
   ```

4. **Retry Failed:** Implement retry logic for 224 failed videos

---

## 📝 Configuration File

Edit `.env` to change:
```env
PORT=8001                                    # API port
MONGO_URI=mongodb://localhost:27017/...      # Database
SCRAPER_ENGINE=nodriver                      # Browser type
SCRAPER_HEADLESS=true                        # No UI browser
SCRAPER_LOCALE=vi-VN                         # Language/region
ENABLE_SCHEDULER=true                        # Auto jobs enabled
AUTO_ENQUEUE_PENDING_ON_STARTUP=true          # Re-queue on start
STARTUP_PENDING_ENQUEUE_LIMIT=300             # Max videos to queue
```

---

**Status:** Service is ready to continuously discover and download Shorts/Reels automatically!
