from pymongo import MongoClient, ASCENDING, DESCENDING
from .config import MONGO_URI, TREND_DB_NAME

client = MongoClient(MONGO_URI)
db = client[TREND_DB_NAME]

channels = db['trendchannels']
videos = db['trendvideos']
logs = db['trendjoblogs']
settings = db['trendsettings']


def ensure_indexes():
    channels.create_index([('platform', ASCENDING), ('channelId', ASCENDING)], unique=True)
    channels.create_index([('isActive', ASCENDING), ('priority', DESCENDING)])

    videos.create_index([('platform', ASCENDING), ('videoId', ASCENDING)], unique=True)
    videos.create_index([('downloadStatus', ASCENDING), ('discoveredAt', DESCENDING)])
    videos.create_index([('topic', ASCENDING), ('downloadStatus', ASCENDING)])

    logs.create_index([('jobType', ASCENDING), ('ranAt', DESCENDING)])
    settings.create_index([('key', ASCENDING)], unique=True)
