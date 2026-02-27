/**
 * Asset Manager Utility
 * Handles asset creation/update in database with duplicate detection
 * 
 * Usage:
 *   const assetManager = require('./assetManager');
 *   const asset = await assetManager.saveAsset({
 *     filename: "image.jpg",
 *     mimeType: "image/jpeg",
 *     fileSize: 1024,
 *     assetType: "image",
 *     assetCategory: "generated-image",
 *     userId: "user123",
 *     storage: {
 *       location: "google-drive",
 *       googleDriveId: "file123",
 *       googleDrivePath: "Affiliate AI/Images/...",
 *       url: "https://drive.google.com/..."
 *     },
 *     // 💫 NEW: Cloud storage for hybrid sync
 *     cloudStorage: {
 *       location: "google-drive",
 *       googleDriveId: "file123",
 *       webViewLink: "https://drive.google.com/...",
 *       thumbnailLink: "https://...",
 *       status: "synced"
 *     },
 *     // 💫 NEW: Local storage for offline access
 *     localStorage: {
 *       location: "local",
 *       path: "/path/to/file.jpg",
 *       fileSize: 1024,
 *       verified: true
 *     }
 *   });
 */

import Asset from '../models/Asset.js';

class AssetManager {
  /**
   * Save asset to database with automatic duplicate detection and replacement
   * 
   * @param {Object} assetData - Asset data to save
   * @param {string} assetData.filename - File name
   * @param {string} assetData.mimeType - MIME type
   * @param {number} assetData.fileSize - File size in bytes
   * @param {string} assetData.assetType - Type: 'image', 'video', 'audio'
   * @param {string} assetData.assetCategory - Category like 'generated-image', 'product-image'
   * @param {string} assetData.userId - User ID
   * @param {string} [assetData.sessionId] - Session ID
   * @param {Object} assetData.storage - Storage info (LEGACY - for backward compatibility)
   * @param {string} assetData.storage.location - 'google-drive' or 'local'
   * @param {Object} [assetData.cloudStorage] - Cloud storage info (NEW - for hybrid sync)
   * @param {Object} [assetData.localStorage] - Local storage info (NEW - for offline access)
   * @param {Object} [assetData.metadata] - Metadata
   * @param {string[]} [assetData.tags] - Tags
   * @param {boolean} [options.autoReplace=true] - Auto-replace duplicate files
   * @param {boolean} [options.verbose=true] - Log operations
   * 
   * @returns {Promise<Object>} - { success, asset, action: 'created'|'updated' }
   */
  static async saveAsset(assetData, options = {}) {
    const {
      autoReplace = true,
      verbose = true
    } = options;

    const {
      filename,
      mimeType,
      fileSize,
      assetType,
      assetCategory,
      userId = 'anonymous',
      sessionId,
      storage,
      cloudStorage,  // 💫 NEW
      localStorage,  // 💫 NEW
      metadata = {},
      tags = []
    } = assetData;

    if (!filename || !assetType || !assetCategory || !storage) {
      throw new Error('Missing required fields: filename, assetType, assetCategory, storage');
    }

    try {
      if (verbose) {
        console.log(`\n💾 Saving asset: ${filename}`);
      }

      // ===============================================
      // CHECK FOR DUPLICATE FILES
      // ===============================================
      let existingAsset = null;
      let isDuplicate = false;
      let queryReason = '';

      // Check 1: If Google Drive ID provided, check by that
      if (storage.googleDriveId) {
        existingAsset = await Asset.findOne({ 'storage.googleDriveId': storage.googleDriveId });
        if (existingAsset) {
          isDuplicate = true;
          queryReason = `Google Drive ID: ${storage.googleDriveId}`;
        }
      }

      // Check 2: If not found by Drive ID, check by filename + userId
      if (!existingAsset) {
        existingAsset = await Asset.findOne({
          filename: filename,
          userId: userId
        });
        if (existingAsset) {
          isDuplicate = true;
          queryReason = `Filename: ${filename}`;
        }
      }

      // ===============================================
      // HANDLE DUPLICATE
      // ===============================================
      if (isDuplicate) {
        if (verbose) {
          console.log(`   ⚠️  Duplicate found - ${queryReason}`);
        }

        if (!autoReplace) {
          if (verbose) {
            console.log(`   ❌ Auto-replace disabled, skipping...`);
          }
          return {
            success: false,
            action: 'skipped',
            error: 'Asset already exists and autoReplace is false',
            asset: existingAsset
          };
        }

        // Update existing asset
        if (verbose) {
          console.log(`   ✅ Replacing with new file info...`);
        }

        existingAsset.mimeType = mimeType;
        existingAsset.fileSize = fileSize;
        existingAsset.storage = storage;
        // 💫 NEW: Update hybrid storage fields
        if (cloudStorage) existingAsset.cloudStorage = cloudStorage;
        if (localStorage) existingAsset.localStorage = localStorage;
        existingAsset.metadata = { ...existingAsset.metadata, ...metadata };
        existingAsset.tags = [...new Set([...existingAsset.tags, ...tags])];
        existingAsset.updatedAt = new Date();

        await existingAsset.save();

        if (verbose) {
          console.log(`   ✅ Asset updated: ${existingAsset.assetId}`);
        }

        return {
          success: true,
          action: 'updated',
          asset: existingAsset
        };
      }

      // ===============================================
      // CREATE NEW ASSET
      // ===============================================
      if (verbose) {
        console.log(`   ✅ Creating new asset record...`);
      }

      const assetId = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newAsset = new Asset({
        assetId,
        filename,
        mimeType,
        fileSize,
        assetType,
        assetCategory,
        userId,
        sessionId,
        storage,
        // 💫 NEW: Include hybrid storage fields
        cloudStorage: cloudStorage || undefined,
        localStorage: localStorage || undefined,
        metadata,
        tags,
        status: 'active',
        // 💫 NEW: Set sync status based on cloudStorage
        syncStatus: cloudStorage?.status === 'synced' ? 'synced' : 'pending'
      });

      await newAsset.save();

      if (verbose) {
        console.log(`   ✅ New asset created: ${newAsset.assetId}`);
      }

      return {
        success: true,
        action: 'created',
        asset: newAsset
      };
    } catch (error) {
      console.error(`❌ Error saving asset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk save multiple assets
   * 
   * @param {Array} assetsData - Array of asset data objects
   * @param {Object} options - Options (autoReplace, verbose)
   * @returns {Promise<Object>} - { success, results: [], summary: {} }
   */
  static async saveMultipleAssets(assetsData, options = {}) {
    console.log(`\n📦 Saving ${assetsData.length} assets...`);

    const results = [];
    const summary = {
      total: assetsData.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    for (const assetData of assetsData) {
      try {
        const result = await this.saveAsset(assetData, {
          ...options,
          verbose: false  // Reduce verbose output for bulk operations
        });

        results.push(result);

        if (result.action === 'created') summary.created++;
        else if (result.action === 'updated') summary.updated++;
        else if (result.action === 'skipped') summary.skipped++;
      } catch (error) {
        results.push({
          success: false,
          action: 'error',
          filename: assetData.filename,
          error: error.message
        });
        summary.errors++;
      }
    }

    console.log(`\n📊 Bulk save summary:`);
    console.log(`   Created: ${summary.created}`);
    console.log(`   Updated: ${summary.updated}`);
    console.log(`   Skipped: ${summary.skipped}`);
    console.log(`   Errors: ${summary.errors}\n`);

    return {
      success: summary.errors === 0,
      results,
      summary
    };
  }

  /**
   * Delete asset by ID
   * 
   * @param {string} assetId - Asset ID
   * @returns {Promise<Object>}
   */
  static async deleteAsset(assetId) {
    try {
      const result = await Asset.findOneAndDelete({ assetId });
      if (!result) {
        return { success: false, error: 'Asset not found' };
      }
      console.log(`✅ Asset deleted: ${assetId}`);
      return { success: true, asset: result };
    } catch (error) {
      console.error(`❌ Error deleting asset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get asset by filename
   * 
   * @param {string} filename - File name
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>}
   */
  static async getAssetByFilename(filename, userId = 'anonymous') {
    try {
      return await Asset.findOne({ filename, userId });
    } catch (error) {
      console.error(`❌ Error getting asset: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get asset by Google Drive ID
   * 
   * @param {string} googleDriveId - Google Drive file ID
   * @returns {Promise<Object|null>}
   */
  static async getAssetByDriveId(googleDriveId) {
    try {
      return await Asset.findOne({ 'storage.googleDriveId': googleDriveId });
    } catch (error) {
      console.error(`❌ Error getting asset: ${error.message}`);
      throw error;
    }
  }
}

export default AssetManager;
