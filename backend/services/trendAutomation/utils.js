export const TOPICS = ['hai', 'dance', 'cooking'];

export function parseViews(text = '') {
  const normalized = String(text).trim().replace(/,/g, '').toUpperCase();
  const match = normalized.match(/([0-9]*\.?[0-9]+)\s*([KMB])?/);
  if (!match) return 0;

  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 'K') return Math.round(value * 1_000);
  if (unit === 'M') return Math.round(value * 1_000_000);
  if (unit === 'B') return Math.round(value * 1_000_000_000);
  return Math.round(value);
}

export function extractYouTubeVideoId(url = '') {
  const short = url.match(/[?&]v=([^&]+)/)?.[1];
  if (short) return short;

  const ytShort = url.match(/\/shorts\/([^?&/]+)/)?.[1];
  if (ytShort) return ytShort;

  return url;
}

export function extractFacebookReelId(url = '') {
  return url.match(/\/reel\/([0-9]+)/)?.[1] || url;
}

export function buildDownloadPath(video) {
  const date = new Date().toISOString().slice(0, 10);
  return `downloads/${video.platform}/${video.topic}/${date}/${video.videoId}.mp4`;
}

export function matchTopic(title = '', topic, keywords = []) {
  const haystack = title.toLowerCase();
  if (keywords.some((k) => haystack.includes(String(k).toLowerCase()))) return true;

  if (topic === 'hai') return /funny|comedy|hài|tấu hài|meme/.test(haystack);
  if (topic === 'dance') return /dance|nhảy|choreography|vũ đạo/.test(haystack);
  return /cook|recipe|nấu|bếp|món/.test(haystack);
}
