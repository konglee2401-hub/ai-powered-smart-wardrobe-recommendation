import asyncio
import time
import random
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from bson import ObjectId

from .config import PORT, ENABLE_SCHEDULER
from .db import ensure_indexes, channels, videos, logs
from .store import get_or_create_settings, update_settings, normalize
from .automation import discover_all, discover_playboard, scan_all_channels, scan_single_channel, enqueue, queue_stats, start_worker

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
        query['topics'] = topic
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


@app.get('/api/shorts-reels/playboard/config-options')
async def get_playboard_config_options():
    """Get available options for Playboard config (dimensions, categories, countries, periods)"""
    return {
        'dimensions': ['most-viewed', 'trending', 'rising'],
        'categories': [
            'All',
            'Pets & Animal',
            'Music',
            'Gaming',
            'News & Politics',
            'People & Blogs',
            'Travel & Event',
            'Sports',
            'Auto & Vehicles',
            'Comedy',
            'Entertainment',
            'Film & Animation',
            'Howto & Style',
            'Education',
            'Science & Technology'
        ],
        'countries': [
            'Worldwide',
            'United States',
            'United Kingdom',
            'Viet Nam',
            'India',
            'Brazil',
            'Germany',
            'France',
            'Japan',
            'South Korea',
            'Mexico',
            'Canada',
            'Australia'
        ],
        'periods': ['weekly', 'monthly', 'yearly'],
        'sampleConfig': {
            'dimension': 'most-viewed',
            'category': 'Howto & Style',
            'country': 'Viet Nam',
            'period': 'weekly',
            'isActive': True,
            'priority': 10
        }
    }


@app.get('/api/shorts-reels/playboard/configs')
async def get_playboard_configs():
    """Get saved Playboard discovery configs from settings"""
    setting = get_or_create_settings()
    configs = setting.get('playboardConfigs', [])
    return {'configs': configs, 'total': len(configs)}


@app.post('/api/shorts-reels/playboard/configs')
async def save_playboard_config(config: dict):
    """Save new Playboard discovery config to settings"""
    if not config.get('dimension') or not config.get('category'):
        raise HTTPException(status_code=400, detail='dimension and category are required')
    
    setting = get_or_create_settings()
    configs = setting.get('playboardConfigs', [])
    
    # Add timestamp and ensure required fields
    config['createdAt'] = datetime.utcnow().isoformat()
    config['isActive'] = config.get('isActive', True)
    config['priority'] = config.get('priority', 5)
    
    configs.append(config)
    update_settings({'playboardConfigs': configs})
    
    return {'success': True, 'config': config, 'totalConfigs': len(configs)}


@app.delete('/api/shorts-reels/playboard/configs/{config_id}')
async def delete_playboard_config(config_id: int):
    """Delete Playboard discovery config by index"""
    setting = get_or_create_settings()
    configs = setting.get('playboardConfigs', [])
    
    if config_id < 0 or config_id >= len(configs):
        raise HTTPException(status_code=404, detail='Config not found')
    
    configs.pop(config_id)
    update_settings({'playboardConfigs': configs})
    
    return {'success': True, 'totalConfigs': len(configs)}


@app.post('/api/shorts-reels/playboard/configs/{config_id}')
async def update_playboard_config(config_id: int, updates: dict):
    """Update Playboard discovery config"""
    setting = get_or_create_settings()
    configs = setting.get('playboardConfigs', [])
    
    if config_id < 0 or config_id >= len(configs):
        raise HTTPException(status_code=404, detail='Config not found')
    
    configs[config_id].update(updates)
    configs[config_id]['updatedAt'] = datetime.utcnow().isoformat()
    update_settings({'playboardConfigs': configs})
    
    return {'success': True, 'config': configs[config_id]}


@app.post('/api/shorts-reels/playboard/manual-discover')
async def manual_discover_playboard(config: dict, topics: list[str] | None = None):
    """
    Manual trigger Playboard discovery with custom config & topic filter.
    
    Config format:
    {
        "dimension": "most-viewed",    # or "trending", "rising"
        "category": "All",             # or specific category
        "country": "Worldwide",        # or specific country
        "period": "weekly",            # or "monthly", "yearly"
        "isActive": true,
        "priority": 10
    }
    
    Topics: ["Fashion", "Beauty", "Lifestyle"] or None (all topics)
    """
    started = time.time()
    
    if not config:
        raise HTTPException(status_code=400, detail='config is required')
    
    # Import TOPICS from utils if topics param not provided
    from .utils import TOPICS
    target_topics = topics if topics else TOPICS
    
    found = 0
    failed = 0
    
    try:
        for topic in target_topics:
            try:
                await asyncio.sleep(3 + random.random() * 2)
                print(f"[ManualDiscover] Discovering {topic} with config: {config.get('category')} / {config.get('country')}")
                item_count = await discover_playboard(config, topic)
                found += item_count
            except Exception as e:
                print(f"[ManualDiscover] Failed for topic {topic}: {e}")
                failed += 1
        
        duration = int((time.time() - started) * 1000)
        log_job('discover', 'success', isManual=True, itemsFound=found, failedTopics=failed, duration=duration)
        
        return {
            'success': True,
            'itemsFound': found,
            'failedTopics': failed,
            'duration': duration,
            'topicsProcessed': len(target_topics)
        }
    except Exception as ex:
        duration = int((time.time() - started) * 1000)
        log_job('discover', 'failed', isManual=True, itemsFound=found, error=str(ex), duration=duration)
        raise HTTPException(status_code=500, detail=f'Manual discovery failed: {str(ex)}')


@app.get('/healthz')
async def healthz():
    return {'ok': True, 'time': time.time()}
