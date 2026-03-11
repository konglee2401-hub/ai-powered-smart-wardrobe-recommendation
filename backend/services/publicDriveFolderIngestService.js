import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import videoMashupService from './videoMashupService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, '..');
const PUBLIC_DRIVE_BASE = 'https://drive.google.com';
const PUBLIC_DRIVE_DOWNLOAD_BASE = 'https://drive.usercontent.google.com/download';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const VIDEO_MIME_PREFIX = 'video/';
const MANIFEST_CACHE_TTL_MS = 15 * 60 * 1000;
const DOWNLOAD_CACHE_DIR = path.join(BACKEND_ROOT, 'media', 'video-factory-cache', 'public-drive');
const DISK_CACHE_DIR = path.join(DOWNLOAD_CACHE_DIR, 'manifests');
const DISK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const manifestCache = new Map();
const selectionHistoryCache = new Map(); // Track last selected videos per source
const MAX_HISTORY_SIZE = 50; // Track last 50 selections

function buildManifestCacheKey(folderId, maxDepth, maxFolders) {
  return `${folderId}:${maxDepth}:${maxFolders}`;
}

function getManifestCachePath(folderId, maxDepth, maxFolders) {
  const safeFolderId = String(folderId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '');
  const key = buildManifestCacheKey(safeFolderId, maxDepth, maxFolders)
    .replace(/[:]/g, '-')
    .slice(0, 120);
  return path.join(DISK_CACHE_DIR, `${key}.json`);
}

function resolveDiskCacheTtlMs(options = {}) {
  if (Number.isFinite(options.cacheTtlMs)) return Math.max(0, Number(options.cacheTtlMs));
  if (Number.isFinite(options.cacheTtlHours)) return Math.max(0, Number(options.cacheTtlHours) * 60 * 60 * 1000);
  if (Number.isFinite(options.cacheTtlMinutes)) return Math.max(0, Number(options.cacheTtlMinutes) * 60 * 1000);
  return DISK_CACHE_TTL_MS;
}

