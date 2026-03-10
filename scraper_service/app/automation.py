import asyncio
import json
import os
import random
import re
import sys
import time
from datetime import datetime
from typing import Dict, List
from urllib.parse import parse_qs, urlparse, urljoin, quote
from urllib.request import Request, urlopen

from bson import ObjectId
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright

try:
    import nodriver as nd
except Exception:
    nd = None

from .config import (
    DOWNLOAD_ROOT,
    PLAYBOARD_COOKIES_FILE,
    PLAYBOARD_USER_EMAIL,
    PLAYBOARD_USER_PASSWORD,
    SCRAPER_ENGINE,
    SCRAPER_HEADLESS,
    SCRAPER_LOCALE,
    SCRAPER_TIMEZONE,
    SCRAPER_PROXY,
    SCRAPER_PROXIES,
)
from .db import channels, videos
from .store import get_or_create_settings, upsert_channel, upsert_video, log_job
from .simple_upload import upload_video_after_download
from .utils import TOPICS, parse_views, extract_youtube_id, extract_reel_id, extract_douyin_id, match_topic

UA = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
]

queue = asyncio.PriorityQueue()
running_jobs = 0
worker_tasks = []
queued_video_ids = set()
processing_video_ids = set()
_proxy_index = 0
FAIL_FAST_TIMEOUTS_MS = [18000, 30000, 50000]
YOUTUBE_VIDEO_ID_RE = re.compile(r'^[A-Za-z0-9_-]{11}$')
YTDLP_TIMEOUT_SEC = 180
DAILYHAHA_HOME = "https://www.dailyhaha.com/videos/"
DAILYHAHA_CHANNEL_ID = "dailyhaha-videos"
DOUYIN_SEARCH_BASE = "https://www.douyin.com/jingxuan/search/{keyword}?type=general"
DOUYIN_TOPIC_KEYWORDS = {
    "funny": "幽默",
    "hai": "搞笑",
    "dance": "舞蹈",
    "sexy dance": "热舞",
    "cooking": "美食",
}

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass


def _proxy_pool() -> List[str]:
    pool = [x for x in SCRAPER_PROXIES if x]
    if not pool and SCRAPER_PROXY:
        pool = [SCRAPER_PROXY]
    return pool


def _mask_proxy(proxy: str) -> str:
    if not proxy:
        return ''
    parsed = urlparse(proxy if '://' in proxy else f'http://{proxy}')
    host = parsed.hostname or 'unknown'
    port = parsed.port or ''
    return f'{host}:{port}'


def _next_proxy() -> str | None:
    global _proxy_index
    pool = _proxy_pool()
    if not pool:
        return None
    proxy = pool[_proxy_index % len(pool)]
    _proxy_index += 1
    print(f"[DEBUG] Proxy selected: {_mask_proxy(proxy)}")
    return proxy


async def _is_proxy_healthy(proxy: str | None, timeout_sec: float = 2.5) -> bool:
    if not proxy:
        return True
    parsed = urlparse(proxy if '://' in proxy else f'http://{proxy}')
    host = parsed.hostname
    port = parsed.port
    if not host or not port:
        return False
    try:
        reader, writer = await asyncio.wait_for(asyncio.open_connection(host, port), timeout=timeout_sec)
        writer.close()
        await writer.wait_closed()
        return True
    except Exception:
        return False


async def _next_healthy_proxy() -> str | None:
    pool = _proxy_pool()
    if not pool:
        return None

    checked = set()
    while len(checked) < len(pool):
        proxy = _next_proxy()
        if not proxy:
            return None
        if proxy in checked:
            continue
        checked.add(proxy)
        ok = await _is_proxy_healthy(proxy)
        if ok:
            print(f"[DEBUG] Proxy health-check OK: {_mask_proxy(proxy)}")
            return proxy
        print(f"[DEBUG] Proxy health-check FAIL: {_mask_proxy(proxy)}")
    return None


def _extract_playboard_link_info(href: str | None) -> Dict[str, str]:
    if not href:
        return {'video_id': '', 'channel_id': '', 'youtube_url': ''}

    raw = href if href.startswith('http') else f'https://playboard.co{href}'
    parsed = urlparse(raw)
    path = parsed.path or ''
    query = parse_qs(parsed.query or '')

    video_id = ''
    if '/video/' in path:
        video_id = path.split('/video/')[-1].split('/')[0].split('?')[0]

    channel_id = (query.get('channelId') or [''])[0]
    youtube_url = f'https://www.youtube.com/watch?v={video_id}' if video_id else ''

    return {'video_id': video_id, 'channel_id': channel_id, 'youtube_url': youtube_url}


async def _apply_playboard_cookies(context) -> None:
    if not PLAYBOARD_COOKIES_FILE:
        return
    if not os.path.exists(PLAYBOARD_COOKIES_FILE):
        print(f'[DEBUG] Cookie file not found: {PLAYBOARD_COOKIES_FILE}')
        return

    try:
        with open(PLAYBOARD_COOKIES_FILE, 'r', encoding='utf-8') as f:
            cookies = json.load(f)
        if isinstance(cookies, list) and cookies:
            await context.add_cookies(cookies)
            print(f'[DEBUG] Applied {len(cookies)} cookies')
    except Exception as e:
        print(f'[DEBUG] Apply cookies failed: {e}')


def _proxy_for_playwright(proxy: str | None) -> Dict | None:
    if not proxy:
        return None
    raw = proxy if '://' in proxy else f'http://{proxy}'
    parsed = urlparse(raw)
    if not parsed.hostname or not parsed.port:
        return None
    cfg = {'server': f'{parsed.scheme}://{parsed.hostname}:{parsed.port}'}
    if parsed.username:
        cfg['username'] = parsed.username
    if parsed.password:
        cfg['password'] = parsed.password
    return cfg


def _proxy_server_only(proxy: str | None) -> str | None:
    cfg = _proxy_for_playwright(proxy)
    return cfg.get('server') if cfg else None


# Mapping of UI category names to Playboard URL slugs (discovered via category click script)
PLAYBOARD_CATEGORY_MAPPING = {
    'All': 'all',
    'Pets & Animal': 'animals',
    'Music': 'music',
    'Gaming': 'gaming',
    'News & Politics': 'news',
    'People & Blogs': 'vlog',
    'Travel & Event': 'travel',
    'Sports': 'sports',
    'Auto & Vehicles': 'vehicles',
    'Comedy': 'comedy',
    'Entertainment': 'entertainment',
    'Film & Animation': 'film',
    'Howto & Style': 'howto',
    'Education': 'education',
    'Science & Technology': 'science'
}

def build_playboard_url(config: Dict) -> str:
    dimension = str(config.get('dimension', 'most-viewed')).strip().lower()
    category = str(config.get('category', 'All')).strip()
    country = str(config.get('country', 'Worldwide')).strip()
    period = str(config.get('period', 'weekly')).strip().lower()

    # Use mapping for known categories, fallback to simple slug
    if category in PLAYBOARD_CATEGORY_MAPPING:
        category_slug = PLAYBOARD_CATEGORY_MAPPING[category] + '-videos'
    else:
        category_slug = category.lower().replace('&', 'and').replace('/', ' ').replace('  ', ' ').replace(' ', '-')
        category_slug = 'all-videos' if category_slug == 'all' else f'{category_slug}-videos'

    country_slug = country.lower().replace('  ', ' ').replace(' ', '-')
    url = f'https://playboard.co/en/chart/short/{dimension}-{category_slug}-in-{country_slug}-{period}'
    print(f'[Playboard URL built] {url}')
    return url


async def human_scroll(page, times: int = 8):
    for _ in range(times):
        await page.mouse.wheel(0, random.randint(700, 1400))
        await asyncio.sleep(random.uniform(2.0, 4.0))


