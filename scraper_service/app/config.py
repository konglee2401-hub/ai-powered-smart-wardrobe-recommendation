import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv('PORT', '8001'))
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/smart_wardrobe')
TREND_DB_NAME = os.getenv('TREND_DB_NAME', 'smart_wardrobe')
DOWNLOAD_ROOT = os.getenv('DOWNLOAD_ROOT', 'downloads')
ENABLE_SCHEDULER = os.getenv('ENABLE_SCHEDULER', 'true').lower() == 'true'

# Anti-detect configuration
SCRAPER_ENGINE = os.getenv('SCRAPER_ENGINE', 'nodriver').lower()  # nodriver | playwright
SCRAPER_HEADLESS = os.getenv('SCRAPER_HEADLESS', 'true').lower() == 'true'
SCRAPER_LOCALE = os.getenv('SCRAPER_LOCALE', 'vi-VN')
SCRAPER_TIMEZONE = os.getenv('SCRAPER_TIMEZONE', 'Asia/Ho_Chi_Minh')
SCRAPER_PROXY = os.getenv('SCRAPER_PROXY', '').strip()  # e.g. http://user:pass@host:port
