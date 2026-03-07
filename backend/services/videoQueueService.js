/**
 * Video Queue Service
 *
 * This service is the Mongo-backed replacement for the deprecated queue.json
 * file store. It preserves the old queue method names so older controllers
 * and orchestrators can keep calling the same API while the data now lives
 * in Mongo and can be shared across the unified pipeline UI.
 */

import VideoPipelineJob from '../models/VideoPipelineJob.js';

const PRIORITY_ORDER = { high: 1, normal: 2, low: 3 };

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
  return {
    ...plain,
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
      job.processLogs.push({
        stage: status,
        status: 'success',
        message: `Status changed from ${oldStatus} to ${status}`,
        timestamp: new Date(),
      });

      await job.save();

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
  async recordError(queueId, error, stage = 'processing') {
    try {
      const job = await VideoPipelineJob.findOne({ queueId });
      if (!job) {
        return { success: false, error: `Queue item not found: ${queueId}` };
      }

      job.errorCount += 1;
      job.retry = job.errorCount;
      job.errorLog.push({
        stage,
        error: error?.message || String(error),
        timestamp: new Date(),
      });

      job.status = job.errorCount <= job.maxRetries ? 'pending' : 'failed';
      job.processLogs.push({
        stage,
        status: 'error',
        error: error?.message || String(error),
        retryAttempt: job.retry,
        timestamp: new Date(),
      });

      await job.save();

      return {
        success: true,
        errorCount: job.errorCount,
        willRetry: job.errorCount <= job.maxRetries,
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
        if (job.errorCount < maxRetries) {
          job.status = 'pending';
          job.retry = 0;
          job.errorLog = [];
          job.processLogs.push({
            stage: 'retry',
            status: 'success',
            message: 'Job moved back to pending',
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
}

export default new VideoQueueService();