async function readManifestFromDisk(folderId, maxDepth, maxFolders, options = {}) {
  if (options.disableDiskCache) return null;
  const cachePath = getManifestCachePath(folderId, maxDepth, maxFolders);
  try {
    const raw = await fs.readFile(cachePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed?.data) return null;
    const ttlMs = resolveDiskCacheTtlMs(options);
    if (ttlMs > 0 && parsed.createdAt && (Date.now() - parsed.createdAt) > ttlMs) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

async function writeManifestToDisk(folderId, maxDepth, maxFolders, data) {
  const cachePath = getManifestCachePath(folderId, maxDepth, maxFolders);
  await fs.mkdir(DISK_CACHE_DIR, { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify({ createdAt: Date.now(), data }, null, 2));
}

function addToSelectionHistory(sourceId, file, maxSize = MAX_HISTORY_SIZE) {
  if (!selectionHistoryCache.has(sourceId)) {
    selectionHistoryCache.set(sourceId, []);
  }
  const history = selectionHistoryCache.get(sourceId);
  history.unshift({ fileId: file.id, name: file.name, selectedAt: Date.now() });
  if (history.length > maxSize) {
    history.pop();
  }
}

function isRecentlySelected(sourceId, fileId, recentThresholdMinutes = 60) {
  if (!selectionHistoryCache.has(sourceId)) return false;
  const history = selectionHistoryCache.get(sourceId);
  const thresholdMs = recentThresholdMinutes * 60 * 1000;
  return history.some((item) => item.fileId === fileId && (Date.now() - item.selectedAt) < thresholdMs);
}

function decodeEscapedString(value = '') {
  return String(value)
    .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\\//g, '/')
    .replace(/\\\\/g, '\\')
    .trim();
}

function extractFolderId(input = '') {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const folderMatch = raw.match(/\/folders\/([A-Za-z0-9_-]+)/i);
  if (folderMatch) return folderMatch[1];
  const idMatch = raw.match(/^([A-Za-z0-9_-]{20,})$/);
  return idMatch ? idMatch[1] : '';
}

function normalizeEntry(entry = {}) {
  const mimeType = decodeEscapedString(entry.mimeType || '');
  const id = String(entry.id || '').trim();
  const name = decodeEscapedString(entry.name || '');
  const isFolder = mimeType === FOLDER_MIME;
  return {
    id,
    name,
    mimeType,
    isFolder,
    url: isFolder
      ? `${PUBLIC_DRIVE_BASE}/drive/folders/${id}`
      : `${PUBLIC_DRIVE_BASE}/file/d/${id}/view?usp=drivesdk`,
  };
}

function themeFromName(name = '') {
  const normalized = String(name || '').toLowerCase();
  if (/animal|funny|pet|cat|dog|cute|hài|động vật|thú cưng|mèo|chó/.test(normalized)) return 'funny-animal';
  if (/affirmation|khẳng định|tự tin/.test(normalized)) return 'affirmation';
  if (/motivat|emotional|inspir|truyền cảm hứng|động lực/.test(normalized)) return 'motivation';
  if (/motherhood|mom|parent|mẹ|mẫu thân|phụ huynh/.test(normalized)) return 'motherhood';
  if (/fitness|gym|workout|tập gym|thể hình/.test(normalized)) return 'fitness';
  if (/health|wellness|sức khỏe|y tế/.test(normalized)) return 'health';
  if (/product|winning|deal|sản phẩm|review/.test(normalized)) return 'product';
  if (/ai-avatar|avatar/.test(normalized)) return 'ai-avatar';
  if (/luxury|lifestyle|car|xe|sang trọng/.test(normalized)) return 'luxury';
  if (/viral|trend|trending|shorts|reels/.test(normalized)) return 'viral';
  return 'general';
}

function recommendedTemplateGroups(theme = 'general') {
  const matrix = {
    'funny-animal': ['reaction', 'meme', 'shorts'],
    affirmation: ['highlight', 'shorts', 'reaction'],
    motivation: ['highlight', 'shorts', 'viral'],
    motherhood: ['reaction', 'shorts', 'cinematic'],
    fitness: ['highlight', 'shorts', 'marketing'],
    health: ['educational', 'highlight', 'shorts'],
    product: ['marketing', 'shorts', 'highlight'],
    'ai-avatar': ['shorts', 'reaction', 'highlight'],
    luxury: ['marketing', 'cinematic', 'shorts'],
    viral: ['viral', 'shorts', 'highlight'],
    general: ['reaction', 'highlight', 'shorts'],
  };
  return matrix[theme] || matrix.general;
}

function summarizeTemplateFits(theme) {
  const templates = videoMashupService.listFactoryTemplates();
  const groups = new Map();
  for (const item of templates) {
    const matched = recommendedTemplateGroups(theme).includes(item.groupKey);
    groups.set(item.groupKey, (groups.get(item.groupKey) || 0) + (matched ? 1 : 0));
  }
  return Array.from(groups.entries())
    .map(([groupKey, totalScore]) => ({ groupKey, totalScore, matched: totalScore > 0 }))
    .filter((item) => item.matched)
    .sort((left, right) => right.totalScore - left.totalScore)
    .slice(0, 4);
}

function sanitizeFileName(value = '') {
  return String(value || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'sub-video';
}

function normalizeThemeHints(input = []) {
  return Array.from(new Set((Array.isArray(input) ? input : [])
    .map((value) => themeFromName(value))
    .filter(Boolean)));
}

function collectThemeHints(context = {}) {
  const values = [
    context.sourceTitle,
    context.subtitleContext,
    context.templateName,
    ...(Array.isArray(context.affiliateKeywords) ? context.affiliateKeywords : []),
    ...(Array.isArray(context.themeHints) ? context.themeHints : []),
  ];

  return Array.from(new Set(values
    .map((value) => themeFromName(value))
    .filter((theme) => theme && theme !== 'general')));
}

function resolveTemplateGroup(templateName = '') {
  const normalized = String(templateName || '').trim().toLowerCase();
  if (!normalized) return 'reaction';
  const factoryTemplate = videoMashupService.listFactoryTemplates().find((item) => item.slug === normalized || item.code.toLowerCase() === normalized || item.name.toLowerCase() === normalized);
  if (factoryTemplate?.groupKey) return factoryTemplate.groupKey;
  if (['reaction', 'highlight', 'meme', 'tiktok', 'grid'].includes(normalized)) return normalized === 'tiktok' ? 'shorts' : normalized;
  if (normalized.includes('short')) return 'shorts';
  if (normalized.includes('market') || normalized.includes('product')) return 'marketing';
  if (normalized.includes('cinematic')) return 'cinematic';
  if (normalized.includes('podcast')) return 'podcast';
  if (normalized.includes('gaming')) return 'gaming';
  return 'reaction';
}

function scoreFileCandidate(file, context = {}, sourceId = '', folderCounts = {}, options = {}) {
  const { ignoreRecent = false, allowMissingMime = false } = options;
  const templateGroup = resolveTemplateGroup(context.templateName);
  const desiredThemes = collectThemeHints(context);
  const fileThemes = Array.from(new Set([
    file.theme,
    ...normalizeThemeHints(file.path || []),
  ].filter(Boolean)));

  const isVideoByMime = Boolean(file.mimeType?.startsWith(VIDEO_MIME_PREFIX));
  const isVideoByName = /\.(mp4|mov|m4v|mkv|webm|avi|flv|wmv)$/i.test(file.name || '');
  let score = (isVideoByMime || (allowMissingMime && isVideoByName)) ? 20 : -100;
  
  // Template group matching
  if (file.recommendedTemplateGroups?.includes(templateGroup)) score += 25;
  
  // Aspect ratio preference
  if (context.aspectRatio === '9:16') score += 3;

  // Theme matching
  for (const theme of desiredThemes) {
    if (fileThemes.includes(theme)) score += 18;
    else if (file.recommendedTemplateGroups?.some((group) => recommendedTemplateGroups(theme).includes(group))) score += 8;
  }

  // General scoring
  if (!desiredThemes.length && file.theme !== 'general') score += 6;
  if (file.path?.length) score += Math.min(file.path.length, 6);
  if (/reel|short|clip|video/i.test(file.name || '')) score += 2;

  // Folder diversity penalty - keep it small (folderCounts is size, not selection count)
  const sourceFolder = file.path?.[0];
  if (sourceFolder && folderCounts[sourceFolder]) {
    const folderSize = folderCounts[sourceFolder];
    const penalty = Math.min(10, Math.floor(Math.log10(folderSize + 1) * 4));
    score -= penalty;
  }

  // Recent selection penalty - avoid picking same video too soon
  if (!ignoreRecent && isRecentlySelected(sourceId, file.id, 60)) {
    score -= 999; // Severely penalize recently selected
  }

  return score;
}

class PublicDriveFolderIngestService {
  async fetchFolderPage(folderId) {
    const url = `${PUBLIC_DRIVE_BASE}/drive/folders/${folderId}`;
    const response = await axios.get(url, {
      timeout: 30000,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
      },
      maxRedirects: 5,
    });

    return {
      folderId,
      url,
      html: response.data,
      title: this.extractFolderTitle(response.data),
    };
  }

  extractFolderTitle(html = '') {
    const match = String(html).match(/<title>([^<]+)<\/title>/i);
    return match ? decodeEscapedString(match[1].replace(/\s*-\s*Google Drive$/i, '')) : 'Google Drive Folder';
  }

  extractEntriesFromHtml(parentFolderId, html = '') {
    const expectedParentId = String(parentFolderId || '').trim();
    const tokens = String(html || '').split('\\x22');
    const entries = new Map();

    for (let index = 1; index + 6 < tokens.length; index += 2) {
      const id = String(tokens[index] || '').trim();
      const parentPrelude = String(tokens[index + 1] || '');
      const parentId = String(tokens[index + 2] || '').trim();
      const parentSuffix = String(tokens[index + 3] || '');
      const name = String(tokens[index + 4] || '').trim();
      const nameSuffix = String(tokens[index + 5] || '');
      const mimeType = String(tokens[index + 6] || '').trim();

      if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) continue;
      if (!parentPrelude.includes('\\x5b')) continue;
      if (!parentSuffix.includes('\\x5d')) continue;
      if (expectedParentId && parentId && parentId !== expectedParentId) continue;
      if (!name || !mimeType || !nameSuffix.startsWith(',')) continue;

      const entry = normalizeEntry({ id, name, mimeType });
      if (!entry.id || !entry.name) continue;
      entries.set(entry.id, entry);
    }

    return Array.from(entries.values());
  }

  analyzeEntries(entries = [], depth = 0, pathSegments = []) {
    return entries.map((entry) => {
      const theme = themeFromName(entry.name);
      return {
        ...entry,
        depth,
        path: [...pathSegments, entry.name],
        theme,
        recommendedTemplateGroups: recommendedTemplateGroups(theme),
        templateFit: summarizeTemplateFits(theme),
      };
    });
  }

  buildPublicManifest(folderId, rootPage, options = {}) {
    const maxDepth = Math.min(Math.max(Number(options.maxDepth ?? 3) || 3, 1), 6);
    const maxFolders = Math.min(Math.max(Number(options.maxFolders ?? 60) || 60, 1), 200);
    return { folderId, rootPage, maxDepth, maxFolders };
  }

  async crawlPublicFolder(input = {}, options = {}) {
    const folderId = extractFolderId(input.url || input.folderId);
    if (!folderId) {
      throw new Error('A valid public Drive folder URL or folderId is required');
    }

    const maxDepth = Math.min(Math.max(Number(options.maxDepth ?? input.maxDepth ?? 3) || 3, 1), 6);
    const maxFolders = Math.min(Math.max(Number(options.maxFolders ?? input.maxFolders ?? 60) || 60, 1), 200);
    const cacheKey = buildManifestCacheKey(folderId, maxDepth, maxFolders);
    const cached = manifestCache.get(cacheKey);
    if (cached && (Date.now() - cached.createdAt) < MANIFEST_CACHE_TTL_MS) {
      return cached.data;
    }

    if (!options.forceRefresh) {
      const diskCached = await readManifestFromDisk(folderId, maxDepth, maxFolders, options);
      if (diskCached) {
        manifestCache.set(cacheKey, { createdAt: Date.now(), data: diskCached });
        return diskCached;
      }
    }

    const rootPage = await this.fetchFolderPage(folderId);
    const queue = [{ folderId, name: rootPage.title, depth: 0, path: [rootPage.title], html: rootPage.html }];
    const visitedFolders = new Set();
    const folderNodes = [];
    const files = [];

    while (queue.length && visitedFolders.size < maxFolders) {
      const current = queue.shift();
      if (!current || visitedFolders.has(current.folderId)) continue;
      visitedFolders.add(current.folderId);

      const rawEntries = this.extractEntriesFromHtml(current.folderId, current.html || '');
      const analyzedEntries = this.analyzeEntries(rawEntries, current.depth + 1, current.path);
      const folders = analyzedEntries.filter((item) => item.isFolder);
      const directFiles = analyzedEntries.filter((item) => !item.isFolder);

      folderNodes.push({
        folderId: current.folderId,
        name: current.name,
        depth: current.depth,
        path: current.path,
        totalChildren: analyzedEntries.length,
        directFolderCount: folders.length,
        directFileCount: directFiles.length,
        recommendedTemplateGroups: Array.from(new Set(folders.flatMap((item) => item.recommendedTemplateGroups))).slice(0, 6),
        childFolders: folders.map((item) => ({
          folderId: item.id,
          name: item.name,
          theme: item.theme,
          recommendedTemplateGroups: item.recommendedTemplateGroups,
        })),
        directFiles: directFiles.slice(0, 20),
      });

      files.push(...directFiles);

      if (current.depth + 1 >= maxDepth) continue;
      for (const folder of folders) {
        if (visitedFolders.has(folder.id)) continue;
        try {
          const nextPage = await this.fetchFolderPage(folder.id);
          queue.push({
            folderId: folder.id,
            name: folder.name,
            depth: current.depth + 1,
            path: [...current.path, folder.name],
            html: nextPage.html,
          });
        } catch (error) {
          folderNodes.push({
            folderId: folder.id,
            name: folder.name,
            depth: current.depth + 1,
            path: [...current.path, folder.name],
            totalChildren: 0,
            directFolderCount: 0,
            directFileCount: 0,
            recommendedTemplateGroups: folder.recommendedTemplateGroups,
            error: error.message,
            childFolders: [],
            directFiles: [],
          });
        }
      }
    }

    const themeSummary = Array.from(
      files.concat(folderNodes.flatMap((node) => (node.childFolders || []).map((item) => ({ theme: item.theme, recommendedTemplateGroups: item.recommendedTemplateGroups })))).reduce((map, item) => {
        const theme = item.theme || 'general';
        const entry = map.get(theme) || { theme, count: 0, recommendedTemplateGroups: new Set() };
        entry.count += 1;
        (item.recommendedTemplateGroups || []).forEach((group) => entry.recommendedTemplateGroups.add(group));
        map.set(theme, entry);
        return map;
      }, new Map()).values()
    ).map((item) => ({
      theme: item.theme,
      count: item.count,
      recommendedTemplateGroups: Array.from(item.recommendedTemplateGroups).slice(0, 6),
    })).sort((left, right) => right.count - left.count);

    const overallTemplateGroupFit = Array.from(themeSummary.reduce((map, item) => {
      for (const groupKey of item.recommendedTemplateGroups || []) {
        map.set(groupKey, (map.get(groupKey) || 0) + item.count);
      }
      return map;
    }, new Map()).entries()).map(([groupKey, score]) => ({ groupKey, score })).sort((left, right) => right.score - left.score);

    const manifest = {
      success: true,
      source: {
        url: input.url || `${PUBLIC_DRIVE_BASE}/drive/folders/${folderId}`,
        folderId,
        title: rootPage.title,
        visibility: 'public-web',
      },
      stats: {
        visitedFolders: visitedFolders.size,
        totalFolders: folderNodes.length,
        totalFiles: files.length,
        videoFiles: files.filter((item) => item.mimeType.startsWith(VIDEO_MIME_PREFIX)).length,
        nonVideoFiles: files.filter((item) => !item.mimeType.startsWith(VIDEO_MIME_PREFIX)).length,
        maxDepth,
      },
      themeSummary,
      overallTemplateGroupFit,
      folders: folderNodes,
      files,
      sampleFiles: files.slice(0, 40),
    };

    manifestCache.set(cacheKey, { createdAt: Date.now(), data: manifest });
    await writeManifestToDisk(folderId, maxDepth, maxFolders, manifest);
    return manifest;
  }

  async analyzePublicFolder(input = {}, options = {}) {
    const manifest = await this.crawlPublicFolder(input, options);
    return {
      ...manifest,
      files: manifest.files,
    };
  }

  selectBestSubVideo(manifest, context = {}, sourceId = '') {
    const files = (manifest?.files || []).filter((item) => item.mimeType?.startsWith(VIDEO_MIME_PREFIX));
    if (!files.length) {
      return { success: false, error: 'No public video files found in library source' };
    }

    // Count files per source folder for diversity
    const folderCounts = {};
    files.forEach((file) => {
      const folder = file.path?.[0] || 'root';
      folderCounts[folder] = (folderCounts[folder] || 0) + 1;
    });

    // Score all candidates
    let ranked = files
      .map((file) => ({
        file,
        score: scoreFileCandidate(file, context, sourceId, folderCounts),
        folder: file.path?.[0] || 'root'
      }))
      .filter((item) => item.score > -100) // Filter out severely penalized items
      .sort((left, right) => right.score - left.score);

    let usedFallback = false;
    if (!ranked.length) {
      ranked = files
        .map((file) => ({
          file,
          score: scoreFileCandidate(file, context, sourceId, folderCounts, { ignoreRecent: true, allowMissingMime: true }),
          folder: file.path?.[0] || 'root'
        }))
        .filter((item) => item.score > -100)
        .sort((left, right) => right.score - left.score);
      usedFallback = ranked.length > 0;
    }

    if (!ranked.length) {
      return { success: false, error: 'Could not rank any suitable sub-video candidate' };
    }

    // Diversify selection strategy:
    // 1. If top candidate is from same folder as many previous, look for alternatives
    // 2. Select from top 5-10, weighting towards higher scores but allowing variance
    // 3. Add random element to top contenders
    
    let finalPicked = null;
    const topCandidates = ranked.slice(0, Math.min(10, ranked.length));
    
    // Group by folder
    const folderGroups = {};
    topCandidates.forEach((candidate) => {
      if (!folderGroups[candidate.folder]) folderGroups[candidate.folder] = [];
      folderGroups[candidate.folder].push(candidate);
    });

    // Prefer candidates from different folders for diversity
    const uniqueFolders = Object.keys(folderGroups);
    if (uniqueFolders.length > 1) {
      // Pick a random folder first, weighted by folder diversity
      const selectedFolder = uniqueFolders[Math.floor(Math.random() * uniqueFolders.length)];
      const folderCandidates = folderGroups[selectedFolder];
      // Then pick from that folder's candidates
      finalPicked = folderCandidates[Math.floor(Math.random() * folderCandidates.length)];
    } else {
      // If all from same folder, use weighted random with exponential decay
      const weights = topCandidates.map((_, idx) => Math.pow(0.7, idx));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < topCandidates.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          finalPicked = topCandidates[i];
          break;
        }
      }
      finalPicked = finalPicked || topCandidates[0];
    }

    if (!finalPicked?.file) {
      finalPicked = topCandidates[0];
    }

    // Track selection
    addToSelectionHistory(sourceId, finalPicked.file);

    const shortlist = topCandidates.slice(0, Math.min(5, topCandidates.length));
    return {
      success: true,
      file: finalPicked.file,
      score: finalPicked.score,
      candidates: shortlist.map((c) => c.file),
      folderDiversity: uniqueFolders.length,
      selectedFolder: finalPicked.folder,
      usedFallback,
      templateGroup: resolveTemplateGroup(context.templateName),
      desiredThemes: collectThemeHints(context),
    };
  }

  async downloadPublicFile(file = {}, options = {}) {
    const fileId = String(file.id || '').trim();
    if (!fileId) {
      throw new Error('A public Drive file id is required');
    }

    await fs.mkdir(DOWNLOAD_CACHE_DIR, { recursive: true });
    const extension = path.extname(file.name || '') || '.mp4';
    const fileName = `${fileId}-${sanitizeFileName(path.parse(file.name || fileId).name)}${extension}`;
    const outputPath = path.join(DOWNLOAD_CACHE_DIR, fileName);

    try {
      await fs.access(outputPath);
      return {
        success: true,
        fileId,
        localPath: outputPath,
        cached: true,
        name: file.name || fileName,
        mimeType: file.mimeType || 'video/mp4',
        url: file.url || `${PUBLIC_DRIVE_BASE}/file/d/${fileId}/view`,
      };
    } catch {
      // continue download
    }

    const response = await axios.get(`${PUBLIC_DRIVE_DOWNLOAD_BASE}?id=${encodeURIComponent(fileId)}&export=download&confirm=t`, {
      timeout: 120000,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    await fs.writeFile(outputPath, Buffer.from(response.data));
    return {
      success: true,
      fileId,
      localPath: outputPath,
      cached: false,
      name: file.name || fileName,
      mimeType: file.mimeType || 'video/mp4',
      url: file.url || `${PUBLIC_DRIVE_BASE}/file/d/${fileId}/view`,
    };
  }

  async resolveSubVideoFromSource(source = {}, context = {}) {
    const sourceId = extractFolderId(source.url || source.folderId) || source.key || 'unknown';
    const manifest = await this.crawlPublicFolder({
      url: source.url,
      folderId: source.folderId,
      maxDepth: source.maxDepth || 3,
      maxFolders: source.maxFolders || 60,
    }, {
      ...source,
      cacheTtlHours: source.cacheTtlHours ?? 24,
    });

    const selected = this.selectBestSubVideo(manifest, {
      ...context,
      themeHints: [...(context.themeHints || []), ...(source.themeHints || [])],
    }, sourceId);

    if (!selected.success) {
      return selected;
    }

    const download = await this.downloadPublicFile(selected.file);
    return {
      success: true,
      source: manifest.source,
      selection: selected,
      download,
      item: {
        assetId: `public_drive_${selected.file.id}`,
        fileId: selected.file.id,
        name: selected.file.name,
        localPath: download.localPath,
        url: selected.file.url,
        mimeType: selected.file.mimeType,
        theme: selected.file.theme,
        recommendedTemplateGroups: selected.file.recommendedTemplateGroups,
        path: selected.file.path,
      },
    };
  }
}

const publicDriveFolderIngestService = new PublicDriveFolderIngestService();

export default publicDriveFolderIngestService;
export { extractFolderId, decodeEscapedString, themeFromName, recommendedTemplateGroups, collectThemeHints, resolveTemplateGroup };
