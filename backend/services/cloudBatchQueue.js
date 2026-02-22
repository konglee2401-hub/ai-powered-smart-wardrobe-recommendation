/**
 * Cloud Batch Queue Service
 * Manages batch processing with Google Drive integration
 * Queue automatically detects and uses media from cloud folders
 */

import GoogleDriveService from './googleDriveService.js';
import CloudMediaManager from './cloudMediaManager.js';
import { EventEmitter } from 'events';

class CloudBatchQueue extends EventEmitter {
  constructor() {
    super();
    this.drive = new GoogleDriveService();
    this.mediaManager = new CloudMediaManager();
    this.queue = [];
    this.processing = new Map();
    this.completed = [];
    this.failed = [];
    this.maxConcurrent = 3;
    this.processingCount = 0;
  }

  /**
   * Initialize batch queue
   */
  async initialize() {
    try {
      await this.drive.initialize();
      await this.mediaManager.initialize();
      console.log('✅ Cloud Batch Queue initialized');
      return true;
    } catch (error) {
      console.error('❌ Cloud Batch Queue initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create batch job from cloud folders
   */
  async createBatchFromCloud(batchConfig) {
    try {
      const {
        name,
        inputFolder,
        outputFolder,
        templateFolder,
        processType,
        parameters,
      } = batchConfig;

      // Create batch folder structure
      const batchFolder = await this.drive.createBatchFolder(
        Date.now().toString(),
        name
      );

      // Get input files from cloud folder
      let inputFiles = [];
      if (inputFolder) {
        inputFiles = await this.drive.listFiles(inputFolder);
      }

      // Get templates from cloud
      let templates = [];
      if (templateFolder) {
        templates = await this.drive.listFiles(templateFolder);
      }

      // Create batch job
      const batch = {
        id: batchFolder.batchId,
        name,
        status: 'pending',
        processType,
        parameters: {
          ...parameters,
          cloudInputFolder: inputFolder,
          cloudOutputFolder: outputFolder || batchFolder.folders.output,
          cloudTemplates: templates.map((t) => ({
            id: t.id,
            name: t.name,
            type: t.mimeType,
          })),
        },
        items: inputFiles.map((file, index) => ({
          id: `${batchFolder.batchId}-${index}`,
          fileId: file.id,
          fileName: file.name,
          type: file.mimeType,
          cloudPath: `drive://${file.id}`,
          status: 'pending',
          createdAt: new Date(),
          progress: 0,
        })),
        folderStructure: batchFolder,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.queue.push(batch);
      this.emit('batch-created', batch);

      return batch;
    } catch (error) {
      console.error('Error creating batch from cloud:', error);
      throw error;
    }
  }

  /**
   * Add item to existing batch
   */
  async addItemToBatch(batchId, fileId, metadata = {}) {
    try {
      const batch = this.queue.find((b) => b.id === batchId);
      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const fileMetadata = await this.drive.getFileMetadata(fileId);

      const item = {
        id: `${batchId}-${batch.items.length}`,
        fileId,
        fileName: fileMetadata.name,
        type: fileMetadata.mimeType,
        cloudPath: `drive://${fileId}`,
        status: 'pending',
        metadata,
        createdAt: new Date(),
        progress: 0,
      };

      batch.items.push(item);
      batch.updatedAt = new Date();

      this.emit('item-added', { batchId, item });

      return item;
    } catch (error) {
      console.error('Error adding item to batch:', error);
      throw error;
    }
  }

  /**
   * Process next batch item
   */
  async processNextItem(batchId) {
    try {
      if (this.processingCount >= this.maxConcurrent) {
        console.log(
          `Max concurrent processing (${this.maxConcurrent}) reached, waiting...`
        );
        return null;
      }

      const batch = this.queue.find((b) => b.id === batchId);
      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      // Find next pending item
      const item = batch.items.find((i) => i.status === 'pending');
      if (!item) {
        console.log(`No pending items in batch ${batchId}`);
        return null;
      }

      this.processingCount++;
      item.status = 'processing';
      item.startedAt = new Date();

      this.emit('item-processing', { batchId, itemId: item.id });

      // Process item (download, process, upload)
      const result = await this.processCloudItem(batch, item);

      // Save result to output folder
      if (result.success) {
        item.status = 'completed';
        item.result = result;
        this.completed.push({ batchId, item });
      } else {
        item.status = 'failed';
        item.error = result.error;
        this.failed.push({ batchId, item });
      }

      item.completedAt = new Date();
      batch.updatedAt = new Date();

      this.processingCount--;
      this.emit('item-completed', { batchId, itemId: item.id, result });

      return result;
    } catch (error) {
      console.error('Error processing item:', error);
      this.processingCount--;
      throw error;
    }
  }

  /**
   * Process cloud item
   */
  async processCloudItem(batch, item) {
    try {
      // Download file from cloud
      const downloadDir = './temp/batch-processing';
      const downloaded = await this.mediaManager.downloadMedia(
        item.fileId,
        downloadDir
      );

      // Process based on media type and batch process type
      let processedPath;
      switch (batch.processType) {
        case 'image-generation':
          processedPath = await this.processImage(downloaded.localPath, batch);
          break;
        case 'video-generation':
          processedPath = await this.processVideo(downloaded.localPath, batch);
          break;
        case 'audio-processing':
          processedPath = await this.processAudio(downloaded.localPath, batch);
          break;
        default:
          processedPath = downloaded.localPath;
      }

      // Upload result to cloud output folder
      const uploadResult = await this.drive.uploadFile(
        processedPath,
        `${item.fileName}-processed-${Date.now()}`,
        batch.parameters.cloudOutputFolder
      );

      return {
        success: true,
        originalFile: item.fileName,
        processedFile: uploadResult.name,
        cloudPath: `drive://${uploadResult.id}`,
        webLink: uploadResult.webViewLink,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process image (placeholder - integrate with actual AI)
   */
  async processImage(filePath, batch) {
    // TODO: Implement actual image processing
    return filePath;
  }

  /**
   * Process video (placeholder - integrate with actual AI)
   */
  async processVideo(filePath, batch) {
    // TODO: Implement actual video processing
    return filePath;
  }

  /**
   * Process audio (placeholder - integrate with actual AI)
   */
  async processAudio(filePath, batch) {
    // TODO: Implement actual audio processing
    return filePath;
  }

  /**
   * Process entire batch
   */
  async processBatch(batchId) {
    try {
      const batch = this.queue.find((b) => b.id === batchId);
      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      batch.status = 'processing';
      batch.startedAt = new Date();
      this.emit('batch-processing', batch);

      // Process all items
      while (
        batch.items.some(
          (i) => i.status === 'pending' || i.status === 'processing'
        )
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait a bit
        await this.processNextItem(batchId);
      }

      // Check if all completed successfully
      const allSuccess = batch.items.every((i) => i.status === 'completed');
      batch.status = allSuccess ? 'completed' : 'partial';
      batch.completedAt = new Date();

      this.emit('batch-completed', batch);

      return batch;
    } catch (error) {
      console.error('Error processing batch:', error);
      throw error;
    }
  }

  /**
   * Get batch status
   */
  getBatchStatus(batchId) {
    const batch = this.queue.find((b) => b.id === batchId);
    if (!batch) {
      return null;
    }

    const stats = {
      batchId,
      name: batch.name,
      status: batch.status,
      totalItems: batch.items.length,
      pending: batch.items.filter((i) => i.status === 'pending').length,
      processing: batch.items.filter((i) => i.status === 'processing').length,
      completed: batch.items.filter((i) => i.status === 'completed').length,
      failed: batch.items.filter((i) => i.status === 'failed').length,
      progress:
        (batch.items.filter((i) =>
          ['completed', 'failed'].includes(i.status)
        ).length /
          batch.items.length) *
        100,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };

    return stats;
  }

  /**
   * Get all batches
   */
  getAllBatches(filter = null) {
    let batches = this.queue;

    if (filter === 'processing') {
      batches = batches.filter((b) => b.status === 'processing');
    } else if (filter === 'completed') {
      batches = batches.filter((b) => b.status === 'completed');
    } else if (filter === 'failed') {
      batches = batches.filter((b) => b.status === 'failed');
    }

    return batches.map((b) => this.getBatchStatus(b.id));
  }

  /**
   * Get batch output files
   */
  async getBatchOutput(batchId) {
    try {
      const batch = this.queue.find((b) => b.id === batchId);
      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const outputFiles = await this.drive.listFiles(
        batch.parameters.cloudOutputFolder
      );

      return {
        batchId,
        outputFolder: batch.parameters.cloudOutputFolder,
        fileCount: outputFiles.length,
        files: outputFiles.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.mimeType,
          createdTime: f.createdTime,
          webLink: f.webViewLink,
          downloadUrl: `drive://${f.id}`,
        })),
      };
    } catch (error) {
      console.error('Error getting batch output:', error);
      throw error;
    }
  }

  /**
   * Delete batch
   */
  async deleteBatch(batchId) {
    try {
      const batchIndex = this.queue.findIndex((b) => b.id === batchId);
      if (batchIndex === -1) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const batch = this.queue[batchIndex];

      // Delete batch folders from Google Drive
      await this.drive.deleteFile(batch.folderStructure.folderId);

      // Remove from queue
      this.queue.splice(batchIndex, 1);

      this.emit('batch-deleted', batchId);

      return {
        success: true,
        message: `Batch ${batchId} deleted`,
      };
    } catch (error) {
      console.error('Error deleting batch:', error);
      throw error;
    }
  }

  /**
   * Get queue stats
   */
  getQueueStats() {
    return {
      totalBatches: this.queue.length,
      processingBatches: this.queue.filter((b) => b.status === 'processing')
        .length,
      completedBatches: this.queue.filter((b) => b.status === 'completed')
        .length,
      failedBatches: this.queue.filter((b) => b.status === 'failed').length,
      totalCompletedItems: this.completed.length,
      totalFailedItems: this.failed.length,
      processingCount: this.processingCount,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

export default CloudBatchQueue;
