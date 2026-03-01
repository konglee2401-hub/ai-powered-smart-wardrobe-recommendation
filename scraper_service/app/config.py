import os
from pathlib import Path
from dotenv import load_dotenv

# Load local env first, then fallback from backend/.env for shared secrets
load_dotenv()
project_root = Path(__file__).resolve().parents[2]
backend_env = project_root / 'backend' / '.env'
if backend_env.exists():
    load_dotenv(backend_env, override=False)

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

# Google Drive shared OAuth config
OAUTH_CLIENT_ID = os.getenv('OAUTH_CLIENT_ID', '')
OAUTH_CLIENT_SECRET = os.getenv('OAUTH_CLIENT_SECRET', '')
DRIVE_TOKEN_PATH = os.getenv('DRIVE_TOKEN_PATH', str(project_root / 'backend' / 'config' / 'drive-token.json'))
DRIVE_FOLDER_STRUCTURE_PATH = os.getenv('DRIVE_FOLDER_STRUCTURE_PATH', str(project_root / 'backend' / 'config' / 'drive-folder-structure.json'))
