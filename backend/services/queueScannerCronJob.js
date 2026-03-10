/**
 * queueScannercronJob.js
 * Automatically scan Queue folder and trigger video mashup generation
 * Runs as scheduled CronJob
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import GoogleDriveIntegration from './googleDriveIntegration.js';
import videoMashupGenerator from './videoMashupGenerator.js';
import VideoQueueService from './videoQueueService.js';
import AutoUploadService from './autoUploadService.js';
import MultiAccountService from './multiAccountService.js';
import QueueScannerSettings from '../models/QueueScannerSettings.js';
import Asset from '../models/Asset.js';
import TrendVideo from '../models/TrendVideo.js';
import driveService from './googleDriveOAuth.js';
import { buildPublishMetadata, mergePublishUploadConfig } from './publishMetadataGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const googleDriveIntegration = new GoogleDriveIntegration();

class QueueScannerCronJob {
  constructor() {
    this.queueDir = path.join(__dirname, '../media/queue');
    this.processedDir = path.join(__dirname, '../media/processed-queue');
    this.mediaDir = path.join(__dirname, '../media');
    this.isRunning = false;
    this.scheduleIntervalRef = null;
    this.scheduleConfig = {
      intervalMinutes: 60,
      scheduleMode: 'hourly',
      everyHours: 1,
      dailyTime: '09:00',
      scheduleLabel: 'Every 1 hour',
      autoPublish: false,
      accountIds: [],
      platform: 'youtube',
      youtubePublishType: 'shorts',
      enabled: false,
    };
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

  getQueueMetadataPath(queueVideoPath = '') {
    if (!queueVideoPath) return '';
    const parsed = path.parse(queueVideoPath);
    const basePath = path.join(parsed.dir, parsed.name);
    return `${basePath}.json`;
  }

  readQueueMetadata(queueVideoPath = '') {
    const directPath = `${queueVideoPath}.json`;
    const derivedPath = this.getQueueMetadataPath(queueVideoPath);
    const candidate = fs.existsSync(directPath) ? directPath : (fs.existsSync(derivedPath) ? derivedPath : '');
    if (!candidate) return null;
    try {
      return JSON.parse(fs.readFileSync(candidate, 'utf8'));
    } catch (error) {
      console.warn('⚠️ Failed to parse queue metadata:', error.message);
      return null;
    }
  }

  async listDriveQueueVideos() {
    const folderId = driveService?.folderIds?.videosQueue || null;
    if (!folderId) return [];

    try {
      const files = await driveService.listFiles(folderId, 50);
      return files.filter((file) => {
        if (file?.mimeType?.startsWith('video/')) return true;
        return /\.(mp4|mov|avi|mkv)$/i.test(file?.name || '');
      });
    } catch (error) {
      console.warn('⚠️ Failed to list Drive queue files:', error.message);
      return [];
    }
  }

  async downloadDriveQueueFile(file) {
    if (!file?.id) return null;
    try {
      if (!driveService.initialized) {
        await driveService.authenticate();
      }
      const url = driveService.getDownloadUrl(file.id);
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const ext = path.extname(file.name || '') || '.mp4';
      const safeName = path.parse(file.name || `drive-queue-${Date.now()}`).name.replace(/[^\w\-]+/g, '-');
      let fileName = `${safeName}${ext}`;
      let destPath = path.join(this.queueDir, fileName);
      let counter = 1;
      while (fs.existsSync(destPath)) {
        fileName = `${safeName}-${Date.now()}-${counter}${ext}`;
        destPath = path.join(this.queueDir, fileName);
        counter += 1;
      }
      fs.writeFileSync(destPath, response.data);
      return {
        name: fileName,
        path: destPath,
        size: fs.statSync(destPath).size,
        createdAt: file.createdTime ? new Date(file.createdTime) : new Date(),
        driveFileId: file.id,
        driveMeta: file,
      };
    } catch (error) {
      console.error('❌ Failed to download Drive queue file:', error.message);
      return null;
    }
  }

  async ensureSourceAsset(queueVideo, metadata = {}) {
    const relativePath = path.relative(this.mediaDir, queueVideo.path).replace(/\\/g, '/');
    const existing = await Asset.findOne({
      $or: [
        { 'localStorage.path': relativePath },
        { 'storage.localPath': relativePath },
      ],
    }).lean();
    if (existing) {
      return existing;
    }

    const assetId = `queue_source_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const asset = await Asset.create({
      assetId,
      filename: queueVideo.name,
      mimeType: 'video/mp4',
      fileSize: queueVideo.size || 0,
      assetType: 'video',
      assetCategory: 'source-video',
      userId: 'queue-scanner',
      sessionId: 'queue-folder',
      storage: {
        location: 'local',
        localPath: relativePath,
        url: `/api/assets/proxy/${assetId}`,
      },
      localStorage: {
        location: 'local',
        path: relativePath,
        fileSize: queueVideo.size || 0,
        savedAt: new Date(),
        verified: true,
      },
      metadata: {
        source: metadata?.sourceKey || metadata?.sourcePlatform || 'other',
        sourceVideoId: metadata?.sourceVideoId || '',
        driveFileId: metadata?.driveFileId || '',
      },
      status: 'active',
      tags: ['video-pipeline', 'queue-folder', 'source-video', metadata?.sourceKey || 'other'],
    });

    return asset;
  }

  async ensureSourceVideo(queueVideo, metadata = {}, asset = null) {
    const existingById = metadata?.sourceVideoId
      ? await TrendVideo.findById(metadata.sourceVideoId)
      : null;
    if (existingById) {
      if (!existingById.localPath) {
        existingById.localPath = path.relative(path.join(__dirname, '..'), queueVideo.path).replace(/\\/g, '/');
        existingById.downloadStatus = 'done';
        existingById.downloadedAt = existingById.downloadedAt || new Date();
        await existingById.save();
      }
      return existingById;
    }

    const videoId = metadata?.videoId || `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const platform = metadata?.sourcePlatform || metadata?.sourceKey || 'other';
    const sourceKey = metadata?.sourceKey || platform || 'other';
    const relativePath = path.relative(path.join(__dirname, '..'), queueVideo.path).replace(/\\/g, '/');

    const newVideo = await TrendVideo.create({
      platform,
      source: sourceKey,
      videoId,
      title: metadata?.sourceTitle || queueVideo.name,
      url: metadata?.sourceUrl || `queue://${queueVideo.name}`,
      thumbnail: metadata?.sourceThumbnail || '',
      discoveredAt: metadata?.queuedAt ? new Date(metadata.queuedAt) : new Date(),
      localPath: relativePath,
      downloadStatus: 'done',
      downloadedAt: new Date(),
      driveSync: {
        status: 'skipped',
        driveFileId: metadata?.driveFileId || '',
        drivePath: metadata?.drivePath || '',
        webViewLink: metadata?.driveWebViewLink || '',
        syncedAt: null,
        lastError: '',
      },
      production: {
        queueStatus: 'idle',
        queueId: '',
      },
    });

    if (asset && newVideo) {
      await Asset.updateOne(
        { assetId: asset.assetId },
        { $set: { 'metadata.sourceVideoId': String(newVideo._id) } }
      );
    }

    return newVideo;
  }

  async upsertGeneratedAsset(queueId, outputPath, driveSync = {}, sourceVideoId = '') {
    const assetId = `video_pipeline_generated_${queueId}`;
    const relativePath = path.relative(path.join(__dirname, '..'), outputPath).replace(/\\/g, '/');
    const existing = await Asset.findOne({ assetId });
    const assetPayload = {
      assetId,
      filename: path.basename(outputPath),
      mimeType: 'video/mp4',
      fileSize: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0,
      assetType: 'video',
      assetCategory: 'generated-video',
      userId: 'queue-scanner',
      sessionId: 'video-pipeline',
      projectId: 'video-pipeline',
      storage: {
        location: driveSync?.driveFileId ? 'google-drive' : 'local',
        googleDriveId: driveSync?.driveFileId || '',
        localPath: relativePath,
        url: driveSync?.webViewLink || `/api/assets/proxy/${assetId}`,
      },
      localStorage: {
        location: 'local',
        path: relativePath,
        fileSize: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0,
        verified: true,
        savedAt: new Date(),
      },
      cloudStorage: driveSync?.driveFileId ? {
        location: 'google-drive',
        googleDriveId: driveSync.driveFileId,
        webViewLink: driveSync.webViewLink || '',
        thumbnailLink: driveSync.thumbnailLink || '',
        status: 'synced',
      } : undefined,
      metadata: {
        sourceVideoId: sourceVideoId || '',
        queueId,
      },
      status: 'active',
      tags: ['video-pipeline', 'generated-video', queueId],
    };

    if (existing) {
      Object.assign(existing, assetPayload);
      await existing.save();
      return existing;
    }

    return Asset.create(assetPayload);
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
      const localQueueVideos = googleDriveIntegration.listQueueVideos();
      const driveQueueFiles = await this.listDriveQueueVideos();
      const driveQueueVideos = [];

      for (const driveFile of driveQueueFiles) {
        const downloaded = await this.downloadDriveQueueFile(driveFile);
        if (downloaded) {
          driveQueueVideos.push(downloaded);
        }
      }

      const queueVideos = [...localQueueVideos, ...driveQueueVideos];
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
          const metadata = this.readQueueMetadata(queueVideo.path) || {};
          const enrichedMetadata = {
            ...metadata,
            driveFileId: queueVideo.driveFileId || metadata.driveFileId || '',
            driveWebViewLink: queueVideo.driveMeta?.webViewLink || metadata.driveWebViewLink || '',
            driveThumbnail: queueVideo.driveMeta?.thumbnailLink || metadata.driveThumbnail || '',
            sourceKey: metadata.sourceKey || metadata.sourcePlatform || 'other',
            sourcePlatform: metadata.sourcePlatform || metadata.sourceKey || 'other',
          };
          const sourceAsset = await this.ensureSourceAsset(queueVideo, enrichedMetadata);
          const sourceVideo = await this.ensureSourceVideo(queueVideo, enrichedMetadata, sourceAsset);

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

          const { mashupId, outputPath, thumbPath, metadata: mashupMetadata } = mashupResult;
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
          const mashupLog = {
            recipe: 'mashup',
            templateName: 'reaction',
            templateGroup: 'reaction',
            layout: '2-3-1-3',
            duration: 30,
            aspectRatio: '9:16',
            audioSource: 'main',
            subtitleMode: 'none',
            subtitleText: '',
            subtitleContext: '',
            mainVideo: {
              sourceVideoId: sourceVideo?._id ? String(sourceVideo._id) : '',
              title: sourceVideo?.title || enrichedMetadata.sourceTitle || queueVideo.name,
              path: queueVideo.path,
              url: sourceVideo?.url || enrichedMetadata.sourceUrl || '',
            },
            subVideo: {
              selectionMethod: 'random',
              assetId: '',
              name: subVideo?.name || '',
              path: subVideo?.path || '',
              sourceKey: 'local-sub',
              sourceType: 'local',
              theme: '',
            },
            selection: {
              method: 'random',
              sourceKey: 'local-sub',
              sourceType: 'local-folder',
              sourceName: 'local sub-videos',
              templateGroup: 'reaction',
              desiredThemes: [],
              score: null,
              candidates: [],
            },
          };
          const queueResult = await VideoQueueService.addToQueue({
            videoConfig: {
              layout: '2-3-1-3',
              duration: 30,
              platform: 'youtube',
              mainVideoPath: queueVideo.path,
              subVideoPath: subVideo.path,
              mashupId,
              outputPath: moveResult.filePath,
              metadata: mashupMetadata,
              sourceTitle: sourceVideo?.title || enrichedMetadata.sourceTitle || queueVideo.name,
              sourceUrl: sourceVideo?.url || enrichedMetadata.sourceUrl || '',
              sourceThumbnail: sourceVideo?.thumbnail || enrichedMetadata.sourceThumbnail || '',
              sourceVideoId: sourceVideo?._id ? String(sourceVideo._id) : '',
              mashupLog,
              publishMetadata: buildPublishMetadata({
                sourceTitle: sourceVideo?.title || enrichedMetadata.sourceTitle || queueVideo.name,
                templateName: mashupLog.templateName,
                templateGroup: mashupLog.templateGroup,
                sourceKey: enrichedMetadata.sourceKey || sourceVideo?.source || 'other',
                sourcePlatform: enrichedMetadata.sourcePlatform || sourceVideo?.platform || 'other',
                subtitleText: mashupLog.subtitleText || '',
                subtitleContext: mashupLog.subtitleContext || '',
                subVideoName: subVideo?.name || '',
              }),
            },
            platform: options.platform || 'youtube',
            contentType: 'mashup',
            priority: 'high',
            accountIds: options.accountIds || [],
            metadata: {
              sourceVideoId: sourceVideo?._id ? String(sourceVideo._id) : '',
              sourceKey: enrichedMetadata.sourceKey || sourceVideo?.source || 'other',
              sourcePlatform: enrichedMetadata.sourcePlatform || sourceVideo?.platform || 'other',
              sourceTitle: sourceVideo?.title || enrichedMetadata.sourceTitle || '',
              sourceUrl: sourceVideo?.url || enrichedMetadata.sourceUrl || '',
              sourceThumbnail: sourceVideo?.thumbnail || enrichedMetadata.sourceThumbnail || '',
              mashupLog,
              publishMetadata: buildPublishMetadata({
                sourceTitle: sourceVideo?.title || enrichedMetadata.sourceTitle || queueVideo.name,
                templateName: mashupLog.templateName,
                templateGroup: mashupLog.templateGroup,
                sourceKey: enrichedMetadata.sourceKey || sourceVideo?.source || 'other',
                sourcePlatform: enrichedMetadata.sourcePlatform || sourceVideo?.platform || 'other',
                subtitleText: mashupLog.subtitleText || '',
                subtitleContext: mashupLog.subtitleContext || '',
                subVideoName: subVideo?.name || '',
              }),
            },
          });
          if (!queueResult.success) {
            throw new Error(queueResult.error || 'Queue item creation failed');
          }
          const publishMetadata = queueResult.queueItem?.videoConfig?.publishMetadata
            || queueResult.queueItem?.metadata?.publishMetadata
            || buildPublishMetadata({
              sourceTitle: sourceVideo?.title || enrichedMetadata.sourceTitle || queueVideo.name,
              templateName: mashupLog.templateName,
              templateGroup: mashupLog.templateGroup,
              sourceKey: enrichedMetadata.sourceKey || sourceVideo?.source || 'other',
              sourcePlatform: enrichedMetadata.sourcePlatform || sourceVideo?.platform || 'other',
              subtitleText: mashupLog.subtitleText || '',
              subtitleContext: mashupLog.subtitleContext || '',
              subVideoName: subVideo?.name || '',
            });

          let completedDriveSync = {
            status: 'skipped',
            message: 'Completed video kept on local storage only',
          };

          try {
            const outputBuffer = fs.readFileSync(moveResult.filePath);
            const driveResult = await driveService.uploadGeneratedVideo(outputBuffer, path.basename(moveResult.filePath), {
              description: `Completed mashup for queue ${queueResult.queueId}`,
              properties: {
                queueId: queueResult.queueId,
                recipe: 'mashup',
              },
            });

            completedDriveSync = {
              status: driveResult?.id ? 'uploaded' : 'skipped',
              driveFileId: driveResult?.id || '',
              webViewLink: driveResult?.webViewLink || '',
              name: driveResult?.name || path.basename(moveResult.filePath),
            };
          } catch (driveError) {
            completedDriveSync = {
              status: 'failed',
              error: driveError.message,
            };
          }

          const generatedAsset = await this.upsertGeneratedAsset(
            queueResult.queueId,
            moveResult.filePath,
            completedDriveSync,
            sourceVideo?._id ? String(sourceVideo._id) : ''
          );

          if (queueResult.success) {
            await VideoQueueService.updateQueueStatus(queueResult.queueId, 'ready', {
              videoConfig: {
                ...(queueResult.queueItem?.videoConfig || {}),
                outputPath: moveResult.filePath,
                videoPath: moveResult.filePath,
                completedDriveSync,
                publishMetadata,
                generatedAsset: generatedAsset ? {
                  assetId: generatedAsset.assetId || '',
                  id: generatedAsset._id ? String(generatedAsset._id) : '',
                } : null,
              },
              metadata: {
                ...(queueResult.queueItem?.metadata || {}),
                completedDriveSync,
                publishMetadata,
              },
              uploadUrl: completedDriveSync.webViewLink || '',
            });
          }

          if (sourceVideo) {
            sourceVideo.production = {
              queueStatus: 'completed',
              queueId: queueResult.queueId,
              recipe: 'mashup',
              completedVideoPath: moveResult.filePath,
              completedDriveFileId: completedDriveSync.driveFileId || '',
              completedAt: new Date(),
              lastError: '',
            };
            await sourceVideo.save();
          }
          console.log(`✓ Queue item created: ${queueResult.queueId}`);

          let autoPublishResults = [];
          if (options.autoPublish && queueResult.success && Array.isArray(options.accountIds) && options.accountIds.length) {
            for (const accountId of options.accountIds) {
              const account = MultiAccountService.getRawAccount(accountId);
              if (!account) {
                autoPublishResults.push({ accountId, success: false, error: 'Account not found' });
                continue;
              }

              const uploadConfig = account.platform === 'youtube'
                ? mergePublishUploadConfig(
                  { youtubePublishType: String(options.youtubePublishType || 'shorts').toLowerCase() },
                  publishMetadata
                )
                : {};

              const upload = AutoUploadService.registerUpload({
                queueId: queueResult.queueId,
                videoPath: moveResult.filePath,
                platform: account.platform,
                accountId,
                uploadConfig
              });

              if (!upload.success) {
                autoPublishResults.push({ accountId, success: false, error: upload.error || 'Register upload failed' });
                continue;
              }

              const executed = await AutoUploadService.executeUpload(upload.uploadId, account);
              if (executed.success) {
                MultiAccountService.recordPost(accountId);
              } else {
                MultiAccountService.recordError(accountId, executed.error || 'Upload failed');
              }

              autoPublishResults.push({ accountId, ...executed });
            }

            if (autoPublishResults.some(r => r.success)) {
              await VideoQueueService.updateQueueStatus(queueResult.queueId, 'uploaded');
            }
          }

          // 5. Mark queue video as processed
          const processedPath = path.join(this.processedDir, queueVideo.name);
          fs.copyFileSync(queueVideo.path, processedPath);
          fs.unlinkSync(queueVideo.path); // Delete from queue
          const metadataPath = this.getQueueMetadataPath(queueVideo.path);
          if (metadataPath && fs.existsSync(metadataPath)) {
            fs.unlinkSync(metadataPath);
          }
          if (queueVideo.driveFileId) {
            try {
              await driveService.deleteFile(queueVideo.driveFileId);
            } catch (driveError) {
              console.warn('⚠️ Failed to delete Drive queue file:', driveError.message);
            }
          }
          console.log(`✓ Marked as processed`);

          results.push({
            queueVideo: queueVideo.name,
            subVideo: subVideo.name,
            mashupId,
            status: 'success',
            outputPath: moveResult.filePath,
            generatedAssetId: generatedAsset?.assetId || '',
            autoPublished: !!options.autoPublish,
            autoPublishResults
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
          scheduleMode: settings.scheduleMode || 'hourly',
          everyHours: settings.everyHours || Math.max(1, Math.round((settings.intervalMinutes || 60) / 60)),
          dailyTime: settings.dailyTime || '09:00',
          scheduleLabel: settings.scheduleLabel || `Every ${Math.max(1, Math.round((settings.intervalMinutes || 60) / 60))} hour(s)`,
          autoPublish: !!settings.autoPublish,
          accountIds: settings.accountIds || [],
          platform: settings.platform || 'youtube',
          youtubePublishType: settings.youtubePublishType || 'shorts',
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
        scheduleMode: config.scheduleMode || 'hourly',
        everyHours: config.everyHours || Math.max(1, Math.round((config.intervalMinutes || 60) / 60)),
        dailyTime: config.dailyTime || '09:00',
        scheduleLabel: config.scheduleLabel || `Every ${config.everyHours || Math.max(1, Math.round((config.intervalMinutes || 60) / 60))} hour(s)`,
        autoPublish: !!config.autoPublish,
        accountIds: config.accountIds || [],
        platform: config.platform || 'youtube',
        youtubePublishType: config.youtubePublishType || 'shorts'
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
      scheduleMode: options.scheduleMode || 'hourly',
      everyHours: options.everyHours || Math.max(1, Math.round(intervalMinutes / 60)),
      dailyTime: options.dailyTime || '09:00',
      scheduleLabel: options.scheduleLabel || `Every ${options.everyHours || Math.max(1, Math.round(intervalMinutes / 60))} hour(s)`,
      autoPublish: !!options.autoPublish,
      accountIds: options.accountIds || [],
      platform: options.platform || 'youtube',
      youtubePublishType: options.youtubePublishType || 'shorts',
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
  async getStatus() {
    const localQueue = googleDriveIntegration.listQueueVideos();
    const driveQueue = await this.listDriveQueueVideos();
    return {
      isRunning: this.isRunning,
      queueDir: this.queueDir,
      processedDir: this.processedDir,
      queueCount: localQueue.length + driveQueue.length,
      localQueueCount: localQueue.length,
      driveQueueCount: driveQueue.length,
      scheduleConfig: this.scheduleConfig
    };
  }
}

export default new QueueScannerCronJob();
