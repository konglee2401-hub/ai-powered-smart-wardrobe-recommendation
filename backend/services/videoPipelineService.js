/**
 * Video Pipeline Service
 *
 * This service is the backend facade for the merged source -> production ->
 * publish workspace. It aggregates data from Mongo collections, Drive upload
 * helpers, the queue service, and the legacy scraper trigger so the frontend
 * talks to one API surface with workflow-oriented semantics.
 */

import axios from 'axios';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Asset from '../models/Asset.js';
import TrendChannel from '../models/TrendChannel.js';
import TrendSourceConfig from '../models/TrendSourceConfig.js';
import TrendVideo from '../models/TrendVideo.js';
import TrendSetting from '../models/TrendSetting.js';
import QueueScannerSettings from '../models/QueueScannerSettings.js';
import DriveTemplateSource from '../models/DriveTemplateSource.js';
import VideoPipelineJob from '../models/VideoPipelineJob.js';
import SocialMediaAccount from '../models/SocialMediaAccount.js';
import VideoQueueService, { buildQueueControl } from './videoQueueService.js';
import MultiAccountService from './multiAccountService.js';
import AutoUploadService from './autoUploadService.js';
import driveService from './googleDriveOAuth.js';
import VideoMashupService from './videoMashupService.js';
import CapCutAICaptionService from './browser/capcutAICaptionService.js';
import youtubeOAuthService from './youtubeOAuthService.js';
import publicDriveFolderIngestService, {
  extractFolderId as extractPublicDriveFolderId,
  resolveTemplateGroup,
  themeFromName,
  recommendedTemplateGroups,
} from './publicDriveFolderIngestService.js';
import queueScannerCronJob from './queueScannerCronJob.js';
import publishSchedulerCronJob from './publishSchedulerCronJob.js';
import GoogleDriveIntegration from './googleDriveIntegration.js';
import { buildPublishMetadata, mergePublishUploadConfig } from './publishMetadataGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, '..');
const PY_SERVICE_BASE = process.env.TREND_AUTOMATION_PY_URL || 'http://localhost:8001';
const CAPCUT_EXPORT_DIR = path.join(BACKEND_ROOT, 'media', 'temp', 'capcut-exports');
const googleDriveIntegration = new GoogleDriveIntegration();

async function shouldUseCapCutCaptions({ productionConfig = {}, queueItem = {}, sourceVideoId = '' }) {
  if (!productionConfig) return false;
  if (productionConfig.capcutAutoCaption === false) return false;
  if (productionConfig.subtitleMode !== 'auto') return false;
  if (productionConfig.subtitleFilePath) return false;

  const provider = String(productionConfig.subtitleProvider || '').toLowerCase();
  const fallback = String(productionConfig.subtitleFallback || '').toLowerCase();
  const forceCapCut = provider === 'capcut';

  if (productionConfig.capcutAutoCaption === true) return true;

  const sourcePlatform = String(
    queueItem.videoConfig?.sourcePlatform ||
    queueItem.metadata?.sourcePlatform ||
    queueItem.platform ||
    ''
  ).toLowerCase();
  const nonYoutube = sourcePlatform && !sourcePlatform.includes('youtube');

  let transcriptMissing = false;
  if (sourceVideoId) {
    const video = await TrendVideo.findById(sourceVideoId).select('+transcript.srt').lean();
    const transcript = video?.transcript || {};
    transcriptMissing = !transcript.srt && (transcript.fetchedAt || transcript.fetchError);
  }

  if (forceCapCut) return true;
  if (fallback === 'capcut' && (nonYoutube || transcriptMissing)) return true;
  if (nonYoutube || transcriptMissing) return true;
  return false;
}

async function generateCapCutCaptions({ videoPath, queueId = '', language = 'auto', onStep = null }) {
  const flowId = queueId ? `capcut-${queueId}` : `capcut-${Date.now()}`;
  const service = new CapCutAICaptionService({ headless: false, flowId });

  try {
    await service.initialize();
    return await service.generateCaptionedVideo({
      videoPath,
      outputDirVideo: CAPCUT_EXPORT_DIR,
      language,
      onStep,
    });
  } finally {
    await service.close();
  }
}

function normalizeTemplateHealth(source) {
  if (!source.enabled) {
    return { status: 'warning', error: 'Source disabled' };
  }

  if (!source.folderId) {
    return { status: 'error', error: 'Missing folderId' };
  }

  if (!source.folderPath) {
    return { status: 'healthy', error: '' };
  }

  const hasKnownFolder = /queue|completed|template|sub|video/i.test(source.folderPath);
  return {
    status: hasKnownFolder ? 'healthy' : 'warning',
    error: hasKnownFolder ? '' : 'Folder path not recognized locally; verify Drive mapping',
  };
}

function buildProductionPayload(video, recipe, productionConfig = {}) {
  const manualMainVideo = productionConfig.manualMainVideo || null;
  const manualSubVideo = productionConfig.manualSubVideo || null;
  const identity = video?.videoId || video?._id || manualMainVideo?.assetId || `manual-${Date.now()}`;
  const fileName = `${identity}.mp4`;
  const outputFileName = `${recipe}-${identity}-${Date.now()}.mp4`;
  
  // Auto-detect theme from source title
  const sourceTitle = video?.title || manualMainVideo?.name || 'Manual video selection';
  const detectedTheme = productionConfig.theme || themeFromName(sourceTitle) || 'general';
  
  // Recommend template based on detected theme
  const recommendedTemplates = recommendedTemplateGroups(detectedTheme);
  const normalizedTemplateName = String(productionConfig.templateName || '').trim();
  const fallbackTemplateName = recommendedTemplates[0] || 'reaction';
  const templateName = normalizedTemplateName && normalizedTemplateName !== 'reaction'
    ? normalizedTemplateName
    : fallbackTemplateName;

  return {
    sourceVideoId: video?._id ? String(video._id) : '',
    sourceTitle,
    sourcePlatform: video?.platform || 'manual',
    sourceUrl: video?.url || manualMainVideo?.url || '',
    sourceThumbnail: video?.thumbnail || '',
    driveSync: video?.driveSync || {},
    mainVideoPath: manualMainVideo?.localPath || video?.localPath || video?.driveSync?.drivePath || '',
    subVideoPath: manualSubVideo?.localPath || '',
    mainVideo: manualMainVideo,
    subVideo: manualSubVideo,
    sourceFileName: fileName,
    recipe,
    productionConfig: {
      aspectRatio: '9:16',
      duration: 30,
      layout: '2-3-1-3',
      templateName,
      theme: detectedTheme,
      quality: 'high',
      audioSource: 'main',
      subtitleMode: 'auto',
      subtitleText: '',
      subtitleContext: '',
      affiliateKeywords: [],
      backgroundAudioPath: '',
      backgroundAudioVolume: 0.18,
      memeOverlayPath: '',
      memeOverlayWindow: { startTime: 4, endTime: 6 },
      highlightDetection: { enabled: false, source: 'sub', maxHighlights: 3, clipDuration: 6 },
      clipExtraction: { enabled: false, segmentDuration: 20, maxClips: 24 },
      watermarkEnabled: false,
      voiceoverEnabled: false,
      outputDriveFolder: 'Videos/Completed',
      ...productionConfig,
    },
    outputFileName,
  };
}