async def _playboard_login(page) -> bool:
    """
    Detect and login to Playboard if needed
    Returns True if login was successful or not needed, False if login failed
    """
    try:
        print('[DEBUG] Checking if Playboard login is needed...')
        
        # Check for "Too many requests" error
        too_many_requests = await page.locator('text=Too many requests').count()
        if too_many_requests > 0:
            print('[DEBUG] Detected "Too many requests" error, need to sign in')
        
        # Check for Sign in link/button (on error page it's an <a> tag)
        sign_in_link = await page.locator('a[href*="/account/signin"], a:has-text("Sign in"), button:has-text("Sign in")').count()
        
        if too_many_requests == 0 and sign_in_link == 0:
            print('[DEBUG] No login needed, page loaded successfully')
            return True
        
        if not PLAYBOARD_USER_EMAIL or not PLAYBOARD_USER_PASSWORD:
            print('[ERROR] Playboard credentials not configured in .env (PLAYBOARD_USER_EMAIL, PLAYBOARD_USER_PASSWORD)')
            return False
        
        print(f'[DEBUG] Playboard login required, attempting login as {PLAYBOARD_USER_EMAIL}...')
        
        # Click sign in link/button (prioritize the <a> link from error page)
        sign_in_element = page.locator('a[href*="/account/signin"]').first
        if await sign_in_element.count() == 0:
            sign_in_element = page.locator('a:has-text("Sign in"), button:has-text("Sign in")').first
        
        await sign_in_element.click(timeout=5000)
        print('[DEBUG] Clicked Sign in button/link')
        await asyncio.sleep(3)
        
        # Wait for login form to appear
        await page.wait_for_selector('input[name="email"], input[name="password"]', timeout=10000)
        await asyncio.sleep(1)
        
        # Fill email field - use input[name="email"]
        email_field = page.locator('input[name="email"]')
        if await email_field.count() > 0:
            await email_field.fill(PLAYBOARD_USER_EMAIL)
            print(f'[DEBUG] Entered email: {PLAYBOARD_USER_EMAIL}')
            await asyncio.sleep(0.5)
        
        # Fill password field - use input[name="password"]
        password_field = page.locator('input[name="password"]')
        if await password_field.count() > 0:
            await password_field.fill(PLAYBOARD_USER_PASSWORD)
            print('[DEBUG] Entered password')
            await asyncio.sleep(0.5)
        
        # Click submit button - button[type="submit"]
        submit_button = page.locator('button[type="submit"]')
        if await submit_button.count() > 0:
            await submit_button.click(timeout=5000)
            print('[DEBUG] Clicked submit button')
            await asyncio.sleep(3)
        
        # Wait for page to fully load after login
        try:
            await page.wait_for_load_state('networkidle', timeout=15000)
        except:
            await asyncio.sleep(2)
        
        print('[DEBUG] Playboard login completed successfully')
        
        # 💾 SAVE COOKIES for next time!
        try:
            if PLAYBOARD_COOKIES_FILE:
                cookies = await page.context.cookies()
                os.makedirs(os.path.dirname(PLAYBOARD_COOKIES_FILE), exist_ok=True)
                with open(PLAYBOARD_COOKIES_FILE, 'w', encoding='utf-8') as f:
                    json.dump(cookies, f, indent=2)
                print(f'[DEBUG] Saved {len(cookies)} cookies to {PLAYBOARD_COOKIES_FILE}')
        except Exception as cookie_err:
            print(f'[DEBUG] Warning: Could not save cookies: {cookie_err}')
        
        return True
        
    except Exception as e:
        print(f'[DEBUG] Playboard login failed: {e}')
        return False


async def _collect_playwright(url: str, proxy: str | None, timeout_ms: int) -> List[Dict]:
    # 💡 Skip proxy if we have valid cookies (session is already authenticated)
    cookies_exist = False
    if PLAYBOARD_COOKIES_FILE:
        cookies_path = os.path.normpath(PLAYBOARD_COOKIES_FILE)
        cookies_exist = os.path.isfile(cookies_path)
        if cookies_exist:
            proxy = None
            print(f'[DEBUG] Cookies file found ({cookies_path}), skipping proxy')
    
    proxy_cfg = _proxy_for_playwright(proxy)
    async with async_playwright() as p:
        browser = None
        context = None
        page = None
        try:
            launch_args = ['--no-default-browser-check']
            launch_kwargs = {'headless': SCRAPER_HEADLESS, 'args': launch_args}
            if proxy_cfg:
                launch_kwargs['proxy'] = proxy_cfg
                print(f'[DEBUG] Using proxy: {proxy_cfg.get("server")}')
            else:
                print(f'[DEBUG] No proxy (direct connection)')

            browser = await p.chromium.launch(**launch_kwargs)
            context = await browser.new_context(
                user_agent=random.choice(UA),
                locale=SCRAPER_LOCALE,
                timezone_id=SCRAPER_TIMEZONE,
                viewport={'width': 1280 + random.randint(-80, 120), 'height': 900 + random.randint(-60, 80)},
            )
            page = await context.new_page()
            await page.add_init_script(
                """
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
                """
            )
            await _apply_playboard_cookies(context)

            # 🔄 Add random delay to avoid rate limiting (3-15 seconds)
            delay = random.uniform(3, 15)
            print(f'[DEBUG] Random delay {delay:.1f}s before request to avoid rate limiting...')
            await asyncio.sleep(delay)

            await page.goto(url, wait_until='domcontentloaded', timeout=timeout_ms)
            await asyncio.sleep(5)
            
            # 💫 Check if login is needed and perform login if necessary
            login_ok = await _playboard_login(page)
            if not login_ok:
                print('[DEBUG] Login check returned false, returning empty results')
                return []
            
            # ⏳ Wait for content and scroll first
            print('[DEBUG] Waiting for content to settle...')
            await asyncio.sleep(2)
            
            # Aggressive scrolling to trigger lazy loading
            print('[DEBUG] Scrolling page to load all content...')
            for i in range(3):
                height = await page.evaluate('document.body.scrollHeight')
                await page.evaluate(f'window.scrollTo(0, {height})')
                await asyncio.sleep(1)
            
            # Wait for table to appear
            print('[DEBUG] Waiting for table...')
            try:
                # Try to wait for video links to appear (more reliable than table)
                await page.wait_for_selector('a[href*="/en/video/"]', timeout=5000)
                print('[DEBUG] Found video links on page')
            except:
                print('[DEBUG] Video links not found by wait_for_selector, continuing anyway')
            
            await human_scroll(page, 8)

            # 🚀 Extract all video data via JavaScript (faster & more reliable)
            extract_script = """
            () => {
                const videos = [];
                
                // Try multiple selector strategies
                // Strategy 1: Look for tbody tr (table structure)
                let rows = Array.from(document.querySelectorAll('tbody tr'));
                
                // Strategy 2: If no tbody, look for div-based rows
                if (rows.length === 0) {
                    rows = Array.from(document.querySelectorAll('[class*="row"][class*="video"], tr[data-video], [role="row"]'));
                }
                
                // Strategy 3: If still nothing, find all video links and work backwards
                if (rows.length === 0) {
                    const videoLinks = Array.from(document.querySelectorAll('a[href*="/en/video/"]'));
                    rows = videoLinks.map(link => link.closest('[class*="table__row"]') || link.closest('tr') || link.closest('div[class*="item"]')).filter(Boolean);
                }
                
                for (let i = 0; i < rows.length && i < 100; i++) {
                    const row = rows[i];
                    
                    // Try to find video link with /en/video/ href
                    const videoLink = row.querySelector('a[href*="/en/video/"]');
                    if (!videoLink) continue;
                    
                    const href = videoLink.getAttribute('href') || '';
                    
                    // Extract video ID from /en/video/{ID}?channelId={CHANNEL_ID}
                    const videoMatch = href.match(/\\/en\\/video\\/([a-zA-Z0-9_-]+)/);
                    if (!videoMatch) continue;
                    
                    const videoId = videoMatch[1];
                    
                    // Extract channel ID from query param
                    const channelMatch = href.match(/channelId=([a-zA-Z0-9_-]+)/);
                    const channelId = channelMatch ? channelMatch[1] : '';
                    
                    // Try to find title - multiple selectors
                    let title = '';
                    const titleSelector = row.querySelector('a.title__label h3, [class*="title"] h3, h3, a[class*="title"]');
                    if (titleSelector) {
                        title = titleSelector.innerText || titleSelector.textContent || '';
                    }
                    
                    // Try to find views - look for numbers
                    let views = 0;
                    const cellsOrText = Array.from(row.querySelectorAll('td, div[class*="cell"], span, strong'));
                    for (const elem of cellsOrText) {
                        const text = elem.innerText || elem.textContent || '';
                        const numMatch = text.match(/(\\d{1,3}(?:,\\d{3})*)/);
                        if (numMatch) {
                            const num = parseInt(numMatch[0].replace(/,/g, ''));
                            if (num > views) views = num;  // Take the largest number (views)
                        }
                    }
                    
                    // Find channel name
                    let channelName = '';
                    const channelLinkElem = row.querySelector('a[href*="/channel/"], [class*="channel"] a, a[class*="channel"]');
                    if (channelLinkElem) {
                        channelName = channelLinkElem.getAttribute('title') || channelLinkElem.innerText || channelLinkElem.textContent || '';
                    }
                    
                    if (videoId && views >= 50000) {
                        videos.push({
                            rank: (i + 1).toString(),
                            title: title.substring(0, 100),
                            views: views,
                            viewsFormatted: views.toLocaleString(),
                            channel_name: channelName.substring(0, 40),
                            channel_id: channelId,
                            video_id: videoId,
                            youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
                            url: `https://www.youtube.com/watch?v=${videoId}`
                        });
                    }
                }
                
                return videos;
            }
            """
            
            results = await page.evaluate(extract_script)
            print(f'[DEBUG] JavaScript extraction found {len(results)} videos (all filters: {[r.get("video_id") for r in results[:3]]})')
            
            return [r for r in results if r['views'] > 50000 and r.get('video_id')]

            
        except Exception as e:
            print(f'[ERROR] Playwright collection error: {e}')
            raise
        finally:
            # ✅ Ensure proper cleanup even if errors occur
            try:
                if page:
                    await page.close()
            except Exception as e:
                print(f'[WARNING] Error closing page: {e}')
            try:
                if context:
                    await context.close()
            except Exception as e:
                print(f'[WARNING] Error closing context: {e}')
            try:
                if browser:
                    await browser.close()
            except Exception as e:
                print(f'[WARNING] Error closing browser: {e}')


