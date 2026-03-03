import express from 'express';
import Asset from '../models/Asset.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import driveService from '../services/googleDriveOAuth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = express.Router();

/**
 * GET /api/assets/gallery
 * Get all assets for gallery (with filtering and pagination)
 */
router.get('/gallery', async (req, res) => {
  try {
    const { userId, assetType = 'all', category = 'all', page = 1, limit = 20, storageLocation = 'all' } = req.query;
    
    // Build query - gallery shows assets from any user (shared gallery)
    const query = { status: 'active' };
    if (userId) query.userId = userId; // Optional: filter by userId if provided
    if (assetType !== 'all') query.assetType = assetType;
    if (category !== 'all') query.assetCategory = category;
    
    // ✅ Updated: Handle both new hybrid storage and legacy storage
    if (storageLocation !== 'all') {
      if (storageLocation === 'local') {
        // Show assets with local storage
        query.$or = [
          { 'localStorage.path': { $exists: true, $ne: null } },
          { 'storage.location': 'local' }
        ];
      } else if (storageLocation === 'google-drive') {
        // Show assets with cloud storage
        query.$or = [
          { 'cloudStorage.googleDriveId': { $exists: true, $ne: null } },
          { 'storage.location': 'google-drive' }
        ];
      }
    } else {
      // Default: show all assets that have either local or cloud storage
      query.$or = [
        { 'localStorage.path': { $exists: true, $ne: null } },
        { 'cloudStorage.googleDriveId': { $exists: true, $ne: null } },
        { 'storage.location': { $exists: true, $ne: null } }
      ];
    }
    
    const skip = (page - 1) * limit;
    const [assets, total] = await Promise.all([
      Asset.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Asset.countDocuments(query)
    ]);
    
    console.log(`📋 Gallery query: ${JSON.stringify(query)}, Found: ${assets.length} assets`);
    
    res.json({
      success: true,
      assets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Gallery fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/assets/proxy/:assetId
 * Proxy endpoint to download Google Drive images and serve them with proper headers
 * Solves CORS issues and ensures images display correctly
 */
router.get('/proxy/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    // Find asset in database
    const asset = await Asset.findOne({ assetId });
    if (!asset) {
      console.log(`❌ Asset not found: ${assetId}`);
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    
    console.log(`🖼️ Proxying asset: ${asset.filename}`);
    console.log(`   Asset storage: ${JSON.stringify({local: !!asset.localStorage, cloud: !!asset.cloudStorage, legacy: !!asset.storage})}`);
    
    // Set CORS and caching headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    res.setHeader('Content-Type', asset.mimeType || 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${asset.filename}"`);
    
    // ✅ REFACTORED: Smarter storage priority with better fallbacks
    
    // STEP 1: Try hybrid local storage (new format)

    const streamFromGoogleDriveApi = async (fileId, sourceLabel) => {
      try {
        const authResult = await driveService.authenticate();
        if (!authResult?.authenticated || !driveService.drive) {
          throw new Error('Google Drive OAuth not authenticated');
        }

        console.log(`☁️ Fetching from Google Drive API (${sourceLabel}): ${fileId}`);
        const driveResponse = await driveService.drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'stream' }
        );

        const driveStream = driveResponse?.data;
        if (!driveStream) {
          throw new Error('Empty stream from Google Drive API');
        }

        const contentLength = driveResponse?.headers?.['content-length'];
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        }

        driveStream.on('error', (err) => {
          if (err?.code === 'ECONNRESET' || err?.message?.includes('aborted')) {
            console.warn(`⚠️ Client aborted stream (${sourceLabel}): ${err.message}`);
            return;
          }

          console.error(`Error streaming from Google Drive API: ${err.message}`);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Error streaming from Google Drive API' });
          }
        });

        driveStream.pipe(res);
        console.log('✅ Streaming Google Drive file via OAuth API');
        return true;
      } catch (err) {
        console.warn(`⚠️ Google Drive API fetch failed (${sourceLabel}): ${err.message}`);
        return false;
      }
    };

    if (asset.localStorage?.path) {
      const filePath = asset.localStorage.path;
      console.log(`   🔍 Checking local storage: ${filePath}`);
      
      try {
        if (fs.existsSync(filePath)) {
          console.log(`   ✅ Found local file: ${filePath}`);
          const fileSize = fs.statSync(filePath).size;
          res.setHeader('Content-Length', fileSize);
          console.log(`   💾 Serving hybrid local file (${fileSize} bytes)`);
          
          const fileStream = fs.createReadStream(filePath);
          fileStream.on('error', (err) => {
            console.error(`   ❌ Error streaming local file: ${err.message}`);
            if (!res.headersSent) {
              res.status(500).json({ success: false, error: 'Error streaming file' });
            }
          });
          fileStream.pipe(res);
          return;
        } else {
          console.log(`   ⚠️  Local file not found: ${filePath}`);
        }
      } catch (err) {
        console.error(`   ❌ Error checking local file: ${err.message}`);
      }
    }
    
    // STEP 2: Try legacy storage.url field (for backward compatibility)
    if (asset.storage?.url && typeof asset.storage.url === 'string' && asset.storage.url.startsWith('/')) {
      const filePath = asset.storage.url;
      console.log(`   🔍 Checking legacy local storage: ${filePath}`);
      
      try {
        if (fs.existsSync(filePath)) {
          console.log(`   ✅ Found legacy local file: ${filePath}`);
          const fileSize = fs.statSync(filePath).size;
          res.setHeader('Content-Length', fileSize);
          console.log(`   💾 Serving legacy local file (${fileSize} bytes)`);
          
          const fileStream = fs.createReadStream(filePath);
          fileStream.on('error', (err) => {
            console.error(`   ❌ Error streaming legacy local file: ${err.message}`);
            if (!res.headersSent) {
              res.status(500).json({ success: false, error: 'Error streaming file' });
            }
          });
          fileStream.pipe(res);
          return;
        }
      } catch (err) {
        console.error(`   ❌ Error checking legacy local file: ${err.message}`);
      }
    }
    
    // STEP 3: Try hybrid cloud storage (new format) via OAuth API
    if (asset.cloudStorage?.googleDriveId) {
      const streamed = await streamFromGoogleDriveApi(asset.cloudStorage.googleDriveId, 'hybrid');
      if (streamed) return;
    }

    // STEP 4: Try legacy cloud storage fallback via OAuth API (no legacy public URL fetch)
    if (asset.storage?.googleDriveId) {
      const streamed = await streamFromGoogleDriveApi(asset.storage.googleDriveId, 'legacy');
      if (streamed) return;
    }

    // STEP 5: No valid storage location found
    console.log(`❌ No valid storage location found for asset ${assetId}`);
    console.log(`   Asset structure: ${JSON.stringify({localStorage: asset.localStorage, cloudStorage: asset.cloudStorage, storage: asset.storage})}`);
    res.status(400).json({ success: false, error: 'No valid storage location found', assetId, storageStatus: {
      hasLocalPath: !!asset.localStorage?.path,
      hasCloudId: !!asset.cloudStorage?.googleDriveId,
      hasStorageUrl: !!asset.storage?.url,
      hasStorageDriveId: !!asset.storage?.googleDriveId
    }});
    
  } catch (error) {
    console.error(`❌ Proxy error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/assets/stream/:assetId
 * Stream asset file - returns direct URLs for Google Drive, or streams local files
 * Works for both Google Drive and local storage assets
 */
router.get('/stream/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    // Find asset in database
    const asset = await Asset.findOne({ assetId });
    if (!asset) {
      console.log(`❌ Asset not found: ${assetId}`);
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    
    console.log(`📦 Redirecting asset: ${asset.filename} (${asset.storage.location})`);
    
    // Handle local storage files
    if (asset.storage.location === 'local' && asset.storage.localPath) {
      const filePath = asset.storage.localPath;
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Local file not found: ${filePath}`);
        return res.status(404).json({ success: false, error: 'File not found on disk' });
      }
      
      // Set content type
      res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', asset.fileSize);
      res.setHeader('Content-Disposition', `inline; filename="${asset.filename}"`);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error(`Error streaming local file: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: 'Error streaming file' });
        }
      });
      fileStream.pipe(res);
      return;
    }
    
    // Handle Google Drive files - return direct URL for client to fetch
    if (asset.storage.location === 'google-drive' && asset.storage.googleDriveId) {
      // Use direct Google Drive download URL with export format
      const fileId = asset.storage.googleDriveId;
      const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      console.log(`☁️ Redirecting to Google Drive download: ${fileId}`);
      
      // Return a redirect or proxy info
      return res.json({
        success: true,
        type: 'google-drive',
        url: driveDownloadUrl,
        fileId: fileId,
        mimeType: asset.mimeType,
        filename: asset.filename,
        message: 'Please use this URL directly for streaming'
      });
    }
    
    // Unsupported storage location
    console.log(`⚠️ Unsupported storage location: ${asset.storage.location}`);
    res.status(400).json({ success: false, error: 'Unsupported storage location' });
    
  } catch (error) {
    console.error(`❌ Stream endpoint error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/assets/by-session/:sessionId
 * Get all assets from a specific session
 */
router.get('/by-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const assets = await Asset.findBySession(sessionId);
    
    res.json({
      success: true,
      assets,
      count: assets.length
    });
  } catch (error) {
    console.error('Session assets fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/assets/by-category/:category
 * Get all assets in a specific category (e.g., character-image, generated-image)
 */
router.get('/by-category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { userId = 'anonymous', page = 1, limit = 20 } = req.query;
    
    const result = await Asset.findByCategory(userId, category, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Category assets fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/assets/create
 * Create or update asset record (for uploaded or generated files)
 * 
 * Features:
 * - Auto-detect duplicate files by filename or googleDriveId
 * - Replace existing asset if same file is re-uploaded
 * - Create new asset if it's a new file
 * 
 * Request body:
 * {
 *   filename: "image.jpg",
 *   mimeType: "image/jpeg",
 *   fileSize: 1024,
 *   assetType: "image",
 *   assetCategory: "generated-image",
 *   userId: "user123",
 *   sessionId: "session123",
 *   storage: {
 *     location: "google-drive",
 *     googleDriveId: "file123",
 *     googleDrivePath: "Affiliate AI/Images/Uploaded/App",
 *     url: "https://drive.google.com/..."
 *   },
 *   metadata: { format: "jpg" },
 *   tags: ["auto-generated"],
 *   autoReplace: true  // If true, replace same filename; if false, error on duplicate
 * }
 */
router.post('/create', async (req, res) => {
  try {
    const {
      filename,
      mimeType,
      fileSize,
      assetType,
      assetCategory,
      userId = 'anonymous',
      sessionId,
      storage,
      metadata = {},
      tags = [],
      generation = null,
      autoReplace = true  // Auto-replace if duplicate found
    } = req.body;
    
    if (!filename || !assetType || !assetCategory || !storage) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
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
    
    // Check 2: If not found by Drive ID, check by filename
    if (!existingAsset) {
      existingAsset = await Asset.findOne({ filename: filename, userId: userId });
      if (existingAsset) {
        isDuplicate = true;
        queryReason = `Filename: ${filename}`;
      }
    }
    
    // ===============================================
    // HANDLE DUPLICATE LOGIC
    // ===============================================
    if (isDuplicate) {
      console.log(`⚠️  Asset already exists - ${queryReason}`);
      console.log(`   Existing ID: ${existingAsset.assetId}`);
      
      if (!autoReplace) {
        // Return error if auto-replace disabled
        return res.status(409).json({
          success: false,
          error: 'Asset with same filename already exists',
          existingAsset: existingAsset,
          action: 'use autoReplace=true to replace it'
        });
      }
      
      // Update existing asset with new file info
      console.log(`   ✅ Replacing with new file information...`);
      existingAsset.mimeType = mimeType;
      existingAsset.fileSize = fileSize;
      existingAsset.storage = storage;
      existingAsset.metadata = metadata;
      existingAsset.tags = [...new Set([...existingAsset.tags, ...tags])]; // Merge tags
      
      // Update update timestamp
      existingAsset.updatedAt = new Date();
      
      await existingAsset.save();
      
      console.log(`   ✅ Asset updated: ${existingAsset.assetId}`);
      
      return res.json({
        success: true,
        asset: existingAsset,
        action: 'updated',
        message: `Existing asset replaced. ID: ${existingAsset.assetId}`
      });
    }
    
    // ===============================================
    // CREATE NEW ASSET (NO DUPLICATE)
    // ===============================================
    console.log(`✅ Asset is new - creating record...`);
    
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const asset = new Asset({
      assetId,
      filename,
      mimeType,
      fileSize,
      assetType,
      assetCategory,
      userId,
      sessionId,
      storage,
      metadata,
      tags,
      generation,
      status: 'active'
    });
    
    await asset.save();
    
    console.log(`   ✅ New asset created: ${asset.assetId}`);
    
    res.json({
      success: true,
      asset,
      action: 'created',
      message: `New asset created. ID: ${asset.assetId}`
    });
  } catch (error) {
    console.error('Asset creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/assets/:assetId/increment-access
 * Increment access count for an asset
 */
router.post('/:assetId/increment-access', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    const asset = await Asset.findOne({ assetId });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    
    await asset.incrementAccessCount();
    
    res.json({ success: true, asset });
  } catch (error) {
    console.error('Access increment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/assets/:assetId/toggle-favorite
 * Toggle favorite status
 */
router.post('/:assetId/toggle-favorite', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    const asset = await Asset.findOne({ assetId });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    
    await asset.toggleFavorite();
    
    res.json({ success: true, asset });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/assets/:assetId
 * Update asset metadata
 */
router.put('/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const updates = req.body;
    
    const asset = await Asset.findOneAndUpdate(
      { assetId },
      updates,
      { new: true }
    );
    
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    
    res.json({ success: true, asset });
  } catch (error) {
    console.error('Asset update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/assets/:assetId
 * Soft delete an asset (mark as deleted, don't remove from DB)
 */
router.delete('/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const { deleteFile = false } = req.body;
    
    const asset = await Asset.findOne({ assetId });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    
    // Soft delete
    asset.status = 'deleted';
    await asset.save();
    
    // Optional: physically delete if requested
    if (deleteFile && asset.storage.localPath) {
      const filePath = path.join(process.cwd(), 'backend', asset.storage.localPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({ success: true, message: 'Asset deleted' });
  } catch (error) {
    console.error('Asset deletion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/assets/search
 * Search assets by filename, tags, or metadata
 */
router.get('/search', async (req, res) => {
  try {
    const { userId = 'anonymous', query = '', tags = [], page = 1, limit = 20 } = req.query;
    
    const searchQuery = {
      userId,
      status: 'active',
      $or: [
        { filename: { $regex: query, $options: 'i' } },
        { tags: { $in: tags } }
      ]
    };
    
    const skip = (page - 1) * limit;
    const [assets, total] = await Promise.all([
      Asset.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Asset.countDocuments(searchQuery)
    ]);
    
    res.json({
      success: true,
      assets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/assets/cleanup-expired
 * Admin endpoint to clean up expired temporary files
 */
router.post('/cleanup-expired', async (req, res) => {
  try {
    const now = new Date();
    
    // Find expired temporary assets
    const expiredAssets = await Asset.find({
      isTemporary: true,
      expiresAt: { $lt: now }
    });
    
    let deletedCount = 0;
    
    for (const asset of expiredAssets) {
      // Delete physical file if exists
      if (asset.storage.localPath) {
        const filePath = path.join(process.cwd(), 'backend', asset.storage.localPath);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error(`Failed to delete file ${filePath}:`, err);
          }
        }
      }
      
      // Mark as deleted in DB
      asset.status = 'deleted';
      await asset.save();
      deletedCount++;
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired assets`,
      deletedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
