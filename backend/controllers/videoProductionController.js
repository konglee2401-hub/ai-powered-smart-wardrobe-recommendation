/**
 * Video Production Controller
 * - Handle all API requests for video production pipeline
 * - Manage queue, uploads, accounts, jobs, and media library
 * - Orchestrate complete workflow
 */

import VideoMashupService from '../services/videoMashupService.js';
import MediaLibraryService from '../services/mediaLibraryService.js';
import VideoQueueService from '../services/videoQueueService.js';
import CronJobService from '../services/cronJobService.js';
import MultiAccountService from '../services/multiAccountService.js';
import AutoUploadService from '../services/autoUploadService.js';
import ProcessOrchestratorService from '../services/processOrchestratorService.js';

// Middleware for error handling
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class VideoProductionController {
  // ============ QUEUE ENDPOINTS ============

  /**
   * Add single video to queue
   * POST /api/queue/add
   */
  static addToQueue = asyncHandler((req, res) => {
    const { videoConfig, platform = 'all', contentType = 'product_promo', priority = 'normal' } = req.body;

    if (!videoConfig) {
      return res.status(400).json({ error: 'videoConfig is required' });
    }

    const result = VideoQueueService.addToQueue({
      videoConfig,
      platform,
      contentType,
      priority
    });

    res.json(result);
  });

  /**
   * Batch add videos to queue
   * POST /api/queue/batch-add
   */
  static batchAddToQueue = asyncHandler((req, res) => {
    const { videos, platform = 'all', contentType = 'product_promo', priority = 'normal' } = req.body;

    if (!Array.isArray(videos) || videos.length === 0) {
      return res.status(400).json({ error: 'videos array is required' });
    }

    const result = VideoQueueService.addBatchToQueue({
      videos,
      platform,
      contentType,
      priority
    });

    res.json(result);
  });

  /**
   * Get queue statistics
   * GET /api/queue/stats
   */
  static getQueueStats = asyncHandler((req, res) => {
    const result = VideoQueueService.getQueueStats();
    res.json(result);
  });

  /**
   * Get specific queue item
   * GET /api/queue/:queueId
   */
  static getQueueItem = asyncHandler((req, res) => {
    const { queueId } = req.params;
    const result = VideoQueueService.getQueueItem(queueId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Get next pending video
   * GET /api/queue/next-pending
   */
  static getNextPending = asyncHandler((req, res) => {
    const { platform } = req.query;
    const result = VideoQueueService.getNextPending(platform);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Get process logs for queue item
   * GET /api/queue/:queueId/logs
   */
  static getQueueLogs = asyncHandler((req, res) => {
    const { queueId } = req.params;
    const result = VideoQueueService.getProcessLogs(queueId);
    res.json(result);
  });

  /**
   * Clear queue
   * DELETE /api/queue
   */
  static clearQueue = asyncHandler((req, res) => {
    const { statusFilter } = req.query;
    const result = VideoQueueService.clearQueue(statusFilter);
    res.json(result);
  });

  // ============ ACCOUNT ENDPOINTS ============

  /**
   * Add new account
   * POST /api/accounts
   */
  static addAccount = asyncHandler((req, res) => {
    const { platform, username, password, displayName, email, metadata } = req.body;

    if (!platform || !username || !password) {
      return res.status(400).json({ error: 'platform, username, and password are required' });
    }

    const result = MultiAccountService.addAccount({
      platform,
      username,
      password,
      displayName,
      email,
      metadata
    });

    res.json(result);
  });

  /**
   * Get all accounts
   * GET /api/accounts
   */
  static getAllAccounts = asyncHandler((req, res) => {
    const result = MultiAccountService.getAllAccounts();
    res.json(result);
  });

  /**
   * Get accounts by platform
   * GET /api/accounts/platform/:platform
   */
  static getAccountsByPlatform = asyncHandler((req, res) => {
    const { platform } = req.params;
    const result = MultiAccountService.getAccountsByPlatform(platform);
    res.json(result);
  });

  /**
   * Get active/verified accounts
   * GET /api/accounts/active
   */
  static getActiveAccounts = asyncHandler((req, res) => {
    const { platform } = req.query;
    const result = MultiAccountService.getActiveAccounts(platform);
    res.json(result);
  });

  /**
   * Get account statistics
   * GET /api/accounts/stats
   */
  static getAccountStats = asyncHandler((req, res) => {
    const result = MultiAccountService.getAccountStats();
    res.json(result);
  });

  /**
   * Get best account for posting
   * GET /api/accounts/best/:platform
   */
  static getBestAccount = asyncHandler((req, res) => {
    const { platform } = req.params;
    const result = MultiAccountService.getBestAccountForPosting(platform);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Check upload capability
   * GET /api/accounts/:accountId/can-upload
   */
  static canUploadNow = asyncHandler((req, res) => {
    const { accountId } = req.params;
    const result = MultiAccountService.canUploadNow(accountId);
    res.json(result);
  });

  /**
   * Get account rotation
   * GET /api/accounts/rotation/:platform
   */
  static getAccountRotation = asyncHandler((req, res) => {
    const { platform } = req.params;
    const { count = 5 } = req.query;
    const result = MultiAccountService.getAccountRotation(platform, parseInt(count));
    res.json(result);
  });

  /**
   * Update account
   * PATCH /api/accounts/:accountId
   */
  static updateAccount = asyncHandler((req, res) => {
    const { accountId } = req.params;
    const updateData = req.body;

    const result = MultiAccountService.updateAccount(accountId, updateData);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Deactivate account
   * POST /api/accounts/:accountId/deactivate
   */
  static deactivateAccount = asyncHandler((req, res) => {
    const { accountId } = req.params;
    const { reason } = req.body;

    const result = MultiAccountService.deactivateAccount(accountId, reason);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Delete account
   * DELETE /api/accounts/:accountId
   */
  static deleteAccount = asyncHandler((req, res) => {
    const { accountId } = req.params;
    const result = MultiAccountService.deleteAccount(accountId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  // ============ MEDIA LIBRARY ENDPOINTS ============

  /**
   * Add template video
   * POST /api/media/templates
   */
  static addTemplate = asyncHandler((req, res) => {
    const { name, description, duration, platform, tags, metadata } = req.body;

    const result = MediaLibraryService.addTemplateVideo({
      name,
      description,
      duration,
      platform,
      tags,
      metadata
    });

    res.json(result);
  });

  /**
   * Add hot video
   * POST /api/media/hot-videos
   */
  static addHotVideo = asyncHandler((req, res) => {
    const { title, source, platform, tags, metadata } = req.body;

    const result = MediaLibraryService.addHotVideo({
      title,
      source,
      platform,
      tags,
      metadata
    });

    res.json(result);
  });

  /**
   * Add audio track
   * POST /api/media/audio
   */
  static addAudio = asyncHandler((req, res) => {
    const { name, category, mood, tags, metadata } = req.body;

    const result = MediaLibraryService.addAudio({
      name,
      category,
      mood,
      tags,
      metadata
    });

    res.json(result);
  });

  /**
   * Get media library statistics
   * GET /api/media/stats
   */
  static getMediaStats = asyncHandler((req, res) => {
    const result = MediaLibraryService.getStats();
    res.json(result);
  });

  /**
   * Get random template
   * GET /api/media/random/template
   */
  static getRandomTemplate = asyncHandler((req, res) => {
    const { platform } = req.query;
    const result = MediaLibraryService.getRandomTemplate({ platform });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Get random hot video
   * GET /api/media/random/hot-video
   */
  static getRandomHotVideo = asyncHandler((req, res) => {
    const { platform } = req.query;
    const result = MediaLibraryService.getRandomHotVideo({ platform });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Get random audio
   * GET /api/media/random/audio
   */
  static getRandomAudio = asyncHandler((req, res) => {
    const { mood } = req.query;
    const result = MediaLibraryService.getRandomAudio({ mood });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  // ============ UPLOAD ENDPOINTS ============

  /**
   * Register upload
   * POST /api/uploads/register
   */
  static registerUpload = asyncHandler((req, res) => {
    const { queueId, videoPath, platform, accountId, uploadConfig } = req.body;

    if (!queueId || !videoPath || !platform || !accountId) {
      return res.status(400).json({ 
        error: 'queueId, videoPath, platform, and accountId are required' 
      });
    }

    const result = AutoUploadService.registerUpload({
      queueId,
      videoPath,
      platform,
      accountId,
      uploadConfig
    });

    res.json(result);
  });

  /**
   * Get upload status
   * GET /api/uploads/:uploadId
   */
  static getUploadStatus = asyncHandler((req, res) => {
    const { uploadId } = req.params;
    const result = AutoUploadService.getUploadStatus(uploadId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Get uploads by status
   * GET /api/uploads/status/:status
   */
  static getUploadsByStatus = asyncHandler((req, res) => {
    const { status } = req.params;
    const result = AutoUploadService.getUploadsByStatus(status);
    res.json(result);
  });

  /**
   * Get uploads for queue
   * GET /api/uploads/queue/:queueId
   */
  static getUploadsForQueue = asyncHandler((req, res) => {
    const { queueId } = req.params;
    const result = AutoUploadService.getUploadsForQueue(queueId);
    res.json(result);
  });

  /**
   * Get uploads for account
   * GET /api/uploads/account/:accountId
   */
  static getUploadsForAccount = asyncHandler((req, res) => {
    const { accountId } = req.params;
    const result = AutoUploadService.getUploadsForAccount(accountId);
    res.json(result);
  });

  /**
   * Get upload statistics
   * GET /api/uploads/stats
   */
  static getUploadStats = asyncHandler((req, res) => {
    const { platform } = req.query;
    const result = AutoUploadService.getUploadStats(platform);
    res.json(result);
  });

  /**
   * Get next pending upload
   * GET /api/uploads/next-pending
   */
  static getNextPendingUpload = asyncHandler((req, res) => {
    const { platform } = req.query;
    const result = AutoUploadService.getNextUpload(platform);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Retry failed uploads
   * POST /api/uploads/retry-failed
   */
  static retryFailedUploads = asyncHandler(async (req, res) => {
    const { maxRetries = 3 } = req.body;
    const result = await AutoUploadService.retryFailed(maxRetries);
    res.json(result);
  });

  /**
   * Get platform status
   * GET /api/uploads/platform/:platform/status
   */
  static getPlatformStatus = asyncHandler((req, res) => {
    const { platform } = req.params;
    const result = AutoUploadService.getPlatformStatus(platform);
    res.json(result);
  });

  // ============ CRON JOB ENDPOINTS ============

  /**
   * Create job
   * POST /api/jobs
   */
  static createJob = asyncHandler((req, res) => {
    const { name, description, schedule, jobType, platform, enabled, metadata } = req.body;

    if (!name || !schedule || !jobType) {
      return res.status(400).json({ error: 'name, schedule, and jobType are required' });
    }

    // Basic handler for job execution
    const handler = async job => ({
      success: true,
      output: { message: 'Job executed' }
    });

    const result = CronJobService.createJob({
      name,
      description,
      schedule,
      jobType,
      platform,
      enabled,
      handler,
      metadata
    });

    res.json(result);
  });

  /**
   * Get all jobs
   * GET /api/jobs
   */
  static getAllJobs = asyncHandler((req, res) => {
    const { jobType, platform, enabled } = req.query;

    const result = CronJobService.getAllJobs({
      jobType,
      platform,
      enabled: enabled === 'true'
    });

    res.json(result);
  });

  /**
   * Get job
   * GET /api/jobs/:jobId
   */
  static getJob = asyncHandler((req, res) => {
    const { jobId } = req.params;
    const result = CronJobService.getJob(jobId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Update job
   * PATCH /api/jobs/:jobId
   */
  static updateJob = asyncHandler((req, res) => {
    const { jobId } = req.params;
    const updateData = req.body;

    const result = CronJobService.updateJob(jobId, updateData);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Enable job
   * POST /api/jobs/:jobId/enable
   */
  static enableJob = asyncHandler((req, res) => {
    const { jobId } = req.params;
    const handler = async job => ({ success: true, output: {} });

    const result = CronJobService.enableJob(jobId, handler);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Disable job
   * POST /api/jobs/:jobId/disable
   */
  static disableJob = asyncHandler((req, res) => {
    const { jobId } = req.params;
    const result = CronJobService.disableJob(jobId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Get job statistics
   * GET /api/jobs/stats
   */
  static getJobStats = asyncHandler((req, res) => {
    const result = CronJobService.getJobStatistics();
    res.json(result);
  });

  /**
   * Get job history
   * GET /api/jobs/:jobId/history
   */
  static getJobHistory = asyncHandler((req, res) => {
    const { jobId } = req.params;
    const { limit = 50 } = req.query;

    const result = CronJobService.getJobHistory(jobId, parseInt(limit));
    res.json(result);
  });

  /**
   * Delete job
   * DELETE /api/jobs/:jobId
   */
  static deleteJob = asyncHandler((req, res) => {
    const { jobId } = req.params;
    const result = CronJobService.deleteJob(jobId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  // ============ ORCHESTRATOR ENDPOINTS ============

  /**
   * Get complete system status
   * GET /api/system/status
   */
  static getSystemStatus = asyncHandler((req, res) => {
    const result = ProcessOrchestratorService.getSystemStatus();
    res.json(result);
  });

  /**
   * Generate video complete workflow
   * POST /api/workflow/generate
   */
  static generateVideoWorkflow = asyncHandler(async (req, res) => {
    const { contentType = 'product_promo', platform = 'all', accounts } = req.body;

    const result = await ProcessOrchestratorService.generateVideoWorkflow({
      contentType,
      platform,
      accounts
    });

    res.json(result);
  });

  /**
   * Process next video in queue
   * POST /api/workflow/process-next
   */
  static processNextVideo = asyncHandler(async (req, res) => {
    const result = await ProcessOrchestratorService.processNextVideo();

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Upload next video
   * POST /api/workflow/upload-next
   */
  static uploadNextVideo = asyncHandler(async (req, res) => {
    const result = await ProcessOrchestratorService.uploadNextVideo();

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  });

  /**
   * Initialize automation
   * POST /api/workflow/initialize-automation
   */
  static initializeAutomation = asyncHandler((req, res) => {
    const {
      generationSchedule = '0 * * * *',
      uploadSchedule = '0 */2 * * *',
      cleanupSchedule = '0 3 * * *',
      videosPerGeneration = 1,
      uploadsPerRun = 2
    } = req.body;

    const result = ProcessOrchestratorService.initializeAutomation({
      generationSchedule,
      uploadSchedule,
      cleanupSchedule,
      videosPerGeneration,
      uploadsPerRun
    });

    res.json(result);
  });

  /**
   * Get running jobs
   * GET /api/workflow/running-jobs
   */
  static getRunningJobs = asyncHandler((req, res) => {
    const result = CronJobService.getRunningJobs();
    res.json(result);
  });

  /**
   * Stop all jobs
   * POST /api/workflow/stop-all-jobs
   */
  static stopAllJobs = asyncHandler((req, res) => {
    const result = CronJobService.stopAllJobs();
    res.json(result);
  });
}

export default VideoProductionController;
