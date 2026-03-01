import asyncio
import os
import random
import time
from datetime import datetime

from bson import ObjectId
from playwright.async_api import async_playwright

from .config import (
    DOWNLOAD_ROOT,
    SCRAPER_ENGINE,
    SCRAPER_HEADLESS,
    SCRAPER_LOCALE,
    SCRAPER_TIMEZONE,
    SCRAPER_PROXY,
)
from .db import channels, videos
from .store import get_or_create_settings, upsert_channel, upsert_video, log_job
from .utils import TOPICS, parse_views, parse_followers, extract_youtube_id, extract_reel_id, match_topic
from .drive_service import drive_service

try:
    import nodriver as nd
except Exception:  # nodriver is optional at runtime
    nd = None

UA = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
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
        _, video_id, attempts = await queue.get()
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

        videos.update_one(
            {'_id': doc['_id']},
            {'$set': {'downloadStatus': 'done', 'localPath': out, 'downloadedAt': datetime.utcnow(), 'failReason': ''}},
        )
        drive_result = await maybe_upload_to_drive(doc, out)
        log_job('download', 'success', platform=doc.get('platform'), topic=doc.get('topic'), itemsDownloaded=1, duration=int((time.time() - started) * 1000), metadata={'drive': drive_result})
    except Exception as ex:
        retry = attempts < 2
        videos.update_one({'_id': doc['_id']}, {'$set': {'downloadStatus': 'pending' if retry else 'failed', 'failReason': str(ex)}})
        log_job('download', 'partial' if retry else 'failed', platform=doc.get('platform'), topic=doc.get('topic'), duration=int((time.time() - started) * 1000), error=str(ex))
        if retry:
            await queue.put((5, str(doc['_id']), attempts + 1))


async def _collect_cards(url: str, card_selector: str, link_selector: str, text_selector: str | None, scroll_count: int = 8):
    """
    Try nodriver first (if configured/available) then fallback to Playwright.
    Returns list[{'href': str, 'text': str}]
    """
    use_nodriver = SCRAPER_ENGINE == 'nodriver' and nd is not None

    if use_nodriver:
        try:
            return await _collect_cards_nodriver(url, card_selector, link_selector, text_selector, scroll_count)
        except Exception:
            # fallback to playwright silently to keep the pipeline running
            pass

    return await _collect_cards_playwright(url, card_selector, link_selector, text_selector, scroll_count)


async def _collect_cards_nodriver(url: str, card_selector: str, link_selector: str, text_selector: str | None, scroll_count: int):
    browser_args = [
        '--disable-blink-features=AutomationControlled',
        '--no-default-browser-check',
        '--lang=vi-VN',
    ]
    if SCRAPER_PROXY:
        browser_args.append(f'--proxy-server={SCRAPER_PROXY}')

    browser = await nd.start(
        headless=SCRAPER_HEADLESS,
        browser_args=browser_args,
        lang=SCRAPER_LOCALE,
    )
    tab = await browser.get(url)

    await tab.evaluate(
        """
        Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        Object.defineProperty(navigator, 'languages', {get: () => ['vi-VN','vi','en-US','en']});
        Object.defineProperty(navigator, 'platform', {get: () => 'Win32'});
        """
    )

    for _ in range(scroll_count):
        await tab.evaluate('window.scrollBy(0, 1200)')
        await asyncio.sleep(0.9 + random.random() * 0.8)

    text_node_expr = f"c.querySelector({text_selector!r})" if text_selector else 'c'

    js = f"""
      (() => {{
        const cards = Array.from(document.querySelectorAll('{card_selector}')).slice(0, 30);
        return cards.map((c) => {{
          const link = c.querySelector('{link_selector}');
          const href = link ? link.getAttribute('href') || '' : '';
          const textNode = {text_node_expr};
          const text = textNode ? (textNode.innerText || c.innerText || '').trim() : (c.innerText || '').trim();
          return {{ href, text }};
        }});
      }})()
    """
    items = await tab.evaluate(js)

    await browser.stop()
    return items or []


