import QueueScannerSettings from '../models/QueueScannerSettings.js';
import VideoPipelineJob from '../models/VideoPipelineJob.js';
import TrendVideo from '../models/TrendVideo.js';
import SocialMediaAccount from '../models/SocialMediaAccount.js';
import VideoQueueService from './videoQueueService.js';
import MultiAccountService from './multiAccountService.js';
import AutoUploadService from './autoUploadService.js';
import youtubeOAuthService from './youtubeOAuthService.js';
import { buildPublishMetadata, mergePublishUploadConfig } from './publishMetadataGenerator.js';
import { resolveTemplateGroup } from './publicDriveFolderIngestService.js';

const DEFAULT_FILTERS = {
  status: 'ready',
  platform: '',
  source: '',
  recipe: '',
  channel: '',
  minViews: 0,
};

function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
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

function normalizeSchedule(input = {}) {
  const enabled = input.enabled !== false;
  const mode = input.mode || (enabled ? 'daily' : 'manual');
  const everyHours = Math.max(1, Number(input.everyHours) || 24);
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

function normalizeFilters(filters = {}) {
  return {
    status: String(filters.status || 'ready').trim() || 'ready',
    platform: String(filters.platform || '').trim(),
    source: String(filters.source || '').trim(),
    recipe: String(filters.recipe || '').trim(),
    channel: String(filters.channel || '').trim(),
    minViews: Math.max(0, Number(filters.minViews) || 0),
  };
}

function buildQueuePublishMetadata(queueItem = {}) {
  return queueItem.metadata?.publishMetadata
    || queueItem.videoConfig?.publishMetadata
    || buildPublishMetadata({
      sourceTitle: queueItem.videoConfig?.sourceTitle || queueItem.title || queueItem.queueId,
      templateName: queueItem.videoConfig?.productionConfig?.templateName || queueItem.metadata?.mashupLog?.templateName || '',
      templateGroup: queueItem.metadata?.mashupLog?.templateGroup || resolveTemplateGroup(queueItem.videoConfig?.productionConfig?.templateName || 'reaction'),
      sourceKey: queueItem.metadata?.sourceKey || queueItem.metadata?.sourcePlatform || queueItem.platform,
      sourcePlatform: queueItem.metadata?.sourcePlatform || queueItem.platform,
      subtitleText: queueItem.metadata?.mashupLog?.subtitleText || queueItem.videoConfig?.productionConfig?.subtitleText || '',
      subtitleContext: queueItem.metadata?.mashupLog?.subtitleContext || queueItem.videoConfig?.productionConfig?.subtitleContext || '',
      subVideoName: queueItem.metadata?.mashupLog?.subVideo?.name || '',
    });
}

async function publishLegacyAccounts(queueId, queueItem, legacyAccountIds = [], youtubePublishType = 'shorts') {
  if (!legacyAccountIds.length) return { success: false, results: [], successful: 0, failed: 0 };

  const videoPath =
    queueItem.videoConfig?.outputPath ||
    queueItem.videoConfig?.videoPath ||
    queueItem.videoConfig?.filePath;

  if (!videoPath) {
    return { success: false, error: 'Missing output video path in queue item config', results: [], successful: 0, failed: 0 };
  }

  const publishMetadata = buildQueuePublishMetadata(queueItem);
  const mergedUploadConfig = mergePublishUploadConfig({ youtubePublishType }, publishMetadata);

  const results = [];

  for (const accountId of legacyAccountIds) {
    const account = MultiAccountService.getRawAccount(accountId);
    if (!account) {
      results.push({ accountId, platform: 'unknown', success: false, error: 'Account not found' });
      continue;
    }

    const upload = AutoUploadService.registerUpload({
      queueId,
      videoPath,
      platform: account.platform || 'youtube',
      accountId,
      uploadConfig: mergedUploadConfig,
    });

    if (!upload.success) {
      results.push({ accountId, platform: account.platform, success: false, error: upload.error });
      continue;
    }

    const executed = await AutoUploadService.executeUpload(upload.uploadId, account);
    if (executed.success) MultiAccountService.recordPost(accountId);
    else MultiAccountService.recordError(accountId, executed.error);

    results.push({ accountId, platform: account.platform, ...executed });
  }

  return {
    success: results.some((item) => item.success),
    results,
    successful: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
  };
}

async function publishOAuthAccounts(queueId, queueItem, oauthAccounts = []) {
  if (!oauthAccounts.length) return { success: false, results: [], successful: 0, failed: 0 };

  const videoPath = queueItem.videoConfig?.outputPath || queueItem.videoConfig?.videoPath;
  if (!videoPath) {
    return { success: false, error: 'Missing output video path in queue item', results: [], successful: 0, failed: 0 };
  }

  const results = [];

  for (const account of oauthAccounts) {
    try {
      const uploadResult = await youtubeOAuthService.uploadVideo(account, {
        filePath: videoPath,
        title: queueItem.videoConfig?.sourceTitle || queueItem.title || 'Generated Video',
        description: '',
        tags: [],
        visibility: 'private',
        thumbnail: null,
      });

      if (uploadResult.success) {
        account.totalUploads = (account.totalUploads || 0) + 1;
        account.lastPostTime = new Date();
        await account.save();

        results.push({
          accountId: account._id.toString(),
          username: account.username,
          platform: 'youtube',
          success: true,
          videoId: uploadResult.videoId,
          videoUrl: `https://www.youtube.com/watch?v=${uploadResult.videoId}`,
        });
      } else {
        results.push({
          accountId: account._id.toString(),
          username: account.username,
          platform: 'youtube',
          success: false,
          error: uploadResult.error || 'Upload failed',
        });
      }
    } catch (error) {
      results.push({ accountId: account._id.toString(), success: false, error: error.message });
    }
  }

  return {
    success: results.some((item) => item.success),
    results,
    successful: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
  };
}

class PublishSchedulerCronJob {
  constructor() {
    this.isRunning = false;
    this.scheduleIntervalRef = null;
    this.scheduleConfig = {
      intervalMinutes: 1440,
      scheduleMode: 'daily',
      everyHours: 24,
      dailyTime: '09:00',
      scheduleLabel: 'Manual only',
      enabled: false,
    };
    this.publishConfig = {
      gapMinutes: 30,
      maxPerRun: 20,
      filters: { ...DEFAULT_FILTERS },
      accountIds: [],
      youtubePublishType: 'shorts',
    };
    this.settingsLoaded = false;
  }

  async loadScheduleSettings() {
    if (this.settingsLoaded) {
      return this.scheduleConfig;
    }

    try {
      const settings = await QueueScannerSettings.findOne({ key: 'default' }).lean();
      if (settings) {
        const schedule = normalizeSchedule({
          enabled: settings.publishEnabled ?? false,
          mode: settings.publishScheduleMode || (settings.publishEnabled ? 'daily' : 'manual'),
          everyHours: settings.publishEveryHours || Math.max(1, Math.round((settings.publishIntervalMinutes || 1440) / 60)),
          dailyTime: settings.publishDailyTime || '09:00',
        });

        this.scheduleConfig = {
          intervalMinutes: settings.publishIntervalMinutes || schedule.intervalMinutes,
          scheduleMode: schedule.mode,
          everyHours: schedule.everyHours,
          dailyTime: schedule.dailyTime,
          scheduleLabel: settings.publishScheduleLabel || schedule.label,
          enabled: !!settings.publishEnabled,
        };

        this.publishConfig = {
          gapMinutes: Math.max(1, Number(settings.publishGapMinutes) || 30),
          maxPerRun: Math.max(1, Number(settings.publishMaxPerRun) || 20),
          filters: normalizeFilters(settings.publishFilters || DEFAULT_FILTERS),
          accountIds: Array.isArray(settings.publishAccountIds) ? settings.publishAccountIds : [],
          youtubePublishType: settings.youtubePublishType || 'shorts',
        };

        if (settings.publishEnabled) {
          this.initializeSchedule(this.scheduleConfig.intervalMinutes, {
            ...this.scheduleConfig,
            gapMinutes: this.publishConfig.gapMinutes,
            filters: this.publishConfig.filters,
            accountIds: this.publishConfig.accountIds,
            youtubePublishType: this.publishConfig.youtubePublishType,
            enabled: true,
          }, { persist: false });
        }
      }
    } catch (error) {
      console.warn('[publish-scheduler] Failed to load schedule settings:', error.message);
    }

    this.settingsLoaded = true;
    return this.scheduleConfig;
  }

  async saveScheduleSettings(config = this.scheduleConfig, publishConfig = this.publishConfig) {
    await QueueScannerSettings.findOneAndUpdate(
      { key: 'default' },
      {
        key: 'default',
        publishEnabled: !!config.enabled,
        publishIntervalMinutes: config.intervalMinutes || 1440,
        publishScheduleMode: config.scheduleMode || 'daily',
        publishEveryHours: config.everyHours || Math.max(1, Math.round((config.intervalMinutes || 1440) / 60)),
        publishDailyTime: config.dailyTime || '09:00',
        publishScheduleLabel: config.scheduleLabel || `Every ${config.everyHours || 24} hours`,
        publishGapMinutes: Math.max(1, Number(publishConfig.gapMinutes) || 30),
        publishFilters: normalizeFilters(publishConfig.filters || DEFAULT_FILTERS),
        publishAccountIds: Array.isArray(publishConfig.accountIds) ? publishConfig.accountIds : [],
      },
      { upsert: true, new: true }
    );
  }

  initializeSchedule(intervalMinutes = 1440, options = {}, control = { persist: true }) {
    if (this.scheduleIntervalRef) {
      clearInterval(this.scheduleIntervalRef);
      this.scheduleIntervalRef = null;
    }

    const schedule = normalizeSchedule({
      enabled: options.enabled !== false,
      mode: options.scheduleMode || options.mode || 'daily',
      everyHours: options.everyHours || Math.max(1, Math.round(intervalMinutes / 60)),
      dailyTime: options.dailyTime || '09:00',
    });

    this.scheduleConfig = {
      intervalMinutes,
      scheduleMode: schedule.mode,
      everyHours: schedule.everyHours,
      dailyTime: schedule.dailyTime,
      scheduleLabel: options.scheduleLabel || schedule.label,
      enabled: schedule.enabled,
    };

    this.publishConfig = {
      gapMinutes: Math.max(1, Number(options.gapMinutes) || 30),
      maxPerRun: Math.max(1, Number(options.maxPerRun) || 20),
      filters: normalizeFilters(options.filters || DEFAULT_FILTERS),
      accountIds: Array.isArray(options.accountIds) ? options.accountIds : [],
      youtubePublishType: options.youtubePublishType || 'shorts',
    };

    if (this.scheduleConfig.enabled) {
      this.scheduleIntervalRef = setInterval(async () => {
        await this.runPublishCycle();
      }, intervalMinutes * 60 * 1000);
    }

    if (control?.persist !== false) {
      this.saveScheduleSettings(this.scheduleConfig, this.publishConfig).catch((err) => {
        console.error('? Failed to persist publish scheduler settings:', err.message);
      });
    }

    return this.scheduleConfig;
  }

  disableSchedule(options = { persist: true }) {
    if (this.scheduleIntervalRef) {
      clearInterval(this.scheduleIntervalRef);
      this.scheduleIntervalRef = null;
    }

    this.scheduleConfig = {
      ...this.scheduleConfig,
      enabled: false,
    };

    if (options?.persist !== false) {
      this.saveScheduleSettings(this.scheduleConfig, this.publishConfig).catch((err) => {
        console.error('? Failed to persist disabled publish scheduler settings:', err.message);
      });
    }

    return this.scheduleConfig;
  }

  async getStatus() {
    return {
      isRunning: this.isRunning,
      scheduleConfig: this.scheduleConfig,
      publishConfig: this.publishConfig,
      lastRunAt: this.lastRunAt,
      lastResult: this.lastResult,
      lastError: this.lastError,
    };
  }

  async runPublishCycle() {
    if (this.isRunning) {
      return { success: false, error: 'Publish scheduler already running' };
    }

    this.isRunning = true;
    this.lastRunAt = new Date().toISOString();
    this.lastError = null;
    console.log('[PublishScheduler] Run start', {
      at: this.lastRunAt,
      accountCount: this.publishConfig?.accountIds?.length || 0,
      gapMinutes: this.publishConfig?.gapMinutes,
      maxPerRun: this.publishConfig?.maxPerRun,
      filters: this.publishConfig?.filters,
    });

    try {
      const result = await withTimeout(this.publishReadyJobs(), 60000, 'Publish scheduler timed out');
      this.lastResult = result;
      console.log('[PublishScheduler] Run end', {
        success: result?.success,
        total: result?.total ?? 0,
      });
      return result;
    } catch (error) {
      const message = error?.message || String(error || 'Publish scheduler failed');
      const result = { success: false, error: message };
      this.lastError = message;
      this.lastResult = result;
      console.log('[PublishScheduler] Run failed', { error: message });
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  async publishReadyJobs() {
    const { filters, gapMinutes, accountIds, youtubePublishType, maxPerRun } = this.publishConfig;

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return { success: false, error: 'No publish accounts configured' };
    }

    const oauthAccounts = await SocialMediaAccount.find({
      _id: { $in: accountIds },
      platform: 'youtube',
      isActive: true,
      isVerified: true,
    });
    const oauthAccountIds = new Set(oauthAccounts.map((account) => account._id.toString()));

    const legacyAccountIds = accountIds.filter((id) => {
      if (oauthAccountIds.has(String(id))) return false;
      const account = MultiAccountService.getRawAccount(id);
      return account && account.active !== false && account.verified;
    });

    if (!oauthAccounts.length && !legacyAccountIds.length) {
      return { success: false, error: 'No active publish accounts configured' };
    }

    const query = {};
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    if (filters.platform) {
      query.platform = filters.platform;
    }
    if (filters.source) {
      query.$or = [
        { 'metadata.sourceKey': filters.source },
        { 'metadata.sourcePlatform': filters.source },
        { 'videoConfig.sourcePlatform': filters.source },
      ];
    }
    if (filters.recipe) {
      query.contentType = filters.recipe;
    }

    let jobs = await VideoPipelineJob.find(query).sort({ createdAt: 1 }).lean();

    const publishLimit = Math.max(0, Number(maxPerRun) || 0);
    if (publishLimit > 0) {
      jobs = jobs.slice(0, publishLimit);
    }

    if (filters.recipe) {
      jobs = jobs.filter((job) => (job.videoConfig?.recipe || job.contentType) === filters.recipe);
    }

    if (filters.channel || filters.minViews > 0) {
      const sourceIds = jobs
        .map((job) => job.metadata?.sourceVideoId)
        .filter(Boolean)
        .map((id) => id.toString());

      const videos = sourceIds.length
        ? await TrendVideo.find({ _id: { $in: sourceIds } }).populate('channel', 'name channelId').lean()
        : [];
      const videoMap = new Map(videos.map((video) => [String(video._id), video]));
      const channelNeedle = filters.channel ? filters.channel.toLowerCase() : '';

      jobs = jobs.filter((job) => {
        const sourceId = job.metadata?.sourceVideoId ? String(job.metadata.sourceVideoId) : '';
        const video = sourceId ? videoMap.get(sourceId) : null;

        if (filters.minViews > 0 && (!video || Number(video.views || 0) < filters.minViews)) {
          return false;
        }

        if (channelNeedle) {
          const channelName = String(video?.channel?.name || '').toLowerCase();
          const channelId = String(video?.channel?.channelId || '').toLowerCase();
          if (!channelName.includes(channelNeedle) && !channelId.includes(channelNeedle)) {
            return false;
          }
        }

        return true;
      });
    }

    const results = [];

    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index];
      const queueResult = await VideoQueueService.getQueueItem(job.queueId);
      if (!queueResult.success) {
        results.push({ queueId: job.queueId, success: false, error: queueResult.error });
        continue;
      }

      const queueItem = queueResult.queueItem;
      const legacyResult = await publishLegacyAccounts(job.queueId, queueItem, legacyAccountIds, youtubePublishType);
      const oauthResult = await publishOAuthAccounts(job.queueId, queueItem, oauthAccounts);

      if (legacyResult.success || oauthResult.success) {
        await VideoQueueService.updateQueueStatus(job.queueId, 'uploaded');
      }

      results.push({
        queueId: job.queueId,
        legacy: legacyResult,
        oauth: oauthResult,
        success: legacyResult.success || oauthResult.success,
      });

      if (index < jobs.length - 1 && gapMinutes > 0) {
        await sleep(gapMinutes * 60 * 1000);
      }
    }

    return {
      success: true,
      total: jobs.length,
      results,
    };
  }
}

export default new PublishSchedulerCronJob();










