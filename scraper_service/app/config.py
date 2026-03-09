import os
from dotenv import load_dotenv

_ = load_dotenv()

PORT = int(os.getenv('PORT', '8001'))
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/smart-wardrobe')
TREND_DB_NAME = os.getenv('TREND_DB_NAME', 'smart-wardrobe')
DOWNLOAD_ROOT = os.getenv('DOWNLOAD_ROOT', 'downloads')
ENABLE_SCHEDULER = os.getenv('ENABLE_SCHEDULER', 'true').lower() == 'true'

# Anti-detect configuration
SCRAPER_ENGINE = os.getenv('SCRAPER_ENGINE', 'playwright').lower()  # playwright (nodriver available as fallback)
# Luôn chạy headless (không bật UI browser)
SCRAPER_HEADLESS = True
SCRAPER_LOCALE = os.getenv('SCRAPER_LOCALE', 'vi-VN')
SCRAPER_TIMEZONE = os.getenv('SCRAPER_TIMEZONE', 'Asia/Ho_Chi_Minh')
SCRAPER_PROXY = os.getenv('SCRAPER_PROXY', '').strip()  # e.g. http://user:pass@host:port
SCRAPER_PROXIES = [x.strip() for x in os.getenv('SCRAPER_PROXIES', '').split(',') if x.strip()]
PLAYBOARD_COOKIES_FILE = os.getenv('PLAYBOARD_COOKIES_FILE', '').strip()


# Playboard login credentials
PLAYBOARD_USER_EMAIL = os.getenv('PLAYBOARD_USER_EMAIL', '').strip()
PLAYBOARD_USER_PASSWORD = os.getenv('PLAYBOARD_USER_PASSWORD', '').strip()

# Startup pending download re-queue
AUTO_ENQUEUE_PENDING_ON_STARTUP = os.getenv('AUTO_ENQUEUE_PENDING_ON_STARTUP', 'true').lower() == 'true'
STARTUP_PENDING_ENQUEUE_LIMIT = int(os.getenv('STARTUP_PENDING_ENQUEUE_LIMIT', '300'))