async def _collect_nodriver(url: str, proxy: str | None, timeout_ms: int) -> List[Dict]:
    """
    Collect Playboard data using nodriver (undetected Chrome)
    Proper implementation with page load waiting, cookies, and login handling
    """
    if nd is None:
        return await _collect_playwright(url, proxy, timeout_ms)

    browser = None
    try:
        # Configure browser launch arguments
        proxy_server = _proxy_server_only(proxy)
        browser_args = ['--no-default-browser-check', '--lang=vi-VN']
        if proxy_server:
            browser_args.append(f'--proxy-server={proxy_server}')

        print(f'[DEBUG] Starting nodriver browser...')
        browser = await nd.start(
            headless=SCRAPER_HEADLESS,
            browser_args=browser_args,
            lang=SCRAPER_LOCALE
        )

        # Navigate to URL with proper timeout
        print(f'[DEBUG] Navigating to {url}...')
        tab = await asyncio.wait_for(
            browser.get(url),
            timeout=min(timeout_ms / 1000, 60)  # Max 60 seconds
        )

        # ✅ CRITICAL FIX: Check if tab is None
        if tab is None:
            print('[ERROR] nodriver: browser.get() returned None - fallback to Playwright')
            if browser:
                try:
                    await browser.stop()
                except Exception:
                    pass
            return await _collect_playwright(url, proxy, timeout_ms)

        print('[DEBUG] Tab created successfully')

        # ✅ CRITICAL FIX: Wait for page content to load (was missing!)
        # nodriver doesn't auto-wait like Playwright, so we must wait manually
        print('[DEBUG] Waiting for page content to load...')
        try:
            # Wait for table or content to appear
            await asyncio.wait_for(
                tab.wait_for_selector(
                    'table, [data-testid*="item"], #app table tbody tr',
                    timeout=30
                ),
                timeout=min(timeout_ms / 1000, 35)
            )
            print('[DEBUG] Page content loaded successfully')
        except Exception as wait_err:
            print(f'[WARNING] Page content wait failed: {wait_err}')
            print('[DEBUG] Continuing anyway with current page state...')

        # Wait a bit for dynamic content
        await asyncio.sleep(3)

        # ✅ NEW: Apply cookies for authentication/session
        if PLAYBOARD_COOKIES_FILE and os.path.exists(PLAYBOARD_COOKIES_FILE):
            try:
                with open(PLAYBOARD_COOKIES_FILE, 'r', encoding='utf-8') as f:
                    cookies_data = json.load(f)
                if isinstance(cookies_data, list):
                    for cookie in cookies_data:
                        try:
                            await tab.send_cdp_cmd('Network.setCookie', {
                                'cookie': {
                                    'name': cookie.get('name', ''),
                                    'value': cookie.get('value', ''),
                                    'url': url,
                                    'domain': cookie.get('domain', 'playboard.co'),
                                    'path': cookie.get('path', '/'),
                                    'secure': cookie.get('secure', False),
                                    'httpOnly': cookie.get('httpOnly', False),
                                }
                            })
                        except Exception:
                            pass
                    print(f'[DEBUG] Applied {len(cookies_data)} cookies to nodriver')
            except Exception as cook_err:
                print(f'[DEBUG] Cookie application failed: {cook_err}')

        # ✅ NEW: Check for login requirement and handle
        print('[DEBUG] Checking for login requirement in nodriver...')
        try:
            # Check for "Too many requests" error
            too_many = await asyncio.wait_for(
                tab.find('Too many requests', best_match=True),
                timeout=5
            )
            if too_many:
                print('[DEBUG] nodriver detected "Too many requests" - attempting login...')
                await _nodriver_login(tab)
                await asyncio.sleep(3)
        except Exception:
            pass  # No "too many requests" error

        try:
            # Check for Sign in button
            sign_in = await asyncio.wait_for(
                tab.find('Sign in', best_match=True),
                timeout=5
            )
            if sign_in:
                print('[DEBUG] nodriver detected Sign in button - attempting login...')
                await _nodriver_login(tab)
                await asyncio.sleep(3)
        except Exception:
            pass  # No sign in button found

        # Set webdriver and language properties
        try:
            await tab.evaluate(
                """
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'languages', {get: () => ['vi-VN','vi','en-US','en']});
                """
            )
            print('[DEBUG] Anti-detection properties set')
        except Exception as eval_err:
            print(f'[WARNING] Could not set navigator properties: {eval_err}')

        # Scroll to load content
        print('[DEBUG] Scrolling page to load content...')
        try:
            for i in range(8):
                await tab.evaluate('window.scrollBy(0, 1200)')
                await asyncio.sleep(2 + random.random() * 2)
                if i % 2 == 0:
                    print(f'   [SCROLL] {i+1}/8')
        except Exception as scroll_err:
            print(f'[WARNING] Scroll failed: {scroll_err}')

        # Extract data with proper error handling
        print('[DEBUG] Extracting table data...')
        js = """
          (() => {
            const rows = Array.from(document.querySelectorAll('#app table tbody tr, table tbody tr, tr')).slice(0, 45);
            return rows.map((r) => {
              const linkEl = r.querySelector('td.thumbnail a, td:nth-child(1) a, td:nth-child(2) a');
              const titleEl = r.querySelector('td.title h3, td.title a.title__label h3, td.title a');
              const viewsEl = r.querySelector('td.score, td.score span, td:nth-child(4), td.views');
              const channelEl = r.querySelector('td.channel span.name, td.channel a .name, td:nth-child(5) a');
              return {
                title: titleEl ? (titleEl.innerText || '').trim() : '',
                views_text: viewsEl ? (viewsEl.innerText || '').trim() : '',
                href: linkEl ? (linkEl.getAttribute('href') || '') : '',
                channel_name: channelEl ? (channelEl.innerText || '').trim() : '',
              }
            })
          })()
        """

        rows = None
        try:
            rows = await asyncio.wait_for(
                tab.evaluate(js),
                timeout=10
            )
        except Exception as eval_err:
            print(f'[WARNING] Data extraction failed: {eval_err}')
            rows = None

        # Process results
        out = []
        if rows:
            print(f'[DEBUG] Extracted {len(rows)} rows from table')
            for r in rows:
                if not isinstance(r, dict):
                    continue

                href = (r.get('href') or '').strip()
                if not href:
                    continue

                link_info = _extract_playboard_link_info(href)
                video_id = link_info.get('video_id', '')
                if not video_id:
                    continue

                out.append({
                    'title': ((r.get('title') or f'Playboard video {video_id}').strip())[:180],
                    'views': parse_views((r.get('views_text') or '').strip()),
                    'url': link_info.get('youtube_url') or f'https://www.youtube.com/watch?v={video_id}',
                    'video_id': video_id,
                    'channel_name': (r.get('channel_name') or '').strip(),
                    'channel_id': link_info.get('channel_id') or '',
                })
        else:
            print('[WARNING] No rows extracted - page may not have loaded properly')

        print(f'[DEBUG] nodriver extraction complete: {len(out)} videos found')
        return [r for r in out if r['views'] > 50000 and r.get('video_id')]

    except Exception as e:
        print(f'[ERROR] nodriver collection failed: {type(e).__name__}: {str(e)[:200]}')
        # Don't raise - let it fall back to Playwright
        return await _collect_playwright(url, proxy, timeout_ms)
    finally:
        # Clean up browser
        if browser:
            try:
                await asyncio.wait_for(browser.stop(), timeout=10)
                print('[DEBUG] nodriver browser stopped')
            except Exception as stop_err:
                print(f'[WARNING] Could not stop nodriver browser: {stop_err}')


