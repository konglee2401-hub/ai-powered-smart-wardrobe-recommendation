import re
from datetime import datetime

TOPICS = ['hai', 'dance', 'cooking']


def now_utc():
    return datetime.utcnow()


def parse_metric(text: str) -> int:
    s = (text or '').replace(',', '').upper()
    m = re.search(r'([0-9]*\.?[0-9]+)\s*([KMB])?', s)
    if not m:
        return 0
    v = float(m.group(1))
    u = m.group(2)
    if u == 'K':
        return round(v * 1_000)
    if u == 'M':
        return round(v * 1_000_000)
    if u == 'B':
        return round(v * 1_000_000_000)
    return round(v)


def parse_views(text: str) -> int:
    return parse_metric(text)


def parse_followers(text: str) -> int:
    # Heuristic: detect nearby "followers/subscribers/đăng ký"
    t = (text or '').lower()
    patterns = [
        r'([0-9]*\.?[0-9]+\s*[kmb]?)\s*(followers|follower)',
        r'([0-9]*\.?[0-9]+\s*[kmb]?)\s*(subscribers|subscriber|đăng ký)',
    ]
    for p in patterns:
        m = re.search(p, t)
        if m:
            return parse_metric(m.group(1))
    return 0


def extract_youtube_id(url: str) -> str:
    m = re.search(r'[?&]v=([^&]+)', url or '')
    if m:
        return m.group(1)
    m = re.search(r'/shorts/([^?&/]+)', url or '')
    if m:
        return m.group(1)
    return url


def extract_reel_id(url: str) -> str:
    m = re.search(r'/reel/([0-9]+)', url or '')
    return m.group(1) if m else url


def match_topic(text: str, topic: str, keywords: list[str]) -> bool:
    t = (text or '').lower()
    if any((k or '').lower() in t for k in (keywords or [])):
        return True
    if topic == 'hai':
        return bool(re.search(r'funny|comedy|hài|meme', t))
    if topic == 'dance':
        return bool(re.search(r'dance|nhảy|vũ đạo|choreo', t))
    return bool(re.search(r'cook|recipe|nấu|món|bếp', t))
