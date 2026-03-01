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
      const { autoPublish = false, accountIds = [], platform = "youtube" } = req.body || {};
      const result = await queueScannerCronJob.scanAndProcess({ autoPublish, accountIds, platform });
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
      const { intervalMinutes = 60, autoPublish = false, accountIds = [], platform = "youtube" } = req.body;
      const scheduleConfig = queueScannerCronJob.initializeSchedule(intervalMinutes, { autoPublish, accountIds, platform });
      
      res.json({
        success: true,
        message: `Queue Scanner initialized with ${intervalMinutes} minute interval`,
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