async def _nodriver_login(tab) -> bool:
    """
    Login to Playboard in nodriver
    Uses nodriver's find() and click() methods
    """
    try:
        print('[DEBUG] Attempting nodriver login...')

        if not PLAYBOARD_USER_EMAIL or not PLAYBOARD_USER_PASSWORD:
            print('[ERROR] Credentials not configured')
            return False

        # Click sign in button
        try:
            sign_in_btn = await asyncio.wait_for(
                tab.find('Sign in', best_match=True),
                timeout=5
            )
            if sign_in_btn:
                print('[DEBUG] Found Sign in button, clicking...')
                await sign_in_btn.click()
                await asyncio.sleep(2)
        except Exception as btn_err:
            print(f'[DEBUG] Sign in button click failed: {btn_err}')
            return False

        # Fill email
        try:
            email_input = await asyncio.wait_for(
                tab.select('input[type=email]'),
                timeout=5
            )
            if email_input:
                print(f'[DEBUG] Filling email: {PLAYBOARD_USER_EMAIL}')
                await email_input.send_keys(PLAYBOARD_USER_EMAIL)
                await asyncio.sleep(1)
        except Exception as email_err:
            print(f'[DEBUG] Email input failed: {email_err}')

        # Fill password
        try:
            pwd_input = await asyncio.wait_for(
                tab.select('input[type=password]'),
                timeout=5
            )
            if pwd_input:
                print('[DEBUG] Filling password')
                await pwd_input.send_keys(PLAYBOARD_USER_PASSWORD)
                await asyncio.sleep(1)
        except Exception as pwd_err:
            print(f'[DEBUG] Password input failed: {pwd_err}')

        # Click login button
        try:
            login_btn = await asyncio.wait_for(
                tab.find('Login', best_match=True),
                timeout=5
            )
            if login_btn:
                print('[DEBUG] Clicking login button')
                await login_btn.click()
                await asyncio.sleep(5)
        except Exception as login_err:
            print(f'[DEBUG] Login button click failed: {login_err}')

        print('[DEBUG] nodriver login completed')
        return True

    except Exception as e:
        print(f'[DEBUG] nodriver login error: {e}')
        return False


async def _collect_playboard_cards(url: str) -> List[Dict]:
    print(f'[DEBUG] Scraping Playboard -> {url}')

    pool = _proxy_pool()
    attempts = max(len(pool), 1)
    last_error = None

    for i in range(attempts):
        timeout_ms = FAIL_FAST_TIMEOUTS_MS[min(i, len(FAIL_FAST_TIMEOUTS_MS) - 1)]
        proxy = await _next_healthy_proxy() if pool else None
        if pool and not proxy:
            print('[DEBUG] No healthy proxy available, stop retry')
            break

        try:
            # 💫 PRIMARY: Always try Playwright first (more stable)
            try:
                return await _collect_playwright(url, proxy, timeout_ms)
            except PlaywrightTimeoutError as e:
                last_error = e
                print(f'[DEBUG] Playwright timeout {timeout_ms}ms with proxy {_mask_proxy(proxy)} -> retry next proxy')
                continue
            except Exception as e:
                print(f'[DEBUG] Playwright failed: {e}')
                
                # 💫 FALLBACK: Try nodriver if Playwright fails
                if nd is not None:
                    try:
                        print(f'[DEBUG] Attempting nodriver as fallback with proxy {_mask_proxy(proxy)}...')
                        return await _collect_nodriver(url, proxy, timeout_ms)
                    except Exception as nodriver_err:
                        print(f'[nodriver fallback also failed] {nodriver_err}')
                        last_error = nodriver_err
                else:
                    last_error = e
                
                continue
                
        except asyncio.TimeoutError as e:
            last_error = e
            print(f'[DEBUG] Collection timeout {timeout_ms}ms with proxy {_mask_proxy(proxy)} -> retry next proxy')
            continue
        except Exception as e:
            last_error = e
            print(f'[DEBUG] Unexpected error with proxy {_mask_proxy(proxy)}: {e}')
            continue

    if last_error:
        print(f'[DEBUG] Playboard collect failed after all retries: {last_error}')
    return []


async def _collect_youtube_cards(topic: str, keywords: List[str]) -> List[Dict]:
    query = f"{(keywords[0] if keywords else topic)} shorts"
    url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}&sp=EgIYAQ%253D%253D"
    print(f'[DEBUG] YouTube search → {url}')

    pool = _proxy_pool()
    attempts = max(len(pool), 1)

    for i in range(attempts):
        timeout_ms = FAIL_FAST_TIMEOUTS_MS[min(i, len(FAIL_FAST_TIMEOUTS_MS) - 1)]
        proxy = await _next_healthy_proxy() if pool else None
        if pool and not proxy:
            print('[DEBUG] No healthy proxy for YouTube collect')
            break

        proxy_cfg = _proxy_for_playwright(proxy)

        try:
            async with async_playwright() as p:
                launch_args = ['--no-default-browser-check']
                launch_kwargs = {'headless': SCRAPER_HEADLESS, 'args': launch_args}
                if proxy_cfg:
                    launch_kwargs['proxy'] = proxy_cfg

                browser = await p.chromium.launch(**launch_kwargs)
                context = await browser.new_context(
                    user_agent=random.choice(UA),
                    locale=SCRAPER_LOCALE,
                    timezone_id=SCRAPER_TIMEZONE,
                    viewport={'width': 1280 + random.randint(-80, 120), 'height': 900 + random.randint(-60, 80)},
                )
                page = await context.new_page()
                await page.add_init_script(
                    """
                    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                    Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
                    """
                )

                await page.goto(url, wait_until='domcontentloaded', timeout=timeout_ms)
                await asyncio.sleep(4)
                await human_scroll(page, 8)

                links = page.locator('a[href*="/shorts/"]')
                count = await links.count()
                print(f'[DEBUG] Found {count} shorts links')

                seen = set()
                out = []
                for j in range(min(count, 60)):
                    link = links.nth(j)
                    try:
                        href = await link.get_attribute('href')
                        if not href:
                            continue
                        full = href if href.startswith('http') else f'https://www.youtube.com{href}'
                        video_id = extract_youtube_id(full)
                        if not video_id or video_id in seen:
                            continue
                        seen.add(video_id)

                        title = ''
                        try:
                            title = (await link.inner_text(timeout=1000)).strip()
                        except Exception:
                            pass
                        if not title:
                            title = f'Shorts {video_id}'

                        out.append(
                            {
                                'title': title[:180],
                                'views': 100001,
                                'url': full,
                                'channel_name': 'youtube-channel',
                                'channel_id': f'yt-{video_id[:8]}',
                            }
                        )
                    except Exception:
                        continue

                await context.close()
                await browser.close()
                return out

        except PlaywrightTimeoutError:
            print(f'[DEBUG] YouTube goto timeout {timeout_ms}ms with proxy {_mask_proxy(proxy)} -> retry next proxy')
            continue
        except Exception as e:
            print(f'[DEBUG] YouTube collect failed with proxy {_mask_proxy(proxy)}: {e}')
            continue

    return []


async def _fetch_html(url: str, timeout_sec: int = 25) -> str:
    def _do_fetch() -> str:
        req = Request(url, headers={'User-Agent': random.choice(UA)})
        with urlopen(req, timeout=timeout_sec) as resp:
            return resp.read().decode('utf-8', errors='ignore')

    return await asyncio.to_thread(_do_fetch)


