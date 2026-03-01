import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv('PORT', '8001'))
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/smart_wardrobe')
TREND_DB_NAME = os.getenv('TREND_DB_NAME', 'smart_wardrobe')
DOWNLOAD_ROOT = os.getenv('DOWNLOAD_ROOT', 'downloads')
ENABLE_SCHEDULER = os.getenv('ENABLE_SCHEDULER', 'true').lower() == 'true'
