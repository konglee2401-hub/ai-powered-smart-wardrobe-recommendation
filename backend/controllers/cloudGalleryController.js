/**
 * Cloud Gallery Controller
 * Handles gallery endpoints for Google Drive integration
 */

import fs from 'fs';
import CloudMediaManager from '../services/cloudMediaManager.js';

const mediaManager = new CloudMediaManager();

const cloudGalleryController = {};

cloudGalleryController.initializeGallery = async (req, res) => {
  try {
    await mediaManager.initialize();

    res.json({
      success: true,
      message: 'Gallery initialized successfully',
      folderStructure: mediaManager.drive.folderStructure,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.getMediaLibrary = async (req, res) => {
  try {
    const overview = await mediaManager.getMediaOverview();

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.getMediaByType = async (req, res) => {
  try {
    const { type } = req.params;

    const media = await mediaManager.getMediaByType(type);

    res.json({
      success: true,
      type,
      count: media.length,
      data: media,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    const { type, tags } = req.body;

    const result = await mediaManager.uploadMedia(req.file.path, type, {
      tags: tags ? tags.split(',') : [],
      uploadedBy: req.user?.id || 'unknown',
      uploadedAt: new Date(),
    });

    // Delete local file after upload
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.downloadMedia = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { outputDir } = req.body;

    const result = await mediaManager.downloadMedia(
      fileId,
      outputDir || './downloads'
    );

    res.json({
      success: true,
      message: 'Media downloaded successfully',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.getMediaPreview = async (req, res) => {
  try {
    const { fileId } = req.params;

    const preview = await mediaManager.getMediaPreview(fileId);

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.searchMedia = async (req, res) => {
  try {
    const { query, type = 'all' } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const results = await mediaManager.searchMedia(query, type);

    res.json({
      success: true,
      query,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.getGalleryUrls = async (req, res) => {
  try {
    const urls = await mediaManager.generateGalleryUrls();

    res.json({
      success: true,
      data: urls,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.organizeByCollection = async (req, res) => {
  try {
    const collections = await mediaManager.organizeMediaByCollection();

    res.json({
      success: true,
      collectionCount: Object.keys(collections).length,
      data: collections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.manageBatchMedia = async (req, res) => {
  try {
    const { batchId, action, mediaIds } = req.body;

    if (!batchId || !action || !mediaIds) {
      return res.status(400).json({
        success: false,
        error: 'batchId, action, and mediaIds are required',
      });
    }

    let result;

    if (action === 'list') {
      result = await mediaManager.manageBatchMedia(batchId, action, []);
    } else {
      result = await mediaManager.manageBatchMedia(
        batchId,
        action,
        mediaIds
      );
    }

    res.json({
      success: true,
      message: `Batch media ${action} completed`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.getCacheStats = (req, res) => {
  try {
    const stats = mediaManager.getCacheStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

cloudGalleryController.clearCache = (req, res) => {
  try {
    mediaManager.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export default cloudGalleryController;