async def _resolve_dailyhaha_youtube_url(video_page_url: str) -> str:
    try:
        html = await _fetch_html(video_page_url, timeout_sec=20)
    except Exception as ex:
        print(f'[dailyhaha] fetch detail failed: {video_page_url} -> {ex}')
        return ''

    patterns = [
        r'"src"\s*:\s*"(https://www\.youtube\.com/watch\?v=[^"&]+)',
        r'"src"\s*:\s*"(https://www\.youtube\.com/embed/[^"?&]+)',
        r'src=\"(https://www\.youtube\.com/embed/[^"?&]+)',
        r'(https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11})',
        r'(https://youtu\.be/[A-Za-z0-9_-]{11})',
    ]

    for pattern in patterns:
        m = re.search(pattern, html, flags=re.IGNORECASE)
        if not m:
            continue
        url = m.group(1).replace('\\/', '/').replace('&amp;', '&')
        video_id = extract_youtube_id(url)
        if video_id and YOUTUBE_VIDEO_ID_RE.match(video_id):
            return f'https://www.youtube.com/watch?v={video_id}'

    return ''


async def _collect_dailyhaha_cards() -> List[Dict]:
    try:
        html = await _fetch_html(DAILYHAHA_HOME, timeout_sec=25)
    except Exception as ex:
        print(f'[dailyhaha] fetch home failed: {ex}')
        return []

    cards: List[Dict] = []
    seen = set()

    anchor_pattern = re.compile(
        r'<a\s+href=\"(?P<href>/[^\"]+)\"\s+class=\"item\s+video\"[^>]*>\s*'
        r'<div\s+class=\"info\">(?P<title>.*?)<div\s+class=\"views\">(?P<views>[0-9,]+)</div>.*?'
        r'<img\s+src=\"(?P<thumb>/[^\"]+)\"',
        flags=re.IGNORECASE | re.DOTALL,
    )

    for match in anchor_pattern.finditer(html):
        href = (match.group('href') or '').strip()
        title = re.sub(r'<[^>]+>', '', (match.group('title') or '')).strip()
        views_text = (match.group('views') or '').strip()
        thumb = (match.group('thumb') or '').strip()

        if not href or href in seen:
            continue
        seen.add(href)

        page_url = urljoin('https://www.dailyhaha.com', href)
        cards.append(
            {
                'title': title[:180],
                'views': parse_views(views_text),
                'url': page_url,
                'thumbnail': urljoin('https://www.dailyhaha.com', thumb) if thumb else '',
            }
        )

    print(f'[dailyhaha] collected {len(cards)} cards')
    return cards


async def discover_dailyhaha(topic: str):
    setting = get_or_create_settings()
    keywords = setting.get('keywords', {}).get(topic, [topic])
    # Dailyhaha: lấy tất, không filter theo views/topic nữa
    cards = await _collect_dailyhaha_cards()
    found = 0

    for card in cards:
        title = card.get('title', '')
        views = int(card.get('views', 0) or 0)
        page_url = card.get('url', '')

        # Chỉ cần có page_url hợp lệ, bỏ qua min_views và match_topic
        if not page_url:
            continue

        video_slug = page_url.rstrip('/').split('/')[-1].replace('.htm', '').strip()
        if not video_slug:
            continue


        existing = videos.find_one({'platform': 'dailyhaha', 'videoId': video_slug})
        if existing:
            continue

        youtube_url = await _resolve_dailyhaha_youtube_url(page_url)
        if not youtube_url:
            continue

        youtube_id = extract_youtube_id(youtube_url)
        if not youtube_id or not YOUTUBE_VIDEO_ID_RE.match(youtube_id):
            continue

        channel = upsert_channel('dailyhaha', DAILYHAHA_CHANNEL_ID, 'DailyHaha', topic)
        v = upsert_video(
            {
                'platform': 'dailyhaha',
                'videoId': video_slug,
                'title': title,
                'views': views,
                'url': youtube_url,
                'topic': topic,
                'thumbnail': card.get('thumbnail') or f'https://img.youtube.com/vi/{youtube_id}/maxresdefault.jpg',
                'channelId': channel['_id'],
            }
        )
        await enqueue(v['_id'], 1 if views > 1_000_000 else 5)
        found += 1

    print(f'[DailyHaha {topic}] -> queued {found} videos')
    return found


async def _douyin_has_captcha(page) -> bool:
    try:
        detected = await page.evaluate(
            """() => {
                const selectors = [
                    '.captcha-verify',
                    '.secsdk-captcha',
                    '[class*="captcha"]',
                    '[id*="captcha"]',
                ];
                for (const sel of selectors) {
                    if (document.querySelector(sel)) return true;
                }

                const text = (document.body?.innerText || '').toLowerCase();
                return text.includes('captcha') || text.includes('验证') || text.includes('安全验证') || text.includes('请完成验证');
            }"""
        )
        return bool(detected)
    except Exception:
        return False


def _log_douyin_captcha_event(topic: str, url: str, reason: str = '') -> None:
    log_job(
        'captcha',
        'paused_captcha',
        platform='douyin',
        topic=topic,
        error=reason or 'douyin captcha detected',
        source='douyin-search',
        targetUrl=url,
        resolved=False,
        resolvedAt=None,
    )


async def _collect_douyin_cards(topic: str) -> List[Dict]:
    keyword = DOUYIN_TOPIC_KEYWORDS.get(topic, topic)
    search_url = DOUYIN_SEARCH_BASE.format(keyword=quote(keyword))
    print(f'[douyin] search topic={topic} keyword={keyword} url={search_url}')

    cards: List[Dict] = []
    pool = _proxy_pool()
    attempts = max(len(pool), 1)

    for i in range(attempts):
        timeout_ms = FAIL_FAST_TIMEOUTS_MS[min(i, len(FAIL_FAST_TIMEOUTS_MS) - 1)]
        proxy = await _next_healthy_proxy() if pool else None
        if pool and not proxy:
            print('[douyin] no healthy proxy available')
            break

        proxy_cfg = _proxy_for_playwright(proxy) if proxy else None

        try:
            async with async_playwright() as p:
                launch_kwargs = {'headless': SCRAPER_HEADLESS, 'args': ['--no-default-browser-check']}
                if proxy_cfg:
                    launch_kwargs['proxy'] = proxy_cfg

                browser = await p.chromium.launch(**launch_kwargs)
                context = await browser.new_context(
                    user_agent=random.choice(UA),
                    locale=SCRAPER_LOCALE,
                    timezone_id=SCRAPER_TIMEZONE,
                    viewport={'width': 1366, 'height': 920},
                )
                page = await context.new_page()

                try:
                    await page.goto(search_url, wait_until='domcontentloaded', timeout=timeout_ms)
                    await asyncio.sleep(3)

                    if await _douyin_has_captcha(page):
                        _log_douyin_captcha_event(topic, search_url, 'captcha detected at page load')
                        print('[douyin] captcha detected at page load; waiting for manual resolve')
                        return []

                    await human_scroll(page, 8)

                    if await _douyin_has_captcha(page):
                        _log_douyin_captcha_event(topic, search_url, 'captcha detected after scroll')
                        print('[douyin] captcha detected after scroll; waiting for manual resolve')
                        return []

                    raw_cards = await page.evaluate(
                        """() => {
                            const normalize = (href) => {
                                if (!href) return '';
                                if (href.startsWith('http')) return href;
                                if (href.startsWith('//')) return `https:${href}`;
                                return `https://www.douyin.com${href}`;
                            };

                            const links = Array.from(document.querySelectorAll('a[href*="/video/"]'));
                            const out = [];
                            const seen = new Set();

                            for (const link of links) {
                                const videoUrl = normalize(link.getAttribute('href'));
                                if (!videoUrl || seen.has(videoUrl)) continue;
                                seen.add(videoUrl);

                                const card = link.closest('li, article, div');
                                const titleNode = card?.querySelector('h3, h4, [data-e2e*="desc"], [data-e2e*="title"]');
                                const title = (titleNode?.textContent || link.textContent || '').trim();

                                const channelLink = card?.querySelector('a[href*="/user/"]');
                                const channelUrl = normalize(channelLink?.getAttribute('href') || '');
                                const channelName = (channelLink?.textContent || '').trim();

                                out.push({
                                    url: videoUrl,
                                    title,
                                    channel_url: channelUrl,
                                    channel_name: channelName,
                                });

                                if (out.length >= 80) break;
                            }

                            return out;

                        }"""
                    )

                    for item in raw_cards or []:
                        url = str(item.get('url') or '').strip()
                        video_id = extract_douyin_id(url)
                        if not url or not video_id.isdigit():
                            continue

                        channel_url = str(item.get('channel_url') or '').strip()
                        channel_match = re.search(r'/user/([^/?]+)', channel_url)
                        channel_id = channel_match.group(1) if channel_match else f'dy-{video_id[:8]}'

                        title = str(item.get('title') or '').strip()
                        cards.append({
                            'video_id': video_id,
                            'url': f'https://www.douyin.com/video/{video_id}',
                            'title': title[:180] if title else f'Douyin video {video_id}',
                            'views': 100001,
                            'channel_id': channel_id,
                            'channel_name': str(item.get('channel_name') or '').strip() or f'douyin-{channel_id[:12]}',
                            'thumbnail': '',
                        })

                    print(f'[douyin] collected {len(cards)} cards for topic={topic}')
                finally:
                    await context.close()
                    await browser.close()

                if cards:
                    break

        except PlaywrightTimeoutError:
            print(f'[douyin] timeout {timeout_ms}ms with proxy {_mask_proxy(proxy)}')
            continue
        except Exception as ex:
            print(f'[douyin] collect failed with proxy {_mask_proxy(proxy)}: {ex}')
            continue

    return cards


