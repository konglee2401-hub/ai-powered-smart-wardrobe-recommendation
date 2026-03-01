import time
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from bson import ObjectId

from .config import ENABLE_SCHEDULER
from .db import ensure_indexes, channels, videos, logs
from .store import get_or_create_settings, update_settings, normalize
from .automation import discover_all, scan_all_channels, scan_single_channel, enqueue, queue_stats, start_worker
from .drive_service import drive_service

app = FastAPI(title='Shorts/Reels Python Automation Service')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

scheduler = AsyncIOScheduler()


@app.on_event('startup')
async def startup_event():
    ensure_indexes()
    get_or_create_settings()
    await start_worker()
    if ENABLE_SCHEDULER:
        await reload_scheduler()


async def reload_scheduler():
    scheduler.remove_all_jobs()
    s = get_or_create_settings()
    scheduler.add_job(discover_all, 'cron', **cron_to_args(s.get('cronTimes', {}).get('discover', '0 7 * * *')), id='discover')
    scheduler.add_job(scan_all_channels, 'cron', **cron_to_args(s.get('cronTimes', {}).get('scan', '30 8 * * *')), id='scan')
    if not scheduler.running:
        scheduler.start()


def cron_to_args(expr):
    parts = expr.split()
    if len(parts) != 5:
        parts = ['0', '7', '*', '*', '*']
    minute, hour, day, month, dow = parts
    return {'minute': minute, 'hour': hour, 'day': day, 'month': month, 'day_of_week': dow}


@app.get('/api/shorts-reels/stats/overview')
async def stats_overview():
    recent = [normalize(x) for x in videos.find().sort([('discoveredAt', -1)]).limit(10)]
    return {
        'channels': channels.count_documents({}),
        'videos': videos.count_documents({}),
        'pending': videos.count_documents({'downloadStatus': 'pending'}),
        'failed': videos.count_documents({'downloadStatus': 'failed'}),
        'done': videos.count_documents({'downloadStatus': 'done'}),
        'queue': queue_stats(),
        'recent': recent,
    }


