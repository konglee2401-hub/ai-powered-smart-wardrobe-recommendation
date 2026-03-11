/**
 * Video Queue Service
 *
 * This service is the Mongo-backed replacement for the deprecated queue.json
 * file store. It preserves the old queue method names so older controllers
 * and orchestrators can keep calling the same API while the data now lives
 * in Mongo and can be shared across the unified pipeline UI.
 */

import VideoPipelineJob from '../models/VideoPipelineJob.js';
import notificationService from './notificationService.js';

const PRIORITY_ORDER = { high: 1, normal: 2, low: 3 };

const RETRYABLE_ERROR_PATTERNS = [
  /timeout/i,
  /timed out/i,
  /econnreset/i,
  /econnrefused/i,
  /enotfound/i,
  /socket hang up/i,
  /network/i,
  /temporar/i,
  /rate limit/i,
  /429/,
  /503/,
  /google drive/i,
  /drive upload/i,
  /drive download/i,
  /ffmpeg exited with code/i,
];

const NON_RETRYABLE_ERROR_PATTERNS = [
  /missing main video/i,
  /asset not found/i,
  /no local file path/i,
  /invalid data found/i,
  /moov atom not found/i,
  /unsupported/i,
  /no enabled sub-video library sources/i,
  /no suitable public file found/i,
  /mashup jobs require a main video input/i,
];

function buildQueueControl(job = {}) {
  const control = job.metadata?.queueControl || {};
  const retryEligible = control.retryEligible !== false;
  const retryStopped = control.retryStopped === true;
  const manualInterventionRequired = control.manualInterventionRequired === true;
  const maxRetries = Number(job.maxRetries) || 0;
  const errorCount = Number(job.errorCount) || 0;
  const retriesRemaining = Math.max(0, maxRetries - errorCount);

  let executionState = 'idle';
  if (job.status === 'processing') executionState = 'processing';
  else if (job.status === 'ready') executionState = 'ready';
  else if (job.status === 'uploaded') executionState = 'uploaded';
  else if (job.status === 'failed') executionState = manualInterventionRequired ? 'manual-review' : 'failed';
  else if (job.status === 'pending' && errorCount > 0 && retryEligible) executionState = 'auto-retry-pending';
  else if (job.status === 'pending') executionState = 'pending';

  return {
    retryEligible,
    retryStopped,
    manualInterventionRequired,
    retriesRemaining,
    retryStoppedReason: control.retryStoppedReason || '',
    retryStoppedAt: control.retryStoppedAt || null,
    lastFailureStage: control.lastFailureStage || '',
    lastFailureMessage: control.lastFailureMessage || '',
    lastFailureAt: control.lastFailureAt || null,
    nextAction: control.nextAction || (executionState === 'manual-review' ? 'manual-start' : executionState === 'auto-retry-pending' ? 'auto-retry' : 'none'),
    executionState,
    summary: retryStopped
      ? 'Retry stopped after reaching the retry limit'
      : executionState === 'manual-review'
        ? 'Needs manual review before retry'
        : executionState === 'auto-retry-pending'
          ? 'Queued for automatic retry'
          : executionState === 'processing'
            ? 'Currently processing'
            : executionState === 'ready'
              ? 'Ready for publishing'
              : executionState === 'uploaded'
                ? 'Uploaded successfully'
                : executionState === 'pending'
                  ? 'Waiting for processing'
                  : 'Idle',
  };
}

function classifyQueueError(error, stage = 'processing') {
  const message = error?.message || String(error || 'Unknown error');
  const normalizedStage = String(stage || 'processing').toLowerCase();

  if (NON_RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return { retryEligible: false, manualInterventionRequired: true, category: 'content', message };
  }

  if (normalizedStage === 'auto-sub-video' && /no suitable|not found|missing/i.test(message)) {
    return { retryEligible: false, manualInterventionRequired: true, category: 'asset-selection', message };
  }

  if (RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return { retryEligible: true, manualInterventionRequired: false, category: 'transient', message };
  }

  return {
    retryEligible: normalizedStage !== 'validation',
    manualInterventionRequired: normalizedStage === 'validation',
    category: normalizedStage === 'validation' ? 'validation' : 'unknown',
    message,
  };
}

