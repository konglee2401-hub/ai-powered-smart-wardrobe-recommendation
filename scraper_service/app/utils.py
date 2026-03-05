import re
from datetime import datetime

TOPICS = ['funny', 'hai', 'dance', 'sexy dance', 'cooking']


def now_utc():
    return datetime.utcnow()


def parse_views(text: str) -> int:
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


def extract_youtube_id(url: str) -> str:
    m = re.search(r'[?&]v=([^&]+)', url or '')
    if m:
        return m.group(1)
    m = re.search(r'youtu\.be/([^?&/]+)', url or '')
    if m:
        return m.group(1)
    m = re.search(r'/embed/([^?&/]+)', url or '')
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
    normalized_topic = (topic or '').strip().lower()

    # Ưu tiên keyword list cấu hình trong settings
    if any((k or '').lower() in t for k in (keywords or [])):
        return True

    # Bổ sung thêm nhiều keyword phổ biến: viral, shorts, comedy, laugh, vlog, v.v.
    topic_patterns = {
        'funny': r'funny|comedy|hài|meme|joke|lol|laugh|laughs|lmao|rofl|viral|viral\s*video|shorts|skit|prank',
        'hai': r'funny|comedy|hài|meme|joke|lol|cười|hài hước|viral|shorts|truyện cười',
        'dance': r'dance|nhảy|vũ đạo|choreo|choreography|kpop|tiktok\s*dance|viral\s*dance',
        'sexy dance': r'sexy\s*dance|hot\s*dance|tiktok\s*dance|dance|nhảy|vũ đạo|sexy|gợi cảm',
        'cooking': r'cook|cooking|recipe|nấu|món|bếp|food|chef|kitchen|ăn ngon',
    }

    pattern = topic_patterns.get(normalized_topic)
    if pattern:
        return bool(re.search(pattern, t))

    return False




def extract_douyin_id(url: str) -> str:
    raw = (url or '').strip()
    if not raw:
        return ''

    patterns = [
        r'/video/([0-9]+)',
        r'/note/([0-9]+)',
        r'/share/video/([0-9]+)',
        r'modal_id=([0-9]+)',
        r'item_id=([0-9]+)',
    ]

    for p in patterns:
        m = re.search(p, raw)
        if m:
            return m.group(1)

    return raw if raw.isdigit() else ''