async def discover_douyin(topic: str):
    setting = get_or_create_settings()
    keywords = setting.get('keywords', {}).get(topic, [topic])
    cards = await _collect_douyin_cards(topic)
    found = 0

    for card in cards:
        title = card.get('title', '')
        if not match_topic(title, topic, keywords) and topic != 'funny':
            # Topic Chinese keyword đã lọc theo query; vẫn giữ check title cho đồng nhất
            continue

        video_id = card.get('video_id', '')
        if not video_id:
            continue

        existing = videos.find_one({'platform': 'douyin', 'videoId': video_id})
        if existing:
            continue

        channel = upsert_channel('douyin', card.get('channel_id') or f'dy-{video_id[:8]}', card.get('channel_name') or 'douyin-channel', topic)
        v = upsert_video(
            {
                'platform': 'douyin',
                'videoId': video_id,
                'title': title,
                'views': int(card.get('views', 100001) or 100001),
                'url': card.get('url') or f'https://www.douyin.com/video/{video_id}',
                'topic': topic,
                'thumbnail': card.get('thumbnail') or f'https://p3-dy.byteimg.com/obj/bytedance-obj/dybase/img/{video_id}',
                'channelId': channel['_id'],
            }
        )
        await enqueue(v['_id'], 5)
        found += 1

    print(f'[Douyin {topic}] -> queued {found} videos')
    return found


async def discover_playboard(config: Dict, topic: str):
    setting = get_or_create_settings()
    # Giảm default minViews cho Playboard xuống 200k như yêu cầu
    min_views = int(setting.get('minViewsFilter', 200000) or 200000)
    topic_keywords = setting.get('keywords', {}).get(topic, [topic])

    url = build_playboard_url(config)
    print(f"[discover_playboard] Collecting cards from {url[:80]}...")
    cards = await _collect_playboard_cards(url)
    print(f"[discover_playboard] Collected {len(cards) if cards else 0} cards from Playboard")

    # Filter ONLY by views + valid url (không bắt buộc match topic cho Playboard)
    filtered_cards = []
    for i, card in enumerate(cards or []):
        title = card.get('title', '')
        views = card.get('views', 0)
        video_url = card.get('url', '')

        if views < min_views or not video_url:
            print(f"[discover_playboard] Card {i+1}: Filtered (views={views:,}, url={bool(video_url)})")
            continue

        # Không cần check match_topic nữa để flexible hơn
        filtered_cards.append(card)
        print(f"[discover_playboard] Card {i+1}: Passed filter - {title[:40]}")

    print(f"[discover_playboard] {len(filtered_cards)} cards passed filters for topic {topic}")

    # Process filtered cards (save channels, videos, queue download)
    if filtered_cards:
        result = await process_playboard_cards(filtered_cards, topic)
        found = result.get('success', 0)
        queued = result.get('queued', 0)
        failed = result.get('failed', 0)
    else:
        print(f"[discover_playboard] No cards to process, skipping")
        found = 0
        queued = 0
        failed = 0

    print(f"[Playboard {topic} | {config.get('category')} {config.get('country')} {config.get('period')}] -> Found {found} videos, Queued {queued} for download")
    return {
        'status': 'success' if found > 0 or queued > 0 else 'no_matches',
        'itemsFound': found,
        'itemsQueued': queued,
        'failedTopics': failed,
        'topic': topic
    }



async def discover_youtube(topic: str):
    setting = get_or_create_settings()
    min_views = setting.get('minViewsFilter', 100000)
    keywords = setting.get('keywords', {}).get(topic, [topic])
    cards = await _collect_youtube_cards(topic, keywords)

    found = 0
    for card in cards:
        title = card.get('title', '')
        views = card.get('views', 0)
        video_url = card.get('url', '')
        if views < min_views or not video_url:
            continue
        if not match_topic(title, topic, keywords):
            continue

        video_id = extract_youtube_id(video_url)
        if not video_id:
            continue

        # Save mới nếu chưa có, đã có thì bỏ qua
        existing = videos.find_one({'platform': 'youtube', 'videoId': video_id})
        if existing:
            continue

        ch = upsert_channel('youtube', card.get('channel_id') or f'yt-{video_id[:8]}', card.get('channel_name') or 'youtube-channel', topic)
        v = upsert_video(
            {
                'platform': 'youtube',
                'videoId': video_id,
                'title': title,
                'views': views,
                'url': video_url,
                'topic': topic,
                'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
                'channelId': ch['_id'],
            }
        )
        await enqueue(v['_id'], 1 if views > 1_000_000 else 5)
        found += 1

    return found


async def discover_all():
    started = time.time()
    setting = get_or_create_settings()
    if not setting.get('isEnabled', True):
        return {'skipped': True}

    found = 0
    try:
        discover_sources = setting.get('discoverSources', {}) or {}
        use_playboard = discover_sources.get('playboard', True)
        use_youtube = discover_sources.get('youtube', True)
        use_dailyhaha = discover_sources.get('dailyhaha', True)
        use_douyin = discover_sources.get('douyin', False)

        # Get active configs sorted by priority
        configs = setting.get('playboardConfigs', [])
        if not configs:
            # Fallback to defaults if no configs in DB
            configs = [
                {'dimension': 'most-viewed', 'category': 'All', 'country': 'Worldwide', 'period': 'weekly', 'isActive': True, 'priority': 10},
                {'dimension': 'most-viewed', 'category': 'Howto & Style', 'country': 'Viet Nam', 'period': 'weekly', 'isActive': True, 'priority': 8},
            ]

        # Filter only active configs and sort by priority (highest first)
        active_configs = [c for c in configs if c.get('isActive', True)]
        active_configs.sort(key=lambda x: x.get('priority', 5), reverse=True)

        print(
            '[DEBUG] Running discover with '
            f'{len(active_configs)} active configs '
            f'| sources: playboard={use_playboard}, youtube={use_youtube}, dailyhaha={use_dailyhaha}, douyin={use_douyin}'
        )

        # 1) Playboard: chạy theo từng config (category/country/period), không loop theo từng topic
        if use_playboard:
            for cfg in active_configs:
                await asyncio.sleep(12 + random.random() * 5)
                try:
                    topic_label = f"playboard-{cfg.get('category', 'All')}-{cfg.get('country', 'Worldwide')}-{cfg.get('period', 'weekly')}"
                    print(
                        f"[DEBUG] Discovering Playboard with config: {cfg.get('category')} / {cfg.get('country')} / {cfg.get('period')} -> topic={topic_label}"
                    )
                    result = await discover_playboard(cfg, topic_label)
                    found += int(result.get('itemsFound', 0))
                except Exception as e:
                    print(f"[DEBUG] discover_playboard failed: {e}")

        # 2) Các nguồn khác vẫn loop theo TOPICS
        for topic in TOPICS:
            try:
                if use_youtube:
                    found += await discover_youtube(topic)
            except Exception as e:
                print(f"[DEBUG] discover_youtube failed: {e}")
            try:
                if use_dailyhaha:
                    found += await discover_dailyhaha(topic)
            except Exception as e:
                print(f"[DEBUG] discover_dailyhaha failed: {e}")
            try:
                if use_douyin:
                    found += await discover_douyin(topic)
            except Exception as e:
                print(f"[DEBUG] discover_douyin failed: {e}")


        log_job('discover', 'success', itemsFound=found, duration=int((time.time() - started) * 1000))
        return {'success': True, 'itemsFound': found}
    except Exception as ex:
        log_job('discover', 'failed', itemsFound=found, duration=int((time.time() - started) * 1000), error=str(ex))
        raise


