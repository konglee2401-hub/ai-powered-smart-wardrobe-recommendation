/**
 * Enhanced Cloud Media Manager  
 * Supports querying by asset category (character-image, product-image, etc.)
 * in addition to media type (image, video, audio)
 */

import Asset from '../models/Asset.js';
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
   * Get all media of specific type from Drive folders
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
   * 💫 NEW: Get media by asset category from MongoDB Asset database
   * Supports: character-image, product-image, generated-image, etc.
   * 
   * This allows gallery picker to show uploaded character/product images
   * without them being in the media_images folder
   */
  async getMediaByCategory(assetCategory) {
    try {
      console.log(`📊 Querying assets by category: ${assetCategory}`);
      
      const assets = await Asset.find({
        assetCategory: assetCategory,
        status: 'active',
        'cloudStorage.googleDriveId': { $exists: true, $ne: null }  // Only synced assets
      })
        .select('assetId filename cloudStorage storage fileSize createdAt')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      console.log(`   ✅ Found ${assets.length} assets in category ${assetCategory}`);

      return assets.map((asset) => ({
        id: asset.assetId,
        name: asset.filename,
        type: 'image', // Asset categories are all images (character-image, product-image, etc.)
        url: asset.cloudStorage?.webViewLink || null,
        driveId: asset.cloudStorage?.googleDriveId,
        cloudPath: asset.cloudStorage?.googleDriveId ? `drive://${asset.cloudStorage.googleDriveId}` : null,
        size: asset.fileSize,
        thumbnail: asset.cloudStorage?.thumbnailLink,
        createdTime: asset.createdAt,
        assetId: asset.assetId,
        assetCategory: assetCategory,
        source: 'asset-database'  // Distinguish from Drive folder queries
      }));
    } catch (error) {
      console.error(`Error getting assets by category ${assetCategory}:`, error);
      return [];
    }
  }

  /**
   * Get media library overview including new asset categories
   */
  async getMediaOverview() {
    try {
      const overview = {
        // Original media type queries (from Drive folders)
        images: await this.getMediaByType('image'),
        videos: await this.getMediaByType('video'),
        audio: await this.getMediaByType('audio'),
        templates: await this.getMediaByType('template'),
        
        // 💫 NEW: Asset category queries (from MongoDB)
        characterImages: await this.getMediaByCategory('character-image'),
        productImages: await this.getMediaByCategory('product-image'),
        generatedImages: await this.getMediaByCategory('generated-image'),
        
        stats: {},
      };

      // Get statistics for each type
      for (const [type, items] of Object.entries(overview)) {
        if (type !== 'stats' && type !== 'characterImages' && type !== 'productImages' && type !== 'generatedImages' && Array.isArray(items)) {
          const stats = await this.drive.getFolderStats(
            this.drive.folderStructure[`media_${type}`]
          );
          overview.stats[type] = stats;
        }
      }

      // Add counts for new categories
      overview.stats.characterImages = overview.characterImages.length;
      overview.stats.productImages = overview.productImages.length;
      overview.stats.generatedImages = overview.generatedImages.length;

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
  async getGalleryPreview(fileId) {
    try {
      // Check cache first
      const cached = this.mediaCache.get(fileId);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      // Fetch from Drive
      const metadata = await this.drive.getFileMetadata(fileId);
      const preview = {
        id: metadata.id,
        name: metadata.name,
        thumbnail: metadata.thumbnailLink,
        preview: metadata.webViewLink,
        size: metadata.size,
        createdTime: metadata.createdTime,
      };

      // Cache for 5 minutes
      this.mediaCache.set(fileId, {
        data: preview,
        expiry: Date.now() + this.cacheExpiry,
      });

      return preview;
    } catch (error) {
      console.error(`Error getting gallery preview ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Search media by name across all sources
   */
  async searchMedia(query) {
    try {
      const lowerQuery = query.toLowerCase();

      // Search in Drive folders
      const driveResults = await this.drive.searchFiles(query);

      // Search in Asset database
      const assetResults = await Asset.find({
        filename: { $regex: query, $options: 'i' },
        status: 'active',
        'cloudStorage.googleDriveId': { $exists: true, $ne: null }
      })
        .select('assetId filename cloudStorage assetCategory fileSize createdAt')
        .limit(50)
        .lean();

      const formattedAssets = assetResults.map((asset) => ({
        id: asset.assetId,
        name: asset.filename,
        type: 'image',
        url: asset.cloudStorage?.webViewLink,
        driveId: asset.cloudStorage?.googleDriveId,
        assetCategory: asset.assetCategory,
        source: 'asset-database'
      }));

      return {
        drive: driveResults.map(f => ({
          id: f.id,
          name: f.name,
          type: f.mimeType?.split('/')[0],
          url: f.webViewLink,
          thumbnail: f.thumbnailLink,
          source: 'google-drive'
        })),
        assets: formattedAssets
      };
    } catch (error) {
      console.error(`Error searching media:`, error);
      return { drive: [], assets: [] };
    }
  }

  /**
   * Clear media cache
   */
  clearCache() {
    this.mediaCache.clear();
    console.log('✅ Media cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      cachedItems: this.mediaCache.size,
      cacheSize: JSON.stringify([...this.mediaCache]).length,
      cacheExpiry: this.cacheExpiry
    };
  }
}

export default CloudMediaManager;
