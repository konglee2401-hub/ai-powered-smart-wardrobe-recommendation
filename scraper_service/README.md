# Shorts/Reels Python Automation Service

Service Python (FastAPI) cho phần discover/scan/download queue/scraping YouTube Shorts + Facebook Reels.

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

## API
Base URL: `http://localhost:8001/api/shorts-reels`

Backend Node proxy sẵn từ `/api/shorts-reels` -> service này.
