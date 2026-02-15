import express from 'express';
import GeneratedImage from '../models/GeneratedImage.js';
import GeneratedVideo from '../models/GeneratedVideo.js';

const router = express.Router();

// ==================== GET IMAGE HISTORY ====================

router.get('/images', async (req, res) => {
  try {
    const {
      userId = 'anonymous',
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isFavorite,
      tags
    } = req.query;

    const filters = {};

    if (isFavorite !== undefined) {
      filters.isFavorite = isFavorite === 'true';
    }

    if (tags) {
      filters.tags = { $in: tags.split(',') };
    }

    const result = await GeneratedImage.getUserHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      filters
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching image history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch image history',
      error: error.message
    });
  }
});

// ==================== GET SESSION IMAGES ====================

router.get('/images/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const images = await GeneratedImage.getSessionImages(sessionId);

    res.json({
      success: true,
      data: {
        images,
        total: images.length
      }
    });

  } catch (error) {
    console.error('Error fetching session images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session images',
      error: error.message
    });
  }
});

// ==================== SAVE IMAGE ====================

router.post('/images', async (req, res) => {
  try {
    const imageData = req.body;

    // Validate required fields
    if (!imageData.sessionId || !imageData.imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'sessionId and imageUrl are required'
      });
    }

    const image = await GeneratedImage.create(imageData);

    res.status(201).json({
      success: true,
      data: image
    });

  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save image',
      error: error.message
    });
  }
});

// ==================== UPDATE IMAGE ====================

router.patch('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const image = await GeneratedImage.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    res.json({
      success: true,
      data: image
    });

  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update image',
      error: error.message
    });
  }
});

// ==================== DELETE IMAGE ====================

router.delete('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const image = await GeneratedImage.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

// ==================== GET VIDEO HISTORY ====================

router.get('/videos', async (req, res) => {
  try {
    const {
      userId = 'anonymous',
      page = 1,
      limit = 20,
      status
    } = req.query;

    const result = await GeneratedVideo.getUserVideos(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching video history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video history',
      error: error.message
    });
  }
});

// ==================== SAVE VIDEO ====================

router.post('/videos', async (req, res) => {
  try {
    const videoData = req.body;

    const video = await GeneratedVideo.create(videoData);

    res.status(201).json({
      success: true,
      data: video
    });

  } catch (error) {
    console.error('Error saving video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save video',
      error: error.message
    });
  }
});

export default router;