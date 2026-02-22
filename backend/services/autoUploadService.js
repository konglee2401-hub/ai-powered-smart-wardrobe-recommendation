/**
 * Auto Upload Service
 * - Handle uploads to TikTok, YouTube, and Facebook
 * - Manage rate limiting per platform
 * - Track upload status and handle retries
 * - Support multiple account uploads
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, '../media');
const uploadDir = path.join(mediaDir, 'uploads');

class AutoUploadService {
  constructor() {
    this.ensureDirectories();
    this.uploadsFile = path.join(uploadDir, 'uploads.json');
    this.loadUploads();

    // Platform-specific rate limits (uploads per hour)
    this.rateLimits = {
      tiktok: 5, // Conservative limit to avoid flags
      youtube: 3,
      facebook: 10
    };

    // Upload timeout (ms)
    this.uploadTimeout = 60000; // 1 minute
  }

  ensureDirectories() {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  /**
   * Load uploads tracking
   */
  loadUploads() {
    try {
      if (fs.existsSync(this.uploadsFile)) {
        const data = fs.readFileSync(this.uploadsFile, 'utf8');
        this.uploads = JSON.parse(data);
      } else {
        this.uploads = [];
        this.saveUploads();
      }
    } catch (error) {
      console.error('Error loading uploads:', error);
      this.uploads = [];
    }
  }

  /**
   * Save uploads tracking
   */
  saveUploads() {
    try {
      fs.writeFileSync(this.uploadsFile, JSON.stringify(this.uploads, null, 2));
    } catch (error) {
      console.error('Error saving uploads:', error);
    }
  }

  /**
   * Register upload
   */
  registerUpload(config) {
    try {
      const {
        queueId,
        videoPath,
        platform,
        accountId,
        uploadConfig = {}
      } = config;

      if (!queueId || !videoPath || !platform || !accountId) {
        return {
          success: false,
          error: 'queueId, videoPath, platform, and accountId are required'
        };
      }

      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const upload = {
        uploadId,
        queueId,
        videoPath,
        platform,
        accountId,
        status: 'pending', // pending, uploading, success, failed, retry
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        uploadUrl: null,
        uploadedByAccount: accountId,
        fileSize: this.getFileSize(videoPath),
        duration: 0,
        retries: 0,
        maxRetries: 3,
        errorLog: [],
        uploadConfig,
        metadata: {}
      };

      this.uploads.push(upload);
      this.saveUploads();

      return {
        success: true,
        uploadId,
        upload,
        message: 'Upload registered successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return stats.size;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if can upload to platform (rate limit check)
   */
  canUploadToPlatform(platform) {
    try {
      const limit = this.rateLimits[platform] || 5;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const recentUploads = this.uploads.filter(
        u =>
          u.platform === platform &&
          u.status === 'success' &&
          new Date(u.completedAt) >= oneHourAgo
      );

      const canUpload = recentUploads.length < limit;

      return {
        canUpload,
        limit,
        uploadedInLastHour: recentUploads.length,
        remainingSlots: Math.max(0, limit - recentUploads.length)
      };
    } catch (error) {
      return {
        canUpload: false,
        error: error.message
      };
    }
  }

  /**
   * Update upload status
   */
  updateUploadStatus(uploadId, status, metadata = {}) {
    try {
      const upload = this.uploads.find(u => u.uploadId === uploadId);
      if (!upload) {
        return { success: false, error: `Upload not found: ${uploadId}` };
      }

      const oldStatus = upload.status;
      upload.status = status;

      if (status === 'uploading' && !upload.startedAt) {
        upload.startedAt = new Date().toISOString();
      }

      if (status === 'success' && !upload.completedAt) {
        upload.completedAt = new Date().toISOString();
      }

      if (status === 'failed' && !upload.completedAt) {
        upload.completedAt = new Date().toISOString();
      }

      Object.assign(upload, metadata);

      this.saveUploads();

      return {
        success: true,
        uploadId,
        oldStatus,
        newStatus: status,
        upload
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record error for upload
   */
  recordUploadError(uploadId, error, stage = 'upload') {
    try {
      const upload = this.uploads.find(u => u.uploadId === uploadId);
      if (!upload) {
        return { success: false, error: `Upload not found: ${uploadId}` };
      }

      upload.errorLog.push({
        stage,
        error: error.message || error,
        timestamp: new Date().toISOString()
      });

      // Increment retries
      upload.retries++;

      // Update status
      if (upload.retries <= upload.maxRetries) {
        upload.status = 'retry';
      } else {
        upload.status = 'failed';
      }

      this.saveUploads();

      return {
        success: true,
        uploadId,
        retries: upload.retries,
        willRetry: upload.retries <= upload.maxRetries,
        upload
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get next upload to process
   */
  getNextUpload(platform = null) {
    try {
      let pending = this.uploads.filter(u => u.status === 'pending' || u.status === 'retry');

      if (platform) {
        pending = pending.filter(u => u.platform === platform);
      }

      // Sort by creation time
      pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      if (pending.length === 0) {
        return { success: false, error: 'No pending uploads' };
      }

      return {
        success: true,
        upload: pending[0],
        position: this.uploads.indexOf(pending[0])
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Perform TikTok upload (mock implementation)
   */
  async uploadToTikTok(uploadId, account) {
    try {
      const upload = this.uploads.find(u => u.uploadId === uploadId);
      if (!upload) {
        throw new Error(`Upload not found: ${uploadId}`);
      }

      const { uploadConfig = {} } = upload;

      // Mock upload - in production, use TikTok API
      // This would use tiktok-api-nodejs or similar library
      // For now, simulate delay and success

      this.updateUploadStatus(uploadId, 'uploading');

      // Simulate upload process (mock)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful upload
      const uploadUrl = `https://www.tiktok.com/@${account.username}/video/${Date.now()}`;

      this.updateUploadStatus(uploadId, 'success', {
        uploadUrl,
        duration: 2000,
        metadata: {
          platform: 'tiktok',
          account: account.username,
          title: uploadConfig.title || '',
          description: uploadConfig.description || '',
          hashtags: uploadConfig.hashtags || []
        }
      });

      return {
        success: true,
        uploadId,
        uploadUrl,
        message: 'Uploaded to TikTok successfully'
      };
    } catch (error) {
      this.recordUploadError(uploadId, error, 'tiktok_upload');
      return {
        success: false,
        uploadId,
        error: error.message
      };
    }
  }

  /**
   * Perform YouTube upload (mock implementation)
   */
  async uploadToYouTube(uploadId, account) {
    try {
      const upload = this.uploads.find(u => u.uploadId === uploadId);
      if (!upload) {
        throw new Error(`Upload not found: ${uploadId}`);
      }

      const { uploadConfig = {} } = upload;

      this.updateUploadStatus(uploadId, 'uploading');

      // Simulate upload process (mock)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock successful upload
      const videoId = Math.random().toString(36).substring(7);
      const uploadUrl = `https://www.youtube.com/watch?v=${videoId}`;

      this.updateUploadStatus(uploadId, 'success', {
        uploadUrl,
        duration: 3000,
        metadata: {
          platform: 'youtube',
          account: account.displayName || account.username,
          videoId,
          title: uploadConfig.title || '',
          description: uploadConfig.description || '',
          tags: uploadConfig.tags || [],
          privacy: uploadConfig.privacy || 'public'
        }
      });

      return {
        success: true,
        uploadId,
        uploadUrl,
        message: 'Uploaded to YouTube successfully'
      };
    } catch (error) {
      this.recordUploadError(uploadId, error, 'youtube_upload');
      return {
        success: false,
        uploadId,
        error: error.message
      };
    }
  }

  /**
   * Perform Facebook upload (mock implementation)
   */
  async uploadToFacebook(uploadId, account) {
    try {
      const upload = this.uploads.find(u => u.uploadId === uploadId);
      if (!upload) {
        throw new Error(`Upload not found: ${uploadId}`);
      }

      const { uploadConfig = {} } = upload;

      this.updateUploadStatus(uploadId, 'uploading');

      // Simulate upload process (mock)
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Mock successful upload
      const postId = Date.now();
      const uploadUrl = `https://www.facebook.com/watch/?v=${postId}`;

      this.updateUploadStatus(uploadId, 'success', {
        uploadUrl,
        duration: 2500,
        metadata: {
          platform: 'facebook',
          account: account.displayName || account.username,
          postId,
          caption: uploadConfig.caption || '',
          description: uploadConfig.description || ''
        }
      });

      return {
        success: true,
        uploadId,
        uploadUrl,
        message: 'Uploaded to Facebook successfully'
      };
    } catch (error) {
      this.recordUploadError(uploadId, error, 'facebook_upload');
      return {
        success: false,
        uploadId,
        error: error.message
      };
    }
  }

  /**
   * Execute upload (routes to appropriate platform)
   */
  async executeUpload(uploadId, account) {
    try {
      const upload = this.uploads.find(u => u.uploadId === uploadId);
      if (!upload) {
        return { success: false, error: `Upload not found: ${uploadId}` };
      }

      const { platform } = upload;

      let result;
      switch (platform) {
        case 'tiktok':
          result = await this.uploadToTikTok(uploadId, account);
          break;
        case 'youtube':
          result = await this.uploadToYouTube(uploadId, account);
          break;
        case 'facebook':
          result = await this.uploadToFacebook(uploadId, account);
          break;
        default:
          return { success: false, error: `Unknown platform: ${platform}` };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get upload status
   */
  getUploadStatus(uploadId) {
    try {
      const upload = this.uploads.find(u => u.uploadId === uploadId);
      if (!upload) {
        return { success: false, error: `Upload not found: ${uploadId}` };
      }

      return {
        success: true,
        upload
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get uploads by status
   */
  getUploadsByStatus(status) {
    try {
      const uploads = this.uploads.filter(u => u.status === status);
      return {
        success: true,
        uploads,
        count: uploads.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get uploads for queue item
   */
  getUploadsForQueue(queueId) {
    try {
      const uploads = this.uploads.filter(u => u.queueId === queueId);
      return {
        success: true,
        uploads,
        count: uploads.length,
        successful: uploads.filter(u => u.status === 'success').length,
        failed: uploads.filter(u => u.status === 'failed').length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get uploads for account
   */
  getUploadsForAccount(accountId) {
    try {
      const uploads = this.uploads.filter(u => u.accountId === accountId);
      return {
        success: true,
        uploads,
        count: uploads.length,
        successful: uploads.filter(u => u.status === 'success').length,
        failed: uploads.filter(u => u.status === 'failed').length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get upload statistics
   */
  getUploadStats(platform = null) {
    try {
      let uploads = platform ? this.uploads.filter(u => u.platform === platform) : this.uploads;

      const stats = {
        total: uploads.length,
        byStatus: {
          pending: uploads.filter(u => u.status === 'pending').length,
          uploading: uploads.filter(u => u.status === 'uploading').length,
          success: uploads.filter(u => u.status === 'success').length,
          failed: uploads.filter(u => u.status === 'failed').length,
          retry: uploads.filter(u => u.status === 'retry').length
        },
        successRate: 0,
        totalSize: 0,
        averageDuration: 0,
        failedWithErrors: uploads.filter(u => u.errorLog.length > 0).length
      };

      uploads.forEach(u => {
        stats.totalSize += u.fileSize || 0;
      });

      if (stats.total > 0) {
        stats.successRate = Math.round((stats.byStatus.success / stats.total) * 100);
      }

      const completed = uploads.filter(u => u.duration > 0);
      if (completed.length > 0) {
        const totalDuration = completed.reduce((sum, u) => sum + u.duration, 0);
        stats.averageDuration = Math.round(totalDuration / completed.length);
      }

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
   * Retry failed uploads
   */
  async retryFailed(maxRetries = 3) {
    try {
      const failed = this.uploads.filter(u => u.status === 'failed' && u.retries < maxRetries);

      let retried = 0;
      failed.forEach(u => {
        u.status = 'retry';
        u.retries = 0;
        u.errorLog = [];
        retried++;
      });

      this.saveUploads();

      return {
        success: true,
        retried,
        message: `Retried ${retried} failed uploads`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old uploads
   */
  cleanupUploads(daysOld = 30) {
    try {
      const beforeCount = this.uploads.length;
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      this.uploads = this.uploads.filter(
        u => new Date(u.completedAt || u.createdAt) >= cutoffDate || u.status === 'pending'
      );

      const deleted = beforeCount - this.uploads.length;
      this.saveUploads();

      return {
        success: true,
        deleted,
        message: `Cleaned up ${deleted} old uploads`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get platform rate limit status
   */
  getPlatformStatus(platform) {
    try {
      const canUpload = this.canUploadToPlatform(platform);
      const stats = this.getUploadStats(platform);

      return {
        success: true,
        platform,
        rateLimit: canUpload,
        stats: stats.stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new AutoUploadService();