async def _collect_cards_playwright(url: str, card_selector: str, link_selector: str, text_selector: str | None, scroll_count: int):
    async with async_playwright() as p:
        launch_args = [
            '--disable-blink-features=AutomationControlled',
            '--no-default-browser-check',
            '--disable-dev-shm-usage',
        ]
        if SCRAPER_PROXY:
            launch_args.append(f'--proxy-server={SCRAPER_PROXY}')

        browser = await p.chromium.launch(headless=SCRAPER_HEADLESS, args=launch_args)
        context = await browser.new_context(
            user_agent=random.choice(UA),
            locale=SCRAPER_LOCALE,
            timezone_id=SCRAPER_TIMEZONE,
            viewport={'width': 1366 + random.randint(-80, 120), 'height': 900 + random.randint(-80, 120)},
            color_scheme='dark',
        )

        page = await context.new_page()
        await page.add_init_script(
            """
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
            window.chrome = window.chrome || { runtime: {} };
            """
        )
        await page.goto(url, wait_until='domcontentloaded', timeout=60000)

        for _ in range(scroll_count):
            await page.mouse.wheel(0, random.randint(900, 1500))
            await page.wait_for_timeout(850 + random.randint(50, 900))

        cards = page.locator(card_selector)
        count = await cards.count()
        out = []
        for i in range(min(count, 30)):
            card = cards.nth(i)
            href = await card.locator(link_selector).first.get_attribute('href') if await card.locator(link_selector).count() else ''
            if text_selector:
                txt = await card.locator(text_selector).first.inner_text() if await card.locator(text_selector).count() else ''
                if not txt:
                    txt = await card.inner_text()
            else:
                txt = await card.inner_text()
            out.append({'href': href or '', 'text': txt or ''})

        await context.close()
        await browser.close()
        return out




async def maybe_upload_to_drive(video_doc, local_path):
    try:
        result = drive_service.upload_downloaded_video(
            file_path=local_path,
            platform=video_doc.get('platform', ''),
            metadata={
                'videoId': video_doc.get('videoId', ''),
                'topic': video_doc.get('topic', ''),
                'sourceUrl': video_doc.get('url', ''),
            },
        )
        if result.get('success'):
            f = result.get('file', {})
            videos.update_one({'_id': video_doc['_id']}, {'$set': {
                'driveFileId': f.get('id'),
                'driveWebViewLink': f.get('webViewLink'),
                'driveFolderId': result.get('folderId'),
            }})
            return result
        return {'success': False, 'message': result.get('message', 'drive upload skipped')}
    except Exception as ex:
        return {'success': False, 'message': str(ex)}

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

        log_job('discover', 'success', itemsFound=found, duration=int((time.time() - started) * 1000))
        return {'success': True, 'itemsFound': found}
    except Exception as ex:
        log_job('discover', 'failed', itemsFound=found, duration=int((time.time() - started) * 1000), error=str(ex))
        raise


async def discover_youtube(topic, setting):
    keywords = setting.get('keywords', {}).get(topic, [topic])
    query = f"{keywords[0]} shorts"
    min_views = setting.get('minViewsFilter', 100000)
    min_followers = setting.get('minChannelFollowers', 0)
    min_channel_total_videos = setting.get('minChannelTotalVideos', 0)
    high_priority_views = setting.get('highPriorityViews', 1_000_000)
    found = 0

    cards = await _collect_cards(
        url=f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}&sp=EgIYAQ%253D%253D",
        card_selector='ytd-video-renderer, ytd-reel-item-renderer',
        link_selector='a#thumbnail, a[href*="watch"], a[href*="/shorts/"]',
        text_selector=None,
        scroll_count=6,
    )

    for row in cards:
        href = row.get('href')
        if not href:
            continue

        text = row.get('text', '')
        views = parse_views(text)
        if views < min_views:
            continue
        if not match_topic(text, topic, keywords):
            continue

        followers = parse_followers(text)
        if followers < min_followers:
            continue

        url = href if href.startswith('http') else f'https://www.youtube.com{href}'
        video_id = extract_youtube_id(url)
        channel_name = 'youtube-channel'
        channel_id = f'yt-{video_id[:8]}'

        ch = upsert_channel('youtube', channel_id, channel_name, topic, followers=followers)
        v = upsert_video({
            'platform': 'youtube',
            'videoId': video_id,
            'title': text[:180],
            'views': views,
            'url': url,
            'topic': topic,
            'thumbnail': '',
            'channelId': ch['_id'],
        })
        if ch.get('totalVideos', 0) < min_channel_total_videos:
            continue

        await enqueue(v['_id'], 1 if views > high_priority_views else 5)
        found += 1

    return found


