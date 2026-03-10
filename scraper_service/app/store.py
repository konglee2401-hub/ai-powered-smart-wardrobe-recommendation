from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ReturnDocument
from .db import channels, videos, logs, settings
from .utils import now_utc


def oid(v):
    return ObjectId(v) if isinstance(v, str) else v


# Default playboard configs matching the backend
DEFAULT_PLAYBOARD_CONFIGS = [
    {"dimension": "most-viewed", "category": "All", "country": "Worldwide", "period": "weekly", "isActive": True, "priority": 10},
    {"dimension": "most-viewed", "category": "Howto & Style", "country": "Viet Nam", "period": "weekly", "isActive": True, "priority": 8},
    {"dimension": "most-viewed", "category": "Comedy", "country": "Viet Nam", "period": "weekly", "isActive": True, "priority": 7},
    {"dimension": "most-viewed", "category": "Entertainment", "country": "Worldwide", "period": "weekly", "isActive": True, "priority": 6},
]


def get_or_create_settings():
    defaults = {
        'key': 'default',
        'keywords': {
            'hai': ['hài', 'funny', 'comedy'],
            'dance': ['dance', 'nhảy', 'choreography'],
            'cooking': ['cooking', 'nấu ăn', 'recipe'],
        },
        'cronTimes': {'discover': '0 7 * * *', 'scan': '30 8 * * *'},
        'maxConcurrentDownload': 3,
        'minViewsFilter': 100000,
        'proxyList': [],
        'telegramBotToken': '',
        'isEnabled': True,
        'discoverSources': {
            'playboard': True,
            'youtube': True,
            'dailyhaha': True,
            'douyin': False,
        },
        'playboardConfigs': DEFAULT_PLAYBOARD_CONFIGS,
    }
    doc = settings.find_one_and_update(
        {'key': 'default'},
        {'$setOnInsert': defaults},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return normalize(doc)


def update_settings(payload):
    doc = settings.find_one_and_update(
        {'key': 'default'},
        {'$set': payload, '$setOnInsert': {'key': 'default'}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return normalize(doc)


def upsert_channel(platform, channel_id, name, topic):
    # First upsert without topics field
    update_doc = {
        '$set': {
            'platform': platform,
            'channelId': channel_id,
            'name': name,
            'isActive': True,
            'updatedAt': now_utc(),
        },
        '$setOnInsert': {'createdAt': now_utc(), 'priority': 5, 'totalVideos': 0, 'topics': []},
    }
    
    doc = channels.find_one_and_update(
        {'platform': platform, 'channelId': channel_id},
        update_doc,
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    
    # Separately add topic if provided (avoids MongoDB operator conflict)
    if topic:
        doc = channels.find_one_and_update(
            {'_id': doc['_id']},
            {'$addToSet': {'topics': topic}},
            return_document=ReturnDocument.AFTER,
        )
    
    return normalize(doc)


def upsert_video(payload):
    thumbnail_value = payload.get('thumbnail', '') or ''
    if not thumbnail_value and payload.get('platform') == 'youtube' and payload.get('videoId'):
        thumbnail_value = f'https://img.youtube.com/vi/{payload["videoId"]}/hqdefault.jpg'

    set_doc = {
        'title': payload.get('title', ''),
        'views': payload.get('views', 0),
        'url': payload.get('url', ''),
        'topics': payload.get('topic'),
        'channel': oid(payload['channelId']),
        'updatedAt': now_utc(),
    }
    if thumbnail_value:
        set_doc['thumbnail'] = thumbnail_value

    doc = videos.find_one_and_update(
        {'platform': payload['platform'], 'videoId': payload['videoId']},
        {
            '$set': set_doc,
            '$setOnInsert': {
                'discoveredAt': now_utc(),
                'downloadStatus': 'pending',
                'createdAt': now_utc(),
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    channels.update_one({'_id': oid(payload['channelId'])}, {'$inc': {'totalVideos': 1}})
    return normalize(doc)


def log_job(job_type, status, **kwargs):
    base_keys = {'topic', 'platform', 'itemsFound', 'itemsDownloaded', 'duration', 'error'}
    extra = {k: v for k, v in kwargs.items() if k not in base_keys}

    logs.insert_one({
        'jobType': job_type,
        'status': status,
        'topic': kwargs.get('topic'),
        'platform': kwargs.get('platform'),
        'itemsFound': kwargs.get('itemsFound', 0),
        'itemsDownloaded': kwargs.get('itemsDownloaded', 0),
        'duration': kwargs.get('duration', 0),
        'error': kwargs.get('error', ''),
        'extra': extra,
        'ranAt': now_utc(),
        'createdAt': now_utc(),
        'updatedAt': now_utc(),
    })


def normalize(doc):
    if not doc:
        return None

    def serialize(value):
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, datetime):
            utc_value = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
            return utc_value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
        if isinstance(value, list):
            return [serialize(item) for item in value]
        if isinstance(value, dict):
            return {key: serialize(item) for key, item in value.items()}
        return value

    return serialize(dict(doc))
