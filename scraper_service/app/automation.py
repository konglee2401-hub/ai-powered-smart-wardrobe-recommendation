import asyncio
import os
import subprocess
import random
import time
from datetime import datetime
from playwright.async_api import async_playwright
from bson import ObjectId
from .config import DOWNLOAD_ROOT
from .db import channels, videos
from .store import get_or_create_settings, upsert_channel, upsert_video, log_job, normalize
from .utils import TOPICS, parse_views, extract_youtube_id, extract_reel_id, match_topic

UA = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
]

queue = asyncio.PriorityQueue()
running_jobs = 0
worker_task = None


def build_download_path(video):
    d = datetime.utcnow().strftime('%Y-%m-%d')
    return os.path.join(DOWNLOAD_ROOT, video['platform'], video.get('topic', 'misc'), d, f"{video['videoId']}.mp4")


async def enqueue(video_id, priority=5):
    await queue.put((priority, str(video_id), 0))


async def start_worker():
    global worker_task
    if worker_task is None:
        worker_task = asyncio.create_task(_worker_loop())


async def _worker_loop():
    global running_jobs
    while True:
        priority, video_id, attempts = await queue.get()
        running_jobs += 1
        try:
            await process_download(video_id, attempts)
        finally:
            running_jobs -= 1
            queue.task_done()


async def process_download(video_id, attempts):
    started = time.time()
    doc = videos.find_one({'_id': ObjectId(video_id)})
    if not doc:
      return

    try:
        videos.update_one({'_id': doc['_id']}, {'$set': {'downloadStatus': 'downloading', 'updatedAt': datetime.utcnow()}})
        out = build_download_path(doc)
        os.makedirs(os.path.dirname(out), exist_ok=True)

        cmd = ['yt-dlp', doc['url'], '-f', 'best[height<=1080]', '-o', out, '--no-warnings', '--write-thumbnail', '--write-description']
        proc = await asyncio.create_subprocess_exec(*cmd, stderr=asyncio.subprocess.PIPE)
        _, err = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError((err or b'').decode('utf-8') or f'yt-dlp code {proc.returncode}')

        videos.update_one({'_id': doc['_id']}, {'$set': {'downloadStatus': 'done', 'localPath': out, 'downloadedAt': datetime.utcnow(), 'failReason': ''}})
        log_job('download', 'success', platform=doc.get('platform'), topic=doc.get('topic'), itemsDownloaded=1, duration=int((time.time()-started)*1000))
    except Exception as ex:
        retry = attempts < 2
        videos.update_one({'_id': doc['_id']}, {'$set': {'downloadStatus': 'pending' if retry else 'failed', 'failReason': str(ex)}})
        log_job('download', 'partial' if retry else 'failed', platform=doc.get('platform'), topic=doc.get('topic'), duration=int((time.time()-started)*1000), error=str(ex))
        if retry:
            await queue.put((5, str(doc['_id']), attempts + 1))


async def discover_all():
    started = time.time()
    setting = get_or_create_settings()
    if not setting.get('isEnabled', True):
        return {'skipped': True}

    found = 0
    try:
        for topic in TOPICS:
            found += await discover_youtube(topic, setting)
            found += await discover_facebook(topic, setting)
        log_job('discover', 'success', itemsFound=found, duration=int((time.time()-started)*1000))
        return {'success': True, 'itemsFound': found}
    except Exception as ex:
        log_job('discover', 'failed', itemsFound=found, duration=int((time.time()-started)*1000), error=str(ex))
        raise


async def discover_youtube(topic, setting):
    keywords = setting.get('keywords', {}).get(topic, [topic])
    query = f"{keywords[0]} shorts"
    min_views = setting.get('minViewsFilter', 100000)
    found = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=random.choice(UA), locale='vi-VN', viewport={'width': 1366, 'height': 900})
        page = await context.new_page()
        await page.goto(f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}&sp=EgIYAQ%253D%253D", wait_until='domcontentloaded', timeout=60000)

        for _ in range(5):
            await page.mouse.wheel(0, 1300)
            await page.wait_for_timeout(1000)

        cards = page.locator('ytd-video-renderer,ytd-reel-item-renderer')
        count = await cards.count()
        for i in range(min(count, 20)):
            card = cards.nth(i)
            title = await card.locator('#video-title, #video-title-link').first.inner_text() if await card.locator('#video-title, #video-title-link').count() else ''
            href = await card.locator('a#thumbnail,a[href*="watch"],a[href*="/shorts/"]').first.get_attribute('href') if await card.locator('a#thumbnail,a[href*="watch"],a[href*="/shorts/"]').count() else None
            if not href or not title:
                continue
            text = await card.inner_text()
            views = parse_views(text)
            if views < min_views or not match_topic(title, topic, keywords):
                continue
            url = href if href.startswith('http') else f'https://www.youtube.com{href}'
            video_id = extract_youtube_id(url)
            channel_name = 'youtube-channel'
            channel_id = f'yt-{video_id[:8]}'
            ch = upsert_channel('youtube', channel_id, channel_name, topic)
            v = upsert_video({'platform': 'youtube', 'videoId': video_id, 'title': title, 'views': views, 'url': url, 'topic': topic, 'thumbnail': '', 'channelId': ch['_id']})
            await enqueue(v['_id'], 1 if views > 1_000_000 else 5)
            found += 1

        await context.close()
        await browser.close()
    return found


