from bson import ObjectId
from pymongo import ReturnDocument
from .db import channels, videos, logs, settings
from .utils import now_utc


def oid(v):
    return ObjectId(v) if isinstance(v, str) else v


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
        'minChannelFollowers': 100000,
        'minChannelTotalVideos': 10,
        'highPriorityViews': 1000000,
        'proxyList': [],
        'telegramBotToken': '',
        'isEnabled': True,
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


def upsert_channel(platform, channel_id, name, topic, followers=0):
    doc = channels.find_one_and_update(
        {'platform': platform, 'channelId': channel_id},
        {
            '$set': {
                'platform': platform,
                'channelId': channel_id,
                'name': name,
                'isActive': True,
                'updatedAt': now_utc(),
                'metadata.followers': followers,
            },
            '$setOnInsert': {'createdAt': now_utc(), 'priority': 5, 'totalVideos': 0, 'topic': []},
            '$addToSet': {'topic': topic},
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return normalize(doc)


def upsert_video(payload):
    doc = videos.find_one_and_update(
      { 'platform': payload['platform'], 'videoId': payload['videoId'] },
      {
        '$set': {
            'title': payload.get('title', ''),
            'views': payload.get('views', 0),
            'url': payload.get('url', ''),
            'topic': payload.get('topic'),
            'thumbnail': payload.get('thumbnail', ''),
            'channel': oid(payload['channelId']),
            'updatedAt': now_utc(),
            'uploadedAt': payload.get('uploadedAt'),
        },
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


def get_channel(channel_id):
    doc = channels.find_one({'_id': oid(channel_id)})
    return normalize(doc)


def log_job(job_type, status, **kwargs):
    logs.insert_one({
        'jobType': job_type,
        'status': status,
        'topic': kwargs.get('topic'),
        'platform': kwargs.get('platform'),
        'itemsFound': kwargs.get('itemsFound', 0),
        'itemsDownloaded': kwargs.get('itemsDownloaded', 0),
        'duration': kwargs.get('duration', 0),
        'error': kwargs.get('error', ''),
        'ranAt': now_utc(),
        'metadata': kwargs.get('metadata', {}),
        'createdAt': now_utc(),
        'updatedAt': now_utc(),
    })


def normalize(doc):
    if not doc:
        return None
    out = dict(doc)
    if '_id' in out:
        out['_id'] = str(out['_id'])
    if 'channel' in out and out['channel'] is not None:
        out['channel'] = str(out['channel'])
    return out
