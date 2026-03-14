import os
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[1] / '.env'
_ = load_dotenv(dotenv_path=ENV_PATH)

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

# Pexels scraping config
PEXELS_START_URL = os.getenv('PEXELS_START_URL', 'https://www.pexels.com/vi-vn/video/').strip()
PEXELS_MAX_ITEMS = int(os.getenv('PEXELS_MAX_ITEMS', '100') or 100)
PEXELS_SCROLL_TIMES = int(os.getenv('PEXELS_SCROLL_TIMES', '6') or 6)
PEXELS_DRIVE_FOLDER_ID = os.getenv('PEXELS_DRIVE_FOLDER_ID', '17szLdP2uhj4Qco4FQXIcoZWTpaHI43zC').strip()

# Kuaishou scraping config
KUAISHOU_START_URL = os.getenv('KUAISHOU_START_URL', 'https://www.kuaishou.com/brilliant').strip()
KUAISHOU_MAX_ITEMS = int(os.getenv('KUAISHOU_MAX_ITEMS', '120') or 120)
KUAISHOU_SCROLL_TIMES = int(os.getenv('KUAISHOU_SCROLL_TIMES', '4') or 4)
KUAISHOU_STORAGE_STATE = os.getenv('KUAISHOU_STORAGE_STATE', '').strip()

# Voiceover pipeline output
VOICEOVER_OUTPUT_ROOT = os.getenv('VOICEOVER_OUTPUT_ROOT', 'data/voiceover').strip()

# Startup pending download re-queue
AUTO_ENQUEUE_PENDING_ON_STARTUP = os.getenv('AUTO_ENQUEUE_PENDING_ON_STARTUP', 'true').lower() == 'true'
STARTUP_PENDING_ENQUEUE_LIMIT = int(os.getenv('STARTUP_PENDING_ENQUEUE_LIMIT', '300'))
