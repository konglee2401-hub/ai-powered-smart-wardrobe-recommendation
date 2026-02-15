import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/auth.js';
import { VideoGenerationOrchestrator } from '../services/videoGenerationOrchestrator.js';
import VideoGeneration from '../models/VideoGeneration.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

/**
 * POST /api/videos/generate
 * Generate video with multi-stage AI pipeline
 */
router.post(
  '/generate',
  protect,
  upload.fields([
    { name: 'character_image', maxCount: 1 },
    { name: 'reference_media', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.files || !req.files.character_image) {
        return res.status(400).json({
          success: false,
          message: 'Character image is required'
        });
      }

      if (!req.body.prompt) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required'
        });
      }

      const orchestrator = new VideoGenerationOrchestrator();

      const referenceFile = req.files.reference_media?.[0];
      const referenceMediaType = referenceFile?.mimetype.startsWith('video/') ? 'video' : 'image';

      const result = await orchestrator.generateVideo({
        userId: req.user._id,
        characterImagePath: req.files.character_image[0].path,
        referenceMediaPath: referenceFile?.path,
        referenceMediaType: referenceMediaType,
        userPrompt: req.body.prompt,
        stylePreferences: req.body.style_preferences ? JSON.parse(req.body.style_preferences) : {},
        targetModel: req.body.model || process.env.VIDEO_MODEL || 'runway'
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Video generation error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/videos/:id/refine
 * Refine existing video based on feedback
 */
router.post('/:id/refine', protect, async (req, res) => {
  try {
    const { feedback } = req.body;
    
    if (!feedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback is required'
      });
    }

    const orchestrator = new VideoGenerationOrchestrator();
    const result = await orchestrator.refineVideo(req.params.id, feedback);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/videos/history
 * Get user's video generation history
 */
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId: req.user._id };
    if (status) query.status = status;

    const videos = await VideoGeneration.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-characterAnalysis -referenceAnalysis -sceneAnalysis -motionDescription -cameraInstructions -lightingAtmosphere -consistencyRules');

    const count = await VideoGeneration.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/videos/:id
 * Get detailed video generation info
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const video = await VideoGeneration.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video generation not found'
      });
    }

    res.json({
      success: true,
      data: video
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/videos/:id/feedback
 * Submit feedback for video
 */
router.post('/:id/feedback', protect, async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    const video = await VideoGeneration.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { userRating: rating, userFeedback: feedback },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video generation not found'
      });
    }

    res.json({
      success: true,
      data: video
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
