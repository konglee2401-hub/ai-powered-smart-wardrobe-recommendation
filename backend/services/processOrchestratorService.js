/**
 * Process Orchestrator Service
 * - Orchestrate the complete video production pipeline
 * - Handle workflow from generation → mashup → upload
 * - Manage process flow and error recovery
 * - Coordinate between all services
 */

import VideoMashupService from './videoMashupService.js';
import MediaLibraryService from './mediaLibraryService.js';
import VideoQueueService from './videoQueueService.js';
import CronJobService from './cronJobService.js';
import MultiAccountService from './multiAccountService.js';
import AutoUploadService from './autoUploadService.js';

class ProcessOrchestratorService {
  constructor() {
    this.videoMashup = VideoMashupService;
    this.mediaLibrary = MediaLibraryService;
    this.videoQueue = VideoQueueService;
    this.cronJob = CronJobService;
    this.multiAccount = MultiAccountService;
    this.autoUpload = AutoUploadService;
  }

  /**
   * Generate and process video (complete workflow)
   */
  async generateVideoWorkflow(config) {
    try {
      const {
        contentType = 'product_promo', // product_promo, hot_mashup, mixed
        platform = 'all',
        accounts = null,
        metadata = {}
      } = config;

      // Step 1: Add to queue
      const queueResult = this.videoQueue.addToQueue({
        videoConfig: config,
        platform,
        contentType,
        metadata
      });

      if (!queueResult.success) {
        return queueResult;
      }

      const queueId = queueResult.queueId;

      try {
        // Step 2: Update status to processing
        this.videoQueue.updateQueueStatus(queueId, 'processing');

        // Step 3: Generate mashup video
        const mashupResult = await this.generateMashupVideo(config);

        if (!mashupResult.success) {
          this.videoQueue.recordError(queueId, new Error(mashupResult.error), 'mashup_generation');
          return mashupResult;
        }

        const videoPath = mashupResult.videoPath;

        // Step 4: Update status to ready
        this.videoQueue.updateQueueStatus(queueId, 'ready', {
          videoPath,
          uploadUrl: null
        });

        // Step 5: Register uploads to target platforms
        const uploadResults = await this.registerUploads(queueId, videoPath, platform, accounts);

        return {
          success: true,
          queueId,
          videoPath,
          message: 'Video generated and ready for upload',
          uploads: uploadResults
        };
      } catch (error) {
        this.videoQueue.recordError(queueId, error, 'workflow');
        return {
          success: false,
          queueId,
          error: error.message
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate mashup video
   */
  async generateMashupVideo(config) {
    try {
      const {
        contentType = 'product_promo',
        platforms = []
      } = config;

      // Get required media from library
      let video1, video2, audioTrack;

      if (contentType === 'hot_mashup' || contentType === 'mixed') {
        // Get hot video + template
        const hotVideoResult = this.mediaLibrary.getRandomHotVideo({
          platform: platforms[0] || 'tiktok'
        });

        if (!hotVideoResult.success) {
          return { success: false, error: 'No hot videos available' };
        }

        video1 = hotVideoResult.media.path;

        // Get template video
        const templateResult = this.mediaLibrary.getRandomTemplate({
          platform: platforms[0] || 'tiktok'
        });

        if (!templateResult.success) {
          return { success: false, error: 'No template videos available' };
        }

        video2 = templateResult.media.path;
      } else {
        // Product promo - get 2 product videos or demos
        const video1Result = this.mediaLibrary.getRandomHotVideo();
        if (!video1Result.success) {
          return { success: false, error: 'Not enough hot videos' };
        }

        const video2Result = this.mediaLibrary.getRandomTemplate();
        if (!video2Result.success) {
          return { success: false, error: 'Not enough template videos' };
        }

        video1 = video1Result.media.path;
        video2 = video2Result.media.path;
      }

      // Get audio track
      const audioResult = this.mediaLibrary.getRandomAudio({
        mood: 'upbeat'
      });

      if (audioResult.success) {
        audioTrack = audioResult.media.path;
      }

      // Create mashup
      const mashupConfig = {
        video1Path: video1,
        video2Path: video2,
        layout: config.layout || 'side-by-side', // side-by-side or pip
        outputPath: config.outputPath || `backend/media/mashups/mashup-${Date.now()}.mp4`,
        audioPath: audioTrack,
        audioVolume: config.audioVolume || 0.8,
        transition: config.transition || 'fade',
        duration: config.duration || 30 // seconds
      };

      const mashupResult = await this.videoMashup.generateMashupVideo(mashupConfig);

      if (!mashupResult.success) {
        return { success: false, error: mashupResult.error };
      }

      return {
        success: true,
        videoPath: mashupConfig.outputPath,
        videoPath: mashupResult.outputPath,
        duration: mashupResult.duration,
        message: 'Mashup video generated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Register uploads for video to target platforms
   */
  async registerUploads(queueId, videoPath, platform, targetAccounts) {
    try {
      const uploads = [];

      if (platform === 'all' || platform === 'tiktok') {
        const tiktokAccounts = this.multiAccount.getAccountsByPlatform('tiktok');
        if (tiktokAccounts.success && tiktokAccounts.accounts.length > 0) {
          const account =
            targetAccounts?.tiktok ||
            tiktokAccounts.accounts[Math.floor(Math.random() * tiktokAccounts.accounts.length)];

          const uploadResult = this.autoUpload.registerUpload({
            queueId,
            videoPath,
            platform: 'tiktok',
            accountId: account.accountId,
            uploadConfig: { hashtags: ['#smartwardrobe', '#affiliate'] }
          });

          if (uploadResult.success) {
            uploads.push(uploadResult);
          }
        }
      }

      if (platform === 'all' || platform === 'youtube') {
        const youtubeAccounts = this.multiAccount.getAccountsByPlatform('youtube');
        if (youtubeAccounts.success && youtubeAccounts.accounts.length > 0) {
          const account =
            targetAccounts?.youtube ||
            youtubeAccounts.accounts[Math.floor(Math.random() * youtubeAccounts.accounts.length)];

          const uploadResult = this.autoUpload.registerUpload({
            queueId,
            videoPath,
            platform: 'youtube',
            accountId: account.accountId,
            uploadConfig: {
              tags: ['smartwardrobe', 'affiliate', 'fashion'],
              privacy: 'public'
            }
          });

          if (uploadResult.success) {
            uploads.push(uploadResult);
          }
        }
      }

      if (platform === 'all' || platform === 'facebook') {
        const facebookAccounts = this.multiAccount.getAccountsByPlatform('facebook');
        if (facebookAccounts.success && facebookAccounts.accounts.length > 0) {
          const account =
            targetAccounts?.facebook ||
            facebookAccounts.accounts[Math.floor(Math.random() * facebookAccounts.accounts.length)];

          const uploadResult = this.autoUpload.registerUpload({
            queueId,
            videoPath,
            platform: 'facebook',
            accountId: account.accountId,
            uploadConfig: { caption: 'Check out Smart Wardrobe!' }
          });

          if (uploadResult.success) {
            uploads.push(uploadResult);
          }
        }
      }

      return uploads;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process next video in queue
   */
  async processNextVideo() {
    try {
      const nextResult = this.videoQueue.getNextPending();

      if (!nextResult.success) {
        return {
          success: false,
          error: 'No pending videos in queue'
        };
      }

      const { queueItem } = nextResult;

      // Generate video
      const workflowResult = await this.generateVideoWorkflow({
        ...queueItem.videoConfig,
        contentType: queueItem.contentType,
        platform: queueItem.platform
      });

      if (!workflowResult.success) {
        return {
          success: false,
          queueId: queueItem.queueId,
          error: workflowResult.error
        };
      }

      return {
        success: true,
        queueId: queueItem.queueId,
        message: 'Video processed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload next ready video
   */
  async uploadNextVideo() {
    try {
      const nextResult = this.autoUpload.getNextUpload();

      if (!nextResult.success) {
        return {
          success: false,
          error: 'No pending uploads'
        };
      }

      const { upload } = nextResult;
      const accountResult = this.multiAccount.getAccount(upload.accountId);

      if (!accountResult.success) {
        this.autoUpload.recordUploadError(upload.uploadId, new Error('Account not found'));
        return {
          success: false,
          error: 'Account not found'
        };
      }

      const account = accountResult.account;

      // Check if can upload
      const canUpload = this.multiAccount.canUploadNow(upload.accountId);
      if (!canUpload.canUpload) {
        return {
          success: false,
          uploadId: upload.uploadId,
          reason: canUpload.reason
        };
      }

      // Execute upload
      const uploadResult = await this.autoUpload.executeUpload(upload.uploadId, account);

      if (uploadResult.success) {
        // Record post to account
        this.multiAccount.recordPost(upload.accountId, {
          views: 0
        });

        // Update queue item
        this.videoQueue.updateQueueStatus(upload.queueId, 'uploaded', {
          uploadUrl: uploadResult.uploadUrl
        });
      } else {
        // Record error
        this.autoUpload.recordUploadError(upload.uploadId, new Error(uploadResult.error));
      }

      return uploadResult;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run cleanup job
   */
  async runCleanupJob() {
    try {
      const queueCleanup = this.videoQueue.cleanupQueue({
        daysOld: 30,
        statuses: ['uploaded', 'failed']
      });

      const uploadCleanup = this.autoUpload.cleanupUploads(30);

      const libraryCleanup = this.mediaLibrary.cleanupOldMedia({
        daysOld: 90
      });

      const historyCleanup = this.cronJob.cleanupHistory(30);

      return {
        success: true,
        queueCleaned: queueCleanup.deleted || 0,
        uploadsCleaned: uploadCleanup.deleted || 0,
        mediaCleaned: libraryCleanup.deleted || 0,
        historyCleaned: historyCleanup.deleted || 0,
        message: 'Cleanup completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get complete system status
   */
  getSystemStatus() {
    try {
      const queueStats = this.videoQueue.getQueueStats();
      const uploadStats = this.autoUpload.getUploadStats();
      const accountStats = this.multiAccount.getAccountStats();
      const jobStats = this.cronJob.getJobStatistics();
      const runningJobs = this.cronJob.getRunningJobs();

      return {
        success: true,
        queue: queueStats.stats,
        uploads: uploadStats.stats,
        accounts: accountStats.stats,
        jobs: jobStats.stats,
        runningJobs: runningJobs.running,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create scheduled generation job
   */
  createGenerationJob(config) {
    try {
      const {
        name,
        schedule = '0 * * * *', // Every hour by default
        contentType = 'product_promo',
        platform = 'all',
        videosPerRun = 1
      } = config;

      const handler = async job => {
        const results = [];

        for (let i = 0; i < videosPerRun; i++) {
          const result = await this.processNextVideo();
          results.push(result);
        }

        const failed = results.filter(r => !r.success).length;
        const successful = results.length - failed;

        return {
          success: failed === 0,
          output: {
            successful,
            failed,
            results
          }
        };
      };

      const jobResult = this.cronJob.createJob({
        name,
        description: `Generate ${videosPerRun} ${contentType} video(s) for ${platform}`,
        schedule,
        jobType: 'generate',
        platform,
        contentType: contentType,
        handler,
        enabled: true,
        metadata: { videosPerRun }
      });

      return jobResult;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create scheduled upload job
   */
  createUploadJob(config) {
    try {
      const {
        name,
        schedule = '0 */2 * * *', // Every 2 hours by default
        platform = 'all',
        uploadsPerRun = 2
      } = config;

      const handler = async job => {
        const results = [];

        for (let i = 0; i < uploadsPerRun; i++) {
          const result = await this.uploadNextVideo();
          results.push(result);

          // Small delay between uploads
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

        const failed = results.filter(r => !r.success).length;
        const successful = results.length - failed;

        return {
          success: failed === 0,
          output: {
            successful,
            failed,
            results
          }
        };
      };

      const jobResult = this.cronJob.createJob({
        name,
        description: `Upload up to ${uploadsPerRun} videos to ${platform}`,
        schedule,
        jobType: 'upload',
        platform,
        handler,
        enabled: true,
        metadata: { uploadsPerRun }
      });

      return jobResult;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create scheduled cleanup job
   */
  createCleanupJob(config) {
    try {
      const { name, schedule = '0 3 * * *' } = config; // Daily at 3 AM

      const handler = async job => {
        const result = await this.runCleanupJob();
        return result;
      };

      const jobResult = this.cronJob.createJob({
        name,
        description: 'Clean up old queue items, uploads, and media',
        schedule,
        jobType: 'cleanup',
        handler,
        enabled: true
      });

      return jobResult;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Initialize complete automation setup
   */
  initializeAutomation(config = {}) {
    try {
      const {
        generationSchedule = '0 * * * *',
        uploadSchedule = '0 */2 * * *',
        cleanupSchedule = '0 3 * * *',
        videosPerGeneration = 1,
        uploadsPerRun = 2
      } = config;

      const results = {
        genJob: null,
        uploadJob: null,
        cleanupJob: null
      };

      // Create generation job
      results.genJob = this.createGenerationJob({
        name: 'Scheduled Video Generation',
        schedule: generationSchedule,
        videosPerRun: videosPerGeneration
      });

      if (!results.genJob.success) {
        return {
          success: false,
          error: 'Failed to create generation job: ' + results.genJob.error
        };
      }

      // Create upload job
      results.uploadJob = this.createUploadJob({
        name: 'Scheduled Video Upload',
        schedule: uploadSchedule,
        uploadsPerRun
      });

      if (!results.uploadJob.success) {
        return {
          success: false,
          error: 'Failed to create upload job: ' + results.uploadJob.error
        };
      }

      // Create cleanup job
      results.cleanupJob = this.createCleanupJob({
        name: 'Scheduled Cleanup',
        schedule: cleanupSchedule
      });

      if (!results.cleanupJob.success) {
        return {
          success: false,
          error: 'Failed to create cleanup job: ' + results.cleanupJob.error
        };
      }

      return {
        success: true,
        message: 'Automation initialized successfully',
        jobs: {
          generation: results.genJob.jobId,
          upload: results.uploadJob.jobId,
          cleanup: results.cleanupJob.jobId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new ProcessOrchestratorService();
