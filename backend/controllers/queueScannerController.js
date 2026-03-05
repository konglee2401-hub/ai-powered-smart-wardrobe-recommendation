/**
 * queueScannerController.js
 * Controller handling queue scanner operations
 */

import queueScannerCronJob from '../services/queueScannerCronJob.js';
import GoogleDriveIntegration from '../services/googleDriveIntegration.js';

const googleDriveIntegration = new GoogleDriveIntegration();

export class QueueScannerController {
  /**
   * Manually trigger queue scan
   * POST /api/queue-scanner/scan-now
   */
  static async triggerScan(req, res) {
    try {
      await queueScannerCronJob.loadScheduleSettings();
      const persisted = queueScannerCronJob.scheduleConfig || {};
      const { autoPublish = persisted.autoPublish || false, accountIds = persisted.accountIds || [], platform = persisted.platform || 'youtube', youtubePublishType = persisted.youtubePublishType || 'shorts' } = req.body || {};
      const result = await queueScannerCronJob.scanAndProcess({ autoPublish, accountIds, platform, youtubePublishType });
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get scanner status
   * GET /api/queue-scanner/status
   */
  static async getStatus(req, res) {
    try {
      await queueScannerCronJob.loadScheduleSettings();
      const status = queueScannerCronJob.getStatus();
      const queueVideos = googleDriveIntegration.listQueueVideos();
      
      res.json({
        success: true,
        data: {
          ...status,
          videos: queueVideos.map(v => ({
            name: v.name,
            size: v.size,
            createdAt: v.createdAt
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Initialize scanner with schedule
   * POST /api/queue-scanner/initialize
   */
  static async initialize(req, res) {
    try {
      const { intervalMinutes = 60, autoPublish = false, accountIds = [], platform = 'youtube', youtubePublishType = 'shorts', enabled = true } = req.body;
      let scheduleConfig;

      if (enabled) {
        scheduleConfig = queueScannerCronJob.initializeSchedule(intervalMinutes, { autoPublish, accountIds, platform, youtubePublishType }, { persist: true });
      } else {
        scheduleConfig = queueScannerCronJob.disableSchedule({ persist: true });
      }

      res.json({
        success: true,
        message: enabled
          ? `Queue Scanner initialized with ${intervalMinutes} minute interval`
          : 'Queue Scanner scheduler disabled',
        schedule: scheduleConfig
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }


  /**
   * Get saved scanner settings from DB
   * GET /api/queue-scanner/settings
   */
  static async getSettings(req, res) {
    try {
      const config = await queueScannerCronJob.loadScheduleSettings();
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Save scanner settings to DB and apply runtime scheduler
   * PUT /api/queue-scanner/settings
   */
  static async saveSettings(req, res) {
    try {
      const {
        intervalMinutes = 60,
        autoPublish = false,
        accountIds = [],
        platform = 'youtube',
        youtubePublishType = 'shorts',
        enabled = true
      } = req.body || {};

      const schedule = enabled
        ? queueScannerCronJob.initializeSchedule(intervalMinutes, { autoPublish, accountIds, platform, youtubePublishType }, { persist: true })
        : queueScannerCronJob.disableSchedule({ persist: true });

      if (!enabled) {
        await queueScannerCronJob.saveScheduleSettings({
          ...queueScannerCronJob.scheduleConfig,
          intervalMinutes,
          autoPublish,
          accountIds,
          platform,
          youtubePublishType,
          enabled: false
        });
      }

      res.json({ success: true, data: schedule });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * List videos in queue
   * GET /api/queue-scanner/queue-videos
   */
  static async listQueueVideos(req, res) {
    try {
      const videos = googleDriveIntegration.listQueueVideos();
      res.json({
        success: true,
        data: {
          count: videos.length,
          videos: videos.map(v => ({
            name: v.name,
            size: (v.size / 1024 / 1024).toFixed(2) + ' MB',
            createdAt: v.createdAt
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get random sub-video
   * GET /api/queue-scanner/random-sub-video
   */
  static async getRandomSubVideo(req, res) {
    try {
      const result = await googleDriveIntegration.getRandomSubVideo();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default QueueScannerController;
