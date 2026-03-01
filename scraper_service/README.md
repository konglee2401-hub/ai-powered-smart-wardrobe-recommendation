# Shorts/Reels Python Automation Service

Service Python (FastAPI) cho phần discover/scan/download queue/scraping YouTube Shorts + Facebook Reels.

## Anti-detect strategy (updated)
- Ưu tiên `nodriver` để giảm khả năng bị detect automation.
- Fallback tự động sang Playwright nếu `nodriver` unavailable/lỗi runtime.
- Áp dụng thêm stealth knobs: random UA, viewport jitter, webdriver override, timezone/locale, optional proxy.

## Google Drive integration
- Sau khi tải video local thành công, service tự động upload lên Drive:
  - Youtube Shorts -> `Affiliate AI/Videos/Downloaded/Youtube`
  - Facebook Reels -> `Affiliate AI/Videos/Downloaded/Reels`
- Có thêm API để browse folder, list files, make public, delete file, upload lại theo `videoId`.

## Run
```bash
cd scraper_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env
python run.py
```

## Config
- `SCRAPER_ENGINE=nodriver|playwright` (default: `nodriver`)
- `SCRAPER_HEADLESS=true|false`
- `SCRAPER_PROXY=http://user:pass@host:port`
- `SCRAPER_LOCALE`, `SCRAPER_TIMEZONE`
- `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`
- `DRIVE_TOKEN_PATH`, `DRIVE_FOLDER_STRUCTURE_PATH`

## API
Base URL: `http://localhost:8001/api/shorts-reels`

Main groups:
- Trend automation: stats/channels/videos/logs/settings/jobs/trigger
- Drive tools:
  - `GET /drive/auth`
  - `POST /drive/init-folders`
  - `GET /drive/folders/map`
  - `GET /drive/folders`
  - `GET /drive/folders/{id}/files`
  - `GET /drive/browse/{id}`
  - `POST /drive/files/{id}/public`
  - `DELETE /drive/files/{id}`
  - `POST /drive/upload-video/{videoId}`

Backend Node proxy sẵn từ `/api/shorts-reels` -> service này.
