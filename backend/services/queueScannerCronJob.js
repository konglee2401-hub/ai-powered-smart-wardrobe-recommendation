/**
 * queueScannercronJob.js
 * Automatically scan Queue folder and trigger video mashup generation
 * Runs as scheduled CronJob
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import googleDriveIntegration from './googleDriveIntegration.js';
import videoMashupGenerator from './videoMashupGenerator.js';
import VideoQueueService from './videoQueueService.js';
import QueueScannerSettings from '../models/QueueScannerSettings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class QueueScannerCronJob {
  constructor() {
    this.queueDir = path.join(__dirname, '../media/queue');
    this.processedDir = path.join(__dirname, '../media/processed-queue');
    this.mediaDir = path.join(__dirname, '../media');
    this.isRunning = false;
    this.scheduleIntervalRef = null;
    this.scheduleConfig = { intervalMinutes: 60, autoPublish: false, accountIds: [], platform: 'youtube', enabled: false };
    this.settingsLoaded = false;
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.queueDir, this.processedDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Scan queue folder and process videos
   * This should be called by CronJob scheduler
   */
  async scanAndProcess(options = {}) {
    if (this.isRunning) {
      console.log('⏳ Scanner already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('\n🔍 Starting Queue scan...');

    try {
      const queueVideos = googleDriveIntegration.listQueueVideos();
      console.log(`📊 Found ${queueVideos.length} videos in queue`);

      if (queueVideos.length === 0) {
        console.log('✓ Queue is empty');
        this.isRunning = false;
        return {
          success: true,
          message: 'Queue empty',
          processed: 0
        };
      }

      const results = [];
      for (const queueVideo of queueVideos) {
        console.log(`\n📹 Processing: ${queueVideo.name}`);
        
        try {
          // 1. Get random sub-video from sub-videos folder
          const subVideoResult = await googleDriveIntegration.getRandomSubVideo();
          if (!subVideoResult.success) {
            throw new Error('No sub-videos available');
          }

          const { file: subVideo } = subVideoResult;
          console.log(`✓ Selected sub-video: ${subVideo.name}`);

          // 2. Generate mashup
          const mashupResult = await videoMashupGenerator.generateMashup(
            queueVideo.path,
            subVideo.path,
            {
              duration: 30,
              quality: 'high',
              aspectRatio: '9:16' // YouTube Shorts
            }
          );

          if (!mashupResult.success) {
            throw new Error(`Mashup generation failed: ${mashupResult.error}`);
          }

          const { mashupId, outputPath, thumbPath, metadata } = mashupResult;
          console.log(`✓ Mashup generated: ${mashupId}`);

          // 3. Move mashup to Completed folder
          const moveResult = await googleDriveIntegration.moveToCompletedFolder(
            outputPath,
            `${mashupId}.mp4`
          );

          if (!moveResult.success) {
            throw new Error(`Failed to move to completed: ${moveResult.error}`);
          }

          console.log(`✓ Moved to completed folder`);

          // 4. Update queue item status
          // Create queue record
          const queueResult = VideoQueueService.addToQueue({
            videoConfig: {
              layout: '2-3-1-3',
              duration: 30,
              platform: 'youtube',
              mainVideoPath: queueVideo.path,
              subVideoPath: subVideo.path,
              mashupId,
              outputPath: moveResult.filePath,
              metadata
            },
            platform: options.platform || 'youtube',
            contentType: 'mashup',
            priority: 'high',
            accountIds: options.accountIds || []
          });
          if (queueResult.success) {
            VideoQueueService.updateQueueStatus(queueResult.queueId, 'ready');
          }
          console.log(`✓ Queue item created: ${queueResult.queueId}`);

          // 5. Mark queue video as processed
          const processedPath = path.join(this.processedDir, queueVideo.name);
          fs.copyFileSync(queueVideo.path, processedPath);
          fs.unlinkSync(queueVideo.path); // Delete from queue
          console.log(`✓ Marked as processed`);

          results.push({
            queueVideo: queueVideo.name,
            subVideo: subVideo.name,
            mashupId,
            status: 'success',
            outputPath: moveResult.filePath
          });

        } catch (error) {
          console.error(`❌ Error processing ${queueVideo.name}:`, error.message);
          results.push({
            queueVideo: queueVideo.name,
            status: 'failed',
            error: error.message
          });
        }
      }

      this.isRunning = false;

      return {
        success: true,
        message: 'Queue scan completed',
        processed: results.length,
        results
      };

    } catch (error) {
      console.error('❌ Queue scan failed:', error);
      this.isRunning = false;
      return {
        success: false,
        error: error.message
      };
    }
  }

  async loadScheduleSettings() {
    if (this.settingsLoaded) {
      return this.scheduleConfig;
    }

    try {
      const settings = await QueueScannerSettings.findOne({ key: 'default' }).lean();
      if (settings) {
        this.scheduleConfig = {
          intervalMinutes: settings.intervalMinutes || 60,
          autoPublish: !!settings.autoPublish,
          accountIds: settings.accountIds || [],
          platform: settings.platform || 'youtube',
          enabled: !!settings.enabled
        };

        if (settings.enabled) {
          this.initializeSchedule(this.scheduleConfig.intervalMinutes, this.scheduleConfig, { persist: false });
        }
      }
    } catch (error) {
      console.error('❌ Failed to load queue scanner settings from DB:', error.message);
    }

    this.settingsLoaded = true;
    return this.scheduleConfig;
  }

  async saveScheduleSettings(config = this.scheduleConfig) {
    await QueueScannerSettings.findOneAndUpdate(
      { key: 'default' },
      {
        key: 'default',
        enabled: !!config.enabled,
        intervalMinutes: config.intervalMinutes || 60,
        autoPublish: !!config.autoPublish,
        accountIds: config.accountIds || [],
        platform: config.platform || 'youtube'
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Initialize CronJob - runs at specified interval
   */
  initializeSchedule(intervalMinutes = 60, options = {}, control = { persist: true }) {
    if (this.scheduleIntervalRef) {
      clearInterval(this.scheduleIntervalRef);
      this.scheduleIntervalRef = null;
    }

    this.scheduleConfig = {
      intervalMinutes,
      autoPublish: !!options.autoPublish,
      accountIds: options.accountIds || [],
      platform: options.platform || 'youtube',
      enabled: true
    };

    console.log(`⏰ Initializing Queue Scanner CronJob (every ${intervalMinutes} minutes)`);

    this.scheduleIntervalRef = setInterval(async () => {
      await this.scanAndProcess(this.scheduleConfig);
    }, intervalMinutes * 60 * 1000);

    if (control?.persist !== false) {
      this.saveScheduleSettings(this.scheduleConfig).catch(err => {
        console.error('❌ Failed to persist queue scanner settings:', err.message);
      });
    }

    console.log('✓ Queue Scanner CronJob initialized');
    return this.scheduleConfig;
  }

  disableSchedule(options = { persist: true }) {
    if (this.scheduleIntervalRef) {
      clearInterval(this.scheduleIntervalRef);
      this.scheduleIntervalRef = null;
    }

    this.scheduleConfig = {
      ...this.scheduleConfig,
      enabled: false
    };

    if (options?.persist !== false) {
      this.saveScheduleSettings(this.scheduleConfig).catch(err => {
        console.error('❌ Failed to persist disabled queue scanner settings:', err.message);
      });
    }

    return this.scheduleConfig;
  }

  /**
   * Get scanner status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueDir: this.queueDir,
      processedDir: this.processedDir,
      queueCount: googleDriveIntegration.listQueueVideos().length,
      scheduleConfig: this.scheduleConfig
    };
  }
}

export default new QueueScannerCronJob();