async def scan_single_channel(channel, use_proxy: bool = True, headless_override: bool | None = None):
    setting = get_or_create_settings()
    min_views = setting.get('minViewsFilter', 100000)

    channel_id = channel.get('channelId', '')
    platform = channel.get('platform', 'youtube')

    if platform == 'youtube':
        # Support both handle (@channel) and channel ID (UCxxxx)
        if channel_id.startswith('@'):
            handle = channel_id[1:]
            target_url = f'https://www.youtube.com/@{handle}/shorts'
        elif channel_id.startswith('UC'):
            target_url = f'https://www.youtube.com/channel/{channel_id}/shorts'
        else:
            # Fallback: treat as handle without @
            target_url = f'https://www.youtube.com/@{channel_id}/shorts'
        link_selector = 'a[href*="/shorts/"]'
    elif platform == 'douyin':
        target_url = f'https://www.douyin.com/user/{channel_id}'
        link_selector = 'a[href*="/video/"]'
    else:
        target_url = f'https://www.facebook.com/{channel_id}/reels'
        link_selector = 'a[href*="/reel/"]'

    print(f"[DEBUG] Scan target URL for {channel_id}: {target_url}")

    pool = _proxy_pool() if use_proxy else []
    attempts = max(len(pool), 1)
    found = 0

    for i in range(attempts):
        timeout_ms = FAIL_FAST_TIMEOUTS_MS[min(i, len(FAIL_FAST_TIMEOUTS_MS) - 1)]
        proxy = await _next_healthy_proxy() if pool else None
        if pool and not proxy:
            print(f'[DEBUG] No healthy proxy for scan channel {channel_id}')
            break

        proxy_cfg = _proxy_for_playwright(proxy) if proxy else None

        try:
            async with async_playwright() as p:
                launch_kwargs = {
                    'headless': SCRAPER_HEADLESS if headless_override is None else headless_override,
                    'args': ['--no-default-browser-check'],
                }
                if proxy_cfg:
                    launch_kwargs['proxy'] = proxy_cfg

                browser = await p.chromium.launch(**launch_kwargs)
                context = await browser.new_context(
                    user_agent=random.choice(UA),
                    locale=SCRAPER_LOCALE,
                    timezone_id=SCRAPER_TIMEZONE,
                    viewport={'width': 1280, 'height': 900},
                )
                page = await context.new_page()

                try:
                    await page.goto(target_url, wait_until='domcontentloaded', timeout=timeout_ms)
                    await asyncio.sleep(4)
                    await human_scroll(page, 8)

                    links = page.locator(link_selector)
                    count = await links.count()
                    print(f'[DEBUG] Scan channel {channel_id}: {count} links')

                    seen = set()
                    for j in range(min(count, 40)):
                        try:
                            href = await links.nth(j).get_attribute('href')
                            if not href:
                                continue
                            full = href if href.startswith('http') else (
                                f'https://www.youtube.com{href}' if platform == 'youtube' else (
                                    f'https://www.douyin.com{href}' if platform == 'douyin' else f'https://www.facebook.com{href}'
                                )
                            )
                            if platform == 'youtube':
                                video_id = extract_youtube_id(full)
                            elif platform == 'douyin':
                                video_id = extract_douyin_id(full)
                            else:
                                video_id = extract_reel_id(full)
                            if not video_id or video_id in seen:
                                continue
                            seen.add(video_id)

                            existing = videos.find_one({'platform': platform, 'videoId': video_id})
                            if existing and existing.get('downloadStatus') == 'done':
                                continue

                            topic_value = channel.get('topics', 'hai')
                            if isinstance(topic_value, list):
                                topic_value = topic_value[0] if topic_value else 'hai'

                            v = upsert_video(
                                {
                                    'platform': platform,
                                    'videoId': video_id,
                                    'title': f'{platform} video {video_id}',
                                    'views': max(min_views, 100001),
                                    'url': full,
                                    'topic': topic_value,
                                    'thumbnail': '',
                                    'channelId': str(channel['_id']),
                                }
                            )
                            await enqueue(v['_id'], 5)
                            found += 1
                        except Exception:
                            continue

                finally:
                    await context.close()
                    await browser.close()

                break

        except PlaywrightTimeoutError:
            print(f'[DEBUG] scan goto timeout {timeout_ms}ms for {channel_id} with proxy {_mask_proxy(proxy)} -> retry next proxy')
            continue
        except Exception as e:
            print(f'[DEBUG] scan failed for {channel_id} with proxy {_mask_proxy(proxy)}: {e}')
            continue

    channels.update_one({'_id': channel['_id']}, {'$set': {'lastScanned': datetime.utcnow(), 'updatedAt': datetime.utcnow()}})
    return found


async def scan_all_channels(use_proxy: bool = True, headless_override: bool | None = None):
    started = time.time()
    setting = get_or_create_settings()
    if not setting.get('isEnabled', True):
        return {'skipped': True}

    found = 0
    try:
        for c in channels.find({'isActive': True}).sort([('priority', -1)]).limit(100):
            found += await scan_single_channel(c, use_proxy=use_proxy, headless_override=headless_override)

        log_job('scan-channel', 'success', itemsFound=found, duration=int((time.time() - started) * 1000))
        return {'success': True, 'itemsFound': found}
    except Exception as ex:
        log_job('scan-channel', 'failed', itemsFound=found, duration=int((time.time() - started) * 1000), error=str(ex))
        raise



def build_download_path(video):
    d = datetime.utcnow().strftime('%Y-%m-%d')
    return os.path.join(DOWNLOAD_ROOT, video['platform'], video.get('topics', 'misc'), d, f"{video['videoId']}.mp4")


def _is_valid_download_target(doc: Dict) -> tuple[bool, str]:
    platform = (doc.get('platform') or '').lower()
    video_id = str(doc.get('videoId') or '').strip()
    url = str(doc.get('url') or '').strip()

    if not url:
        return False, 'missing url'

    if platform == 'youtube' and not YOUTUBE_VIDEO_ID_RE.match(video_id):
        return False, f'invalid youtube videoId: {video_id}'

    return True, ''


async def cleanup_invalid_youtube_records(limit: int = 1000) -> dict:
    """Delete obviously invalid YouTube records (e.g. test IDs, wrong format)."""
    # Match any youtube platform with malformed videoId (not 11-char ID) or test urls
    query = {
        'platform': 'youtube',
        '$or': [
            {'videoId': {'$not': YOUTUBE_VIDEO_ID_RE}},
            {'url': {'$regex': 'test_video', '$options': 'i'}},
            {'title': {'$regex': 'test', '$options': 'i'}},
        ],
    }

    invalid_docs = list(videos.find(query, {'_id': 1, 'videoId': 1, 'url': 1}).limit(limit))
    if not invalid_docs:
        return {'deleted': 0, 'matched': 0}

    invalid_ids = [doc['_id'] for doc in invalid_docs]
    res = videos.delete_many({'_id': {'$in': invalid_ids}})

    log_job(
        'cleanup-invalid-youtube',
        'success',
        deleted=res.deleted_count,
        matched=len(invalid_docs),
    )

    return {'deleted': res.deleted_count, 'matched': len(invalid_docs)}


def _desired_worker_count() -> int:
    setting = get_or_create_settings() or {}
    configured = int(setting.get('maxConcurrentDownload') or 1)
    return max(1, configured)


async def reset_orphaned_downloads() -> dict:
    result = videos.update_many(
        {
            '$or': [
                {'downloadStatus': 'downloading'},
                {'queueState': {'$in': ['queued', 'downloading', 'retry-pending']}},
            ]
        },
        {
            '$set': {
                'downloadStatus': 'pending',
                'queueState': 'pending',
                'updatedAt': datetime.utcnow(),
            }
        },
    )
    queued_video_ids.clear()
    processing_video_ids.clear()
    return {'reset': result.modified_count}


