import express from 'express';
import Asset from '../models/Asset.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/assets/gallery
 * Get all assets for gallery (with filtering and pagination)
 */
router.get('/gallery', async (req, res) => {
  try {
    const { userId = 'anonymous', assetType = 'all', category = 'all', page = 1, limit = 20 } = req.query;
    
    const query = { userId, status: 'active' };
    if (assetType !== 'all') query.assetType = assetType;
    if (category !== 'all') query.assetCategory = category;
    
    const skip = (page - 1) * limit;
    const [assets, total] = await Promise.all([
      Asset.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Asset.countDocuments(query)
    ]);
    
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
 * Create a new asset record (for uploaded or generated files)
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
      generation = null
    } = req.body;
    
    if (!filename || !assetType || !assetCategory || !storage) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Generate unique assetId
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
      generation
    });
    
    await asset.save();
    
    res.json({
      success: true,
      asset
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