async def discover_facebook(topic, setting):
    keywords = setting.get('keywords', {}).get(topic, [topic])
    keyword = keywords[0]
    min_views = setting.get('minViewsFilter', 100000)
    min_followers = setting.get('minChannelFollowers', 0)
    min_channel_total_videos = setting.get('minChannelTotalVideos', 0)
    high_priority_views = setting.get('highPriorityViews', 1_000_000)
    found = 0

    cards = await _collect_cards(
        url=f"https://www.facebook.com/search/reels/?q={keyword}",
        card_selector='a[href*="/reel/"]',
        link_selector=':scope',
        text_selector=None,
        scroll_count=10,
    )

    for row in cards:
        href = row.get('href')
        if not href:
            continue
        text = row.get('text', '')
        views = parse_views(text)
        if views < min_views:
            continue
        if not match_topic(text, topic, keywords):
            continue

        followers = parse_followers(text)
        if followers < min_followers:
            continue

        url = href if href.startswith('http') else f'https://www.facebook.com{href}'
        vid = extract_reel_id(url)
        ch = upsert_channel('facebook', f'fb-{vid[:8]}', 'facebook-page', topic, followers=followers)
        v = upsert_video({
            'platform': 'facebook',
            'videoId': vid,
            'title': text[:120],
            'views': views,
            'url': url,
            'topic': topic,
            'thumbnail': '',
            'channelId': ch['_id'],
        })
        if ch.get('totalVideos', 0) < min_channel_total_videos:
            continue

        await enqueue(v['_id'], 1 if views > high_priority_views else 5)
        found += 1

    return found


async def scan_single_channel(channel):
    setting = get_or_create_settings()
    min_views = setting.get('minViewsFilter', 100000)
    min_followers = setting.get('minChannelFollowers', 0)
    high_priority_views = setting.get('highPriorityViews', 1_000_000)
    found = 0

    target_url = (
        f"https://www.youtube.com/@{channel['channelId'].replace('@', '')}/shorts"
        if channel['platform'] == 'youtube'
        else f"https://www.facebook.com/{channel['channelId']}/reels"
    )

    selector = 'a[href*="/shorts/"]' if channel['platform'] == 'youtube' else 'a[href*="/reel/"]'

    cards = await _collect_cards(
        url=target_url,
        card_selector=selector,
        link_selector=':scope',
        text_selector=None,
        scroll_count=8,
    )

    for row in cards:
        href = row.get('href')
        if not href:
            continue

        full = href if href.startswith('http') else ('https://www.youtube.com' + href if channel['platform'] == 'youtube' else 'https://www.facebook.com' + href)
        video_id = extract_youtube_id(full) if channel['platform'] == 'youtube' else extract_reel_id(full)

        existing = videos.find_one({'platform': channel['platform'], 'videoId': video_id})
        if existing and existing.get('downloadStatus') == 'done':
            continue

        text = row.get('text', '')
        views = parse_views(text)
        followers = parse_followers(text)
        if views < min_views or followers < min_followers:
            continue

        v = upsert_video({
            'platform': channel['platform'],
            'videoId': video_id,
            'title': text[:120],
            'views': views,
            'url': full,
            'topic': (channel.get('topic') or ['hai'])[0],
            'thumbnail': '',
            'channelId': str(channel['_id']),
        })
        await enqueue(v['_id'], 1 if views > high_priority_views else 5)
        found += 1

    channels.update_one({'_id': channel['_id']}, {'$set': {'lastScanned': datetime.utcnow(), 'updatedAt': datetime.utcnow()}})
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

        log_job('scan-channel', 'success', itemsFound=found, duration=int((time.time() - started) * 1000))
        return {'success': True, 'itemsFound': found}
    except Exception as ex:
        log_job('scan-channel', 'failed', itemsFound=found, duration=int((time.time() - started) * 1000), error=str(ex))
        raise


def queue_stats():
    return {'queued': queue.qsize(), 'running': running_jobs, 'started': worker_task is not None, 'engine': SCRAPER_ENGINE}