async def discover_facebook(topic, setting):
    keywords = setting.get('keywords', {}).get(topic, [topic])
    keyword = keywords[0]
    min_views = setting.get('minViewsFilter', 100000)
    found = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=random.choice(UA), locale='vi-VN', viewport={'width': 1366, 'height': 900})
        page = await context.new_page()
        await page.goto(f"https://www.facebook.com/search/reels/?q={keyword}", wait_until='domcontentloaded', timeout=60000)
        for _ in range(8):
            await page.mouse.wheel(0, 1100)
            await page.wait_for_timeout(1200)

        links = page.locator('a[href*="/reel/"]')
        count = await links.count()
        for i in range(min(count, 20)):
            link = links.nth(i)
            href = await link.get_attribute('href')
            if not href:
                continue
            text = await link.inner_text()
            views = parse_views(text)
            if views < min_views or not match_topic(text, topic, keywords):
                continue
            url = href if href.startswith('http') else f'https://www.facebook.com{href}'
            vid = extract_reel_id(url)
            ch = upsert_channel('facebook', f'fb-{vid[:8]}', 'facebook-page', topic)
            v = upsert_video({'platform': 'facebook', 'videoId': vid, 'title': text[:120], 'views': views, 'url': url, 'topic': topic, 'thumbnail': '', 'channelId': ch['_id']})
            await enqueue(v['_id'], 1 if views > 1_000_000 else 5)
            found += 1

        await context.close()
        await browser.close()
    return found


async def scan_single_channel(channel):
    setting = get_or_create_settings()
    min_views = setting.get('minViewsFilter', 100000)
    found = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=random.choice(UA), locale='vi-VN')
        page = await context.new_page()
        url = f"https://www.youtube.com/@{channel['channelId'].replace('@','')}/shorts" if channel['platform'] == 'youtube' else f"https://www.facebook.com/{channel['channelId']}/reels"
        await page.goto(url, wait_until='domcontentloaded', timeout=60000)

        for _ in range(8):
            await page.mouse.wheel(0, 1200)
            await page.wait_for_timeout(1000)

        selector = 'a[href*="/shorts/"]' if channel['platform'] == 'youtube' else 'a[href*="/reel/"]'
        links = page.locator(selector)
        count = await links.count()

        for i in range(min(count, 20)):
            href = await links.nth(i).get_attribute('href')
            if not href:
                continue
            full = href if href.startswith('http') else ('https://www.youtube.com' + href if channel['platform'] == 'youtube' else 'https://www.facebook.com' + href)
            video_id = extract_youtube_id(full) if channel['platform'] == 'youtube' else extract_reel_id(full)
            existing = videos.find_one({'platform': channel['platform'], 'videoId': video_id})
            if existing and existing.get('downloadStatus') == 'done':
                continue
            text = await links.nth(i).inner_text()
            views = parse_views(text)
            if views < min_views:
                continue
            v = upsert_video({'platform': channel['platform'], 'videoId': video_id, 'title': text[:120], 'views': views, 'url': full, 'topic': (channel.get('topic') or ['hai'])[0], 'thumbnail': '', 'channelId': str(channel['_id'])})
            await enqueue(v['_id'], 1 if views > 1_000_000 else 5)
            found += 1

        channels.update_one({'_id': channel['_id']}, {'$set': {'lastScanned': datetime.utcnow(), 'updatedAt': datetime.utcnow()}})
        await context.close()
        await browser.close()

    return found


async def scan_all_channels():
    started = time.time()
    setting = get_or_create_settings()
    if not setting.get('isEnabled', True):
        return {'skipped': True}

    found = 0
    try:
        for c in channels.find({'isActive': True}).sort([('priority', -1)]).limit(100):
            found += await scan_single_channel(c)
        log_job('scan-channel', 'success', itemsFound=found, duration=int((time.time()-started)*1000))
        return {'success': True, 'itemsFound': found}
    except Exception as ex:
        log_job('scan-channel', 'failed', itemsFound=found, duration=int((time.time()-started)*1000), error=str(ex))
        raise


def queue_stats():
    return {'queued': queue.qsize(), 'running': running_jobs, 'started': worker_task is not None}
