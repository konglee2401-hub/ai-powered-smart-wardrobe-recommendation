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
 * 💫 UPDATED: Supports multiple scenario-specific images
 */
router.post(
  '/generate',
  protect,
  upload.fields([
    { name: 'character_wearing_outfit', maxCount: 1 },      // 💫 NEW: Required - Character in outfit
    { name: 'character_holding_product', maxCount: 1 },     // 💫 NEW: Optional - Character holding/presenting product
    { name: 'product_reference', maxCount: 1 },              // 💫 NEW: Optional - Product close-up reference
    { name: 'reference_media', maxCount: 1 }                 // Keep for backward compatibility
  ]),
  async (req, res) => {
    try {
      // 💫 UPDATED: Check for character_wearing_outfit (new naming) OR character_image (old naming)
      const characterImage = req.files?.character_wearing_outfit?.[0] || req.files?.character_image?.[0];
      
      if (!req.files || !characterImage) {
        return res.status(400).json({
          success: false,
          message: 'Character wearing outfit image is required'
        });
      }

      if (!req.body.prompt) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required'
        });
      }

      const orchestrator = new VideoGenerationOrchestrator();

      // 💫 NEW: Handle multiple optional images
      const characterHoldingFile = req.files?.character_holding_product?.[0];
      const productReferenceFile = req.files?.product_reference?.[0];
      const referenceMediaFile = req.files?.reference_media?.[0];

      // Determine reference media type
      const referenceFile = referenceMediaFile || productReferenceFile;
      const referenceMediaType = referenceFile?.mimetype.startsWith('video/') ? 'video' : 'image';

      // 💫 NEW: Build image paths object for scenario-specific image analysis
      const imagePaths = {
        characterWearingOutfit: characterImage.path,
        characterHoldingProduct: characterHoldingFile?.path || null,
        productReference: productReferenceFile?.path || null
      };

      const result = await orchestrator.generateVideo({
        userId: req.user._id,
        characterImagePath: characterImage.path,  // Keep for backward compatibility
        imagePaths: imagePaths,                    // 💫 NEW: New structured image paths
        referenceMediaPath: referenceFile?.path,
        referenceMediaType: referenceMediaType,
        userPrompt: req.body.prompt,
        scenario: req.body.scenario,               // 💫 NEW: Video scenario for prompt template selection
        productName: req.body.productName,         // 💫 NEW: For detailed product analysis
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
 * POST /api/videos/generate-prompts-chatgpt
 * Generate video segment prompts using ChatGPT browser service
 * This is the main endpoint for video prompt enhancement using ChatGPT
 */
router.post('/generate-prompts-chatgpt', protect, async (req, res) => {
  try {
    const { 
      duration, 
      scenario, 
      segments = 3, 
      style = 'professional',
      videoProvider = 'grok',
      useCase = null,
      aspectRatio = '16:9'
    } = req.body;

    if (!duration || !scenario) {
      return res.status(400).json({
        success: false,
        message: 'Duration and scenario are required'
      });
    }

    const maxPerVideo = videoProvider === 'google-flow' ? 6 : 10;
    const segmentDuration = Math.floor(duration / segments);

    try {
      const ChatGPTService = (await import('../services/browser/chatgptService.js')).default;
      const chatgptService = new ChatGPTService({ headless: false });
      
      console.log('\n🤖 Generating video prompts with ChatGPT...');
      await chatgptService.initialize();

      const scenarioDescriptions = {
        'product-intro': 'Product Introduction - showcasing a product with professional presentation',
        'fashion-show': 'Fashion Walk - model walking and posing on runway',
        'styling-tips': 'Styling Tips - demonstrating how to style and wear items',
        'unboxing': 'Unboxing - revealing and examining a product',
        'lip-sync': 'Lip Sync - person speaking or singing to camera',
        'lifestyle': 'Lifestyle - everyday activities in the outfit',
        'transition': 'Clothing Transition - changing between outfits'
      };

      const scenarioDesc = scenarioDescriptions[scenario] || scenario;
      
      const prompt = `You are a professional video script writer. Generate ${segments} detailed video prompts for a ${style} ${scenarioDesc}.

Each segment should be approximately ${segmentDuration} seconds.
For each segment, provide:
1. The main action/movement (what the model does)
2. Camera movement (pan, zoom, static, etc.)
3. Clothing/details to highlight
4. Facial expression or mood
5. Background/setting

Video context:
- Total duration: ${duration}s (${segments} x ~${segmentDuration}s segments)
- Aspect ratio: ${aspectRatio}
- Style: ${style}
- Video will be generated with ${videoProvider === 'google-flow' ? 'Google Flow' : 'Grok'} AI

Format your response as:
SEGMENT 1: [detailed description]
SEGMENT 2: [detailed description]
SEGMENT 3: [detailed description]

Make each description 2-3 sentences, specific and actionable for video generation.`;

      const response = await chatgptService.sendPrompt(prompt);
      const responseText = typeof response === 'string' ? response : response.text || JSON.stringify(response);
      
      const segmentPrompts = responseText
        .split(/(?:SEGMENT|Segment|segment)\s*\d+/i)
        .filter(p => p.trim().length > 10)
        .map(p => p.replace(/^[\d\.\:\-\s]+/, '').trim())
        .slice(0, segments);

      if (segmentPrompts.length === 0) {
        segmentPrompts.push(
          `Professional ${scenarioDesc} with smooth camera movement, model showcasing the outfit confidently`,
          `Continue with dynamic pose and movement, highlighting clothing details and fabric flow`,
          `Final pose with professional finish, capturing the complete look`
        );
      }

      await chatgptService.close();

      res.json({
        success: true,
        data: {
          prompts: segmentPrompts,
          scenario,
          duration,
          segments,
          segmentDuration,
          style,
          videoProvider,
          aspectRatio,
          useCase,
          provider: 'chatgpt-browser'
        },
        message: 'Video prompts generated successfully via ChatGPT'
      });

    } catch (chatgptError) {
      console.error('ChatGPT prompt generation error:', chatgptError.message);
      const templatePrompts = generateTemplatePrompts(scenario, segments, segmentDuration, style);
      
      res.json({
        success: true,
        data: {
          prompts: templatePrompts,
          scenario,
          duration,
          segments,
          segmentDuration,
          style,
          videoProvider,
          aspectRatio,
          isTemplate: true,
          error: chatgptError.message
        },
        message: 'Using template prompts due to ChatGPT error'
      });
    }

  } catch (error) {
    console.error('Video prompt generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Helper function to generate template-based prompts
 */
function generateTemplatePrompts(scenario, segments, segmentDuration, style) {
  const templates = {
    'product-intro': [
      `Start with close-up of product details, slowly panning to show full item against clean white background. ${style} style photography with professional lighting.`,
      `Model wearing product, walking or posing with confident movement, highlighting fit and fabric. Camera follows with smooth tracking shot.`,
      `Transition to product showcase, rotating to show all angles with professional lighting. Final pose with confident smile.`
    ],
    'fashion-show': [
      `Model walking down runway with energetic stride, showcasing outfit movement and drape. Dynamic camera angle from side.`,
      `Pause and turn to display outfit from multiple angles, showing styling details and accessories. Eye contact with camera.`,
      `Exit runway with confident walk, camera following to capture full outfit movement. Final wave to audience.`
    ],
    'styling-tips': [
      `Start with full body shot of basic outfit, then zoom to highlight key styling element. Natural movement in studio setting.`,
      `Show how to layer or accessorize, demonstrating styling techniques with clear visibility. Hands gesture to explain.`,
      `Final shot of complete styled outfit from front and side, modeling natural movement. Confident pose with smile.`
    ],
    'unboxing': [
      `Hands opening package or revealing product with excitement, showing packaging details. Close-up on hands.`,
      `Close-up examination of product, handling it carefully with good lighting on details. Zoom to show texture.`,
      `Final reveal of product in use or displayed, showing quality and craftsmanship. Hold product up to camera.`
    ],
    'lip-sync': [
      `Person speaking or lip syncing with expression, looking directly at camera. Confident delivery with natural gestures.`,
      `Change expression and emotion while speaking, showing versatility. Move slightly to add dynamism.`,
      `Final pose with confident expression, looking at camera with smile. Sign off with friendly wave.`
    ],
    'lifestyle': [
      `Walking casually in everyday setting, natural movement showing outfit in real context. Outdoor or indoor scene.`,
      `Sitting or posing naturally in the outfit, interacting with environment. Relaxed but confident posture.`,
      `Standing confidently showing the complete look from multiple angles. Final pose with smile.`
    ],
    'transition': [
      `Start in initial outfit pose, looking at camera with confident expression. Static shot in studio.`,
      `Transition or gesture showing outfit change, perhaps turning away and back or using prop. Smooth movement.`,
      `Final look reveal in new styling, striking pose to showcase complete new outfit. Confident smile.`
    ]
  };

  const selectedTemplates = templates[scenario] || templates['product-intro'];
  const prompts = selectedTemplates.slice(0, segments);
  
  while (prompts.length < segments) {
    prompts.push(`Continue showcasing the product with focused camera movement and professional ${style} lighting`);
  }
  
  return prompts;
}

/**
 * POST /api/videos/generate-prompts
 * Generate video segment prompts from Grok AI (legacy endpoint)
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

/**
 * POST /api/videos/generate-scenario-prompts
 * 💫 NEW: Generate scenario-specific video prompts with image analysis
 * Accepts up to 3 images and uses scenario-specific ChatGPT templates
 */
router.post(
  '/generate-scenario-prompts',
  protect,
  upload.fields([
    { name: 'character_wearing_outfit', maxCount: 1 },
    { name: 'character_holding_product', maxCount: 1 },
    { name: 'product_reference', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        scenario = 'product-intro',
        duration = 20,
        segments = 3,
        productName = 'product',
        productFeatures = [],
        additionalDetails = ''
      } = req.body;

      // 💫 Validate scenario
      const validScenarios = ['dancing', 'product-intro', 'lifestyle', 'lip-sync', 'fashion-walk', 'transition'];
      if (!validScenarios.includes(scenario)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid scenario. Must be one of: ' + validScenarios.join(', ')
        });
      }

      // 💫 Check required image based on scenario
      const characterWearingFile = req.files?.character_wearing_outfit?.[0];
      if (!characterWearingFile) {
        return res.status(400).json({
          success: false,
          message: 'Character wearing outfit image is required'
        });
      }

      // Import scenario prompt templates
      const { getScenarioPromptTemplate } = await import('../utils/scenarioPromptTemplates.js');

      try {
        const ChatGPTService = (await import('../services/browser/chatgptService.js')).default;
        const chatgptService = new ChatGPTService({ headless: false });

        console.log(`\n🤖 Generating ${scenario} video prompts with scenario-specific template and image analysis...`);
        await chatgptService.initialize();

        // 💫 Generate scenario-specific prompt with image references
        const promptParams = {
          duration: parseInt(duration),
          segments: parseInt(segments),
          characterWearingImage: characterWearingFile?.path,
          characterHoldingImage: req.files?.character_holding_product?.[0]?.path || null,
          productReferenceImage: req.files?.product_reference?.[0]?.path || null,
          productName: productName,
          productFeatures: typeof productFeatures === 'string' ? JSON.parse(productFeatures) : productFeatures,
          additionalDetails: additionalDetails
        };

        const scenarioPrompt = getScenarioPromptTemplate(scenario, promptParams);

        // 💫 Send prompt to ChatGPT
        const response = await chatgptService.sendPrompt(scenarioPrompt);
        const responseText = typeof response === 'string' ? response : (response.text || JSON.stringify(response));

        // 💫 Parse response to extract segments
        const segmentPrompts = parseScenarioResponse(responseText, parseInt(segments));

        await chatgptService.close();

        res.json({
          success: true,
          data: {
            prompts: segmentPrompts,
            scenario,
            duration: parseInt(duration),
            segments: parseInt(segments),
            images: {
              characterWearing: !!characterWearingFile,
              characterHolding: !!req.files?.character_holding_product?.[0],
              productReference: !!req.files?.product_reference?.[0]
            },
            provider: 'chatgpt-browser-with-images'
          },
          message: `${scenario} video prompts generated with image analysis`
        });

      } catch (chatgptError) {
        console.error('ChatGPT analysis error:', chatgptError.message);
        
        // 💫 Fallback to template prompts if ChatGPT fails
        const templatePrompts = generateTemplatePrompts(scenario, parseInt(segments), Math.round(parseInt(duration) / parseInt(segments)), 'professional');

        res.json({
          success: true,
          data: {
            prompts: templatePrompts,
            scenario,
            duration: parseInt(duration),
            segments: parseInt(segments),
            images: {
              characterWearing: !!characterWearingFile,
              characterHolding: !!req.files?.character_holding_product?.[0],
              productReference: !!req.files?.product_reference?.[0]
            },
            isTemplate: true,
            error: chatgptError.message
          },
          message: 'Using template prompts (ChatGPT analysis unavailable)'
        });
      }

    } catch (error) {
      console.error('Scenario prompt generation error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * Helper: Parse ChatGPT response for scenario prompts
 */
function parseScenarioResponse(responseText, expectedSegments) {
  // Try to extract segments between markers
  let segments = [];

  // Try to split by "Segment X:" pattern
  const segmentMatches = responseText.match(/Segment\s*\d+[\s\:]*([^\n]*(?:\n(?!Segment\s*\d+)[^\n]*)*)/gi);
  
  if (segmentMatches && segmentMatches.length > 0) {
    segments = segmentMatches.map(match => 
      match.replace(/^Segment\s*\d+[\s\:]*/i, '').trim()
    );
  }

  // If no segments found, try to split by double newlines
  if (segments.length === 0) {
    const parts = responseText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 10);
    
    segments = parts.slice(0, expectedSegments);
  }

  // Pad with default prompts if needed
  while (segments.length < expectedSegments) {
    segments.push(`Detailed segment ${segments.length + 1} with focused camera work and professional presentation`);
  }

  return segments.slice(0, expectedSegments);
}

export default router;
