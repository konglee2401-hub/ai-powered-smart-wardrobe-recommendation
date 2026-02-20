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

/**
 * POST /api/videos/generate-prompts
 * Generate video segment prompts from Grok AI
 */
router.post('/generate-prompts', protect, async (req, res) => {
  try {
    const { duration, scenario, segments = 3, style = 'professional' } = req.body;

    if (!duration || !scenario) {
      return res.status(400).json({
        success: false,
        message: 'Duration and scenario are required'
      });
    }

    // Use GrokServiceV2 if available, otherwise simulate prompt generation
    try {
      const GrokServiceV2 = await import('../services/GrokServiceV2.js').then(m => m.GrokServiceV2);
      const grokService = new GrokServiceV2();

      const prompt = `Generate ${segments} detailed video prompts for a ${style} ${scenario}. 
Each prompt should be 1-2 sentences describing the action for a ~${duration / segments}s segment.
Focus on: movement, camera angles, clothing details, facial expressions, background.
Format: Segment 1: [prompt] | Segment 2: [prompt] | Segment 3: [prompt]`;

      const response = await grokService.generateVideoPrompts(prompt);
      
      // Parse the response to extract individual segment prompts
      const segmentPrompts = response
        .split(/Segment \d+:|(?=Segment)/)
        .filter(p => p.trim())
        .map(p => p.replace(/^\s*\|/, '').trim())
        .slice(0, segments);

      res.json({
        success: true,
        data: {
          prompts: segmentPrompts,
          scenario,
          duration,
          segments: segments
        }
      });

    } catch (grokError) {
      // Fallback: Generate basic prompts based on scenario templates
      const scenarioTemplates = {
        'product-intro': [
          'Start with close-up of product details, slowly panning to show full item against clean white background',
          'Model wearing product, walking or posing with confident movement, highlighting fit and fabric',
          'Transition to product showcase, rotating to show all angles with professional lighting'
        ],
        'fashion-show': [
          'Model walking down runway with energetic stride, showcasing outfit movement and drape',
          'Pause and turn to display outfit from multiple angles, showing styling details and accessories',
          'Exit runway with confident walk, camera following to capture full outfit movement'
        ],
        'styling-tips': [
          'Start with full body shot of basic outfit, then zoom to highlight key styling element',
          'Show how to layer or accessorize, demonstrating styling techniques with clear visibility',
          'Final shot of complete styled outfit from front and side, modeling natural movement'
        ],
        'unboxing': [
          'Hands opening package or revealing product with excitement, showing packaging details',
          'Close-up examination of product, handling it carefully with good lighting on details',
          'Final reveal of product in use or displayed, showing quality and craftsmanship'
        ]
      };

      const templates = scenarioTemplates[scenario] || scenarioTemplates['product-intro'];
      const selectedPrompts = templates.slice(0, segments);

      // Pad with additional prompts if needed
      while (selectedPrompts.length < segments) {
        selectedPrompts.push(`Continue showcasing the product with focused camera movement and professional lighting`);
      }

      res.json({
        success: true,
        data: {
          prompts: selectedPrompts,
          scenario,
          duration,
          segments: segments,
          isTemplate: true
        }
      });
    }

  } catch (error) {
    console.error('Prompt generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