function createQueueId() {
  return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeDate(value, fallback = new Date()) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toPlainJob(job) {
  if (!job) return null;
  const plain = typeof job.toObject === 'function' ? job.toObject() : { ...job };
  const queueControl = buildQueueControl(plain);
  return {
    ...plain,
    queueControl,
    scheduleTime: plain.scheduleTime ? new Date(plain.scheduleTime).toISOString() : null,
    startedAt: plain.startedAt ? new Date(plain.startedAt).toISOString() : null,
    completedAt: plain.completedAt ? new Date(plain.completedAt).toISOString() : null,
    uploadedAt: plain.uploadedAt ? new Date(plain.uploadedAt).toISOString() : null,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : null,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : null,
    processLogs: (plain.processLogs || []).map((entry) => ({
      ...entry,
      timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : null,
    })),
    errorLog: (plain.errorLog || []).map((entry) => ({
      ...entry,
      timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : null,
    })),
  };
}

class VideoQueueService {
  /**
   * Adds a single job into the unified production queue.
   * The payload intentionally mirrors the legacy queue item shape.
   */
  async addToQueue(config) {
    try {
      const {
        videoConfig,
        platform = 'all',
        contentType = 'product_promo',
        priority = 'normal',
        scheduleTime = null,
        accountIds = [],
        metadata = {},
      } = config || {};

      if (!videoConfig) {
        return { success: false, error: 'videoConfig is required' };
      }

      const queueId = createQueueId();
      const job = await VideoPipelineJob.create({
        queueId,
        videoConfig,
        platform,
        contentType,
        priority,
        scheduleTime: normalizeDate(scheduleTime),
        accountIds: Array.isArray(accountIds) ? accountIds : [],
        metadata,
        processLogs: [{
          stage: 'created',
          status: 'success',
          message: 'Video added to queue',
          timestamp: new Date(),
        }],
      });

      return {
        success: true,
        queueId,
        queueItem: toPlainJob(job),
        message: 'Video added to queue successfully',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Adds multiple jobs in one request. The batch metadata is stored on each
   * child job so the UI can still reconstruct the original operator action.
   */
  async addBatchToQueue(config) {
    try {
      const {
        videos = [],
        platform = 'all',
        contentType = 'product_promo',
        priority = 'normal',
        metadata = {},
      } = config || {};

      if (!Array.isArray(videos) || videos.length === 0) {
        return { success: false, error: 'Videos array is empty' };
      }

      const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const queueIds = [];

      for (const [index, video] of videos.entries()) {
        const result = await this.addToQueue({
          videoConfig: video,
          platform,
          contentType,
          priority,
          metadata: {
            ...metadata,
            batchId,
            batchIndex: index,
            batchSize: videos.length,
          },
        });

        if (result.success) {
          queueIds.push(result.queueId);
        }
      }

      return {
        success: true,
        batchId,
        totalAdded: queueIds.length,
        queueIds,
        message: `Added ${queueIds.length} videos to queue`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Changes the lifecycle status of one queue job and stores a process log entry.
   */
  async updateQueueStatus(queueId, status, metadata = {}) {
    try {
      const job = await VideoPipelineJob.findOne({ queueId });
      if (!job) {
        return { success: false, error: `Queue item not found: ${queueId}` };
      }

      const oldStatus = job.status;
      job.status = status;

      if (status === 'processing' && !job.startedAt) job.startedAt = new Date();
      if (status === 'ready' && !job.completedAt) job.completedAt = new Date();
      if (status === 'uploaded' && !job.uploadedAt) job.uploadedAt = new Date();

      Object.assign(job, metadata);
      const previousQueueControl = job.metadata?.queueControl || {};
      if (['processing', 'ready', 'uploaded'].includes(status)) {
        job.metadata = {
          ...(job.metadata || {}),
          queueControl: {
            ...previousQueueControl,
            retryEligible: true,
            retryStopped: false,
            retryStoppedReason: '',
            retryStoppedAt: null,
            manualInterventionRequired: false,
            nextAction: status === 'processing' ? 'await-render' : 'none',
          },
        };
      }
      job.processLogs.push({
        stage: status,
        status: 'success',
        message: `Status changed from ${oldStatus} to ${status}`,
        timestamp: new Date(),
      });

      await job.save();

      if (oldStatus !== status) {
        const title = job.videoConfig?.sourceTitle || job.title || queueId;
        const notifyPayloads = {
          processing: {
            type: 'queue.processing',
            title: 'Queue processing',
            message: `${title} is processing`,
            severity: 'info',
            source: 'video-pipeline',
          },
          ready: {
            type: 'queue.completed',
            title: 'Mashup completed',
            message: `${title} completed successfully`,
            severity: 'success',
            source: 'video-pipeline',
          },
          failed: {
            type: 'queue.failed',
            title: 'Mashup failed',
            message: `${title} failed during processing`,
            severity: 'error',
            source: 'video-pipeline',
          },
          uploaded: {
            type: 'publish.completed',
            title: 'Publish completed',
            message: `${title} published successfully`,
            severity: 'success',
            source: 'publish',
          },
        };
        const notify = notifyPayloads[status];
        if (notify) {
          await notificationService.createNotification({
            ...notify,
            queueId,
            meta: { queueId, status },
          });
        }
      }

      return {
        success: true,
        oldStatus,
        newStatus: status,
        queueItem: toPlainJob(job),
        message: 'Queue item updated successfully',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Records a stage-specific failure and automatically decides if the job
   * should go back to pending or remain failed after max retry attempts.
   */
  async recordError(queueId, error, stage = 'processing', options = {}) {
    try {
      const job = await VideoPipelineJob.findOne({ queueId });
      if (!job) {
        return { success: false, error: `Queue item not found: ${queueId}` };
      }

      const classification = {
        ...classifyQueueError(error, stage),
        ...options,
      };
      const message = classification.message || error?.message || String(error);

      job.errorCount += 1;
      job.retry = job.errorCount;
      job.errorLog.push({
        stage,
        error: message,
        timestamp: new Date(),
      });

      const reachedRetryLimit = classification.retryEligible !== false && job.errorCount >= job.maxRetries;
      const willRetry = classification.retryEligible !== false && job.errorCount < job.maxRetries;
      const manualInterventionRequired = classification.manualInterventionRequired === true || !willRetry;
      job.status = willRetry ? 'pending' : 'failed';
      job.metadata = {
        ...(job.metadata || {}),
        queueControl: {
          ...(job.metadata?.queueControl || {}),
          retryEligible: classification.retryEligible !== false,
          retryStopped: reachedRetryLimit || classification.retryEligible === false,
          retryStoppedReason: reachedRetryLimit
            ? 'Reached max retries (' + job.maxRetries + ')'
            : classification.retryEligible === false
              ? 'Retry disabled for non-retryable error'
              : '',
          retryStoppedAt: !willRetry ? new Date().toISOString() : null,
          manualInterventionRequired,
          category: classification.category || 'unknown',
          lastFailureStage: stage,
          lastFailureMessage: message,
          lastFailureAt: new Date().toISOString(),
          nextAction: willRetry ? 'auto-retry' : 'manual-start',
        },
      };

      job.processLogs.push({
        stage,
        status: 'error',
        message: willRetry
            ? 'Job returned to pending for automatic retry'
            : reachedRetryLimit
              ? 'Retry stopped after reaching max retries'
              : 'Job requires manual intervention',
        error: message,
        retryAttempt: job.retry,
        timestamp: new Date(),
      });

      await job.save();

      if (!willRetry) {
        const title = job.videoConfig?.sourceTitle || job.title || queueId;
        await notificationService.createNotification({
          type: 'queue.failed',
          title: 'Mashup failed',
          message: `${title} failed: ${message}`,
          severity: 'error',
          source: 'video-pipeline',
          queueId,
          meta: { queueId, stage, message },
        });
      }

      return {
        success: true,
        errorCount: job.errorCount,
        willRetry,
        queueItem: toPlainJob(job),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Returns the next pending job with legacy priority ordering.
   */
  async getNextPending(platform = 'all') {
    try {
      const query = { status: 'pending' };
      if (platform !== 'all') {
        query.$or = [{ platform }, { platform: 'all' }];
      }

      const pending = await VideoPipelineJob.find(query).lean();
      if (!pending.length) {
        return { success: false, error: 'No pending videos in queue' };
      }

      pending.sort((a, b) => {
        const aPriority = PRIORITY_ORDER[a.priority] || PRIORITY_ORDER.normal;
        const bPriority = PRIORITY_ORDER[b.priority] || PRIORITY_ORDER.normal;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      return {
        success: true,
        queueItem: toPlainJob(pending[0]),
        position: 0,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Returns the next ready-to-publish job while respecting scheduleTime.
   */
  async getNextReady(platform = 'all') {
    try {
      const query = {
        status: 'ready',
        scheduleTime: { $lte: new Date() },
      };

      if (platform !== 'all') {
        query.$or = [{ platform }, { platform: 'all' }];
      }

      const ready = await VideoPipelineJob.find(query).lean();
      if (!ready.length) {
        return { success: false, error: 'No ready videos in queue' };
      }

      ready.sort((a, b) => {
        const aPriority = PRIORITY_ORDER[a.priority] || PRIORITY_ORDER.normal;
        const bPriority = PRIORITY_ORDER[b.priority] || PRIORITY_ORDER.normal;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime();
      });

      return {
        success: true,
        queueItem: toPlainJob(ready[0]),
        position: 0,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Returns a single queue job for detail views and publish flows.
   */
  async getQueueItem(queueId) {
    try {
      const job = await VideoPipelineJob.findOne({ queueId }).lean();
      if (!job) {
        return { success: false, error: `Queue item not found: ${queueId}` };
      }
      return { success: true, queueItem: toPlainJob(job) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Lists the latest queue jobs for dashboard and queue screens.
   */
  async getAllQueueItems(limit = 100) {
    try {
      const items = await VideoPipelineJob.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      const count = await VideoPipelineJob.countDocuments();

      return {
        success: true,
        items: items.map(toPlainJob),
        count,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Produces summary metrics for the queue tab and dashboard widgets.
   */
  async getQueueStats() {
    try {
      const jobs = await VideoPipelineJob.find({}).lean();
      const stats = {
        total: jobs.length,
        byStatus: {
          pending: jobs.filter((job) => job.status === 'pending').length,
          processing: jobs.filter((job) => job.status === 'processing').length,
          ready: jobs.filter((job) => job.status === 'ready').length,
          uploaded: jobs.filter((job) => job.status === 'uploaded').length,
          failed: jobs.filter((job) => job.status === 'failed').length,
        },
        byExecutionState: {
          pending: 0,
          'auto-retry-pending': 0,
          processing: 0,
          ready: 0,
          uploaded: 0,
          'manual-review': 0,
          failed: 0,
          idle: 0,
        },
        byPlatform: {},
        byContentType: {},
        errorRate: 0,
        averageProcessingTime: 0,
        oldestPending: null,
        newestAdded: null,
      };

      for (const job of jobs) {
        stats.byPlatform[job.platform] = (stats.byPlatform[job.platform] || 0) + 1;
        stats.byContentType[job.contentType] = (stats.byContentType[job.contentType] || 0) + 1;
        const executionState = buildQueueControl(job).executionState;
        stats.byExecutionState[executionState] = (stats.byExecutionState[executionState] || 0) + 1;
      }

      const errored = jobs.filter((job) => job.errorCount > 0).length;
      stats.errorRate = jobs.length ? (errored / jobs.length) * 100 : 0;

      const completed = jobs.filter((job) => job.startedAt && job.completedAt);
      if (completed.length) {
        const totalTime = completed.reduce((sum, job) => {
          return sum + (new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime());
        }, 0);
        stats.averageProcessingTime = Math.round(totalTime / completed.length / 1000);
      }

      const pending = jobs
        .filter((job) => job.status === 'pending')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      if (pending.length) stats.oldestPending = toPlainJob(pending[0]);

      const newest = [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (newest.length) stats.newestAdded = toPlainJob(newest[0]);

      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Summarize runtime health for the production queue, including stale
   * processing jobs that likely need operator release after a crash/restart.
   */
  async getQueueRuntime(timeoutMinutes = 30) {
    try {
      const normalizedTimeout = Math.max(1, Number(timeoutMinutes) || 30);
      const jobs = await VideoPipelineJob.find({}).lean();
      const cutoff = Date.now() - normalizedTimeout * 60 * 1000;

      const processing = jobs.filter((job) => job.status === 'processing');
      const staleProcessing = processing.filter((job) => {
        const reference = job.updatedAt || job.startedAt || job.createdAt;
        return reference ? new Date(reference).getTime() < cutoff : false;
      });

      const oldestPending = jobs
        .filter((job) => job.status === 'pending')
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())[0] || null;

      return {
        success: true,
        runtime: {
          timeoutMinutes: normalizedTimeout,
          total: jobs.length,
          processing: processing.length,
          staleProcessing: staleProcessing.length,
          pending: jobs.filter((job) => job.status === 'pending').length,
          ready: jobs.filter((job) => job.status === 'ready').length,
          failed: jobs.filter((job) => job.status === 'failed').length,
          uploaded: jobs.filter((job) => job.status === 'uploaded').length,
          manualReview: jobs.filter((job) => buildQueueControl(job).executionState === 'manual-review').length,
          autoRetryPending: jobs.filter((job) => buildQueueControl(job).executionState === 'auto-retry-pending').length,
          oldestPending: oldestPending ? toPlainJob(oldestPending) : null,
          staleJobs: staleProcessing
            .sort((left, right) => new Date(left.updatedAt || left.startedAt || left.createdAt).getTime() - new Date(right.updatedAt || right.startedAt || right.createdAt).getTime())
            .slice(0, 20)
            .map(toPlainJob),
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Returns queue jobs that permanently failed and may need manual retry.
   */
  async getFailedVideos() {
    try {
      const failed = await VideoPipelineJob.find({ status: 'failed' }).sort({ updatedAt: -1 }).lean();
      return {
        success: true,
        failed: failed.map(toPlainJob),
        count: failed.length,
        message: `Found ${failed.length} failed videos`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Resets failed jobs back to pending when retry attempts are still allowed.
   */
  async retryFailedBatch(maxRetries = 3) {
    try {
      const jobs = await VideoPipelineJob.find({ status: 'failed' });
      let retryCount = 0;

      for (const job of jobs) {
        const queueControl = buildQueueControl(job);
        const retryEligible = queueControl.retryEligible !== false;
        const manualInterventionRequired = queueControl.manualInterventionRequired === true;
        if (retryEligible && !manualInterventionRequired && job.errorCount < maxRetries) {
          job.status = 'pending';
          job.metadata = {
            ...(job.metadata || {}),
            queueControl: {
              ...(job.metadata?.queueControl || {}),
              retryEligible: true,
              retryStopped: false,
              retryStoppedReason: '',
              retryStoppedAt: null,
              manualInterventionRequired: false,
              nextAction: 'auto-retry',
            },
          };
          job.processLogs.push({
            stage: 'retry',
            status: 'success',
            message: 'Job moved back to pending for automatic retry batch',
            timestamp: new Date(),
          });
          await job.save();
          retryCount += 1;
        }
      }

      return {
        success: true,
        retriedCount: retryCount,
        message: `Retried ${retryCount} failed videos`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Deletes historical jobs that are older than the configured cutoff.
   */
  async cleanupQueue(config = {}) {
    try {
      const {
        daysOld = 30,
        statuses = ['uploaded', 'failed'],
      } = config;

      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const result = await VideoPipelineJob.deleteMany({
        status: { $in: statuses },
        $or: [
          { completedAt: { $lt: cutoffDate } },
          { completedAt: null, createdAt: { $lt: cutoffDate } },
        ],
      });

      return {
        success: true,
        deleted: result.deletedCount || 0,
        message: `Cleaned up ${result.deletedCount || 0} old queue items`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Writes a process log entry without changing the queue status.
   */
  async logProcess(logEntry) {
    try {
      const {
        queueId,
        stage,
        status,
        message = '',
        error = null,
        duration = null,
        retryAttempt = 0,
      } = logEntry || {};

      if (!queueId) return { success: false, error: 'queueId is required' };

      const job = await VideoPipelineJob.findOne({ queueId });
      if (!job) return { success: false, error: `Queue item not found: ${queueId}` };

      job.processLogs.push({
        stage,
        status,
        message,
        error,
        duration,
        retryAttempt,
        timestamp: new Date(),
      });

      await job.save();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Returns process logs embedded in the queue job document.
   */
  async getProcessLogs(queueId) {
    try {
      const job = await VideoPipelineJob.findOne({ queueId }).lean();
      if (!job) return { success: false, error: `Queue item not found: ${queueId}` };

      return {
        success: true,
        logs: (job.processLogs || []).map((entry) => ({
          ...entry,
          timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : null,
        })),
        count: job.processLogs?.length || 0,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clears queue items completely or by one status bucket.
   */
  async clearQueue(statusFilter = null) {
    try {
      const query = statusFilter ? { status: statusFilter } : {};
      const deleted = await VideoPipelineJob.countDocuments(query);
      await VideoPipelineJob.deleteMany(query);
      const remaining = await VideoPipelineJob.countDocuments();

      return {
        success: true,
        deleted,
        remaining,
        message: `Cleared ${deleted} queue items`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Releases stale processing jobs back to pending so operators can resume
   * after a crash or an interrupted server restart.
   */
  async releaseStaleJobs(timeoutMinutes = 30) {
    try {
      const normalizedTimeout = Math.max(1, Number(timeoutMinutes) || 30);
      const cutoff = new Date(Date.now() - normalizedTimeout * 60 * 1000);
      const staleJobs = await VideoPipelineJob.find({
        status: 'processing',
        $or: [
          { updatedAt: { $lt: cutoff } },
          { updatedAt: { $exists: false }, startedAt: { $lt: cutoff } },
        ],
      });

      let released = 0;
      const queueIds = [];
      for (const job of staleJobs) {
        job.status = 'pending';
        job.metadata = {
          ...(job.metadata || {}),
          queueControl: {
            ...(job.metadata?.queueControl || {}),
            retryEligible: true,
            retryStopped: false,
            retryStoppedReason: '',
            retryStoppedAt: null,
            manualInterventionRequired: false,
            lastFailureStage: 'runtime-recovery',
            lastFailureMessage: `Released from stale processing after ${normalizedTimeout} minute timeout`,
            lastFailureAt: new Date().toISOString(),
            nextAction: 'auto-retry',
          },
        };
        job.processLogs.push({
          stage: 'runtime-recovery',
          status: 'warning',
          message: `Released stale processing job back to pending after ${normalizedTimeout} minute timeout`,
          timestamp: new Date(),
        });
        await job.save();
        released += 1;
        queueIds.push(job.queueId);
      }

      return {
        success: true,
        released,
        queueIds,
        timeoutMinutes: normalizedTimeout,
        message: released
          ? `Released ${released} stale processing job(s)`
          : 'No stale processing jobs found',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export { buildQueueControl, classifyQueueError };

export default new VideoQueueService();