async def enqueue(video_id, priority=5, attempts=0, force=False):
    video_id = str(video_id)
    doc = videos.find_one({'_id': ObjectId(video_id)}, {'downloadStatus': 1})
    if not doc:
        return False

    current_status = str(doc.get('downloadStatus') or '').lower()
    if not force and current_status in {'done', 'downloading'}:
        return False

    if not force and (video_id in queued_video_ids or video_id in processing_video_ids):
        return False

    queued_video_ids.add(video_id)
    videos.update_one(
        {'_id': ObjectId(video_id)},
        {
            '$set': {
                'queueState': 'queued',
                'lastQueuedAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow(),
            }
        },
    )
    await queue.put((priority, video_id, attempts))
    return True


async def start_worker():
    target_count = _desired_worker_count()
    while len(worker_tasks) < target_count:
        worker_index = len(worker_tasks) + 1
        worker_tasks.append(asyncio.create_task(_worker_loop(worker_index)))


async def _worker_loop(worker_index: int):
    global running_jobs
    while True:
        _, video_id, attempts = await queue.get()
        queued_video_ids.discard(str(video_id))
        processing_video_ids.add(str(video_id))
        running_jobs += 1
        try:
            await process_download(video_id, attempts)
        finally:
            processing_video_ids.discard(str(video_id))
            running_jobs -= 1
            queue.task_done()


async def process_download(video_id, attempts):
    started = time.time()
    doc = videos.find_one({'_id': ObjectId(video_id)})
    if not doc:
        return

    try:
        is_valid, invalid_reason = _is_valid_download_target(doc)
        if not is_valid:
            videos.update_one(
                {'_id': doc['_id']},
                {'$set': {'downloadStatus': 'failed', 'queueState': 'failed', 'failReason': invalid_reason, 'updatedAt': datetime.utcnow()}},
            )
            log_job(
                'download',
                'failed',
                platform=doc.get('platform'),
                topic=doc.get('topics'),
                duration=int((time.time() - started) * 1000),
                error=invalid_reason,
            )
            return

        videos.update_one(
            {'_id': doc['_id']},
            {
                '$set': {
                    'downloadStatus': 'downloading',
                    'queueState': 'downloading',
                    'downloadAttempts': attempts + 1,
                    'updatedAt': datetime.utcnow(),
                }
            },
        )
        out = build_download_path(doc)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        format_candidates = [
            'bv*[height<=1080]+ba/b[height<=1080]/best[height<=1080]',
            'bv*+ba/b/best',
            'best',
        ]
        last_reason = ''

        for format_selector in format_candidates:
            cmd = [
                'yt-dlp',
                doc['url'],
                '-f',
                format_selector,
                '-o',
                out,
                '--no-warnings',
                '--no-playlist',
                '--socket-timeout',
                '20',
                '--retries',
                '1',
                '--fragment-retries',
                '1',
                '--write-thumbnail',
                '--write-description',
            ]
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                out_bytes, err_bytes = await asyncio.wait_for(proc.communicate(), timeout=YTDLP_TIMEOUT_SEC)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.communicate()
                raise RuntimeError(f'yt-dlp timeout after {YTDLP_TIMEOUT_SEC}s')

            if proc.returncode == 0:
                last_reason = ''
                break

            err_text = (err_bytes or b'').decode('utf-8', errors='ignore').strip()
            out_text = (out_bytes or b'').decode('utf-8', errors='ignore').strip()
            last_reason = (err_text or out_text or f'yt-dlp code {proc.returncode}')[-2000:]
            format_unavailable = 'Requested format is not available' in last_reason
            if not format_unavailable:
                break

        if last_reason:
            raise RuntimeError(last_reason)

        videos.update_one(
            {'_id': doc['_id']},
            {
                '$set': {
                    'downloadStatus': 'done',
                    'queueState': 'done',
                    'localPath': out,
                    'downloadedAt': datetime.utcnow(),
                    'failReason': '',
                    'updatedAt': datetime.utcnow(),
                }
            },
        )
        
        # 💾 Upload to Google Drive
        try:
            platform = (doc.get('platform') or 'unknown').lower()
            await upload_video_after_download(doc['_id'], out, platform)
        except Exception as upload_err:
            print(f"⚠️  Google Drive upload error (non-fatal): {upload_err}")
        
        log_job(
            'download',
            'success',
            platform=doc.get('platform'),
            topic=doc.get('topics'),
            itemsDownloaded=1,
            duration=int((time.time() - started) * 1000),
        )
    except Exception as ex:
        retry = attempts < 2
        videos.update_one(
            {'_id': doc['_id']},
            {
                '$set': {
                    'downloadStatus': 'pending' if retry else 'failed',
                    'queueState': 'retry-pending' if retry else 'failed',
                    'failReason': str(ex),
                    'updatedAt': datetime.utcnow(),
                }
            },
        )
        log_job(
            'download',
            'partial' if retry else 'failed',
            platform=doc.get('platform'),
            topic=doc.get('topics'),
            duration=int((time.time() - started) * 1000),
            error=str(ex),
        )
        if retry:
            await enqueue(str(doc['_id']), 5, attempts + 1, force=True)


def queue_stats():
    return {
        'queued': queue.qsize(),
        'running': running_jobs,
        'started': bool(worker_tasks),
        'engine': SCRAPER_ENGINE,
        'workers': len(worker_tasks),
        'uniqueQueuedVideos': len(queued_video_ids),
        'processingVideos': len(processing_video_ids),
        'persistedQueued': videos.count_documents({'queueState': 'queued'}),
        'persistedRunning': videos.count_documents({'queueState': 'downloading'}),
    }


async def process_playboard_cards(cards: List[Dict], topic: str):
    """
    Process Playboard cards:
    1. Save/Update channel records
    2. Save/Update video records
    3. Queue videos for download
    
    Args:
        cards: List of video cards extracted from Playboard
        topic: Topic category (e.g. 'viral-shorts', 'trending-videos')
    """
    if not cards:
        print('[INFO] No cards to process')
        return {'success': 0, 'failed': 0, 'queued': 0}
    
    success = 0
    failed = 0
    queued = 0
    
    print(f'[INFO] Processing {len(cards)} Playboard cards for topic: {topic}')
    
    for i, card in enumerate(cards, 1):
        try:
            # Extract video ID and channel ID
            video_id = card.get('video_id', '')
            channel_id = card.get('channel_id', '') or f'yt-{video_id[:12]}'
            channel_name = card.get('channel_name', '') or 'YouTube Channel'
            title = card.get('title', 'Untitled Video')
            views = card.get('views', 0)
            youtube_url = card.get('youtube_url') or f'https://www.youtube.com/watch?v={video_id}'
            
            if not video_id:
                print(f'[WARN] Card {i}: Missing video_id, skipping')
                failed += 1
                continue
            
            # 1️⃣ Save/Update Channel
            channel = None
            channel_obj_id = None
            try:
                channel = upsert_channel('youtube', channel_id, channel_name, topic)
                if channel:
                    channel_obj_id = str(channel['_id'])
                    print(f'[OK] Card {i}: Channel saved - {channel_name} ({channel_id})')
                else:
                    print(f'[WARN] Card {i}: Channel upsert returned None')
                    failed += 1
                    continue
            except Exception as ch_err:
                print(f'[WARN] Card {i}: Failed to save channel - {ch_err}')
                failed += 1
                continue  # Skip video if channel save fails
            
            if not channel_obj_id:
                print(f'[WARN] Card {i}: No channel ObjectId available')
                failed += 1
                continue
            
            # 2️⃣ Save/Update Video
            try:
                video_payload = {
                    'platform': 'youtube',
                    'source': 'playboard',
                    'videoId': video_id,
                    'title': title[:200],
                    'views': views,
                    'url': youtube_url,
                    'topic': topic,
                    'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
                    'channelId': channel_obj_id,
                }
                video = upsert_video(video_payload)
                print(f'[OK] Card {i}: Video saved - {title[:50]}... ({video_id})')
                
                # 3️⃣ Queue for download
                if video:
                    video_id_str = str(video['_id'])
                    accepted = await enqueue(video_id_str, 0)
                    if accepted:
                        queued += 1
                        print(f'[OK] Card {i}: Queued for download')
                    else:
                        print(f'[OK] Card {i}: Already queued or processing')
                
                success += 1
                
            except Exception as vid_err:
                print(f'[WARN] Card {i}: Failed to save video - {vid_err}')
                failed += 1
        
        except Exception as e:
            print(f'[ERROR] Card {i}: {e}')
            failed += 1
    
    result = {'success': success, 'failed': failed, 'queued': queued}
    print(f'[SUMMARY] Processed {len(cards)} cards: {success} saved, {failed} failed, {queued} queued for download')
    
    return result
