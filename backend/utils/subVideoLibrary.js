import { extractFolderId } from '../services/publicDriveFolderIngestService.js';

export const DEFAULT_SUB_VIDEO_LIBRARY_SOURCE = Object.freeze({
  key: 'public-video-reels',
  name: 'Public Video Reels Library',
  sourceType: 'public-drive-folder',
  url: 'https://drive.google.com/drive/folders/1PlCs1HxhzulF8tzO80wiJSVM2fzAhI7A',
  folderId: '1PlCs1HxhzulF8tzO80wiJSVM2fzAhI7A',
  enabled: true,
  isDefault: true,
  maxDepth: 3,
  visibility: 'public-web',
  themeHints: ['motivation', 'luxury', 'motherhood', 'health', 'funny-animal', 'product'],
  recommendedTemplateGroups: ['shorts', 'highlight', 'reaction', 'cinematic', 'marketing', 'viral'],
  notes: 'Default public sub-video library source for mashup and shorts automation.',
});

export const PEXELS_SUB_VIDEO_LIBRARY_SOURCE = Object.freeze({
  key: 'pexels-sub-library',
  name: 'Pexels Sub Library',
  sourceType: 'public-drive-folder',
  url: 'https://drive.google.com/drive/folders/17szLdP2uhj4Qco4FQXIcoZWTpaHI43zC',
  folderId: '17szLdP2uhj4Qco4FQXIcoZWTpaHI43zC',
  enabled: true,
  isDefault: false,
  maxDepth: 3,
  visibility: 'public-web',
  themeHints: ['product', 'fitness', 'health', 'luxury', 'viral', 'general'],
  recommendedTemplateGroups: ['shorts', 'reaction', 'highlight', 'marketing', 'cinematic'],
  notes: 'Pexels sub-video library auto-ingested from scraper uploads.',
});

const DEFAULT_LIBRARY_SOURCES = [
  DEFAULT_SUB_VIDEO_LIBRARY_SOURCE,
  PEXELS_SUB_VIDEO_LIBRARY_SOURCE,
];

export function normalizeSubVideoLibrarySources(input = []) {
  const items = Array.isArray(input) ? input : [];
  const normalized = [];
  const seen = new Set();

  for (const item of items) {
    const key = String(item?.key || item?.folderId || item?.url || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    const folderId = extractFolderId(item?.folderId || item?.url || '');
    const dedupeKey = key || folderId || String(item?.url || '').trim();
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    normalized.push({
      key: key || DEFAULT_SUB_VIDEO_LIBRARY_SOURCE.key,
      name: String(item?.name || '').trim() || 'Sub-video library source',
      sourceType: String(item?.sourceType || 'public-drive-folder').trim() || 'public-drive-folder',
      url: String(item?.url || '').trim(),
      folderId,
      enabled: item?.enabled !== false,
      isDefault: item?.isDefault === true,
      maxDepth: Math.min(6, Math.max(1, Number(item?.maxDepth) || 3)),
      visibility: String(item?.visibility || 'public-web').trim() || 'public-web',
      themeHints: Array.from(new Set((Array.isArray(item?.themeHints) ? item.themeHints : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean))).slice(0, 12),
      recommendedTemplateGroups: Array.from(new Set((Array.isArray(item?.recommendedTemplateGroups) ? item.recommendedTemplateGroups : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean))).slice(0, 12),
      notes: String(item?.notes || '').trim(),
    });
  }

  const withDefault = normalized.length ? normalized : DEFAULT_LIBRARY_SOURCES.map((item) => ({ ...item }));
  const ensured = DEFAULT_LIBRARY_SOURCES.reduce((acc, source) => {
    const key = source.key;
    if (!acc.some((item) => item.key === key || item.folderId === source.folderId)) {
      acc.push({ ...source });
    }
    return acc;
  }, [...withDefault]);
  const hasDefault = ensured.some((item) => item.isDefault && item.enabled !== false);

  return ensured.map((item, index) => ({
    ...item,
    isDefault: hasDefault ? item.isDefault === true : index === 0,
  }));
}
