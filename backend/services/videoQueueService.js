/**
 * Video Queue Service
 * - Manage video processing queue
 * - Track status: pending, processing, ready, uploaded, failed
 * - Store queue items with metadata
 * - Retry failed videos
 * - Provide queue statistics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, '../media');
const queueDir = path.join(mediaDir, 'queue');

class VideoQueueService {
  constructor() {
    this.ensureDirectories();
    this.queueFile = path.join(queueDir, 'queue.json');
    this.logFile = path.join(queueDir, 'process-log.json');
    this.loadQueue();
  }

  ensureDirectories() {
    if (!fs.existsSync(queueDir)) {
      fs.mkdirSync(queueDir, { recursive: true });
    }
  }

  /**
   * Load queue from file
   */
  loadQueue() {
    try {
      if (fs.existsSync(this.queueFile)) {
        const data = fs.readFileSync(this.queueFile, 'utf8');
        this.queue = JSON.parse(data);
      } else {
        this.queue = [];
        this.saveQueue();
      }
    } catch (error) {
      console.error('Error loading queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to file
   */
  saveQueue() {
    try {
      fs.writeFileSync(this.queueFile, JSON.stringify(this.queue, null, 2));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  /**
   * Add video to queue
   */
  addToQueue(config) {
    try {
      const {
        videoConfig,
        platform = 'all', // tiktok, youtube, facebook, all
        contentType = 'product_promo', // product_promo, hot_mashup, mixed
        priority = 'normal', // low, normal, high
        scheduleTime = null, // ISO timestamp or null for immediately
        accountIds = null, // Target specific accounts
        metadata = {}
      } = config;

      const queueId = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const queueItem = {
        queueId,
        videoConfig,
        platform,
        contentType,
        priority,
        scheduleTime: scheduleTime || new Date().toISOString(),
        accountIds,
        status: 'pending', // pending, processing, ready, uploaded, failed
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        uploadedAt: null,
        uploadUrl: null,
        uploadedByAccount: null,
        errorCount: 0,
        errorLog: [],
        metadata,
        retry: 0,
        maxRetries: 3
      };

      this.queue.push(queueItem);
      this.saveQueue();

      this.logProcess({
        queueId,
        stage: 'created',
        status: 'success',
        message: 'Video added to queue'
      });

      return {
        success: true,
        queueId,
        queueItem,
        message: 'Video added to queue successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add multiple videos to queue (batch)
   */
  addBatchToQueue(config) {
    try {
      const {
        videos = [],
        platform = 'all',
        contentType = 'product_promo',
        priority = 'normal',
        metadata = {}
      } = config;

      if (!Array.isArray(videos) || videos.length === 0) {
        return { success: false, error: 'Videos array is empty' };
      }

      const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const queueIds = [];

      videos.forEach((video, index) => {
        const result = this.addToQueue({
          videoConfig: video,
          platform,
          contentType,
          priority,
          metadata: {
            ...metadata,
            batchId,
            batchIndex: index,
            batchSize: videos.length
          }
        });

        if (result.success) {
          queueIds.push(result.queueId);
        }
      });

      return {
        success: true,
        batchId,
        totalAdded: queueIds.length,
        queueIds,
        message: `Added ${queueIds.length} videos to queue`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update queue item status
   */
  updateQueueStatus(queueId, status, metadata = {}) {
    try {
      const item = this.queue.find(q => q.queueId === queueId);

      if (!item) {
        return { success: false, error: `Queue item not found: ${queueId}` };
      }

      const oldStatus = item.status;
      item.status = status;

      // Update timestamps
      if (status === 'processing' && !item.startedAt) {
        item.startedAt = new Date().toISOString();
      }

      if (status === 'ready' && !item.completedAt) {
        item.completedAt = new Date().toISOString();
      }

      if (status === 'uploaded' && !item.uploadedAt) {
        item.uploadedAt = new Date().toISOString();
      }

      // Update metadata
      Object.assign(item, metadata);

      this.saveQueue();

      this.logProcess({
        queueId,
        stage: status,
        status: 'success',
        message: `Status changed from ${oldStatus} to ${status}`
      });

      return {
        success: true,
        oldStatus,
        newStatus: status,
        queueItem: item,
        message: 'Queue item updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record error for queue item
   */
  recordError(queueId, error, stage = 'processing') {
    try {
      const item = this.queue.find(q => q.queueId === queueId);

      if (!item) {
        return { success: false, error: `Queue item not found: ${queueId}` };
      }

      item.errorCount++;
      item.errorLog.push({
        stage,
        error: error.message || error,
        timestamp: new Date().toISOString()
      });

      // Check if should retry
      if (item.errorCount <= item.maxRetries) {
        item.status = 'pending';
        item.retry = item.errorCount;
      } else {
        item.status = 'failed';
      }

      this.saveQueue();

      this.logProcess({
        queueId,
        stage,
        status: 'error',
        error: error.message || error,
        retryAttempt: item.retry
      });

      return {
        success: true,
        errorCount: item.errorCount,
        willRetry: item.errorCount <= item.maxRetries,
        queueItem: item
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get next video for processing
   */
  getNextPending(platform = 'all') {
    try {
      let pending = this.queue.filter(q => q.status === 'pending');

      if (platform !== 'all') {
        pending = pending.filter(q => q.platform === platform || q.platform === 'all');
      }

      // Sort by priority, then by created time
      pending.sort((a, b) => {
        const priorityOrder = { low: 3, normal: 2, high: 1 };
        const aScore = priorityOrder[a.priority] * 1000000 + new Date(a.createdAt).getTime();
        const bScore = priorityOrder[b.priority] * 1000000 + new Date(b.createdAt).getTime();
        return aScore - bScore;
      });

      if (pending.length === 0) {
        return { success: false, error: 'No pending videos in queue' };
      }

      const next = pending[0];
      return {
        success: true,
        queueItem: next,
        position: this.queue.indexOf(next)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get next video ready for upload
   */
  getNextReady(platform = 'all') {
    try {
      let ready = this.queue.filter(q => q.status === 'ready');

      if (platform !== 'all') {
        ready = ready.filter(q => q.platform === platform || q.platform === 'all');
      }

      // Filter by schedule time
      const now = new Date();
      ready = ready.filter(q => new Date(q.scheduleTime) <= now);

      // Sort by priority and schedule time
      ready.sort((a, b) => {
        const priorityOrder = { low: 3, normal: 2, high: 1 };
        const aScore = priorityOrder[a.priority] * 1000000 + new Date(a.scheduleTime).getTime();
        const bScore = priorityOrder[b.priority] * 1000000 + new Date(b.scheduleTime).getTime();
        return aScore - bScore;
      });

      if (ready.length === 0) {
        return { success: false, error: 'No ready videos in queue' };
      }

      const next = ready[0];
      return {
        success: true,
        queueItem: next,
        position: this.queue.indexOf(next)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get queue item by ID
   */
  getQueueItem(queueId) {
    try {
      const item = this.queue.find(q => q.queueId === queueId);

      if (!item) {
        return { success: false, error: `Queue item not found: ${queueId}` };
      }

      return {
        success: true,
        queueItem: item
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }


  getAllQueueItems(limit = 100) {
    const sorted = [...this.queue].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {
      success: true,
      items: sorted.slice(0, limit),
      count: this.queue.length
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    try {
      const stats = {
        total: this.queue.length,
        byStatus: {
          pending: this.queue.filter(q => q.status === 'pending').length,
          processing: this.queue.filter(q => q.status === 'processing').length,
          ready: this.queue.filter(q => q.status === 'ready').length,
          uploaded: this.queue.filter(q => q.status === 'uploaded').length,
          failed: this.queue.filter(q => q.status === 'failed').length
        },
        byPlatform: {},
        byContentType: {},
        errorRate: 0,
        averageProcessingTime: 0,
        oldestPending: null,
        newestAdded: null
      };

      // Count by platform
      this.queue.forEach(q => {
        if (!stats.byPlatform[q.platform]) {
          stats.byPlatform[q.platform] = 0;
        }
        stats.byPlatform[q.platform]++;
      });

      // Count by content type
      this.queue.forEach(q => {
        if (!stats.byContentType[q.contentType]) {
          stats.byContentType[q.contentType] = 0;
        }
        stats.byContentType[q.contentType]++;
      });

      // Error rate
      const totalWithErrors = this.queue.filter(q => q.errorCount > 0).length;
      stats.errorRate = this.queue.length > 0 ? (totalWithErrors / this.queue.length) * 100 : 0;

      // Average processing time
      const completed = this.queue.filter(q => q.completedAt && q.startedAt);
      if (completed.length > 0) {
        const totalTime = completed.reduce((sum, q) => {
          const start = new Date(q.startedAt);
          const end = new Date(q.completedAt);
          return sum + (end - start);
        }, 0);
        stats.averageProcessingTime = Math.round(totalTime / completed.length / 1000); // seconds
      }

      // Oldest pending
      const pending = this.queue.filter(q => q.status === 'pending');
      if (pending.length > 0) {
        pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        stats.oldestPending = pending[0];
      }

      // Newest added
      const sorted = [...this.queue].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      stats.newestAdded = sorted[0];

      return {
        success: true,
        stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get failed videos for retry
   */
  getFailedVideos() {
    try {
      const failed = this.queue.filter(q => q.status === 'failed');

      return {
        success: true,
        failed,
        count: failed.length,
        message: `Found ${failed.length} failed videos`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retry failed batch
   */
  retryFailedBatch(maxRetries = 3) {
    try {
      const failed = this.queue.filter(q => q.status === 'failed');
      let retryCount = 0;

      failed.forEach(q => {
        if (q.errorCount < maxRetries) {
          q.status = 'pending';
          q.retry = 0;
          q.errorLog = [];
          retryCount++;
        }
      });

      this.saveQueue();

      return {
        success: true,
        retriedCount: retryCount,
        message: `Retried ${retryCount} failed videos`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old queue items
   */
  cleanupQueue(config = {}) {
    try {
      const {
        daysOld = 30,
        statuses = ['uploaded', 'failed'] // Which statuses to clean
      } = config;

      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const beforeCount = this.queue.length;

      this.queue = this.queue.filter(q => {
        if (statuses.includes(q.status) && new Date(q.completedAt || q.createdAt) < cutoffDate) {
          return false;
        }
        return true;
      });

      const deleted = beforeCount - this.queue.length;
      this.saveQueue();

      return {
        success: true,
        deleted,
        message: `Cleaned up ${deleted} old queue items`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log process event
   */
  logProcess(logEntry) {
    try {
      const {
        queueId,
        stage,
        status,
        message = '',
        error = null,
        duration = null,
        retryAttempt = 0
      } = logEntry;

      const log = {
        queueId,
        stage,
        status,
        message,
        error,
        duration,
        retryAttempt,
        timestamp: new Date().toISOString()
      };

      let logs = [];
      if (fs.existsSync(this.logFile)) {
        const data = fs.readFileSync(this.logFile, 'utf8');
        logs = JSON.parse(data);
      }

      logs.push(log);

      // Keep only last 10000 logs
      if (logs.length > 10000) {
        logs = logs.slice(-10000);
      }

      fs.writeFileSync(this.logFile, JSON.stringify(logs, null, 2));

      return { success: true };
    } catch (error) {
      console.error('Error logging process:', error);
      return { success: false };
    }
  }

  /**
   * Get process logs for queue item
   */
  getProcessLogs(queueId) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return { success: true, logs: [] };
      }

      const data = fs.readFileSync(this.logFile, 'utf8');
      const logs = JSON.parse(data);

      const queueLogs = logs.filter(l => l.queueId === queueId);

      return {
        success: true,
        logs: queueLogs,
        count: queueLogs.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear queue (use with caution!)
   */
  clearQueue(statusFilter = null) {
    try {
      const beforeCount = this.queue.length;

      if (statusFilter) {
        this.queue = this.queue.filter(q => q.status !== statusFilter);
      } else {
        this.queue = [];
      }

      const deleted = beforeCount - this.queue.length;
      this.saveQueue();

      return {
        success: true,
        deleted,
        remaining: this.queue.length,
        message: `Cleared ${deleted} queue items`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new VideoQueueService();
