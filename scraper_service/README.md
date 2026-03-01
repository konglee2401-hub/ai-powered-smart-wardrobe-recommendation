# Shorts/Reels Python Automation Service

Service Python (FastAPI) cho phần discover/scan/download queue/scraping YouTube Shorts + Facebook Reels.

## Anti-detect strategy (updated)
- Ưu tiên `nodriver` để giảm khả năng bị detect automation.
- Fallback tự động sang Playwright nếu `nodriver` unavailable/lỗi runtime.
- Áp dụng thêm stealth knobs: random UA, viewport jitter, webdriver override, timezone/locale, optional proxy.

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

## API
Base URL: `http://localhost:8001/api/shorts-reels`

Backend Node proxy sẵn từ `/api/shorts-reels` -> service này.
