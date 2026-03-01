import asyncio
import time
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from bson import ObjectId

from .config import PORT, ENABLE_SCHEDULER
from .db import ensure_indexes, channels, videos, logs
from .store import get_or_create_settings, update_settings, normalize
from .automation import discover_all, scan_all_channels, scan_single_channel, enqueue, queue_stats, start_worker

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
    cursor = channels.find(query).sort([('priority', -1), ('updatedAt', -1)]).skip((page-1)*limit).limit(limit)
    items = [normalize(x) for x in cursor]
    total = channels.count_documents(query)
    return {'items': items, 'total': total, 'page': page, 'pages': (total + limit - 1)//limit}


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

    cursor = videos.find(query).sort([('discoveredAt', -1)]).skip((page-1)*limit).limit(limit)
    items = [normalize(x) for x in cursor]
    total = videos.count_documents(query)
    return {'items': items, 'total': total, 'page': page, 'pages': (total + limit - 1)//limit}


@app.post('/api/shorts-reels/videos/{video_id}/re-download')
async def redownload(video_id: str):
    v = videos.find_one({'_id': ObjectId(video_id)})
    if not v:
        raise HTTPException(status_code=404, detail='Video not found')
    videos.update_one({'_id': v['_id']}, {'$set': {'downloadStatus': 'pending', 'failReason': ''}})
    await enqueue(str(v['_id']), 1 if v.get('views', 0) > 1_000_000 else 5)
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


@app.get('/healthz')
async def healthz():
    return {'ok': True, 'time': time.time()}
