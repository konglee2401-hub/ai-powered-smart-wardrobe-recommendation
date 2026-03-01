/**
 * queueScannercronJob.js
 * Automatically scan Queue folder and trigger video mashup generation
 * Runs as scheduled CronJob
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import GoogleDriveIntegration from './googleDriveIntegration.js';
import videoMashupGenerator from './videoMashupGenerator.js';
import VideoQueueService from './videoQueueService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const googleDriveIntegration = new GoogleDriveIntegration();

class QueueScannerCronJob {
  constructor() {
    this.queueDir = path.join(__dirname, '../media/queue');
    this.processedDir = path.join(__dirname, '../media/processed-queue');
    this.mediaDir = path.join(__dirname, '../media');
    this.isRunning = false;
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
  async scanAndProcess() {
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
          const queueConfig = {
            layout: '2-3-1-3',
            duration: 30,
            platform: 'youtube',
            mainVideoPath: queueVideo.path,
            subVideoPath: subVideo.path,
            mashupId,
            metadata
          };

          const queueResult = VideoQueueService.addToQueue(queueConfig);
          console.log(`✓ Queue item created: ${queueResult.queueItem.queueId}`);

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

  /**
   * Initialize CronJob - runs at specified interval
   */
  initializeSchedule(intervalMinutes = 60) {
    console.log(`⏰ Initializing Queue Scanner CronJob (every ${intervalMinutes} minutes)`);
    
    setInterval(async () => {
      await this.scanAndProcess();
    }, intervalMinutes * 60 * 1000);

    console.log('✓ Queue Scanner CronJob initialized');
  }

  /**
   * Get scanner status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueDir: this.queueDir,
      processedDir: this.processedDir,
      queueCount: googleDriveIntegration.listQueueVideos().length
    };
  }
}

export default new QueueScannerCronJob();