@app.get('/api/shorts-reels/channels')
async def get_channels(page: int = 1, limit: int = 20, search: str = ''):
    query = {}
    if search:
        query = {'$or': [{'name': {'$regex': search, '$options': 'i'}}, {'channelId': {'$regex': search, '$options': 'i'}}]}
    cursor = channels.find(query).sort([('priority', -1), ('updatedAt', -1)]).skip((page - 1) * limit).limit(limit)
    items = [normalize(x) for x in cursor]
    total = channels.count_documents(query)
    return {'items': items, 'total': total, 'page': page, 'pages': (total + limit - 1) // limit}


@app.post('/api/shorts-reels/channels/{channel_id}/manual-scan')
async def manual_scan(channel_id: str):
    ch = channels.find_one({'_id': ObjectId(channel_id)})
    if not ch:
        raise HTTPException(status_code=404, detail='Channel not found')
    found = await scan_single_channel(ch)
    return {'success': True, 'itemsFound': found}


@app.get('/api/shorts-reels/videos')
async def get_videos(
    page: int = 1,
    limit: int = 20,
    platform: str | None = None,
    topic: str | None = None,
    status: str | None = None,
    minViews: int | None = None,
    from_date: str | None = Query(default=None, alias='from'),
    to: str | None = None,
):
    query = {}
    if platform:
        query['platform'] = platform
    if topic:
        query['topic'] = topic
    if status:
        query['downloadStatus'] = status
    if minViews is not None:
        query['views'] = {'$gte': minViews}
    if from_date or to:
        query['discoveredAt'] = {}
        if from_date:
            query['discoveredAt']['$gte'] = datetime.fromisoformat(from_date)
        if to:
            query['discoveredAt']['$lte'] = datetime.fromisoformat(to)

    cursor = videos.find(query).sort([('discoveredAt', -1)]).skip((page - 1) * limit).limit(limit)
    items = [normalize(x) for x in cursor]
    total = videos.count_documents(query)
    return {'items': items, 'total': total, 'page': page, 'pages': (total + limit - 1) // limit}


@app.post('/api/shorts-reels/videos/{video_id}/re-download')
async def redownload(video_id: str):
    v = videos.find_one({'_id': ObjectId(video_id)})
    if not v:
        raise HTTPException(status_code=404, detail='Video not found')
    videos.update_one({'_id': v['_id']}, {'$set': {'downloadStatus': 'pending', 'failReason': ''}})
    s = get_or_create_settings()
    high_priority_views = s.get('highPriorityViews', 1_000_000)
    await enqueue(str(v['_id']), 1 if v.get('views', 0) > high_priority_views else 5)
    return {'success': True}


@app.get('/api/shorts-reels/logs')
async def get_logs(jobType: str | None = None, status: str | None = None, from_date: str | None = Query(default=None, alias='from'), to: str | None = None):
    query = {}
    if jobType:
        query['jobType'] = jobType
    if status:
        query['status'] = status
    if from_date or to:
        query['ranAt'] = {}
        if from_date:
            query['ranAt']['$gte'] = datetime.fromisoformat(from_date)
        if to:
            query['ranAt']['$lte'] = datetime.fromisoformat(to)

    items = [normalize(x) for x in logs.find(query).sort([('ranAt', -1)]).limit(200)]
    return {'items': items}


@app.get('/api/shorts-reels/settings')
async def get_settings():
    return get_or_create_settings()


@app.post('/api/shorts-reels/settings')
async def save_settings(payload: dict):
    saved = update_settings(payload)
    if ENABLE_SCHEDULER:
        await reload_scheduler()
    return saved


@app.post('/api/shorts-reels/jobs/trigger')
async def trigger_job(type: str = Query(...)):
    if type == 'discover':
        return await discover_all()
    if type == 'scan':
        return await scan_all_channels()
    raise HTTPException(status_code=400, detail='Invalid type. Use discover or scan')


# Google Drive endpoints (Python side)
@app.get('/api/shorts-reels/drive/auth')
async def drive_auth():
    return drive_service.authenticate()


@app.post('/api/shorts-reels/drive/init-folders')
async def drive_init_folders():
    yt = drive_service.ensure_downloaded_platform_folder('youtube')
    reels = drive_service.ensure_downloaded_platform_folder('facebook')
    tiktok = drive_service.ensure_downloaded_platform_folder('tiktok')
    return {'success': True, 'folders': {'youtube': yt, 'reels': reels, 'tiktok': tiktok}}


@app.get('/api/shorts-reels/drive/folders/map')
async def drive_folder_map():
    return {'success': True, 'folders': drive_service.get_folder_map()}


@app.get('/api/shorts-reels/drive/folders')
async def drive_list_folders(parentId: str = 'root'):
    return {'success': True, 'folders': drive_service.list_folders(parentId)}


@app.get('/api/shorts-reels/drive/folders/{folder_id}/files')
async def drive_list_files(folder_id: str, type: str | None = None):
    return {'success': True, 'files': drive_service.list_files(folder_id, type)}


@app.get('/api/shorts-reels/drive/browse/{folder_id}')
async def drive_browse(folder_id: str):
    return {'success': True, **drive_service.browse(folder_id)}


@app.post('/api/shorts-reels/drive/files/{file_id}/public')
async def drive_public(file_id: str):
    return {'success': True, 'permission': drive_service.make_public(file_id)}


@app.delete('/api/shorts-reels/drive/files/{file_id}')
async def drive_delete(file_id: str):
    return drive_service.delete_file(file_id)


@app.post('/api/shorts-reels/drive/upload-video/{video_id}')
async def drive_upload_video(video_id: str):
    v = videos.find_one({'_id': ObjectId(video_id)})
    if not v:
        raise HTTPException(status_code=404, detail='Video not found')
    if not v.get('localPath'):
        raise HTTPException(status_code=400, detail='Video has no localPath yet')

    result = drive_service.upload_downloaded_video(
        file_path=v['localPath'],
        platform=v.get('platform', 'youtube'),
        metadata={'videoId': v.get('videoId', ''), 'topic': v.get('topic', ''), 'sourceUrl': v.get('url', '')},
    )
    if result.get('success'):
        f = result.get('file', {})
        videos.update_one({'_id': v['_id']}, {'$set': {'driveFileId': f.get('id'), 'driveWebViewLink': f.get('webViewLink'), 'driveFolderId': result.get('folderId')}})
    return result


@app.get('/healthz')
async def healthz():
    return {'ok': True, 'time': time.time()}
