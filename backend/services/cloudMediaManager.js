/**
 * Cloud Media Manager
 * Manages media files from Google Drive and local storage
 * Provides unified interface for images, videos, audio files
 */

import GoogleDriveService from './googleDriveService.js';
import fs from 'fs';
import path from 'path';

class CloudMediaManager {
  constructor() {
    this.drive = new GoogleDriveService();
    this.mediaCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize media manager
   */
  async initialize() {
    try {
      await this.drive.initialize();
      console.log('✅ Cloud Media Manager initialized');
      return true;
    } catch (error) {
      console.error('❌ Cloud Media Manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Upload media file to cloud
   */
  async uploadMedia(filePath, mediaType, metadata = {}) {
    try {
      const fileName = path.basename(filePath);
      
      // Determine target folder based on media type
      let targetFolder;
      switch (mediaType) {
        case 'image':
          targetFolder = this.drive.folderStructure.media_images;
          break;
        case 'video':
          targetFolder = this.drive.folderStructure.media_videos;
          break;
        case 'audio':
          targetFolder = this.drive.folderStructure.media_audio;
          break;
        case 'template':
          targetFolder = this.drive.folderStructure.media_templates;
          break;
        default:
          targetFolder = this.drive.folderStructure.media;
      }

      // Check file size for large file handling
      const fileSize = fs.statSync(filePath).size;
      const maxSmallFileSize = 5 * 1024 * 1024; // 5MB

      let uploadResult;
      if (fileSize > maxSmallFileSize) {
        uploadResult = await this.drive.uploadLargeFile(
          filePath,
          fileName,
          targetFolder,
          (uploaded, total) => {
            const percent = ((uploaded / total) * 100).toFixed(2);
            console.log(`Uploading ${fileName}: ${percent}%`);
          }
        );
      } else {
        uploadResult = await this.drive.uploadFile(
          filePath,
          fileName,
          targetFolder,
          metadata
        );
      }

      // Cache media info
      const mediaInfo = {
        id: uploadResult.id,
        name: uploadResult.name,
        type: mediaType,
        url: uploadResult.webViewLink,
        cloudPath: `drive://${uploadResult.id}`,
        size: uploadResult.size,
        uploadedAt: uploadResult.uploadedAt,
        metadata,
      };

      this.mediaCache.set(uploadResult.id, {
        data: mediaInfo,
        expiry: Date.now() + this.cacheExpiry,
      });

      return mediaInfo;
    } catch (error) {
      console.error(`Error uploading media ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get all media of specific type
   */
  async getMediaByType(mediaType) {
    try {
      let targetFolder;
      switch (mediaType) {
        case 'image':
          targetFolder = this.drive.folderStructure.media_images;
          break;
        case 'video':
          targetFolder = this.drive.folderStructure.media_videos;
          break;
        case 'audio':
          targetFolder = this.drive.folderStructure.media_audio;
          break;
        case 'template':
          targetFolder = this.drive.folderStructure.media_templates;
          break;
        default:
          return [];
      }

      const files = await this.drive.listFiles(targetFolder, 100);

      return files.map((file) => ({
        id: file.id,
        name: file.name,
        type: mediaType,
        url: file.webViewLink,
        cloudPath: `drive://${file.id}`,
        size: file.size,
        thumbnail: file.thumbnailLink,
        createdTime: file.createdTime,
      }));
    } catch (error) {
      console.error(`Error getting media by type ${mediaType}:`, error);
      return [];
    }
  }

  /**
   * Get media library overview
   */
  async getMediaOverview() {
    try {
      const overview = {
        images: await this.getMediaByType('image'),
        videos: await this.getMediaByType('video'),
        audio: await this.getMediaByType('audio'),
        templates: await this.getMediaByType('template'),
        stats: {},
      };

      // Get statistics for each type
      for (const [type, items] of Object.entries(overview)) {
        if (type !== 'stats' && Array.isArray(items)) {
          const stats = await this.drive.getFolderStats(
            this.drive.folderStructure[`media_${type}`]
          );
          overview.stats[type] = stats;
        }
      }

      return overview;
    } catch (error) {
      console.error('Error getting media overview:', error);
      return null;
    }
  }

  /**
   * Download media file to local
   */
  async downloadMedia(fileId, outputDir) {
    try {
      const metadata = await this.drive.getFileMetadata(fileId);
      const outputPath = path.join(outputDir, metadata.name);

      const result = await this.drive.downloadFile(fileId, outputPath);

      return {
        localPath: result.path,
        fileId: fileId,
        fileName: metadata.name,
        size: result.size,
      };
    } catch (error) {
      console.error(`Error downloading media ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Get preview data for gallery
   */
  async getMediaPreview(fileId) {
    try {
      // Check cache first
      const cached = this.mediaCache.get(fileId);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      const metadata = await this.drive.getFileMetadata(fileId);

      const preview = {
        id: fileId,
        name: metadata.name,
        mimeType: metadata.mimeType,
        size: metadata.size,
        webLink: metadata.webViewLink,
        thumbnail: metadata.thumbnailLink,
        createdTime: metadata.createdTime,
        modifiedTime: metadata.modifiedTime,
      };

      // Cache it
      this.mediaCache.set(fileId, {
        data: preview,
        expiry: Date.now() + this.cacheExpiry,
      });

      return preview;
    } catch (error) {
      console.error(`Error getting media preview ${fileId}:`, error);
      return null;
    }
  }

  /**
   * Organize media into collections
   */
  async organizeMediaByCollection() {
    try {
      const collections = {};

      // Get all media with collection tags
      const allMedia = {
        images: await this.getMediaByType('image'),
        videos: await this.getMediaByType('video'),
        audio: await this.getMediaByType('audio'),
      };

      // Group by collection (extract from name or metadata)
      for (const [type, files] of Object.entries(allMedia)) {
        files.forEach((file) => {
          // Try to extract collection name from file name
          const match = file.name.match(/\[([^\]]+)\]/);
          const collectionName = match ? match[1] : 'Uncategorized';

          if (!collections[collectionName]) {
            collections[collectionName] = {};
          }

          if (!collections[collectionName][type]) {
            collections[collectionName][type] = [];
          }

          collections[collectionName][type].push(file);
        });
      }

      return collections;
    } catch (error) {
      console.error('Error organizing media:', error);
      return {};
    }
  }

  /**
   * Search media files
   */
  async searchMedia(query, folderType = 'all') {
    try {
      let results = [];

      if (folderType === 'all' || folderType === 'images') {
        const images = await this.drive.searchFiles(
          query,
          this.drive.folderStructure.media_images
        );
        results.push(...images.map((f) => ({ ...f, type: 'image' })));
      }

      if (folderType === 'all' || folderType === 'videos') {
        const videos = await this.drive.searchFiles(
          query,
          this.drive.folderStructure.media_videos
        );
        results.push(...videos.map((f) => ({ ...f, type: 'video' })));
      }

      if (folderType === 'all' || folderType === 'audio') {
        const audio = await this.drive.searchFiles(
          query,
          this.drive.folderStructure.media_audio
        );
        results.push(...audio.map((f) => ({ ...f, type: 'audio' })));
      }

      return results;
    } catch (error) {
      console.error(`Error searching media:`, error);
      return [];
    }
  }

  /**
   * Generate media URLs for gallery display
   */
  async generateGalleryUrls() {
    try {
      const gallery = await this.getMediaOverview();

      const urls = {};

      for (const [type, items] of Object.entries(gallery)) {
        if (type !== 'stats' && Array.isArray(items)) {
          urls[type] = items.map((item) => ({
            id: item.id,
            name: item.name,
            url: item.url,
            thumbnail: item.thumbnail,
            cloudPath: item.cloudPath,
            type: item.type,
          }));
        }
      }

      return urls;
    } catch (error) {
      console.error('Error generating gallery URLs:', error);
      return null;
    }
  }

  /**
   * Manage batch media
   */
  async manageBatchMedia(batchId, action, mediaIds) {
    try {
      const batchFolder = await this.drive.getOrCreateFolder(
        `batch-${batchId}`,
        this.drive.folderStructure.batches
      );

      const inputFolder = await this.drive.getOrCreateFolder(
        'input',
        batchFolder
      );

      switch (action) {
        case 'add':
          // Move/copy media to batch input folder
          for (const mediaId of mediaIds) {
            await this.drive.copyFile(
              mediaId,
              `${mediaId}-${Date.now()}`,
              inputFolder
            );
          }
          break;

        case 'remove':
          // Delete media from batch input folder
          for (const mediaId of mediaIds) {
            await this.drive.deleteFile(mediaId);
          }
          break;

        case 'list':
          // List all media in batch
          return await this.drive.listFiles(inputFolder);

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return {
        batchId,
        action,
        itemCount: mediaIds.length,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`Error managing batch media:`, error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.mediaCache.clear();
    console.log('Media cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      cacheSize: this.mediaCache.size,
      items: Array.from(this.mediaCache.keys()),
    };
  }
}

export default CloudMediaManager;
