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
import path from 'path';
import Asset from '../models/Asset.js';
import TrendChannel from '../models/TrendChannel.js';
import TrendSourceConfig from '../models/TrendSourceConfig.js';
import TrendVideo from '../models/TrendVideo.js';
import TrendSetting from '../models/TrendSetting.js';
import QueueScannerSettings from '../models/QueueScannerSettings.js';
import DriveTemplateSource from '../models/DriveTemplateSource.js';
import VideoQueueService from './videoQueueService.js';
import MultiAccountService from './multiAccountService.js';
import AutoUploadService from './autoUploadService.js';
import driveService from './googleDriveOAuth.js';
import VideoMashupService from './videoMashupService.js';

const PY_SERVICE_BASE = process.env.TREND_AUTOMATION_PY_URL || 'http://localhost:8001';

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

  return {
    sourceVideoId: video?._id ? String(video._id) : '',
    sourceTitle: video?.title || manualMainVideo?.name || 'Manual video selection',
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
      subtitleMode: 'auto',
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
  const dailyTime = normalizeClockValue(input.dailyTime || '09:00');
  const label = buildHumanScheduleLabel({ enabled, mode, everyHours, dailyTime });

  return {
    enabled,
    mode,
    everyHours,
    dailyTime,
    label,
    intervalMinutes: mode === 'daily' ? 24 * 60 : everyHours * 60,
  };
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

  await fs.access(video.localPath);
  const fileBuffer = await fs.readFile(video.localPath);
  const fileName = path.basename(video.localPath) || `${video.videoId || video._id}.mp4`;
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

function resolveAssetLocalPath(asset = {}) {
  const candidate = asset?.localStorage?.path || asset?.storage?.localPath || '';
  if (!candidate) return '';
  return path.isAbsolute(candidate) ? candidate : path.join(process.cwd(), candidate);
}

async function resolveVideoSelection(selection = null) {
  if (!selection) return null;

  if (selection.localPath) {
    return {
      ...selection,
      localPath: path.isAbsolute(selection.localPath)
        ? selection.localPath
        : path.join(process.cwd(), selection.localPath),
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

class VideoPipelineService {
  /**
   * Dashboard data is intentionally small and aggregated so the overview tab
   * can render quickly without needing to preload the large video tables.
   */
  async getDashboard() {
    const [queueStats, accountStats, sourceConfigs, totalVideos, driveReadyVideos, queuedVideos, totalChannels, templateSources] =
      await Promise.all([
        VideoQueueService.getQueueStats(),
        Promise.resolve(MultiAccountService.getAccountStats()),
        TrendSourceConfig.ensureDefaults(),
        TrendVideo.countDocuments(),
        TrendVideo.countDocuments({ 'driveSync.status': 'uploaded' }),
        TrendVideo.countDocuments({ 'production.queueStatus': 'queued' }),
        TrendChannel.countDocuments(),
        DriveTemplateSource.find({}).sort({ updatedAt: -1 }).lean(),
      ]);

    return {
      success: true,
      metrics: {
        configuredSources: sourceConfigs.length,
        totalChannels,
        totalVideos,
        driveReadyVideos,
        queuedVideos,
        queueJobs: queueStats.stats?.total || 0,
        readyToPublish: (queueStats.stats?.byStatus?.ready || 0) + (queueStats.stats?.byStatus?.uploaded || 0),
        connections: accountStats.stats?.totalAccounts || 0,
        healthyTemplateSources: templateSources.filter((item) => item.healthStatus === 'healthy').length,
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
      limit = 100,
    } = filters;

    const query = {};
    if (platform) query.platform = platform;
    if (source) {
      query.$or = [
        { source },
        { platform: source },
      ];
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

    const items = await TrendVideo.find(query)
      .populate('channel', 'name channelId platform sourceKey subscriberCount')
      .sort({ discoveredAt: -1, createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 250))
      .lean();

    return {
      success: true,
      items: items.map((item) => ({
        ...item,
        id: String(item._id),
        sourceKey: item.source || item.platform,
        queueReady: item.downloadStatus === 'done',
        driveReady: item.driveSync?.status === 'uploaded',
        channelName: item.channel?.name || '',
      })),
      count: items.length,
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

      return {
        success: true,
        message: 'Pending download trigger sent successfully',
        upstream: PY_SERVICE_BASE,
        data: response.data,
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
      return {
        ...item,
        sourceTitle: source?.title || item.videoConfig?.sourceTitle || item.queueId,
        sourcePlatform: source?.platform || item.videoConfig?.sourcePlatform || item.platform,
      };
    });

    return {
      success: true,
      items: enriched,
      count: enriched.length,
      stats: (await VideoQueueService.getQueueStats()).stats,
    };
  }

  /**
   * Connections stay on the existing multi-account service for now, but this
   * method exposes them in the unified API contract used by the page.
   */
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
      dailyTime: queueScanner?.dailyTime || '09:00',
    });

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
          templateSources,
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
    await trendSetting.save();

    await QueueScannerSettings.findOneAndUpdate(
      { key: 'default' },
      {
        key: 'default',
        enabled: scheduler.enabled,
        intervalMinutes: scheduler.intervalMinutes,
        scheduleMode: scheduler.mode,
        everyHours: scheduler.everyHours,
        dailyTime: scheduler.dailyTime,
        scheduleLabel: scheduler.label,
        autoPublish: production.autoPublish ?? false,
        platform: production.defaultPlatform || 'youtube',
        youtubePublishType: production.youtubePublishType || 'shorts',
      },
      { upsert: true, new: true }
    );

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

  /**
   * Publishes a completed queue item to one or more configured accounts.
   */
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

    const results = [];
    for (const target of targets) {
      const account = MultiAccountService.getRawAccount(target.accountId);
      if (!account) {
        results.push({ accountId: target.accountId, platform: target.platform, success: false, error: 'Account not found' });
        continue;
      }

      const upload = AutoUploadService.registerUpload({
        queueId,
        videoPath,
        platform: target.platform || account.platform,
        accountId: target.accountId,
        uploadConfig: target.uploadConfig || uploadConfig,
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
   * Stores an operator-uploaded video in local workspace storage and registers
   * a gallery asset so the same file can be picked later from the video picker.
   */
  async uploadOperatorVideo(file, payload = {}) {
    if (!file) {
      return { success: false, error: 'file is required' };
    }

    const uploadDir = path.join(process.cwd(), 'backend', 'uploads', 'video-pipeline');
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = sanitizeFileName(path.parse(file.originalname || 'video').name);
    const extension = path.extname(file.originalname || '') || '.mp4';
    const storedFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fileName}${extension}`;
    const absolutePath = path.join(uploadDir, storedFileName);
    const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, '/');
    const assetId = `video_pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await fs.writeFile(absolutePath, file.buffer);

    const asset = await Asset.create({
      assetId,
      filename: file.originalname || storedFileName,
      mimeType: file.mimetype || 'video/mp4',
      fileSize: file.size || file.buffer?.length || 0,
      assetType: 'video',
      assetCategory: 'source-video',
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
      },
      status: 'active',
      tags: ['video-pipeline', 'operator-upload', payload.slot || 'unassigned'],
    });

    return {
      success: true,
      message: 'Video uploaded successfully',
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
    const subVideo = await resolveVideoSelection(queueItem.videoConfig?.subVideo || queueItem.videoConfig?.productionConfig?.manualSubVideo || null);
    const mainVideoPath = mainVideo?.localPath || queueItem.videoConfig?.mainVideoPath || '';
    const subVideoPath = subVideo?.localPath || queueItem.videoConfig?.subVideoPath || '';

    if (!mainVideoPath || !subVideoPath) {
      return {
        success: false,
        error: 'Mashup jobs require both main and sub video inputs before manual start',
      };
    }

    await VideoQueueService.updateQueueStatus(queueId, 'processing');

    try {
      const outputDir = path.join(process.cwd(), 'backend', 'media', 'mashups');
      await fs.mkdir(outputDir, { recursive: true });

      const outputFileName = sanitizeFileName(queueItem.videoConfig?.outputFileName || `${queueId}.mp4`);
      const outputPath = path.join(outputDir, outputFileName);
      const renderResult = await VideoMashupService.generateMashupVideo({
        mainVideoPath,
        templateVideoPath: subVideoPath,
        outputPath,
        duration: Number(queueItem.videoConfig?.productionConfig?.duration) || 30,
        aspectRatio: queueItem.videoConfig?.productionConfig?.aspectRatio || '9:16',
      });

      if (!renderResult.success) {
        await VideoQueueService.recordError(queueId, new Error(renderResult.error || 'Mashup render failed'), 'mashup');
        return { success: false, error: renderResult.error || 'Mashup render failed' };
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

      const nextVideoConfig = {
        ...(queueItem.videoConfig || {}),
        mainVideo,
        subVideo,
        mainVideoPath,
        subVideoPath,
        outputPath,
        videoPath: outputPath,
        completedDriveSync,
      };

      const updateResult = await VideoQueueService.updateQueueStatus(queueId, 'ready', {
        videoConfig: nextVideoConfig,
        metadata: {
          ...(queueItem.metadata || {}),
          completedDriveSync,
          manualStartedAt: new Date().toISOString(),
        },
        uploadUrl: completedDriveSync.webViewLink || '',
      });

      return {
        success: true,
        queueId,
        message: 'Job rendered successfully',
        queueItem: updateResult.queueItem,
      };
    } catch (error) {
      await VideoQueueService.recordError(queueId, error, 'manual-start');
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new VideoPipelineService();