function slugifySourceKey(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeClockValue(input = '09:00') {
  const match = String(input || '').match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return '09:00';

  const hours = Math.max(0, Math.min(Number(match[1]) || 0, 23));
  const minutes = Math.max(0, Math.min(Number(match[2]) || 0, 59));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function buildHumanScheduleLabel(schedule = {}) {
  if (schedule.mode === 'manual' || schedule.enabled === false) {
    return 'Manual only';
  }

  if (schedule.mode === 'daily') {
    return `Every day at ${normalizeClockValue(schedule.dailyTime || '09:00')}`;
  }

  if (schedule.mode === 'minutes') {
    const minutes = Math.max(1, Number(schedule.everyMinutes) || 1);
    return minutes === 1 ? 'Every minute' : `Every ${minutes} minutes`;
  }

  const hours = Math.max(1, Number(schedule.everyHours) || 1);
  return hours === 1 ? 'Every hour' : `Every ${hours} hours`;
}

function cronToReadableSchedule(cronValue = '', fallbackTime = '09:00') {
  const cron = String(cronValue || '').trim();
  if (!cron) {
    return {
      mode: 'manual',
      enabled: false,
      everyHours: 1,
      dailyTime: normalizeClockValue(fallbackTime),
      label: 'Manual only',
    };
  }

  const dailyMatch = cron.match(/^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/);
  if (dailyMatch) {
    const dailyTime = normalizeClockValue(`${dailyMatch[2]}:${dailyMatch[1]}`);
    return {
      mode: 'daily',
      enabled: true,
      everyHours: 24,
      dailyTime,
      label: `Every day at ${dailyTime}`,
    };
  }

  const hourlyMatch = cron.match(/^(\d{1,2})\s+\*\/(\d{1,2})\s+\*\s+\*\s+\*$/);
  if (hourlyMatch) {
    const everyHours = Math.max(1, Number(hourlyMatch[2]) || 1);
    return {
      mode: 'hourly',
      enabled: true,
      everyHours,
      dailyTime: normalizeClockValue(fallbackTime),
      label: everyHours === 1 ? 'Every hour' : `Every ${everyHours} hours`,
    };
  }

  const topOfHourMatch = cron.match(/^(\d{1,2})\s+\*\s+\*\s+\*\s+\*$/);
  if (topOfHourMatch) {
    return {
      mode: 'hourly',
      enabled: true,
      everyHours: 1,
      dailyTime: normalizeClockValue(fallbackTime),
      label: 'Every hour',
    };
  }

  return {
    mode: 'daily',
    enabled: true,
    everyHours: 24,
    dailyTime: normalizeClockValue(fallbackTime),
    label: cron,
  };
}

function scheduleToCron(schedule = {}, fallbackCron = '0 9 * * *') {
  const normalized = {
    enabled: schedule.enabled !== false,
    mode: schedule.mode || 'hourly',
    everyHours: Math.max(1, Number(schedule.everyHours) || 1),
    dailyTime: normalizeClockValue(schedule.dailyTime || '09:00'),
  };

  if (!normalized.enabled || normalized.mode === 'manual') {
    return '';
  }

  if (normalized.mode === 'daily') {
    const [hours, minutes] = normalized.dailyTime.split(':');
    return `${Number(minutes)} ${Number(hours)} * * *`;
  }

  if (normalized.mode === 'hourly') {
    return normalized.everyHours === 1 ? '0 * * * *' : `0 */${normalized.everyHours} * * *`;
  }

  return fallbackCron;
}

function normalizeProductionSchedule(input = {}) {
  const enabled = input.enabled !== false;
  const mode = input.mode || (enabled ? 'hourly' : 'manual');
  const everyHours = Math.max(1, Number(input.everyHours) || 1);
  const everyMinutes = Math.max(1, Number(input.everyMinutes) || 15);
  const dailyTime = normalizeClockValue(input.dailyTime || '09:00');
  const label = buildHumanScheduleLabel({ enabled, mode, everyHours, everyMinutes, dailyTime });
  const intervalMinutes = mode === 'daily'
    ? 24 * 60
    : mode === 'minutes'
      ? everyMinutes
      : everyHours * 60;

  return {
    enabled,
    mode,
    everyHours,
    everyMinutes,
    dailyTime,
    label,
    intervalMinutes,
  };
}

function normalizePublishFilters(input = {}) {
  return {
    status: String(input.status || 'ready').trim() || 'ready',
    platform: String(input.platform || '').trim(),
    source: String(input.source || '').trim(),
    recipe: String(input.recipe || '').trim(),
    channel: String(input.channel || '').trim(),
    minViews: Math.max(0, Number(input.minViews) || 0),
  };
}

function normalizeTemplateBrowserPreferences(input = {}) {
  const normalizeString = (value, fallback = '') => String(value || '').trim() || fallback;
  const suggestionLimit = Math.min(12, Math.max(1, Number(input.suggestionLimit) || 6));

  return {
    search: normalizeString(input.search, ''),
    groupKey: normalizeString(input.groupKey, 'all'),
    showOnlySuggested: input.showOnlySuggested === true,
    suggestionLimit,
  };
}

function normalizeComposerDefaults(input = {}) {
  const clampNumber = (value, fallback, min, max) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
  };
  const allowed = {
    recipe: ['mashup', 'subtitle', 'voiceover'],
    platform: ['youtube', 'facebook', 'tiktok'],
    aspectRatio: ['9:16', '16:9', '1:1'],
    layout: ['2-3-1-3', 'full-screen', 'pip-right', 'pip-left', 'grid'],
    templateStrategy: ['random', 'weighted'],
    quality: ['low', 'medium', 'high'],
    audioSource: ['main', 'sub', 'mixed'],
    subtitleMode: ['auto', 'none', 'manual'],
    youtubePublishType: ['shorts', 'video'],
    highlightSource: ['main', 'sub'],
  };
  const pick = (value, fallback, values) => (values.includes(value) ? value : fallback);

  return {
    recipe: pick(String(input.recipe || ''), 'mashup', allowed.recipe),
    platform: pick(String(input.platform || ''), 'youtube', allowed.platform),
    duration: clampNumber(input.duration, 30, 3, 300),
    aspectRatio: pick(String(input.aspectRatio || ''), '9:16', allowed.aspectRatio),
    layout: pick(String(input.layout || ''), '2-3-1-3', allowed.layout),
    templateName: String(input.templateName || '').trim(),
    templateStrategy: pick(String(input.templateStrategy || ''), 'weighted', allowed.templateStrategy),
    quality: pick(String(input.quality || ''), 'high', allowed.quality),
    audioSource: pick(String(input.audioSource || ''), 'main', allowed.audioSource),
    subtitleMode: pick(String(input.subtitleMode || ''), 'auto', allowed.subtitleMode),
    backgroundAudioVolume: clampNumber(input.backgroundAudioVolume, 0.18, 0, 1),
    youtubePublishType: pick(String(input.youtubePublishType || ''), 'shorts', allowed.youtubePublishType),
    watermarkEnabled: input.watermarkEnabled !== false,
    voiceoverEnabled: input.voiceoverEnabled === true,
    highlightEnabled: input.highlightEnabled === true,
    highlightSource: pick(String(input.highlightSource || ''), 'sub', allowed.highlightSource),
    highlightClipDuration: clampNumber(input.highlightClipDuration, 6, 1, 60),
    highlightMaxHighlights: clampNumber(input.highlightMaxHighlights, 3, 1, 20),
    clipExtractionEnabled: input.clipExtractionEnabled === true,
    clipSegmentDuration: clampNumber(input.clipSegmentDuration, 20, 3, 120),
    clipMaxClips: clampNumber(input.clipMaxClips, 24, 1, 100),
  };
}

function normalizeTemplateLibrary(input = {}) {
  const clamp = (items = [], limit = 24) => Array.from(new Set((Array.isArray(items) ? items : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean))).slice(0, limit);

  return {
    favorites: clamp(input.favorites, 24),
    pinned: clamp(input.pinned, 24),
    recent: clamp(input.recent, 8),
  };
}

const DEFAULT_SUB_VIDEO_LIBRARY_SOURCE = Object.freeze({
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

function normalizeSubVideoLibrarySources(input = []) {
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
    const folderId = extractPublicDriveFolderId(item?.folderId || item?.url || '');
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

  const withDefault = normalized.length ? normalized : [{ ...DEFAULT_SUB_VIDEO_LIBRARY_SOURCE }];
  const hasDefault = withDefault.some((item) => item.isDefault && item.enabled !== false);

  return withDefault.map((item, index) => ({
    ...item,
    isDefault: hasDefault ? item.isDefault === true : index === 0,
  }));
}

function sourceUploadMethod(sourceKey = '') {
  const normalized = String(sourceKey || '').toLowerCase();
  return {
    playboard: 'uploadPlayboardScrapedVideo',
    youtube: 'uploadYoutubeScrapedVideo',
    dailyhaha: 'uploadDailyhahaScrapedVideo',
    douyin: 'uploadDouyinScrapedVideo',
  }[normalized] || 'uploadSourceScrapedVideo';
}

async function uploadVideoFileToDrive(video) {
  if (!video?.localPath) {
    throw new Error('Video has no local file path');
  }

  const resolvedLocalPath = resolveBackendPath(video.localPath);
  await fs.access(resolvedLocalPath);
  const fileBuffer = await fs.readFile(resolvedLocalPath);
  const fileName = path.basename(resolvedLocalPath) || `${video.videoId || video._id}.mp4`;
  const uploadMethod = sourceUploadMethod(video.source || video.platform);

  if (uploadMethod === 'uploadSourceScrapedVideo') {
    return driveService.uploadSourceScrapedVideo(fileBuffer, fileName, video.source || video.platform, {
      description: `Scraped source video from ${video.source || video.platform}`,
      properties: {
        sourceVideoId: String(video._id),
        sourcePlatform: video.platform,
        sourceKey: video.source || video.platform,
        sourceUrl: video.url,
      },
    });
  }

  return driveService[uploadMethod](fileBuffer, fileName, {
    description: `Scraped source video from ${video.source || video.platform}`,
    properties: {
      sourceVideoId: String(video._id),
      sourcePlatform: video.platform,
      sourceKey: video.source || video.platform,
      sourceUrl: video.url,
    },
  });
}

function sanitizeFileName(value = '') {
  return String(value || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `video-${Date.now()}`;
}

function normalizeAssetType(requestedType = '', mimeType = '') {
  const normalizedRequestedType = String(requestedType || '').trim().toLowerCase();
  if (['video', 'audio', 'image'].includes(normalizedRequestedType)) {
    return normalizedRequestedType;
  }

  const normalizedMimeType = String(mimeType || '').trim().toLowerCase();
  if (normalizedMimeType.startsWith('audio/')) return 'audio';
  if (normalizedMimeType.startsWith('image/')) return 'image';
  return 'video';
}

function resolveUploadCategory(assetType, requestedCategory = '') {
  const categoryMap = {
    image: new Set(['character-image', 'product-image', 'generated-image', 'reference-image', 'thumbnail']),
    video: new Set(['source-video', 'generated-video']),
    audio: new Set(['audio']),
  };
  const fallbackMap = {
    image: 'reference-image',
    video: 'source-video',
    audio: 'audio',
  };

  const normalizedCategory = String(requestedCategory || '').trim();
  return categoryMap[assetType]?.has(normalizedCategory) ? normalizedCategory : fallbackMap[assetType];
}

function resolveBackendPath(candidate = '') {
  const normalized = String(candidate || '').trim().replace(/[\\/]+/g, path.sep);
  if (!normalized) return '';
  if (path.isAbsolute(normalized)) return normalized;

  const workspaceRoot = path.dirname(BACKEND_ROOT);
  if (normalized === 'backend' || normalized.startsWith(`backend${path.sep}`)) {
    return path.join(workspaceRoot, normalized);
  }

  const backendPath = path.join(BACKEND_ROOT, normalized);
  if (fsSync.existsSync(backendPath)) return backendPath;

  const workspacePath = path.join(workspaceRoot, normalized);
  if (fsSync.existsSync(workspacePath)) return workspacePath;

  const scraperServicePath = path.join(workspaceRoot, 'scraper_service', normalized);
  if (fsSync.existsSync(scraperServicePath)) return scraperServicePath;

  return backendPath;
}

async function triggerPythonRedownload(videoId) {
  if (!videoId) return { success: false, error: 'Missing videoId' };
  try {
    const response = await axios.post(`${PY_SERVICE_BASE}/api/shorts-reels/videos/${videoId}/re-download`, null, {
      timeout: 120000,
    });
    const upstreamData = response?.data || {};
    if (upstreamData && typeof upstreamData === 'object' && upstreamData.success === false) {
      return {
        success: false,
        error: upstreamData.error || upstreamData.message || 'Scraper service rejected the re-download request',
        upstream: PY_SERVICE_BASE,
        data: upstreamData,
      };
    }
    return {
      success: true,
      message: upstreamData.message || 'Re-download triggered',
      upstream: PY_SERVICE_BASE,
      data: upstreamData,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Scraper service unavailable',
      upstream: PY_SERVICE_BASE,
    };
  }
}

function resolveAssetLocalPath(asset = {}) {
  const candidate = asset?.localStorage?.path || asset?.storage?.localPath || '';
  if (!candidate) return '';
  return resolveBackendPath(candidate);
}

async function resolveVideoSelection(selection = null) {
  if (!selection) return null;

  if (selection.localPath) {
    return {
      ...selection,
      localPath: resolveBackendPath(selection.localPath),
    };
  }

  if (selection.assetId) {
    const asset = await Asset.findOne({ assetId: selection.assetId }).lean();
    if (!asset) {
      throw new Error(`Asset not found: ${selection.assetId}`);
    }

    const localPath = resolveAssetLocalPath(asset);
    if (!localPath) {
      throw new Error(`Asset has no local file path: ${selection.assetId}`);
    }

    return {
      assetId: asset.assetId,
      id: String(asset._id),
      name: asset.filename,
      localPath,
      mimeType: asset.mimeType,
      type: asset.assetType,
      category: asset.assetCategory,
      url: asset.storage?.url || '',
      storage: asset.storage || {},
    };
  }

  return null;
}

function buildSourceVideoQuery(sourceKey = '') {
  const normalized = String(sourceKey || '').trim();
  if (!normalized) return {};

  if (normalized.toLowerCase() === 'playboard') {
    return {
      $or: [
        { source: 'playboard' },
        { platform: 'youtube', topics: { $regex: 'playboard', $options: 'i' } },
      ],
    };
  }

  return {
    $or: [
      { source: normalized },
      { platform: normalized },
    ],
  };
}

function buildProductionJobQuery(sourceKey = '') {
  const normalized = String(sourceKey || '').trim();
  const base = { contentType: 'mashup' };
  if (!normalized) return base;

  if (normalized.toLowerCase() === 'playboard') {
    return {
      ...base,
      $or: [
        { 'metadata.sourceKey': 'playboard' },
        { 'metadata.sourcePlatform': 'playboard' },
      ],
    };
  }

  return {
    ...base,
    $or: [
      { 'metadata.sourceKey': normalized },
      { 'metadata.sourcePlatform': normalized },
      { platform: normalized },
    ],
  };
}

function extractDriveFileId(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('public_drive_')) return raw.replace('public_drive_', '');

  const urlMatch = raw.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/i)
    || raw.match(/[?&]id=([A-Za-z0-9_-]{20,})/i)
    || raw.match(/open\?id=([A-Za-z0-9_-]{20,})/i);
  if (urlMatch) return urlMatch[1];

  const fileMatch = raw.match(/([A-Za-z0-9_-]{20,})-/);
  if (fileMatch) return fileMatch[1];

  return '';
}

function buildDriveThumbnail(fileId) {
  if (!fileId) return '';
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w640`;
}

function buildMashupLog(job = {}) {
  const metadataLog = job.metadata?.mashupLog || job.videoConfig?.mashupLog;
  if (metadataLog) return metadataLog;

  const productionConfig = job.videoConfig?.productionConfig || {};
  const templateName = productionConfig.templateName || 'reaction';
  const templateGroup = resolveTemplateGroup(templateName);
  const subVideo = job.videoConfig?.subVideo || productionConfig.manualSubVideo || {};
  const autoSelected = Boolean(subVideo?.autoSelected || job.videoConfig?.autoSelectedSubVideo);

  return {
    recipe: job.videoConfig?.recipe || job.contentType || 'mashup',
    templateName,
    templateGroup,
    layout: productionConfig.layout || '2-3-1-3',
    duration: Number(productionConfig.duration) || 30,
    aspectRatio: productionConfig.aspectRatio || '9:16',
    audioSource: productionConfig.audioSource || 'main',
    mainVideo: {
      sourceVideoId: job.videoConfig?.sourceVideoId || job.metadata?.sourceVideoId || '',
      title: job.videoConfig?.sourceTitle || '',
      path: job.videoConfig?.mainVideoPath || '',
      url: job.videoConfig?.sourceUrl || '',
    },
    subVideo: {
      selectionMethod: autoSelected ? 'auto' : (subVideo?.assetId ? 'manual' : 'auto'),
      assetId: subVideo?.assetId || '',
      name: subVideo?.name || job.videoConfig?.autoSelectedSubVideo?.name || '',
      path: job.videoConfig?.subVideoPath || subVideo?.localPath || '',
      sourceKey: subVideo?.sourceKey || job.videoConfig?.autoSelectedSubVideo?.sourceKey || '',
      sourceType: subVideo?.sourceType || job.videoConfig?.autoSelectedSubVideo?.sourceType || '',
      theme: subVideo?.theme || job.videoConfig?.autoSelectedSubVideo?.theme || '',
    },
    selection: autoSelected ? {
      method: 'auto',
      sourceKey: subVideo?.sourceKey || job.videoConfig?.autoSelectedSubVideo?.sourceKey || '',
      sourceType: subVideo?.sourceType || job.videoConfig?.autoSelectedSubVideo?.sourceType || '',
      sourceName: subVideo?.name || job.videoConfig?.autoSelectedSubVideo?.name || '',
      templateGroup,
      desiredThemes: [],
      score: null,
      candidates: [],
    } : { method: 'manual' },
      subtitleMode: productionConfig.subtitleMode || 'none',
      subtitleText: productionConfig.subtitleText || '',
      subtitleContext: productionConfig.subtitleContext || '',
      subtitleFilePath: productionConfig.subtitleFilePath || '',
      subtitleProvider: productionConfig.subtitleProvider || '',
      captionedVideoPath: productionConfig.captionedVideoPath || '',
    };
  }

function resolveSubThumbnail(job = {}, mashupLog = {}) {
  const subVideo = mashupLog?.subVideo || {};
  const candidates = [
    subVideo?.assetId,
    job.videoConfig?.subVideo?.assetId,
    job.videoConfig?.autoSelectedSubVideo?.name,
    job.videoConfig?.subVideo?.url,
    job.videoConfig?.subVideo?.localPath,
    job.videoConfig?.subVideoPath,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const fileId = extractDriveFileId(candidate);
    if (fileId) {
      return buildDriveThumbnail(fileId);
    }
  }

  return '';
}

async function updateTrendVideoProductionSnapshot(videoId, updates = {}) {
  if (!videoId) return null;

  const video = await TrendVideo.findById(videoId);
  if (!video) return null;

  video.production = {
    ...(video.production?.toObject ? video.production.toObject() : video.production || {}),
    ...updates,
  };
  await video.save();
  return video;
}

async function clearTrendVideoProductionSnapshot(videoId, queueId) {
  if (!videoId) return null;
  const video = await TrendVideo.findById(videoId);
  if (!video) return null;
  if (queueId && video.production?.queueId && String(video.production.queueId) !== String(queueId)) {
    return video;
  }

  video.production = {
    ...(video.production?.toObject ? video.production.toObject() : video.production || {}),
    queueStatus: 'idle',
    queueId: '',
    recipe: '',
    lastQueuedAt: null,
    completedVideoPath: '',
    completedDriveFileId: '',
    completedAt: null,
    lastError: '',
  };
  await video.save();
  return video;
}

async function upsertGeneratedVideoAsset(payload = {}) {
  const {
    queueId,
    outputPath,
    driveSync = {},
    sourceVideoId = '',
    recipe = 'mashup',
    sourceTitle = '',
  } = payload;

  if (!queueId || !outputPath) {
    return { success: false, error: 'queueId and outputPath are required' };
  }

  const stats = await fs.stat(outputPath);
  const relativePath = path.relative(BACKEND_ROOT, outputPath).replace(/\\/g, '/');
  const filename = path.basename(outputPath);
  const assetId = `video_pipeline_generated_${queueId}`;
  const synced = Boolean(driveSync?.driveFileId);
  const now = new Date();

  const assetPayload = {
    assetId,
    filename,
    mimeType: 'video/mp4',
    fileSize: stats.size,
    assetType: 'video',
    assetCategory: 'generated-video',
    userId: 'anonymous',
    sessionId: 'video-pipeline',
    storage: {
      location: synced ? 'google-drive' : 'local',
      localPath: relativePath,
      googleDriveId: driveSync?.driveFileId || '',
      googleDrivePath: driveSync?.name || filename,
      url: driveSync?.webViewLink || `/api/assets/proxy/${assetId}`,
    },
    localStorage: {
      location: 'local',
      path: relativePath,
      fileSize: stats.size,
      savedAt: now,
      verified: true,
    },
    cloudStorage: synced ? {
      location: 'google-drive',
      googleDriveId: driveSync.driveFileId,
      webViewLink: driveSync.webViewLink || '',
      status: 'synced',
      syncedAt: now,
      attempted: 1,
    } : (driveSync?.status === 'failed' ? {
      location: 'google-drive',
      googleDriveId: '',
      webViewLink: '',
      status: 'failed',
      syncedAt: null,
      attempted: 1,
    } : undefined),
    syncStatus: synced ? 'synced' : (driveSync?.status === 'failed' ? 'failed' : 'pending'),
    generation: {
      model: 'video-pipeline-mashup',
      parameters: {
        queueId,
        sourceVideoId,
        recipe,
        sourceTitle,
        completedDriveStatus: driveSync?.status || 'pending',
      },
    },
    usedIn: ['video-generation', 'gallery'],
    tags: ['video-pipeline', 'generated-video', recipe, queueId],
    projectId: 'video-pipeline',
    status: 'active',
  };

  const existing = await Asset.findOne({ assetId });
  if (existing) {
    Object.assign(existing, assetPayload);
    await existing.save();
    return { success: true, item: existing };
  }

  const asset = await Asset.create(assetPayload);
  return { success: true, item: asset };
}

class VideoPipelineService {
  /**
   * Infers contentType from source video metadata
   * Used to select the appropriate template type for mashups
   */
  inferContentType(video = {}) {
    if (!video || typeof video !== 'object') return 'general';

    // Check title and keywords for product/shopping content
    const titleLower = String(video.title || '').toLowerCase();
    const productKeywords = ['product', 'buy', 'shop', 'offer', 'discount', 'deal', 'price', 'review', 'unbox'];
    if (productKeywords.some(kw => titleLower.includes(kw))) {
      return 'product';
    }

    // Check if from Playboard (trending content often humorous)
    const sourceKey = String(video.source || video.platform || '').toLowerCase();
    if (sourceKey === 'playboard' || sourceKey.includes('playboard')) {
      return 'funny-animal';
    }

    // Check topic field
    const topic = String(video.topic || '').toLowerCase();
    if (['hai', 'dance'].includes(topic)) {
      return 'funny-animal';
    }

    // Default to general
    return 'general';
  }

  /**
   * Dashboard data is intentionally small and aggregated so the overview tab
   * can render quickly without needing to preload the large video tables.
   */
  async getDashboard() {
    const [
      queueStats,
      accountStats,
      sourceConfigs,
      totalVideos,
      driveReadyVideos,
      queuedVideos,
      totalChannels,
      templateSources,
      completedMashups,
      failedMashups,
      generatedVideoAssets,
      downloadPending,
      downloadProcessing,
      downloadDone,
      downloadFailed,
    ] =
      await Promise.all([
        VideoQueueService.getQueueStats(),
        Promise.resolve(MultiAccountService.getAccountStats()),
        TrendSourceConfig.ensureDefaults(),
        TrendVideo.countDocuments(),
        TrendVideo.countDocuments({ 'driveSync.status': 'uploaded' }),
        TrendVideo.countDocuments({ 'production.queueStatus': 'queued' }),
        TrendChannel.countDocuments(),
        DriveTemplateSource.find({}).sort({ updatedAt: -1 }).lean(),
        VideoPipelineJob.countDocuments({ contentType: 'mashup', status: { $in: ['ready', 'uploaded'] } }),
        VideoPipelineJob.countDocuments({ contentType: 'mashup', status: 'failed' }),
        Asset.countDocuments({ assetCategory: 'generated-video', projectId: 'video-pipeline', status: 'active' }),
        TrendVideo.countDocuments({ downloadStatus: 'pending' }),
        TrendVideo.countDocuments({ downloadStatus: 'downloading' }),
        TrendVideo.countDocuments({ downloadStatus: 'done' }),
        TrendVideo.countDocuments({ downloadStatus: 'failed' }),
      ]);

    return {
      success: true,
      metrics: {
        configuredSources: sourceConfigs.length,
        totalChannels,
        totalVideos,
        driveReadyVideos,
        queuedVideos,
        downloadPending,
        downloadProcessing,
        downloadDone,
        downloadFailed,
        queueJobs: queueStats.stats?.total || 0,
        readyToPublish: (queueStats.stats?.byStatus?.ready || 0) + (queueStats.stats?.byStatus?.uploaded || 0),
        connections: accountStats.stats?.totalAccounts || 0,
        healthyTemplateSources: templateSources.filter((item) => item.healthStatus === 'healthy').length,
        completedMashups,
        failedMashups,
        generatedVideoAssets,
      },
      queue: queueStats.stats || {},
      connections: accountStats.stats || {},
    };
  }

  /**
   * Source configs are the operator-managed scraper providers, not the scraped
   * videos themselves. This API joins provider definitions with Mongo counts
   * so the Sources tab can manage config and health in one place.
   */
  async listSources() {
    const sourceConfigs = await TrendSourceConfig.ensureDefaults();
    const [videoStats, channelStats] = await Promise.all([
      TrendVideo.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$source', '$platform'] },
            totalVideos: { $sum: 1 },
            driveReadyVideos: {
              $sum: {
                $cond: [{ $eq: ['$driveSync.status', 'uploaded'] }, 1, 0],
              },
            },
          },
        },
      ]),
      TrendChannel.aggregate([
        {
          $group: {
            _id: {
              $cond: [
                { $and: [{ $ne: ['$sourceKey', null] }, { $ne: ['$sourceKey', ''] }] },
                '$sourceKey',
                '$platform',
              ],
            },
            totalChannels: { $sum: 1 },
            activeChannels: {
              $sum: {
                $cond: [{ $eq: ['$isActive', true] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const videoMap = new Map(videoStats.map((item) => [String(item._id || ''), item]));
    const channelMap = new Map(channelStats.map((item) => [String(item._id || ''), item]));

    return {
      success: true,
      items: sourceConfigs.map((item) => {
        const key = item.key;
        const videoInfo = videoMap.get(key) || {};
        const channelInfo = channelMap.get(key) || {};

        return {
          ...item,
          id: String(item._id),
          stats: {
            totalVideos: videoInfo.totalVideos || 0,
            driveReadyVideos: videoInfo.driveReadyVideos || 0,
            totalChannels: channelInfo.totalChannels || 0,
            activeChannels: channelInfo.activeChannels || 0,
          },
        };
      }),
      count: sourceConfigs.length,
    };
  }

  /**
   * Creates an operator-defined source config. Default system sources are
   * seeded automatically and are protected from deletion separately.
   */
  async createSource(payload = {}) {
    await TrendSourceConfig.ensureDefaults();

    const key = slugifySourceKey(payload.key || payload.provider || payload.name);
    if (!key) {
      return { success: false, error: 'Source key or name is required' };
    }

    const existing = await TrendSourceConfig.findOne({ key });
    if (existing) {
      return { success: false, error: `Source key already exists: ${key}` };
    }

    const source = await TrendSourceConfig.create({
      key,
      name: payload.name || key,
      provider: payload.provider || key,
      description: payload.description || '',
      defaultUrl: payload.defaultUrl || '',
      enabled: payload.enabled !== false,
      isDefault: false,
      allowDelete: true,
      sortOrder: Number(payload.sortOrder) || 50,
      videoCriteria: {
        minViews: Number(payload.videoCriteria?.minViews) || 0,
        minSubscribers: Number(payload.videoCriteria?.minSubscribers) || 0,
        minTotalVideos: Number(payload.videoCriteria?.minTotalVideos) || 0,
      },
      channelCriteria: {
        minViews: Number(payload.channelCriteria?.minViews) || 0,
        minSubscribers: Number(payload.channelCriteria?.minSubscribers) || 0,
        minTotalVideos: Number(payload.channelCriteria?.minTotalVideos) || 0,
      },
      metadata: payload.metadata || {},
    });

    return {
      success: true,
      message: 'Source created successfully',
      item: {
        ...source.toObject(),
        id: String(source._id),
      },
    };
  }

  /**
   * Updates a source config. Default providers remain editable for thresholds
   * and URLs, but their identity and deletion rules stay protected.
   */
  async updateSource(sourceId, payload = {}) {
    await TrendSourceConfig.ensureDefaults();

    const source = await TrendSourceConfig.findById(sourceId);
    if (!source) {
      return { success: false, error: 'Source not found' };
    }

    source.name = payload.name ?? source.name;
    source.description = payload.description ?? source.description;
    source.defaultUrl = payload.defaultUrl ?? source.defaultUrl;
    source.enabled = payload.enabled ?? source.enabled;
    source.sortOrder = payload.sortOrder ?? source.sortOrder;
    source.videoCriteria = {
      ...(source.videoCriteria?.toObject?.() || source.videoCriteria || {}),
      ...(payload.videoCriteria || {}),
    };
    source.channelCriteria = {
      ...(source.channelCriteria?.toObject?.() || source.channelCriteria || {}),
      ...(payload.channelCriteria || {}),
    };
    source.metadata = payload.metadata ?? source.metadata;

    if (!source.isDefault) {
      source.provider = payload.provider || source.provider;
      source.key = slugifySourceKey(payload.key || source.key);
    }

    await source.save();

    return {
      success: true,
      message: 'Source updated successfully',
      item: {
        ...source.toObject(),
        id: String(source._id),
      },
    };
  }

  /**
   * Deletes a custom source config. Seeded sources are intentionally protected
   * so the operator always has the baseline provider registry available.
   */
  async deleteSource(sourceId) {
    await TrendSourceConfig.ensureDefaults();

    const source = await TrendSourceConfig.findById(sourceId);
    if (!source) {
      return { success: false, error: 'Source not found' };
    }

    if (source.isDefault || source.allowDelete === false) {
      return { success: false, error: 'Default sources cannot be deleted' };
    }

    await source.deleteOne();
    return { success: true, message: 'Source deleted successfully' };
  }

  /**
   * Channels are read directly from Mongo so the Channels tab no longer
   * depends on a scraper proxy response just to render the table.
   */
  async listChannels(filters = {}) {
    const { source = '', platform = '', search = '', status = '', limit = 100 } = filters;

    const query = {};
    if (platform) query.platform = platform;
    if (source) {
      query.$or = [
        { sourceKey: source },
        { platform: source },
      ];
    }
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (search) {
      query.$or = [
        ...(query.$or || []),
        { name: { $regex: search, $options: 'i' } },
        { channelId: { $regex: search, $options: 'i' } },
        { channelUrl: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await TrendChannel.find(query)
      .sort({ subscriberCount: -1, updatedAt: -1 })
      .limit(Math.min(Number(limit) || 100, 200))
      .lean();

    const channelIds = items.map((item) => item._id);
    const videoStats = channelIds.length
      ? await TrendVideo.aggregate([
        { $match: { channel: { $in: channelIds } } },
        {
          $group: {
            _id: '$channel',
            totalVideos: { $sum: 1 },
            driveReadyVideos: {
              $sum: {
                $cond: [{ $eq: ['$driveSync.status', 'uploaded'] }, 1, 0],
              },
            },
            queuedVideos: {
              $sum: {
                $cond: [{ $eq: ['$production.queueStatus', 'queued'] }, 1, 0],
              },
            },
            lastVideoAt: { $max: '$discoveredAt' },
          },
        },
      ])
      : [];

    const videoMap = new Map(videoStats.map((item) => [String(item._id), item]));

    return {
      success: true,
      items: items.map((item) => {
        const stats = videoMap.get(String(item._id)) || {};
        return {
          ...item,
          id: String(item._id),
          sourceKey: item.sourceKey || item.platform,
          stats: {
            totalVideos: stats.totalVideos || item.totalVideos || 0,
            driveReadyVideos: stats.driveReadyVideos || 0,
            queuedVideos: stats.queuedVideos || 0,
            lastVideoAt: stats.lastVideoAt || null,
          },
        };
      }),
      count: items.length,
    };
  }

  /**
   * Source videos are the discovered media assets that can move to Drive and
   * then into production. This API backs the dedicated Videos tab.
   */
  async listSourceVideos(filters = {}) {
    const {
      source = '',
      platform = '',
      downloadStatus = '',
      driveStatus = '',
      productionStatus = '',
      search = '',
      limit = 25,
      offset = 0,
    } = filters;

    const query = {};
    if (platform) query.platform = platform;
    if (source) {
      if (source.toLowerCase() === 'playboard') {
        // Special case for Playboard: look for source='playboard' OR platform='youtube' with playboard topic
        query.$or = [
          { source: 'playboard' },
          { platform: 'youtube', topics: { $regex: 'playboard', $options: 'i' } },
        ];
      } else {
        query.$or = [
          { source },
          { platform: source },
        ];
      }
    }
    if (downloadStatus) query.downloadStatus = downloadStatus;
    if (driveStatus) query['driveSync.status'] = driveStatus;
    if (productionStatus) query['production.queueStatus'] = productionStatus;
    if (search) {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { videoId: { $regex: search, $options: 'i' } },
            { url: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await TrendVideo.countDocuments(query);

    const cursor = TrendVideo.find(query);
    const withPopulate = cursor.populate('channel', 'name channelId platform sourceKey subscriberCount');
    const withSort = withPopulate.sort({ discoveredAt: -1, createdAt: -1 });
    const withSkip = withSort.skip(Math.max(0, Number(offset) || 0));
    const withLimit = withSkip.limit(Math.min(Number(limit) || 25, 250));
    const withLean = withLimit.lean();
    
    const items = await withLean;

    return {
      success: true,
      items: items.map((item) => ({
        ...item,
        id: String(item._id),
        thumbnail: item.thumbnail || (item.platform === 'youtube' && item.videoId ? `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg` : ''),
        sourceKey: item.source || item.platform,
        queueReady: item.downloadStatus === 'done',
        driveReady: item.driveSync?.status === 'uploaded',
        localMissing: item.downloadStatus === 'done'
          ? !fsSync.existsSync(resolveBackendPath(item.localPath || ''))
          : false,
        channelName: item.channel?.name || '',
      })),
      count: totalCount,
    };
  }

  /**
   * Uploads one discovered video to Drive (or local fallback when Drive is not
   * configured) and writes the resulting sync state onto TrendVideo.
   */
  async uploadSourceVideo(videoId) {
    const video = await TrendVideo.findById(videoId);
    if (!video) {
      return { success: false, error: 'Video not found' };
    }

    try {
      const uploadResult = await uploadVideoFileToDrive(video);
      const isDriveUpload = Boolean(uploadResult?.id) && !String(uploadResult.id).startsWith('local-');

      video.driveSync = {
        ...(video.driveSync || {}),
        status: isDriveUpload ? 'uploaded' : 'skipped',
        driveFileId: isDriveUpload ? uploadResult.id : '',
        driveFolder: isDriveUpload ? 'Videos/Downloaded' : '',
        drivePath: uploadResult?.name || path.basename(video.localPath || ''),
        webViewLink: uploadResult?.webViewLink || '',
        syncedAt: new Date(),
        lastError: isDriveUpload ? '' : (uploadResult?.notice || uploadResult?.error || 'Google Drive upload unavailable'),
      };
      await video.save();

      return {
        success: true,
        uploaded: isDriveUpload,
        message: isDriveUpload ? 'Video uploaded to Google Drive' : 'Drive upload skipped; fallback storage used',
        item: {
          id: String(video._id),
          driveSync: video.driveSync,
        },
      };
    } catch (error) {
      video.driveSync = {
        ...(video.driveSync || {}),
        status: 'failed',
        syncedAt: new Date(),
        lastError: error.message,
      };
      await video.save();

      return {
        success: false,
        error: error.message,
        item: {
          id: String(video._id),
          driveSync: video.driveSync,
        },
      };
    }
  }

  /**
   * Batch upload helper for the operator-facing "Upload Pending" action.
   * It avoids the old Python proxy and works directly from TrendVideo rows.
   */
  async uploadPendingSourceVideos(limit = 30) {
    const videos = await TrendVideo.find({
      downloadStatus: 'done',
      $or: [
        { 'driveSync.status': { $exists: false } },
        { 'driveSync.status': { $in: ['pending', 'failed', 'skipped'] } },
      ],
    })
      .sort({ discoveredAt: 1 })
      .limit(Math.min(Number(limit) || 30, 100));

    const results = [];
    for (const video of videos) {
      results.push(await this.uploadSourceVideo(video._id));
    }

    return {
      success: true,
      total: results.length,
      uploaded: results.filter((item) => item.uploaded).length,
      skipped: results.filter((item) => item.success && !item.uploaded).length,
      failed: results.filter((item) => !item.success).length,
      results,
    };
  }

  /**
   * Scraper triggering remains an upstream concern, but the UI now calls this
   * wrapper so it receives a controlled error payload instead of a raw 502.
   */
  async triggerPendingDownloads(limit = 200) {
    try {
      const response = await axios.post(
        `${PY_SERVICE_BASE}/api/shorts-reels/videos/trigger-pending-downloads`,
        null,
        {
          params: { limit },
          timeout: 120000,
        }
      );

      const upstreamData = response?.data || {};
      if (upstreamData && typeof upstreamData === 'object' && upstreamData.success === false) {
        return {
          success: false,
          error: upstreamData.error || upstreamData.message || 'Scraper service rejected the trigger request',
          upstream: PY_SERVICE_BASE,
          data: upstreamData,
          source: 'python-trend-service',
        };
      }

      return {
        success: true,
        message: upstreamData.message || 'Pending download trigger sent successfully',
        upstream: PY_SERVICE_BASE,
        data: upstreamData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Scraper service unavailable',
        upstream: PY_SERVICE_BASE,
        source: 'python-trend-service',
      };
    }
  }

  /**
   * Production jobs remain stored centrally in Mongo. Each source video gets
   * its latest queue linkage mirrored back onto TrendVideo for quick UI joins.
   */
  async queueSourceVideos(payload = {}) {
    const {
      videoIds = [],
      recipe = 'mashup',
      platform = 'youtube',
      accountIds = [],
      productionConfig = {},
    } = payload;

    const manualMainVideo = await resolveVideoSelection(productionConfig.manualMainVideo || null);
    const manualSubVideo = await resolveVideoSelection(productionConfig.manualSubVideo || null);
    const effectiveProductionConfig = {
      ...productionConfig,
      subtitleMode: productionConfig.subtitleMode || 'auto',
      manualMainVideo,
      manualSubVideo,
    };

    const videos = Array.isArray(videoIds) && videoIds.length
      ? await TrendVideo.find({ _id: { $in: videoIds } })
      : [];

    if (!videos.length && !(manualMainVideo && manualSubVideo)) {
      return { success: false, error: 'Select at least one source video or provide both main/sub manual videos' };
    }

    const queued = [];
    if (!videos.length && manualMainVideo && manualSubVideo) {
      const queueResult = await VideoQueueService.addToQueue({
        videoConfig: buildProductionPayload(null, recipe, effectiveProductionConfig),
        platform,
        contentType: recipe,
        priority: 'high',
        accountIds,
        metadata: {
          sourceVideoId: null,
          sourcePlatform: 'manual',
          sourceKey: 'manual',
          driveSyncStatus: 'manual',
          inputMode: 'manual-assets',
        },
      });

      if (!queueResult.success) {
        return queueResult;
      }

      queued.push({
        sourceVideoId: '',
        queueId: queueResult.queueId,
        title: manualMainVideo.name || 'Manual composition',
      });
    }

    for (const video of videos) {
      const queueResult = await VideoQueueService.addToQueue({
        videoConfig: buildProductionPayload(video, recipe, effectiveProductionConfig),
        platform,
        contentType: recipe,
        priority: 'high',
        accountIds,
        metadata: {
          sourceVideoId: String(video._id),
          sourcePlatform: video.platform,
          sourceKey: video.source || (String(video.topics || '').toLowerCase().includes('playboard') ? 'playboard' : video.platform),
          driveSyncStatus: video.driveSync?.status || 'pending',
        },
      });

      if (!queueResult.success) {
        continue;
      }

      video.production = {
        ...(video.production || {}),
        queueStatus: 'queued',
        queueId: queueResult.queueId,
        recipe,
        lastQueuedAt: new Date(),
        lastError: '',
      };
      await video.save();

      queued.push({
        sourceVideoId: String(video._id),
        queueId: queueResult.queueId,
        title: video.title,
      });
    }

    return {
      success: queued.length > 0,
      queued,
      totalQueued: queued.length,
      failed: videoIds.length - queued.length,
    };
  }

  /**
   * Adds downloaded source videos into the legacy Queue folder so the
   * queue-scanner cron job can auto-generate mashups.
   */
  async queueSourceVideosToFolder(payload = {}) {
    const { videoIds = [] } = payload;
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return { success: false, error: 'Select at least one source video to queue' };
    }

    const videos = await TrendVideo.find({ _id: { $in: videoIds } }).lean();
    if (!videos.length) {
      return { success: false, error: 'No matching source videos found' };
    }

    const queueDir = googleDriveIntegration.getFolderDirectory('queue');
    await fs.mkdir(queueDir, { recursive: true });

    const queued = [];
    const failed = [];

    for (const video of videos) {
      try {
        const sourcePath = resolveBackendPath(video.localPath || '');
        if (!sourcePath || !fsSync.existsSync(sourcePath)) {
          failed.push({ id: String(video._id), error: 'Local file not found' });
          continue;
        }

        const ext = path.extname(sourcePath) || '.mp4';
        const baseName = sanitizeFileName(video.videoId || path.parse(sourcePath).name || `queue-${Date.now()}`);
        let fileName = `${baseName}${ext}`;
        let destPath = path.join(queueDir, fileName);
        let counter = 1;
        while (fsSync.existsSync(destPath)) {
          fileName = `${baseName}-${Date.now()}-${counter}${ext}`;
          destPath = path.join(queueDir, fileName);
          counter += 1;
        }

        await fs.copyFile(sourcePath, destPath);

        // Infer contentType from video metadata
        const inferredContentType = this.inferContentType(video);
        
        const metadata = {
          sourceVideoId: String(video._id),
          sourceKey: video.source || video.platform || 'other',
          sourcePlatform: video.platform || video.source || 'other',
          sourceUrl: video.url || '',
          sourceTitle: video.title || video.videoId || fileName,
          sourceThumbnail: video.thumbnail || '',
          videoId: video.videoId || '',
          queuedAt: new Date().toISOString(),
          contentType: inferredContentType,
        };
        const metadataPath = `${destPath}.json`;
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        queued.push({
          id: String(video._id),
          fileName,
          queuePath: destPath,
        });
      } catch (error) {
        failed.push({ id: String(video._id), error: error.message });
      }
    }

    return {
      success: queued.length > 0,
      queued,
      failed,
      totalQueued: queued.length,
      totalFailed: failed.length,
    };
  }

  /**
   * Jobs drive the queue/processing surface and are enriched with source video
   * labels here so the UI does not need to join across multiple requests.
   */
  async listJobs(filters = {}) {
    const { status = '', limit = 100 } = filters;
    const jobsResult = await VideoQueueService.getAllQueueItems(limit);
    if (!jobsResult.success) return jobsResult;

    let items = jobsResult.items || [];
    if (status) {
      items = items.filter((item) => item.status === status);
    }

    const sourceIds = items
      .map((item) => item.videoConfig?.sourceVideoId)
      .filter(Boolean);

    const sources = sourceIds.length
      ? await TrendVideo.find({ _id: { $in: sourceIds } }).lean()
      : [];

    const sourceMap = new Map(sources.map((item) => [String(item._id), item]));
    const enriched = items.map((item) => {
      const source = sourceMap.get(String(item.videoConfig?.sourceVideoId || ''));
      const queueControl = buildQueueControl(item);
      return {
        ...item,
        queueControl,
        sourceTitle: source?.title || item.videoConfig?.sourceTitle || item.queueId,
        sourcePlatform: source?.platform || item.videoConfig?.sourcePlatform || item.platform,
        canManualStart: ['pending', 'failed'].includes(item.status),
      };
    });

    return {
      success: true,
      items: enriched,
      count: enriched.length,
      stats: (await VideoQueueService.getQueueStats()).stats,
    };
  }

  async getQueueRuntime(timeoutMinutes = 30) {
    const [statsResult, runtimeResult] = await Promise.all([
      VideoQueueService.getQueueStats(),
      VideoQueueService.getQueueRuntime(timeoutMinutes),
    ]);

    if (!statsResult.success) return statsResult;
    if (!runtimeResult.success) return runtimeResult;

    return {
      success: true,
      stats: statsResult.stats || {},
      runtime: runtimeResult.runtime || {},
    };
  }

  async getProductionOverview(filters = {}) {
    const sourceQuery = buildSourceVideoQuery(filters.sourceKey);
    const jobQuery = buildProductionJobQuery(filters.sourceKey);
    const pendingDriveSyncQuery = Object.keys(sourceQuery).length
      ? {
          downloadStatus: 'done',
          $and: [
            sourceQuery,
            {
              $or: [
                { 'driveSync.status': { $exists: false } },
                { 'driveSync.status': { $in: ['pending', 'failed', 'skipped'] } },
              ],
            },
          ],
        }
      : {
          downloadStatus: 'done',
          $or: [
            { 'driveSync.status': { $exists: false } },
            { 'driveSync.status': { $in: ['pending', 'failed', 'skipped'] } },
          ],
        };

    const [
      eligibleSourceVideos,
      driveReadySourceVideos,
      sourceVideosPendingDriveSync,
      activeSourceVideos,
      completedSourceVideos,
      failedSourceVideos,
      mashupStatusBuckets,
      generatedVideoAssets,
      recentJobs,
    ] = await Promise.all([
      TrendVideo.countDocuments({ downloadStatus: 'done', ...sourceQuery }),
      TrendVideo.countDocuments({ downloadStatus: 'done', 'driveSync.status': 'uploaded', ...sourceQuery }),
      TrendVideo.countDocuments(pendingDriveSyncQuery),
      TrendVideo.countDocuments({ ...sourceQuery, 'production.queueStatus': { $in: ['queued', 'processing', 'ready'] } }),
      TrendVideo.countDocuments({ ...sourceQuery, 'production.queueStatus': 'completed' }),
      TrendVideo.countDocuments({ ...sourceQuery, 'production.queueStatus': 'failed' }),
      VideoPipelineJob.aggregate([
        { $match: jobQuery },
        { $group: { _id: '$status', total: { $sum: 1 } } },
      ]),
      Asset.countDocuments({ assetCategory: 'generated-video', projectId: 'video-pipeline', status: 'active' }),
      VideoPipelineJob.find(jobQuery).sort({ updatedAt: -1 }).limit(12).lean(),
    ]);

    const byStatus = mashupStatusBuckets.reduce((accumulator, bucket) => {
      const key = bucket._id || 'unknown';
      accumulator[key] = bucket.total || 0;
      return accumulator;
    }, {});

    return {
      success: true,
      metrics: {
        eligibleSourceVideos,
        driveReadySourceVideos,
        sourceVideosPendingDriveSync,
        activeSourceVideos,
        completedSourceVideos,
        failedSourceVideos,
        generatedVideoAssets,
        completedMashupJobs: (byStatus.ready || 0) + (byStatus.uploaded || 0),
        failedMashupJobs: byStatus.failed || 0,
      },
      jobSummary: {
        total: Object.values(byStatus).reduce((sum, value) => sum + value, 0),
        byStatus,
      },
      recentHistory: recentJobs.map((job) => ({
        queueId: job.queueId,
        status: job.status,
        sourceTitle: job.videoConfig?.sourceTitle || job.queueId,
        sourceVideoId: job.metadata?.sourceVideoId || '',
        sourcePlatform: job.metadata?.sourceKey || job.metadata?.sourcePlatform || job.platform,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        uploadedAt: job.uploadedAt,
        outputPath: job.videoConfig?.outputPath || job.videoConfig?.videoPath || '',
        completedDriveSync: job.videoConfig?.completedDriveSync || job.metadata?.completedDriveSync || {},
        executionState: buildQueueControl(job).executionState,
        errorCount: job.errorCount || 0,
      })),
    };
  }

  async getProductionHistory(filters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
    const status = String(filters.status || '').trim();
    const sourceKey = String(filters.sourceKey || '').trim();
    const query = buildProductionJobQuery(sourceKey);

    if (status) query.status = status;

    const [items, total] = await Promise.all([
      VideoPipelineJob.find(query)
        .sort({ completedAt: -1, updatedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      VideoPipelineJob.countDocuments(query),
    ]);

    const sourceIds = items
      .map((job) => job.videoConfig?.sourceVideoId || job.metadata?.sourceVideoId || '')
      .filter(Boolean);
    const sources = sourceIds.length
      ? await TrendVideo.find({ _id: { $in: sourceIds } }).lean()
      : [];
    const sourceMap = new Map(sources.map((item) => [String(item._id), item]));

    const enriched = items.map((job) => {
      const sourceId = job.videoConfig?.sourceVideoId || job.metadata?.sourceVideoId || '';
      const source = sourceMap.get(String(sourceId));
      const mashupLog = buildMashupLog(job);
      const mainThumbnail = job.videoConfig?.sourceThumbnail || source?.thumbnail || '';
      const subThumbnail = resolveSubThumbnail(job, mashupLog);
      const publishMetadata = job.metadata?.publishMetadata || job.videoConfig?.publishMetadata || null;

      return {
        queueId: job.queueId,
        status: job.status,
        contentType: job.contentType,
        priority: job.priority,
        sourceVideoId: sourceId,
        sourceTitle: source?.title || job.videoConfig?.sourceTitle || job.queueId,
        sourcePlatform: job.metadata?.sourceKey || job.metadata?.sourcePlatform || job.platform,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        uploadedAt: job.uploadedAt,
        outputPath: job.videoConfig?.outputPath || job.videoConfig?.videoPath || '',
        completedDriveSync: job.videoConfig?.completedDriveSync || job.metadata?.completedDriveSync || {},
        mainThumbnail,
        subThumbnail,
        mashupLog,
        templateName: mashupLog?.templateName || job.videoConfig?.productionConfig?.templateName || '',
        templateGroup: mashupLog?.templateGroup || resolveTemplateGroup(job.videoConfig?.productionConfig?.templateName || 'reaction'),
        selectionMethod: mashupLog?.subVideo?.selectionMethod || (job.videoConfig?.subVideo?.autoSelected ? 'auto' : 'manual'),
        publishMetadata,
      };
    });

    return {
      success: true,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      items: enriched,
    };
  }

  async getProductionHistoryItem(queueId) {
    const job = await VideoPipelineJob.findOne({ queueId }).lean();
    if (!job) {
      return { success: false, error: `Queue item not found: ${queueId}` };
    }

    const sourceId = job.videoConfig?.sourceVideoId || job.metadata?.sourceVideoId || '';
    const source = sourceId ? await TrendVideo.findById(sourceId).lean() : null;
    const mashupLog = buildMashupLog(job);
    const mainThumbnail = job.videoConfig?.sourceThumbnail || source?.thumbnail || '';
    const subThumbnail = resolveSubThumbnail(job, mashupLog);
    const publishMetadata = job.metadata?.publishMetadata || job.videoConfig?.publishMetadata || null;

    return {
      success: true,
      item: {
        ...job,
        sourceTitle: source?.title || job.videoConfig?.sourceTitle || job.queueId,
        sourcePlatform: job.metadata?.sourceKey || job.metadata?.sourcePlatform || job.platform,
        mainThumbnail,
        subThumbnail,
        mashupLog,
        publishMetadata,
      },
    };
  }

  async deleteProductionHistoryItem(queueId) {
    const job = await VideoPipelineJob.findOne({ queueId });
    if (!job) {
      return { success: false, error: `Queue item not found: ${queueId}` };
    }

    const outputPath = job.videoConfig?.outputPath || job.videoConfig?.videoPath || '';
    const driveFileId = job.videoConfig?.completedDriveSync?.driveFileId || job.metadata?.completedDriveSync?.driveFileId || '';
    const assetId = job.videoConfig?.generatedAsset?.assetId || `video_pipeline_generated_${queueId}`;

    if (outputPath) {
      try {
        await fs.unlink(outputPath);
      } catch {
        // ignore
      }
    }

    if (driveFileId) {
      try {
        await driveService.deleteFile(driveFileId);
      } catch {
        // ignore
      }
    }

    if (assetId) {
      await Asset.updateOne({ assetId }, { $set: { status: 'deleted' } });
    }

    const sourceVideoId = job.videoConfig?.sourceVideoId || job.metadata?.sourceVideoId || '';
    await clearTrendVideoProductionSnapshot(sourceVideoId, queueId);

    await VideoPipelineJob.deleteOne({ queueId });

    return { success: true, message: 'Production history item deleted' };
  }

  async remashupJob(queueId, payload = {}) {
    const job = await VideoPipelineJob.findOne({ queueId });
    if (!job) {
      return { success: false, error: `Queue item not found: ${queueId}` };
    }

    if (job.contentType !== 'mashup') {
      return { success: false, error: 'Only mashup jobs can be re-rendered' };
    }

    const outputPath = job.videoConfig?.outputPath || job.videoConfig?.videoPath || '';
    const driveFileId = job.videoConfig?.completedDriveSync?.driveFileId || job.metadata?.completedDriveSync?.driveFileId || '';
    const assetId = job.videoConfig?.generatedAsset?.assetId || `video_pipeline_generated_${queueId}`;

    if (outputPath) {
      try {
        await fs.unlink(outputPath);
      } catch {
        // ignore
      }
    }

    if (driveFileId) {
      try {
        await driveService.deleteFile(driveFileId);
      } catch {
        // ignore
      }
    }

    if (assetId) {
      await Asset.updateOne({ assetId }, { $set: { status: 'deleted' } });
    }

    if (payload.templateStrategy === 'specific' && !payload.templateName) {
      return { success: false, error: 'Specific template requires templateName' };
    }

    const productionConfig = {
      ...(job.videoConfig?.productionConfig || {}),
    };
    if (!productionConfig.subtitleMode) {
      productionConfig.subtitleMode = 'auto';
    }

    if (payload.templateName) {
      productionConfig.templateName = payload.templateName;
    }
    if (payload.templateStrategy) {
      productionConfig.templateStrategy = payload.templateStrategy;
    }
    if (payload.subtitleMode) {
      productionConfig.subtitleMode = payload.subtitleMode;
    }
    if (payload.watermarkEnabled !== undefined) {
      productionConfig.watermarkEnabled = Boolean(payload.watermarkEnabled);
    }
    if (payload.voiceoverEnabled !== undefined) {
      productionConfig.voiceoverEnabled = Boolean(payload.voiceoverEnabled);
    }
    if (payload.capcutAutoCaption !== undefined) {
      productionConfig.capcutAutoCaption = Boolean(payload.capcutAutoCaption);
    }
    if (payload.manualSubVideo) {
      productionConfig.manualSubVideo = payload.manualSubVideo;
    } else if (payload.manualSubVideo === null) {
      productionConfig.manualSubVideo = null;
    }

    job.status = 'pending';
    job.errorCount = 0;
    job.retry = 0;
    job.errorLog = [];
    job.startedAt = null;
    job.completedAt = null;
    job.uploadedAt = null;
    job.uploadUrl = '';
    job.lastRetryAt = null;
    job.metadata = {
      ...(job.metadata || {}),
      completedDriveSync: null,
      mashupLog: null,
      queueControl: {
        retryEligible: true,
        retryStopped: false,
        retryStoppedReason: '',
        retryStoppedAt: null,
        manualInterventionRequired: false,
        nextAction: 'await-render',
      },
    };
    job.videoConfig = {
      ...(job.videoConfig || {}),
      productionConfig,
      subVideo: payload.manualSubVideo || null,
      subVideoPath: payload.manualSubVideo?.localPath || '',
      outputPath: '',
      videoPath: '',
      completedDriveSync: {},
      generatedAsset: null,
    };
    job.processLogs.push({
      stage: 'remashup',
      status: 'success',
      message: `Re-mashup requested${payload.templateName ? ` with template ${payload.templateName}` : ''}`,
      timestamp: new Date(),
    });

    await job.save();

    const sourceVideoId = job.videoConfig?.sourceVideoId || job.metadata?.sourceVideoId || '';
    await updateTrendVideoProductionSnapshot(sourceVideoId, {
      queueStatus: 'queued',
      queueId,
      recipe: job.videoConfig?.recipe || 'mashup',
      lastQueuedAt: new Date(),
      lastError: '',
    });

    if (payload.startImmediately !== false) {
      return this.startJob(queueId);
    }

    return {
      success: true,
      queueId,
      message: 'Re-mashup queued',
      queueItem: job.toObject(),
    };
  }

  async runMassProduction(payload = {}) {
    const limit = Math.min(50, Math.max(1, Number(payload.limit) || 5));
    const sourceKey = String(payload.sourceKey || '').trim();
    const syncSourceToDrive = payload.syncSourceToDrive !== false;
    const startImmediately = payload.startImmediately !== false;
    const recipe = String(payload.recipe || 'mashup').trim() || 'mashup';
    const platform = String(payload.platform || 'youtube').trim() || 'youtube';
    const sourceQuery = buildSourceVideoQuery(sourceKey);
    const productionConfig = {
      ...(payload.productionConfig || {}),
    };
    if (!productionConfig.subtitleMode) {
      productionConfig.subtitleMode = 'auto';
    }
    const candidateQuery = Object.keys(sourceQuery).length
      ? {
          downloadStatus: 'done',
          localPath: { $exists: true, $ne: '' },
          $and: [
            sourceQuery,
            {
              $or: [
                { 'production.queueStatus': { $exists: false } },
                { 'production.queueStatus': { $in: ['idle', 'failed', null, ''] } },
              ],
            },
          ],
        }
      : {
          downloadStatus: 'done',
          localPath: { $exists: true, $ne: '' },
          $or: [
            { 'production.queueStatus': { $exists: false } },
            { 'production.queueStatus': { $in: ['idle', 'failed', null, ''] } },
          ],
        };

    const candidates = await TrendVideo.find(candidateQuery)
      .sort({ downloadedAt: 1, discoveredAt: 1, createdAt: 1 })
      .limit(limit * 4);

    const picked = [];
    const skipped = [];

    for (const video of candidates) {
      if (picked.length >= limit) break;

      const activeJob = await VideoPipelineJob.exists({
        'metadata.sourceVideoId': String(video._id),
        status: { $in: ['pending', 'processing', 'ready'] },
      });

      if (activeJob) {
        skipped.push({
          videoId: String(video._id),
          title: video.title,
          reason: 'active-job-exists',
        });
        continue;
      }

      picked.push(video);
    }

    const results = [];
    for (const video of picked) {
      const itemResult = {
        videoId: String(video._id),
        title: video.title,
        sourceKey: video.source || video.platform,
        syncedSourceToDrive: false,
        queueId: '',
        status: 'skipped',
        error: '',
      };

      if (syncSourceToDrive && video.driveSync?.status !== 'uploaded') {
        const syncResult = await this.uploadSourceVideo(video._id);
        if (!syncResult.success) {
          await updateTrendVideoProductionSnapshot(video._id, {
            queueStatus: 'failed',
            lastError: syncResult.error || 'Source drive sync failed before mass production',
          });
          itemResult.status = 'failed';
          itemResult.error = syncResult.error || 'Source drive sync failed';
          results.push(itemResult);
          continue;
        }

        itemResult.syncedSourceToDrive = Boolean(syncResult.uploaded);
      }

      const queueResult = await this.queueSourceVideos({
        videoIds: [String(video._id)],
        recipe,
        platform,
        productionConfig,
      });

      if (!queueResult.success || !queueResult.queued?.length) {
        await updateTrendVideoProductionSnapshot(video._id, {
          queueStatus: 'failed',
          lastError: queueResult.error || 'Could not queue production job',
        });
        itemResult.status = 'failed';
        itemResult.error = queueResult.error || 'Queue failed';
        results.push(itemResult);
        continue;
      }

      itemResult.queueId = queueResult.queued[0]?.queueId || '';
      itemResult.status = startImmediately ? 'queued' : 'pending';

      if (startImmediately && itemResult.queueId) {
        const startResult = await this.startJob(itemResult.queueId);
        if (!startResult.success) {
          itemResult.status = 'failed';
          itemResult.error = startResult.error || 'Inline render failed';
          results.push(itemResult);
          continue;
        }

        itemResult.status = startResult.queueItem?.status || 'ready';
      }

      results.push(itemResult);
    }

    const summary = {
      requested: limit,
      considered: candidates.length,
      selected: picked.length,
      skipped: skipped.length,
      queued: results.filter((item) => ['pending', 'queued'].includes(item.status)).length,
      completed: results.filter((item) => ['ready', 'uploaded'].includes(item.status)).length,
      failed: results.filter((item) => item.status === 'failed').length,
      syncedSourceToDrive: results.filter((item) => item.syncedSourceToDrive).length,
    };

    return {
      success: true,
      message: `Processed ${summary.selected} source video(s) for ${recipe}`,
      summary,
      skipped,
      results,
    };
  }

  async retryFailedJobs(maxRetries = 3) {
    return VideoQueueService.retryFailedBatch(maxRetries);
  }

  async releaseStaleJobs(timeoutMinutes = 30) {
    return VideoQueueService.releaseStaleJobs(timeoutMinutes);
  }

  async clearQueueJobs(payload = {}) {
    const statusFilter = String(payload.statusFilter || '').trim() || null;
    const force = payload.force === true;

    if (statusFilter === 'processing' && !force) {
      return {
        success: false,
        error: 'Clearing processing jobs requires force=true',
      };
    }

    return VideoQueueService.clearQueue(statusFilter);
  }

  async getSchedulerRuntimeStatus() {
    await queueScannerCronJob.loadScheduleSettings();
    const status = await queueScannerCronJob.getStatus();
    const videos = googleDriveIntegration.listQueueVideos();
    const driveQueue = await queueScannerCronJob.listDriveQueueVideos();

    await publishSchedulerCronJob.loadScheduleSettings();
    const publishStatus = await publishSchedulerCronJob.getStatus();

    return {
      success: true,
      data: {
        ...status,
        scheduleConfig: queueScannerCronJob.scheduleConfig || {},
        videos: videos.map((item) => ({
          name: item.name,
          size: item.size,
          createdAt: item.createdAt,
          metadata: queueScannerCronJob.readQueueMetadata(item.path) || null,
        })),
        publishScheduler: {
          ...publishStatus,
          scheduleConfig: publishSchedulerCronJob.scheduleConfig || {},
        },
        driveQueue: driveQueue.map((item) => ({
          name: item.name,
          size: item.size,
          createdAt: item.createdTime || null,
          driveFileId: item.id,
          thumbnail: item.thumbnailLink || '',
          webViewLink: item.webViewLink || '',
        })),
      },
    };
  }

  /**
   * Connections stay on the existing multi-account service for now, but this
   * method exposes them in the unified API contract used by the page.
   */
  async triggerPublishSchedulerNow() {
    const timeout = (ms, message) => new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
    try {
      await Promise.race([
        publishSchedulerCronJob.loadScheduleSettings(),
        timeout(10000, 'Publish scheduler settings timed out'),
      ]);
    } catch (error) {
      return { success: false, error: error?.message || 'Publish scheduler settings timed out' };
    }

    const result = await publishSchedulerCronJob.runPublishCycle();
    if (!result?.success) {
      return { success: false, error: result?.error || 'Publish scheduler failed.' };
    }
    return { success: true, result, message: 'Publish scheduler triggered.' };
  }

  async getConnections() {
    return {
      success: true,
      accounts: MultiAccountService.getAllAccounts().accounts || [],
      stats: MultiAccountService.getAccountStats().stats || {},
    };
  }

  async addConnection(payload = {}) {
    return MultiAccountService.addAccount(payload);
  }

  async verifyConnection(accountId) {
    return MultiAccountService.verifyAccountConnection(accountId);
  }

  async deleteConnection(accountId) {
    return MultiAccountService.deleteAccount(accountId);
  }

  /**
   * Settings now return human-readable schedule descriptors. The frontend no
   * longer needs to expose raw cron strings just to edit a daily schedule.
   */
  async getSettings() {
    const [trendSetting, queueScanner, templateSources] = await Promise.all([
      TrendSetting.getOrCreateDefault(),
      QueueScannerSettings.findOne({ key: 'default' }).lean(),
      DriveTemplateSource.find({}).sort({ updatedAt: -1 }).lean(),
    ]);

    const discoverSchedule = cronToReadableSchedule(trendSetting.cronTimes?.discover, '07:00');
    const scanSchedule = cronToReadableSchedule(trendSetting.cronTimes?.scan, '08:30');
    const scheduler = normalizeProductionSchedule({
      enabled: queueScanner?.enabled || false,
      mode: queueScanner?.scheduleMode || (queueScanner?.enabled ? 'hourly' : 'manual'),
      everyHours: queueScanner?.everyHours || Math.max(1, Math.round((queueScanner?.intervalMinutes || 60) / 60)),
      everyMinutes: queueScanner?.everyMinutes || Math.max(1, Number(queueScanner?.intervalMinutes || 60)),
      dailyTime: queueScanner?.dailyTime || '09:00',
    });

    const publishScheduler = normalizeProductionSchedule({
      enabled: queueScanner?.publishEnabled ?? false,
      mode: queueScanner?.publishScheduleMode || (queueScanner?.publishEnabled ? 'daily' : 'manual'),
      everyHours: queueScanner?.publishEveryHours || Math.max(1, Math.round((queueScanner?.publishIntervalMinutes || 1440) / 60)),
      everyMinutes: queueScanner?.publishEveryMinutes || Math.max(1, Number(queueScanner?.publishIntervalMinutes || 1440)),
      dailyTime: queueScanner?.publishDailyTime || '09:00',
    });
    const publishFilters = normalizePublishFilters(queueScanner?.publishFilters || {});
    const publishGapMinutes = Math.max(1, Number(queueScanner?.publishGapMinutes) || 30);
    const publishMaxPerRun = Math.max(1, Number(queueScanner?.publishMaxPerRun) || 20);
    const publishAccountIds = Array.isArray(queueScanner?.publishAccountIds) ? queueScanner.publishAccountIds : [];
    const publishVisibility = queueScanner?.publishVisibility || 'public';

    return {
      success: true,
      settings: {
        discovery: {
          keywords: trendSetting.keywords,
          maxConcurrentDownload: trendSetting.maxConcurrentDownload,
          minViewsFilter: trendSetting.minViewsFilter,
          proxyList: trendSetting.proxyList,
          telegramBotToken: trendSetting.telegramBotToken,
          isEnabled: trendSetting.isEnabled,
          discoverSchedule,
          scanSchedule,
        },
        production: {
          scheduler,
          schedulerEnabled: scheduler.enabled,
          autoPublish: queueScanner?.autoPublish || false,
          defaultPlatform: queueScanner?.platform || 'youtube',
          youtubePublishType: queueScanner?.youtubePublishType || 'shorts',
          publishScheduler,
          publishFilters,
          publishGapMinutes,
          publishMaxPerRun,
          publishVisibility,
          publishAccountIds,
          templateSources,
          templateLibrary: normalizeTemplateLibrary(trendSetting.videoPipelinePreferences?.production?.templateLibrary),
          subVideoLibrarySources: normalizeSubVideoLibrarySources(trendSetting.videoPipelinePreferences?.production?.subVideoLibrarySources),
          composerDefaults: normalizeComposerDefaults(trendSetting.videoPipelinePreferences?.production?.composerDefaults),
          templateBrowserPreferences: normalizeTemplateBrowserPreferences(trendSetting.videoPipelinePreferences?.production?.templateBrowserPreferences),
        },
      },
    };
  }

  /**
   * Saves readable settings back into the legacy storage shape used by the
   * worker and discovery layer while preserving one payload shape for the UI.
   */
  async saveSettings(payload = {}) {
    const discovery = payload.discovery || {};
    const production = payload.production || {};
    const scheduler = normalizeProductionSchedule({
      ...(production.scheduler || {}),
      enabled: production.scheduler?.enabled ?? production.schedulerEnabled ?? false,
    });
    const publishScheduler = normalizeProductionSchedule({
      ...(production.publishScheduler || {}),
      enabled: production.publishScheduler?.enabled ?? false,
    });
    const publishFilters = normalizePublishFilters(production.publishFilters || {});
    const publishGapMinutes = Math.max(1, Number(production.publishGapMinutes) || 30);
    const publishMaxPerRun = Math.max(1, Number(production.publishMaxPerRun) || 20);
    const publishAccountIds = Array.isArray(production.publishAccountIds) ? production.publishAccountIds : [];
    const publishVisibilityInput = String(production.publishVisibility || 'public').toLowerCase();
    const publishVisibility = ['public', 'unlisted', 'private'].includes(publishVisibilityInput)
      ? publishVisibilityInput
      : 'public';

    const trendSetting = await TrendSetting.getOrCreateDefault();
    trendSetting.keywords = discovery.keywords || trendSetting.keywords;
    trendSetting.maxConcurrentDownload = discovery.maxConcurrentDownload ?? trendSetting.maxConcurrentDownload;
    trendSetting.minViewsFilter = discovery.minViewsFilter ?? trendSetting.minViewsFilter;
    trendSetting.proxyList = discovery.proxyList || trendSetting.proxyList;
    trendSetting.telegramBotToken = discovery.telegramBotToken ?? trendSetting.telegramBotToken;
    trendSetting.isEnabled = discovery.isEnabled ?? trendSetting.isEnabled;
    trendSetting.cronTimes = {
      discover: scheduleToCron(discovery.discoverSchedule, trendSetting.cronTimes?.discover || '0 7 * * *'),
      scan: scheduleToCron(discovery.scanSchedule, trendSetting.cronTimes?.scan || '30 8 * * *'),
    };
    const templateLibraryPayload = production.templateLibrary === undefined
      ? trendSetting.videoPipelinePreferences?.production?.templateLibrary
      : production.templateLibrary;
    const subVideoLibrarySourcesPayload = production.subVideoLibrarySources === undefined
      ? trendSetting.videoPipelinePreferences?.production?.subVideoLibrarySources
      : production.subVideoLibrarySources;
    const composerDefaultsPayload = production.composerDefaults === undefined
      ? trendSetting.videoPipelinePreferences?.production?.composerDefaults
      : production.composerDefaults;
    const templateBrowserPreferencesPayload = production.templateBrowserPreferences === undefined
      ? trendSetting.videoPipelinePreferences?.production?.templateBrowserPreferences
      : production.templateBrowserPreferences;

    trendSetting.videoPipelinePreferences = {
      ...(trendSetting.videoPipelinePreferences?.toObject ? trendSetting.videoPipelinePreferences.toObject() : trendSetting.videoPipelinePreferences || {}),
      production: {
        ...((trendSetting.videoPipelinePreferences?.production && typeof trendSetting.videoPipelinePreferences.production.toObject === 'function') ? trendSetting.videoPipelinePreferences.production.toObject() : trendSetting.videoPipelinePreferences?.production || {}),
        templateLibrary: normalizeTemplateLibrary(templateLibraryPayload),
        subVideoLibrarySources: normalizeSubVideoLibrarySources(subVideoLibrarySourcesPayload),
        composerDefaults: normalizeComposerDefaults(composerDefaultsPayload),
        templateBrowserPreferences: normalizeTemplateBrowserPreferences(templateBrowserPreferencesPayload),
      },
    };
    await trendSetting.save();

    await QueueScannerSettings.findOneAndUpdate(
      { key: 'default' },
      {
        key: 'default',
        enabled: scheduler.enabled,
        intervalMinutes: scheduler.intervalMinutes,
        scheduleMode: scheduler.mode,
        everyHours: scheduler.everyHours,
        everyMinutes: scheduler.everyMinutes,
        dailyTime: scheduler.dailyTime,
        scheduleLabel: scheduler.label,
        autoPublish: production.autoPublish ?? false,
        platform: production.defaultPlatform || 'youtube',
        youtubePublishType: production.youtubePublishType || 'shorts',
        publishEnabled: publishScheduler.enabled,
        publishIntervalMinutes: publishScheduler.intervalMinutes,
        publishScheduleMode: publishScheduler.mode,
        publishEveryHours: publishScheduler.everyHours,
        publishEveryMinutes: publishScheduler.everyMinutes,
        publishDailyTime: publishScheduler.dailyTime,
        publishScheduleLabel: publishScheduler.label,
        publishGapMinutes,
        publishMaxPerRun,
        publishFilters,
        publishAccountIds,
        publishVisibility,
      },
      { upsert: true, new: true }
    );

    if (scheduler.enabled) {
      queueScannerCronJob.initializeSchedule(scheduler.intervalMinutes, {
        scheduleMode: scheduler.mode,
        everyHours: scheduler.everyHours,
        dailyTime: scheduler.dailyTime,
        scheduleLabel: scheduler.label,
        autoPublish: production.autoPublish ?? false,
        accountIds: production.accountIds || [],
        platform: production.defaultPlatform || 'youtube',
        youtubePublishType: production.youtubePublishType || 'shorts',
      }, { persist: false });
      console.log('[QueueScanner] Enabled', {
        intervalMinutes: scheduler.intervalMinutes,
        mode: scheduler.mode,
        everyHours: scheduler.everyHours,
        dailyTime: scheduler.dailyTime,
      });
    } else {
      queueScannerCronJob.disableSchedule({ persist: false });
      console.log('[QueueScanner] Disabled');
    }

    if (publishScheduler.enabled) {
      publishSchedulerCronJob.initializeSchedule(publishScheduler.intervalMinutes, {
        ...publishScheduler,
      }, { persist: false });
      console.log('[PublishScheduler] Enabled', {
        intervalMinutes: publishScheduler.intervalMinutes,
        mode: publishScheduler.mode,
        everyHours: publishScheduler.everyHours,
        dailyTime: publishScheduler.dailyTime,
      });
    } else {
      publishSchedulerCronJob.disableSchedule({ persist: false });
      console.log('[PublishScheduler] Disabled');
    }

    if (Array.isArray(production.templateSources)) {
      const keepIds = [];
      for (const item of production.templateSources) {
        const health = normalizeTemplateHealth(item);
        const doc = await DriveTemplateSource.findOneAndUpdate(
          { folderId: item.folderId },
          {
            name: item.name || path.basename(item.folderPath || item.folderId),
            folderId: item.folderId,
            folderPath: item.folderPath || '',
            enabled: item.enabled !== false,
            selectionStrategy: item.selectionStrategy || 'random',
            healthStatus: health.status,
            lastCheckedAt: new Date(),
            lastError: health.error,
            notes: item.notes || '',
          },
          { upsert: true, new: true }
        );
        keepIds.push(String(doc._id));
      }

      await DriveTemplateSource.deleteMany({
        _id: { $nin: keepIds },
      });
    }

    return this.getSettings();
  }

  async resolveAutomaticSubVideoInput(queueItem = {}) {
    const trendSetting = await TrendSetting.getOrCreateDefault();
    const productionPreferences = trendSetting.videoPipelinePreferences?.production || {};
    const sources = normalizeSubVideoLibrarySources(productionPreferences.subVideoLibrarySources).filter((item) => item.enabled !== false);

    if (!sources.length) {
      return { success: false, error: 'No enabled sub-video library sources are configured' };
    }

    const productionConfig = queueItem.videoConfig?.productionConfig || {};
    const context = {
      templateName: productionConfig.templateName || 'reaction',
      aspectRatio: productionConfig.aspectRatio || '9:16',
      sourceTitle: queueItem.videoConfig?.sourceTitle || '',
      subtitleContext: productionConfig.subtitleContext || '',
      affiliateKeywords: productionConfig.affiliateKeywords || [],
    };

    const orderedSources = [...sources].sort((left, right) => Number(right.isDefault === true) - Number(left.isDefault === true));
    const errors = [];

    for (const source of orderedSources) {
      try {
        const resolved = await publicDriveFolderIngestService.resolveSubVideoFromSource(source, context);
        if (resolved.success) {
          return {
            success: true,
            source,
            ...resolved,
          };
        }
        errors.push(`${source.name || source.key}: ${resolved.error || 'No suitable public file found'}`);
      } catch (error) {
        errors.push(`${source.name || source.key}: ${error.message}`);
      }
    }

    return {
      success: false,
      error: errors[0] || 'Automatic sub-video resolution failed',
      errors,
    };
  }

  /**
   * Publishes a completed queue item to one or more configured accounts.
   */
  async analyzePublicSubVideoDriveFolder(payload = {}) {    try {
      return await publicDriveFolderIngestService.analyzePublicFolder(payload, payload || {});
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Could not analyze public Drive folder',
      };
    }
  }

  async publishJob(queueId, payload = {}) {
    const { accountIds = [], uploadConfig = {} } = payload;
    const queueResult = await VideoQueueService.getQueueItem(queueId);
    if (!queueResult.success) return queueResult;

    const queueItem = queueResult.queueItem;
    const videoPath =
      queueItem.videoConfig?.outputPath ||
      queueItem.videoConfig?.videoPath ||
      queueItem.videoConfig?.filePath;

    if (!videoPath) {
      return { success: false, error: 'Missing output video path in queue item config' };
    }

    const targets = MultiAccountService.resolveAccountTargets({ accountIds, uploadConfig });
    if (!targets.length) {
      return { success: false, error: 'At least one valid account target is required for publishing' };
    }

    const publishMetadata = queueItem.metadata?.publishMetadata
      || queueItem.videoConfig?.publishMetadata
      || buildPublishMetadata({
        sourceTitle: queueItem.videoConfig?.sourceTitle || queueItem.title || queueId,
        templateName: queueItem.videoConfig?.productionConfig?.templateName || queueItem.metadata?.mashupLog?.templateName || '',
        templateGroup: queueItem.metadata?.mashupLog?.templateGroup || resolveTemplateGroup(queueItem.videoConfig?.productionConfig?.templateName || 'reaction'),
        sourceKey: queueItem.metadata?.sourceKey || queueItem.metadata?.sourcePlatform || queueItem.platform,
        sourcePlatform: queueItem.metadata?.sourcePlatform || queueItem.platform,
        subtitleText: queueItem.metadata?.mashupLog?.subtitleText || queueItem.videoConfig?.productionConfig?.subtitleText || '',
        subtitleContext: queueItem.metadata?.mashupLog?.subtitleContext || queueItem.videoConfig?.productionConfig?.subtitleContext || '',
        subVideoName: queueItem.metadata?.mashupLog?.subVideo?.name || '',
      });

    const mergedUploadConfig = mergePublishUploadConfig(uploadConfig, publishMetadata);

    const results = [];
    for (const target of targets) {
      const account = MultiAccountService.getRawAccount(target.accountId);
      if (!account) {
        results.push({ accountId: target.accountId, platform: target.platform, success: false, error: 'Account not found' });
        continue;
      }

      const resolvedUploadConfig = mergePublishUploadConfig(
        target.uploadConfig || mergedUploadConfig,
        publishMetadata
      );

      const upload = AutoUploadService.registerUpload({
        queueId,
        videoPath,
        platform: target.platform || account.platform,
        accountId: target.accountId,
        uploadConfig: resolvedUploadConfig,
      });

      if (!upload.success) {
        results.push({ accountId: target.accountId, platform: target.platform, success: false, error: upload.error });
        continue;
      }

      const executed = await AutoUploadService.executeUpload(upload.uploadId, account);
      if (executed.success) MultiAccountService.recordPost(target.accountId);
      else MultiAccountService.recordError(target.accountId, executed.error);

      results.push({
        accountId: target.accountId,
        platform: target.platform || account.platform,
        ...executed,
      });
    }

    if (results.some((item) => item.success)) {
      await VideoQueueService.updateQueueStatus(queueId, 'uploaded');
    }

    return {
      success: results.some((item) => item.success),
      results,
      successful: results.filter((item) => item.success).length,
      failed: results.filter((item) => !item.success).length,
    };
  }

  async getJobLogs(queueId) {
    return VideoQueueService.getProcessLogs(queueId);
  }

  /**
   * Get all available publishing accounts (YouTube OAuth + legacy MultiAccountService)
   */
  async getPublishAccounts() {
    try {
      // Fetch YouTube OAuth accounts from database
      const youtubeAccounts = await SocialMediaAccount.find({
        platform: 'youtube',
      }).select(
        '_id username displayName platform isActive isVerified platformData totalUploads lastPostTime channelTitle channelId channelThumbnailUrl channelUrl channelCustomUrl'
      );

      // Get legacy MultiAccountService accounts (singleton instance)
      const legacyAccounts = MultiAccountService.accounts || [];

      // Format YouTube accounts
      const youtubeFormatted = youtubeAccounts.map(acc => ({
        id: acc._id.toString(),
        accountId: acc._id.toString(),
        username: acc.username || acc.displayName || acc.channelTitle,
        displayName: acc.displayName || acc.channelTitle || acc.username,
        platform: 'youtube',
        source: 'oauth',
        isActive: acc.isActive,
        isVerified: acc.isVerified,
        channelInfo: {
          title: acc.channelTitle || acc.platformData?.channelInfo?.title || '',
          channelId: acc.channelId || acc.platformData?.channelInfo?.channelId || '',
          thumbnailUrl: acc.channelThumbnailUrl || acc.platformData?.channelInfo?.thumbnailUrl || '',
          url: acc.channelUrl || acc.platformData?.channelInfo?.url || '',
        },
        stats: {
          totalUploads: acc.totalUploads || 0,
          lastPostTime: acc.lastPostTime
        }
      }));

      // Format legacy accounts
      const legacyFormatted = legacyAccounts.map(acc => ({
        id: acc.id || acc.accountId,
        accountId: acc.id || acc.accountId,
        username: acc.username || acc.email,
        displayName: acc.displayName || acc.username,
        platform: acc.platform || 'youtube',
        source: 'legacy',
        isActive: acc.isActive !== false,
        isVerified: acc.verified !== false
      }));

      return {
        success: true,
        accounts: [...youtubeFormatted, ...legacyFormatted],
        total: youtubeFormatted.length + legacyFormatted.length,
        youtube: youtubeFormatted.length,
        legacy: legacyFormatted.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        accounts: []
      };
    }
  }

  /**
   * Publish video to selected YouTube accounts via OAuth
   */
  async publishToYoutubeAccounts(queueId, payload = {}) {
    try {
      const { accountIds = [], videoMetadata = {} } = payload;

      if (!accountIds || accountIds.length === 0) {
        return { success: false, error: 'At least one YouTube account must be selected' };
      }

      // Get video from queue
      const queueResult = await VideoQueueService.getQueueItem(queueId);
      if (!queueResult.success) {
        return queueResult;
      }

      const queueItem = queueResult.queueItem;
      const videoPath = queueItem.videoConfig?.outputPath || queueItem.videoConfig?.videoPath;

      if (!videoPath) {
        return { success: false, error: 'Missing output video path in queue item' };
      }

      // Upload to each selected account
      const results = [];

      for (const accountId of accountIds) {
        try {
          // Fetch account from database
          const account = await SocialMediaAccount.findById(accountId);

          if (!account) {
            results.push({
              accountId,
              success: false,
              error: 'Account not found'
            });
            continue;
          }

          if (account.platform !== 'youtube') {
            results.push({
              accountId,
              success: false,
              error: 'Account is not a YouTube account'
            });
            continue;
          }

          if (!account.isActive || !account.isVerified) {
            results.push({
              accountId,
              success: false,
              error: 'Account is not active or verified'
            });
            continue;
          }

          // Upload video using YouTube OAuth service
          const uploadResult = await youtubeOAuthService.uploadVideo(account, {
            filePath: videoPath,
            title: videoMetadata.title || queueItem.title || 'Generated Video',
            description: videoMetadata.description || '',
            tags: videoMetadata.tags || [],
            visibility: videoMetadata.visibility || 'private',
            thumbnail: videoMetadata.thumbnail
          });

          if (uploadResult.success) {
            // Update account stats
            account.totalUploads = (account.totalUploads || 0) + 1;
            account.lastPostTime = new Date();
            await account.save();

            results.push({
              accountId: accountId.toString(),
              username: account.username,
              platform: 'youtube',
              success: true,
              videoId: uploadResult.videoId,
              videoUrl: `https://www.youtube.com/watch?v=${uploadResult.videoId}`
            });
          } else {
            results.push({
              accountId: accountId.toString(),
              username: account.username,
              platform: 'youtube',
              success: false,
              error: uploadResult.error || 'Upload failed'
            });
          }
        } catch (error) {
          results.push({
            accountId,
            success: false,
            error: error.message
          });
        }
      }

      // Update queue status if at least one succeeded
      if (results.some(r => r.success)) {
        await VideoQueueService.updateQueueStatus(queueId, 'uploaded');
      }

      return {
        success: results.some(r => r.success),
        results,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listFactoryTemplates() {
    const items = VideoMashupService.listFactoryTemplates();
    return {
      success: true,
      items,
      total: items.length,
    };
  }

  /**
   * Stores an operator-uploaded video in local workspace storage and registers
   * a gallery asset so the same file can be picked later from the video picker.
   */
  async uploadOperatorVideo(file, payload = {}) {
    if (!file) {
      return { success: false, error: 'file is required' };
    }

    const assetType = normalizeAssetType(payload.assetType, file.mimetype || '');
    const assetCategory = resolveUploadCategory(assetType, payload.assetCategory);
    const uploadDir = path.join(BACKEND_ROOT, 'uploads', 'video-pipeline', assetType);
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = sanitizeFileName(path.parse(file.originalname || assetType).name);
    const fallbackExtension = assetType === 'audio' ? '.mp3' : assetType === 'image' ? '.png' : '.mp4';
    const extension = path.extname(file.originalname || '') || fallbackExtension;
    const storedFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fileName}${extension}`;
    const absolutePath = path.join(uploadDir, storedFileName);
    const relativePath = path.relative(BACKEND_ROOT, absolutePath).replace(/\\/g, '/');
    const assetId = `video_pipeline_${assetType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await fs.writeFile(absolutePath, file.buffer);

    const asset = await Asset.create({
      assetId,
      filename: file.originalname || storedFileName,
      mimeType: file.mimetype || `${assetType}/octet-stream`,
      fileSize: file.size || file.buffer?.length || 0,
      assetType,
      assetCategory,
      userId: 'anonymous',
      sessionId: 'video-pipeline',
      storage: {
        location: 'local',
        localPath: relativePath,
        url: `/api/assets/proxy/${assetId}`,
      },
      localStorage: {
        location: 'local',
        path: relativePath,
        fileSize: file.size || file.buffer?.length || 0,
        savedAt: new Date(),
        verified: true,
      },
      metadata: {
        source: 'video-pipeline-operator-upload',
        slot: payload.slot || '',
        assetRole: payload.assetRole || '',
        originalCategory: payload.assetCategory || '',
        originalType: payload.assetType || assetType,
      },
      status: 'active',
      tags: ['video-pipeline', 'operator-upload', assetType, assetCategory, payload.slot || 'unassigned'],
    });

    return {
      success: true,
      message: `${assetType.charAt(0).toUpperCase()}${assetType.slice(1)} uploaded successfully`,
      item: {
        id: String(asset._id),
        assetId: asset.assetId,
        name: asset.filename,
        type: asset.assetType,
        category: asset.assetCategory,
        localPath: relativePath,
        url: asset.storage?.url || '',
        storage: asset.storage || {},
      },
    };
  }

  /**
   * Manual start allows operators to force a queued mashup job to render
   * immediately from the currently selected main/sub inputs.
   */
  async startJob(queueId) {
    const queueResult = await VideoQueueService.getQueueItem(queueId);
    if (!queueResult.success) {
      return queueResult;
    }

    const queueItem = queueResult.queueItem;
    const sourceVideoId = queueItem.metadata?.sourceVideoId || queueItem.videoConfig?.sourceVideoId || '';
    await VideoQueueService.logProcess({
      queueId,
      stage: 'manual-start',
      status: 'processing',
      message: 'Manual start requested',
    });
    if (queueItem.status === 'uploaded') {
      return { success: false, error: 'Uploaded jobs cannot be started again' };
    }

    if (queueItem.status === 'processing') {
      return { success: true, message: 'Job is already processing', queueItem };
    }

    const recipe = queueItem.contentType || queueItem.videoConfig?.recipe || 'mashup';
    if (recipe !== 'mashup') {
      await VideoQueueService.logProcess({
        queueId,
        stage: 'manual-start',
        status: 'success',
        message: `Manual start acknowledged for recipe "${recipe}". This recipe is waiting for a dedicated worker.`,
      });

      return {
        success: true,
        queueId,
        message: `Manual start acknowledged. Recipe "${recipe}" is not rendered inline yet.`,
      };
    }

    const mainVideo = await resolveVideoSelection(queueItem.videoConfig?.mainVideo || queueItem.videoConfig?.productionConfig?.manualMainVideo || null);
    let subVideo = await resolveVideoSelection(queueItem.videoConfig?.subVideo || queueItem.videoConfig?.productionConfig?.manualSubVideo || null);
    let mainVideoPath = resolveBackendPath(mainVideo?.localPath || queueItem.videoConfig?.mainVideoPath || '');
    let sourceVideoRecord = null;
    if (mainVideoPath && !fsSync.existsSync(mainVideoPath)) {
      mainVideoPath = '';
    }
    if (!mainVideoPath && sourceVideoId) {
      try {
        sourceVideoRecord = await TrendVideo.findById(sourceVideoId).lean();
        const fallbackCandidate = resolveBackendPath(sourceVideoRecord?.localPath || sourceVideoRecord?.driveSync?.drivePath || '');
        if (fallbackCandidate && fsSync.existsSync(fallbackCandidate)) {
          mainVideoPath = fallbackCandidate;
          await VideoPipelineJob.updateOne({ queueId }, { $set: { 'videoConfig.mainVideoPath': mainVideoPath } });
          await VideoQueueService.logProcess({
            queueId,
            stage: 'main-video-fallback',
            status: 'success',
            message: `Recovered main video from TrendVideo localPath: ${mainVideoPath}`,
          });
        }
      } catch (error) {
        await VideoQueueService.logProcess({
          queueId,
          stage: 'main-video-fallback',
          status: 'error',
          message: `Failed to recover main video path from TrendVideo: ${error.message}`,
        });
      }
    }
    if (!mainVideoPath) {
      const baseName = path.basename(queueItem.videoConfig?.mainVideoPath || '');
      if (baseName) {
        const processedCandidate = path.join(BACKEND_ROOT, 'media', 'processed-queue', baseName);
        if (fsSync.existsSync(processedCandidate)) {
          mainVideoPath = processedCandidate;
          await VideoPipelineJob.updateOne({ queueId }, { $set: { 'videoConfig.mainVideoPath': mainVideoPath } });
          await VideoQueueService.logProcess({
            queueId,
            stage: 'main-video-fallback',
            status: 'success',
            message: `Recovered main video from processed-queue: ${mainVideoPath}`,
          });
        }
      }
    }
    let subVideoPath = resolveBackendPath(subVideo?.localPath || queueItem.videoConfig?.subVideoPath || '');
    let autoSelection = null;
    let autoSelectionSource = null;
    let processingMarked = false;

    if (!mainVideoPath) {
      if (!sourceVideoRecord && sourceVideoId) {
        sourceVideoRecord = await TrendVideo.findById(sourceVideoId).lean();
      }
      const sourceUrl = sourceVideoRecord?.url || queueItem.videoConfig?.sourceUrl || '';
      if (sourceUrl && sourceVideoId) {
        const redownloadResult = await triggerPythonRedownload(sourceVideoId);
        await VideoQueueService.logProcess({
          queueId,
          stage: 'main-video-redownload',
          status: redownloadResult.success ? 'processing' : 'error',
          message: redownloadResult.success
            ? `Triggered re-download for missing main video (source: ${sourceUrl})`
            : `Failed to trigger re-download: ${redownloadResult.error}`,
        });
      }
      const errorMessage = sourceUrl
        ? 'Main video is missing locally; re-download triggered. Please retry after download completes.'
        : 'Mashup jobs require a main video input before manual start';
      const error = new Error(errorMessage);
      await VideoQueueService.recordError(queueId, error, 'validation', {
        retryEligible: false,
        manualInterventionRequired: true,
        category: 'validation',
      });
      await updateTrendVideoProductionSnapshot(sourceVideoId, {
        queueStatus: 'failed',
        queueId,
        recipe,
        lastError: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }

    await VideoQueueService.logProcess({
      queueId,
      stage: 'main-video',
      status: 'success',
      message: `Main video resolved: ${path.basename(mainVideoPath)}`,
    });

    // Mark processing early so UI doesn't keep it in pending while heavy steps run
    if (queueItem.status !== 'processing') {
      await VideoQueueService.updateQueueStatus(queueId, 'processing', {
        lastRetryAt: new Date(),
        metadata: {
          ...(queueItem.metadata || {}),
        },
      });
      await updateTrendVideoProductionSnapshot(sourceVideoId, {
        queueStatus: 'processing',
        queueId,
        recipe,
        lastQueuedAt: queueItem.videoConfig?.lastQueuedAt || queueItem.createdAt || new Date(),
        lastError: '',
      });
      processingMarked = true;
    }

    if (!subVideoPath) {
      await VideoQueueService.logProcess({
        queueId,
        stage: 'auto-sub-video',
        status: 'processing',
        message: 'Resolving auto sub video',
      });
      const autoSubVideoResult = await this.resolveAutomaticSubVideoInput(queueItem);
      if (!autoSubVideoResult.success) {
        const autoSubError = new Error(autoSubVideoResult.error || 'Automatic sub-video selection failed');
        await VideoQueueService.recordError(queueId, autoSubError, 'auto-sub-video', {
          retryEligible: false,
          manualInterventionRequired: true,
          category: 'asset-selection',
          message: autoSubVideoResult.errors?.join(' | ') || autoSubError.message,
        });
        await updateTrendVideoProductionSnapshot(sourceVideoId, {
          queueStatus: 'failed',
          queueId,
          recipe,
          lastError: autoSubError.message,
        });
        return {
          success: false,
          error: autoSubError.message,
        };
      }

      subVideo = {
        assetId: autoSubVideoResult.item?.assetId,
        name: autoSubVideoResult.item?.name,
        url: autoSubVideoResult.item?.url,
        localPath: autoSubVideoResult.item?.localPath,
        sourceType: autoSubVideoResult.source?.sourceType || 'public-drive-folder',
        sourceKey: autoSubVideoResult.source?.key || 'public-drive',
        theme: autoSubVideoResult.item?.theme || 'general',
        recommendedTemplateGroups: autoSubVideoResult.item?.recommendedTemplateGroups || [],
        autoSelected: true,
      };
      subVideoPath = autoSubVideoResult.item?.localPath || '';
      autoSelection = autoSubVideoResult.selection || null;
      autoSelectionSource = autoSubVideoResult.source || null;

      await VideoQueueService.logProcess({
        queueId,
        stage: 'auto-sub-video',
        status: 'success',
        message: `Auto-selected sub video: ${autoSubVideoResult.item?.name || 'Unnamed clip'}`,
      });
    }

    if (subVideoPath) {
      await VideoQueueService.logProcess({
        queueId,
        stage: 'sub-video',
        status: 'success',
        message: `Sub video resolved: ${path.basename(subVideoPath)}`,
      });
    }

      const productionConfig = queueItem.videoConfig?.productionConfig || {};
      const originalMainVideoPath = mainVideoPath;
      let captionedVideoPath = '';
      let capcutSubtitleResult = null;
      try {
        const shouldUseCapCut = await shouldUseCapCutCaptions({
          productionConfig,
          queueItem,
          sourceVideoId,
        });
        if (shouldUseCapCut && mainVideoPath) {
          await VideoQueueService.logProcess({
            queueId,
            stage: 'capcut-captions',
            status: 'processing',
            message: 'Generating captions via CapCut',
          });

          capcutSubtitleResult = await generateCapCutCaptions({
            videoPath: mainVideoPath,
            queueId,
            language: productionConfig.subtitleLanguage || 'auto',
            onStep: async (step, message) => {
              await VideoQueueService.logProcess({
                queueId,
                stage: `capcut-${step}`,
                status: 'processing',
                message,
              });
            },
          });

          if (capcutSubtitleResult?.outputVideoPath) {
            captionedVideoPath = capcutSubtitleResult.outputVideoPath;
            productionConfig.captionedVideoPath = captionedVideoPath;
            productionConfig.subtitleProvider = 'capcut';
            productionConfig.subtitleMode = 'none';
            productionConfig.subtitleText = '';
            productionConfig.subtitleFilePath = '';
            await VideoQueueService.logProcess({
              queueId,
              stage: 'capcut-captions',
              status: 'success',
              message: `CapCut captioned video saved (temporary): ${captionedVideoPath}`,
            });
          }
        }
      } catch (error) {
        await VideoQueueService.logProcess({
          queueId,
          stage: 'capcut-captions',
          status: 'failed',
          message: error.message || 'CapCut caption generation failed',
        });
      }

      const templateName = productionConfig.templateName || 'reaction';
      const mashupMainVideoPath = captionedVideoPath || mainVideoPath;
      const templateGroup = resolveTemplateGroup(templateName);
      const mashupLog = {
        recipe,
        templateName,
        templateGroup,
        layout: productionConfig.layout || '2-3-1-3',
        duration: Number(productionConfig.duration) || 30,
        aspectRatio: productionConfig.aspectRatio || '9:16',
        audioSource: productionConfig.audioSource || 'main',
        subtitleMode: productionConfig.subtitleMode || 'none',
        subtitleText: productionConfig.subtitleText || '',
        subtitleContext: productionConfig.subtitleContext || '',
        subtitleFilePath: productionConfig.subtitleFilePath || '',
        subtitleProvider: productionConfig.subtitleProvider || '',
        captionedVideoPath: productionConfig.captionedVideoPath || '',
        mainVideo: {
          sourceVideoId,
          title: queueItem.videoConfig?.sourceTitle || '',
          path: mainVideoPath,
          url: queueItem.videoConfig?.sourceUrl || '',
        },
      subVideo: {
        selectionMethod: subVideo?.autoSelected ? 'auto' : 'manual',
        assetId: subVideo?.assetId || '',
        name: subVideo?.name || (subVideoPath ? path.basename(subVideoPath) : ''),
        path: subVideoPath,
        sourceKey: subVideo?.sourceKey || '',
        sourceType: subVideo?.sourceType || '',
        theme: subVideo?.theme || '',
      },
      selection: subVideo?.autoSelected ? {
        method: 'auto',
        sourceKey: autoSelectionSource?.key || 'public-drive',
        sourceType: autoSelectionSource?.sourceType || 'public-drive-folder',
        sourceName: autoSelectionSource?.name || 'default library source',
        templateGroup: autoSelection?.templateGroup || templateGroup,
        desiredThemes: autoSelection?.desiredThemes || [],
        score: Number.isFinite(autoSelection?.score) ? autoSelection.score : null,
        candidates: (autoSelection?.candidates || []).map((candidate) => ({
          id: candidate.file?.id || '',
          name: candidate.file?.name || '',
          score: Number.isFinite(candidate.score) ? candidate.score : null,
          theme: candidate.file?.theme || '',
          recommendedTemplateGroups: candidate.file?.recommendedTemplateGroups || [],
        })),
      } : {
        method: 'manual',
      },
    };

    await VideoQueueService.logProcess({
      queueId,
      stage: 'mashup-config',
      status: 'success',
      message: JSON.stringify({
        recipe: mashupLog.recipe,
        templateName: mashupLog.templateName,
        templateGroup: mashupLog.templateGroup,
        mainVideoId: mashupLog.mainVideo.sourceVideoId,
        mainTitle: mashupLog.mainVideo.title,
        subVideoName: mashupLog.subVideo.name,
        subSelection: mashupLog.subVideo.selectionMethod,
        subSourceKey: mashupLog.subVideo.sourceKey,
      }),
    });

    if (processingMarked) {
      await VideoPipelineJob.updateOne(
        { queueId },
        {
          $set: {
            lastRetryAt: new Date(),
            'metadata.mashupLog': mashupLog,
          },
        }
      );
    } else {
      await VideoQueueService.updateQueueStatus(queueId, 'processing', {
        lastRetryAt: new Date(),
        metadata: {
          ...(queueItem.metadata || {}),
          mashupLog,
        },
      });
      await updateTrendVideoProductionSnapshot(sourceVideoId, {
        queueStatus: 'processing',
        queueId,
        recipe,
        lastQueuedAt: queueItem.videoConfig?.lastQueuedAt || queueItem.createdAt || new Date(),
        lastError: '',
      });
    }

    try {
      const outputDir = path.join(BACKEND_ROOT, 'media', 'mashups');
      await fs.mkdir(outputDir, { recursive: true });

      const outputFileName = sanitizeFileName(queueItem.videoConfig?.outputFileName || `${queueId}.mp4`);
      const outputPath = path.join(outputDir, outputFileName);

      // Infer contentType from source video for smart template selection
      let inferredContentType = 'general';
      if (sourceVideoId) {
        try {
          const sourceVideo = await TrendVideo.findById(sourceVideoId).lean();
          if (sourceVideo) {
            inferredContentType = this.inferContentType(sourceVideo);
          }
        } catch (err) {
          // If error fetching source video, just use inferred contentType = 'general'
        }
      }

      const renderResult = await VideoMashupService.generateMashupVideo({
        mainVideoPath: mashupMainVideoPath,
        templateVideoPath: subVideoPath,
        outputPath,
        duration: Number(productionConfig.duration) || 30,
        aspectRatio: productionConfig.aspectRatio || '9:16',
        quality: productionConfig.quality || 'high',
        audioSource: productionConfig.audioSource || 'main',
        templateName: productionConfig.templateName || 'reaction',
        subtitleMode: productionConfig.subtitleMode || 'none',
        subtitleFilePath: productionConfig.subtitleFilePath || '',
        subtitleText: productionConfig.subtitleText || '',
        videoContext: productionConfig.subtitleContext || queueItem.videoConfig?.sourceTitle || '',
        affiliateKeywords: productionConfig.affiliateKeywords || [],
        backgroundAudioPath: productionConfig.backgroundAudioPath || '',
        backgroundAudioVolume: productionConfig.backgroundAudioVolume ?? 0.18,
        memeOverlayPath: productionConfig.memeOverlayPath || '',
        memeOverlayWindow: productionConfig.memeOverlayWindow || null,
        watermarkEnabled: productionConfig.watermarkEnabled !== false,
        watermarkPath: productionConfig.watermarkPath || '',
        watermarkOpacity: productionConfig.watermarkOpacity,
        watermarkWidth: productionConfig.watermarkWidth,
        highlightDetection: productionConfig.highlightDetection || {},
        clipExtraction: productionConfig.clipExtraction || {},
        additionalVideoPaths: productionConfig.additionalVideoPaths || [],
        contentType: inferredContentType, // Smart template selection
      });

      if (!renderResult.success) {
        await VideoQueueService.recordError(queueId, new Error(renderResult.error || 'Mashup render failed'), 'mashup');
        await updateTrendVideoProductionSnapshot(sourceVideoId, {
          queueStatus: 'failed',
          queueId,
          recipe,
          lastError: renderResult.error || 'Mashup render failed',
        });
        return { success: false, error: renderResult.error || 'Mashup render failed' };
      }

      if (captionedVideoPath && captionedVideoPath !== originalMainVideoPath) {
        try {
          await fs.unlink(captionedVideoPath);
          await VideoQueueService.logProcess({
            queueId,
            stage: 'capcut-cleanup',
            status: 'success',
            message: `Removed temporary captioned video: ${captionedVideoPath}`,
          });
        } catch (cleanupError) {
          await VideoQueueService.logProcess({
            queueId,
            stage: 'capcut-cleanup',
            status: 'failed',
            message: cleanupError.message || 'Failed to remove temporary captioned video',
          });
        }
      }

      let completedDriveSync = {
        status: 'skipped',
        message: 'Completed video kept on local storage only',
      };

      try {
        const outputBuffer = await fs.readFile(outputPath);
        const driveResult = await driveService.uploadGeneratedVideo(outputBuffer, path.basename(outputPath), {
          description: `Completed mashup for queue ${queueId}`,
          properties: {
            queueId,
            recipe,
          },
        });

        completedDriveSync = {
          status: driveResult?.id ? 'uploaded' : 'skipped',
          driveFileId: driveResult?.id || '',
          webViewLink: driveResult?.webViewLink || '',
          name: driveResult?.name || path.basename(outputPath),
        };
      } catch (driveError) {
        completedDriveSync = {
          status: 'failed',
          error: driveError.message,
        };
      }

      const assetResult = await upsertGeneratedVideoAsset({
        queueId,
        outputPath,
        driveSync: completedDriveSync,
        sourceVideoId,
        recipe,
        sourceTitle: queueItem.videoConfig?.sourceTitle || '',
      });

      const publishMetadata = buildPublishMetadata({
        sourceTitle: queueItem.videoConfig?.sourceTitle || queueItem.title || queueId,
        templateName: mashupLog.templateName,
        templateGroup: mashupLog.templateGroup,
        sourceKey: queueItem.metadata?.sourceKey || queueItem.metadata?.sourcePlatform || queueItem.platform,
        sourcePlatform: queueItem.metadata?.sourcePlatform || queueItem.platform,
        subtitleText: mashupLog.subtitleText || '',
        subtitleContext: mashupLog.subtitleContext || '',
        subVideoName: mashupLog.subVideo?.name || '',
      });

      const nextVideoConfig = {
        ...(queueItem.videoConfig || {}),
        mainVideo,
        subVideo,
        mainVideoPath: originalMainVideoPath,
        mashupMainVideoPath,
        subVideoPath,
        outputPath,
        videoPath: outputPath,
        mashupLog,
        completedDriveSync,
        publishMetadata,
        generatedAsset: assetResult.success ? {
          assetId: assetResult.item?.assetId || '',
          id: assetResult.item?._id ? String(assetResult.item._id) : '',
        } : null,
        autoSelectedSubVideo: subVideo?.autoSelected ? {
          sourceKey: subVideo.sourceKey || 'public-drive',
          sourceType: subVideo.sourceType || 'public-drive-folder',
          name: subVideo.name || '',
          theme: subVideo.theme || 'general',
          recommendedTemplateGroups: subVideo.recommendedTemplateGroups || [],
        } : queueItem.videoConfig?.autoSelectedSubVideo || null,
      };

      const updateResult = await VideoQueueService.updateQueueStatus(queueId, 'ready', {
        videoConfig: nextVideoConfig,
        metadata: {
          ...(queueItem.metadata || {}),
          mashupLog,
          completedDriveSync,
          manualStartedAt: new Date().toISOString(),
          publishMetadata,
        },
        uploadUrl: completedDriveSync.webViewLink || '',
      });

      await updateTrendVideoProductionSnapshot(sourceVideoId, {
        queueStatus: 'completed',
        queueId,
        recipe,
        completedVideoPath: outputPath,
        completedDriveFileId: completedDriveSync.driveFileId || '',
        completedAt: new Date(),
        lastError: completedDriveSync.status === 'failed'
          ? (completedDriveSync.error || '')
          : '',
      });

      return {
        success: true,
        queueId,
        message: 'Job rendered successfully',
        queueItem: updateResult.queueItem,
      };
    } catch (error) {
      await VideoQueueService.recordError(queueId, error, 'manual-start');
      await updateTrendVideoProductionSnapshot(sourceVideoId, {
        queueStatus: 'failed',
        queueId,
        recipe,
        lastError: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Completely deletes a source video:
   * - Local file
   * - Google Drive file (if synced)
   * - All associated production jobs
   * - All generated assets
   * - Mashup queue entries
   * - Production snapshot from TrendVideo
   */
  async deleteSourceVideo(videoId) {
    try {
      const video = await TrendVideo.findById(videoId);
      if (!video) {
        return { success: false, error: 'Source video not found' };
      }

      const deletionLog = {
        videoId: String(video._id),
        title: video.title || video.videoId,
        timestamp: new Date(),
        deletedItems: {
          localFile: false,
          googleDriveFile: false,
          productionJobs: 0,
          generatedAssets: 0,
          queueItems: 0,
        },
        errors: [],
      };

      // 1. Delete local file
      if (video.localPath) {
        try {
          const resolvedPath = resolveBackendPath(video.localPath);
          if (fsSync.existsSync(resolvedPath)) {
            await fs.unlink(resolvedPath);
            deletionLog.deletedItems.localFile = true;
          }
        } catch (error) {
          deletionLog.errors.push(`Local file deletion failed: ${error.message}`);
        }
      }

      // 2. Delete from Google Drive
      if (video.driveSync?.driveFileId) {
        try {
          await driveService.deleteFile(video.driveSync.driveFileId);
          deletionLog.deletedItems.googleDriveFile = true;
        } catch (error) {
          deletionLog.errors.push(`Google Drive file deletion failed: ${error.message}`);
        }
      }

      // 3. Find and delete all production jobs for this video
      const productionJobs = await VideoPipelineJob.find({
        $or: [
          { 'videoConfig.sourceVideoId': String(video._id) },
          { 'metadata.sourceVideoId': String(video._id) },
        ],
      });

      for (const job of productionJobs) {
        try {
          // Delete generated output file
          if (job.videoConfig?.outputPath) {
            try {
              await fs.unlink(job.videoConfig.outputPath);
            } catch {
              // ignore
            }
          }

          // Delete from Google Drive
          if (job.videoConfig?.completedDriveSync?.driveFileId) {
            try {
              await driveService.deleteFile(job.videoConfig.completedDriveSync.driveFileId);
            } catch {
              // ignore
            }
          }

          // Mark generated asset as deleted
          if (job.videoConfig?.generatedAsset?.assetId) {
            await Asset.updateOne(
              { assetId: job.videoConfig.generatedAsset.assetId },
              { $set: { status: 'deleted' } }
            );
          }

          // Delete the job itself
          await VideoPipelineJob.deleteOne({ _id: job._id });
          deletionLog.deletedItems.productionJobs += 1;
        } catch (error) {
          deletionLog.errors.push(`Production job deletion failed: ${error.message}`);
        }
      }

      // 4. Delete all generated assets linked to this source video
      const linkedAssets = await Asset.find({
        'generation.parameters.sourceVideoId': String(video._id),
        assetCategory: 'generated-video',
        projectId: 'video-pipeline',
      });

      for (const asset of linkedAssets) {
        try {
          // Delete local file if exists
          if (asset.localStorage?.path) {
            try {
              const assetPath = resolveBackendPath(asset.localStorage.path);
              if (fsSync.existsSync(assetPath)) {
                await fs.unlink(assetPath);
              }
            } catch {
              // ignore
            }
          }

          // Delete from Drive if synced
          if (asset.cloudStorage?.googleDriveId) {
            try {
              await driveService.deleteFile(asset.cloudStorage.googleDriveId);
            } catch {
              // ignore
            }
          }

          // Mark asset as deleted
          asset.status = 'deleted';
          await asset.save();
          deletionLog.deletedItems.generatedAssets += 1;
        } catch (error) {
          deletionLog.errors.push(`Asset deletion failed: ${error.message}`);
        }
      }

      // 5. Remove video from queue folder if it was queued
      const queueDir = googleDriveIntegration.getFolderDirectory('queue');
      if (fsSync.existsSync(queueDir)) {
        try {
          const queueFiles = await fs.readdir(queueDir);
          for (const fileName of queueFiles) {
            const filePath = path.join(queueDir, fileName);
            const metadataPath = `${filePath}.json`;

            if (fsSync.existsSync(metadataPath)) {
              try {
                const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                if (metadata.sourceVideoId === String(video._id)) {
                  await fs.unlink(filePath);
                  await fs.unlink(metadataPath);
                  deletionLog.deletedItems.queueItems += 1;
                }
              } catch {
                // ignore
              }
            }
          }
        } catch (error) {
          deletionLog.errors.push(`Queue folder cleanup failed: ${error.message}`);
        }
      }

      // 6. Delete the TrendVideo document itself
      await TrendVideo.deleteOne({ _id: video._id });

      return {
        success: true,
        message: `Source video "${video.title || video.videoId}" and all associated data deleted completely`,
        deletionLog,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unexpected error during video deletion',
      };
    }
  }

  async getVideoTranscript(videoId) {
    try {
      const video = await TrendVideo.findById(videoId).select('+transcript.srt');
      if (!video) {
        return {
          success: false,
          error: 'Video not found',
        };
      }

      const transcript = video.transcript || {};
      return {
        success: true,
        videoId: video._id,
        title: video.title,
        platform: video.platform,
        transcript: {
          srt: transcript.srt || null,
          language: transcript.language || 'unknown',
          fetchedAt: transcript.fetchedAt || null,
          fetchError: transcript.fetchError || null,
        },
        hasMissedTranscript: !transcript.srt && transcript.fetchedAt,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to retrieve transcript',
      };
    }
  }
}

export default new VideoPipelineService();
