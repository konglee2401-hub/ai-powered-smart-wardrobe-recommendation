import GenerationFlow from '../models/GenerationFlow.js';
import { getFileUrl, saveGeneratedImage, saveVideo } from '../utils/uploadConfig.js';
import imageGenService, { analyzeImagesForPrompt } from '../services/imageGenService.js';
import { generateVideo as generateVideoWithProvider } from '../services/videoOrchestrator.js';
import promptBuilder from '../services/promptBuilder.js';
import { buildVideoPrompt } from '../services/videoPromptEngineer.js';

/**
 * Step 1: Create new flow with uploaded images
 */
export const createFlow = async (req, res) => {
  try {
    // For testing without auth, use a placeholder anonymous user ID
    const userId = req.user?.id || '000000000000000000000000';
    
    if (!req.files || !req.files.character_image || !req.files.product_image) {
      return res.status(400).json({
        success: false,
        message: 'Both character and product images are required'
      });
    }
    
    const characterFile = req.files.character_image[0];
    const productFile = req.files.product_image[0];
    
    const flow = await GenerationFlow.create({
      userId,
      characterImage: {
        path: characterFile.path,
        url: getFileUrl(characterFile.path),
        originalName: characterFile.originalname,
        size: characterFile.size
      },
      productImage: {
        path: productFile.path,
        url: getFileUrl(productFile.path),
        originalName: productFile.originalname,
        size: productFile.size
      },
      overallStatus: 'draft'
    });
    
    res.json({
      success: true,
      data: {
        flowId: flow._id.toString(),
        characterImage: flow.characterImage,
        productImage: flow.productImage
      }
    });
    
  } catch (error) {
    console.error('Create flow error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Step 2: Generate images from character + product (with style options)
 * UPDATED with better logging and validation
 */
export const generateImages = async (req, res) => {
  try {
    const flowId = req.params.flowId;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📸 GENERATE IMAGES FOR FLOW: ${flowId}`);
    console.log('='.repeat(80));
    
    // Get flow from database
    const flow = await GenerationFlow.findById(flowId);
    if (!flow) {
      console.error('❌ Flow not found:', flowId);
      return res.status(404).json({ 
        success: false, 
        message: 'Flow not found' 
      });
    }

    console.log('✅ Flow found');
    console.log('   Status:', flow.overallStatus || flow.status);
    console.log('   Character image:', flow.characterImage?.originalName || flow.characterImage?.filename);
    console.log('   Product image:', flow.productImage?.originalName || flow.productImage?.filename);

    // Extract image paths - support both old and new structure
    const characterImagePath = flow.characterImage?.path;
    const productImagePath = flow.productImage?.path;

    // Validate paths
    if (!characterImagePath || !productImagePath) {
      console.error('❌ Missing image paths!');
      console.error('   characterImagePath:', characterImagePath);
      console.error('   productImagePath:', productImagePath);
      console.error('   Flow characterImage:', JSON.stringify(flow.characterImage, null, 2));
      console.error('   Flow productImage:', JSON.stringify(flow.productImage, null, 2));
      
      return res.status(400).json({
        success: false,
        message: 'Character or product image path not found in flow. Please upload images first.',
        debug: {
          hasCharacterImage: !!flow.characterImage,
          hasProductImage: !!flow.productImage,
          characterImagePath: characterImagePath,
          productImagePath: productImagePath
        }
      });
    }

    console.log('✅ Image paths validated');
    console.log('   Character path:', characterImagePath);
    console.log('   Product path:', productImagePath);

    // ✅ FIX: Parse all parameters properly
    const imageCount = parseInt(req.body.imageCount) || 4;
    const useGoogleLabs = req.body.useGoogleLabs === 'true' || req.body.useGoogleLabs === true;
    const selectedModel = req.body.selectedModel || 'hf-flux-schnell';
    
    // ✅ Get prompt from frontend (built by frontend), fallback to flow.prompt
    const prompt = req.body.prompt || flow.prompt || 'A young Vietnamese woman wearing elegant fashion';
    const negativePrompt = req.body.negativePrompt || '';
    
    console.log('📋 Request body keys:', Object.keys(req.body));
    console.log('📋 Parsed imageCount:', imageCount, '(type:', typeof imageCount, ')');
    console.log('📋 Selected model:', selectedModel);
    console.log('\n📝 FULL PROMPT FROM FRONTEND:');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80));
    if (negativePrompt) {
      console.log('\n🚫 NEGATIVE PROMPT:');
      console.log('='.repeat(80));
      console.log(negativePrompt);
      console.log('='.repeat(80));
    }
    console.log('📏 Prompt length:', prompt.length, 'characters');
    console.log('📏 Negative prompt length:', negativePrompt.length, 'characters');
    
    const styleOptions = {
      characterStyle: flow.styleOptions?.characterStyle || req.body.characterStyle || 'realistic',
      productStyle: flow.styleOptions?.productStyle || req.body.productStyle || 'elegant',
      setting: flow.styleOptions?.setting || req.body.setting || 'studio',
      lighting: flow.styleOptions?.lighting || req.body.lighting || 'natural',
      cameraAngle: flow.styleOptions?.cameraAngle || req.body.cameraAngle || 'eye-level',
      mood: flow.styleOptions?.mood || req.body.mood || 'confident',
      colorPalette: flow.styleOptions?.colorPalette || req.body.colorPalette || 'warm'
    };

    console.log('📋 Generation options:');
    console.log('   Image count:', imageCount);
    console.log('   Use Google Labs:', useGoogleLabs);
    console.log('   Style options:', JSON.stringify(styleOptions, null, 2));
    console.log('   Prompt length:', flow.prompt?.length || 0);
    
    // Get AI analysis from flow (support multiple paths)
    const aiAnalysis = flow.aiAnalysis || flow.imageGeneration?.aiAnalysis || null;
    console.log('   Has AI analysis:', !!aiAnalysis);

    // Generate images
    console.log('\n🎨 Starting image generation...');
    
    // ✅ FIX: Pass negativePrompt and selectedModel correctly
    const results = await imageGenService.generateMultipleImages({
      characterImagePath: characterImagePath,
      productImagePath: productImagePath,
      prompt: prompt,
      negativePrompt: negativePrompt,
      count: imageCount,
      useGoogleLabs: useGoogleLabs,
      selectedModel: selectedModel,
      styleOptions: styleOptions,
      aiAnalysis: aiAnalysis
    });

    console.log(`✅ Generated ${results.length} images`);
    console.log(`   Expected: ${imageCount}, Got: ${results.length}`);

    // Save results to flow
    flow.generatedImages = results.map((img, index) => ({
      url: img.url || `/uploads/generated/image_${Date.now()}_${index}.png`,
      seed: img.seed,
      format: img.format || 'png',
      provider: img.provider || 'unknown',
      model: img.model || selectedModel,
      generatedAt: new Date()
    }));
    
    // ✅ Save prompt and negativePrompt to flow
    flow.prompt = prompt;
    flow.negativePrompt = negativePrompt;
    flow.selectedModel = selectedModel;
    
    flow.status = 'images_generated';
    flow.updatedAt = new Date();
    
    await flow.save();

    console.log('✅ Flow updated with generated images');
    console.log('   Saved prompt length:', prompt.length);
    console.log('   Saved negativePrompt length:', negativePrompt.length);
    console.log('   Saved selectedModel:', selectedModel);
    console.log('='.repeat(80) + '\n');

    res.json({
      success: true,
      data: {
        images: flow.generatedImages,
        count: results.length,
        requested: imageCount,
        message: `Generated ${results.length} images successfully`
      }
    });

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ GENERATE IMAGES ERROR');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(80) + '\n');
    
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Step 3: Select image and generate video (with video options)
 */
export const generateVideo = async (req, res) => {
  try {
    const { flowId } = req.params;
    const { 
      selectedImageIndex, 
      videoPrompt, 
      videoModel,
      // Video options
      cameraMovement,
      motionStyle,
      videoStyle,
      duration,
      aspectRatio
    } = req.body;
    
    const flow = await GenerationFlow.findById(flowId);
    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }
    
    if (!flow.generatedImages || flow.generatedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No generated images available. Please generate images first.'
      });
    }
    
    const selectedIndex = selectedImageIndex || flow.imageGeneration.selectedImageIndex || 0;
    const selectedImage = flow.generatedImages[selectedIndex];
    if (!selectedImage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image selection'
      });
    }
    
    flow.imageGeneration.selectedImageIndex = selectedIndex;
    flow.videoGeneration.status = 'analyzing';
    flow.videoGeneration.startedAt = new Date();
    flow.videoGeneration.inputImage = selectedImage;
    flow.videoGeneration.userPrompt = videoPrompt;
    flow.videoGeneration.videoModel = videoModel || process.env.VIDEO_MODEL || 'runway';
    
    // Store video options
    flow.videoGeneration.options = {
      cameraMovement: cameraMovement || 'static',
      motionStyle: motionStyle || 'moderate',
      videoStyle: videoStyle || 'realistic',
      duration: duration || 5,
      aspectRatio: aspectRatio || '16:9'
    };
    
    flow.overallStatus = 'video-generating';
    await flow.save();
    
    const userId = req.user?.id || '';
    req.io?.to(userId).emit('flow-progress', {
      flowId: flow._id,
      step: 'video-generation',
      status: 'analyzing',
      progress: 10
    });
    
    try {
      // Build enhanced video prompt
      console.log('✍️ Building video prompt...');
      const finalVideoPrompt = await buildVideoPrompt({
        basePrompt: videoPrompt || 'Create a smooth video from this image',
        imageAnalysis: flow.imageGeneration.imagePrompt,
        options: flow.videoGeneration.options
      });
      
      flow.videoGeneration.finalPrompt = finalVideoPrompt;
      await flow.save();
      
      req.io?.to(userId).emit('flow-progress', {
        flowId: flow._id,
        step: 'video-generation',
        status: 'prompting',
        progress: 20,
        message: 'Prompt built, starting video generation...'
      });
      
      // Generate video using multi-provider orchestrator
      const videoResult = await generateVideoWithProvider({
        imagePath: selectedImage.path,
        prompt: finalVideoPrompt,
        model: videoModel || 'auto', // 'auto' tries all providers in priority order
        options: flow.videoGeneration.options
      });
      
      // Update flow with results
      flow.videoGeneration.videoUrl = videoResult.url;
      flow.videoGeneration.videoPath = videoResult.path;
      flow.videoGeneration.provider = videoResult.provider;
      flow.videoGeneration.status = 'completed';
      flow.videoGeneration.completedAt = new Date();
      flow.videoGeneration.duration = (flow.videoGeneration.completedAt - flow.videoGeneration.startedAt) / 1000;
      flow.overallStatus = 'completed';
      
      flow.metadata.totalDuration = flow.totalProcessingTime;
      
      await flow.save();
      
      req.io?.to(userId).emit('flow-progress', {
        flowId: flow._id,
        step: 'video-generation',
        status: 'completed',
        progress: 100,
        message: 'Video generated successfully!'
      });
      
      res.json({
        success: true,
        data: {
          flowId: flow._id,
          video: {
            url: videoResult.url,
            path: videoResult.path,
            provider: videoResult.provider
          },
          finalPrompt: finalVideoPrompt,
          options: flow.videoGeneration.options,
          duration: flow.videoGeneration.duration
        }
      });
      
    } catch (error) {
      flow.videoGeneration.status = 'failed';
      flow.videoGeneration.error = error.message;
      flow.overallStatus = 'failed';
      await flow.save();
      
      throw error;
    }
    
  } catch (error) {
    console.error('Generate video error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Build video prompt preview (without generating)
 */
export const buildVideoPromptPreview = async (req, res) => {
  try {
    const { flowId } = req.params;
    const {
      videoPrompt,
      cameraMovement,
      motionStyle,
      videoStyle,
      duration,
      aspectRatio
    } = req.body;
    
    const flow = await GenerationFlow.findById(flowId);
    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }
    
    // Build video prompt options
    const videoOptions = {
      cameraMovement: cameraMovement || 'static',
      motionStyle: motionStyle || 'moderate',
      videoStyle: videoStyle || 'realistic',
      duration: duration || 5,
      aspectRatio: aspectRatio || '16:9'
    };
    
    // Build enhanced prompt
    const finalVideoPrompt = await buildVideoPrompt({
      basePrompt: videoPrompt || 'Create a smooth video from this image',
      imageAnalysis: flow.imageGeneration.imagePrompt,
      options: videoOptions
    });
    
    res.json({
      success: true,
      data: {
        prompt: finalVideoPrompt,
        options: videoOptions
      }
    });
    
  } catch (error) {
    console.error('Build video prompt error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get flow details
 */
export const getFlow = async (req, res) => {
  try {
    const { flowId } = req.params;
    
    const flow = await GenerationFlow.findById(flowId);
    
    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }
    
    res.json({
      success: true,
      data: flow
    });
    
  } catch (error) {
    console.error('Get flow error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user's flow history
 */
export const getFlowHistory = async (req, res) => {
  try {
    const { page = 1, limit = 12, status } = req.query;
    
    const query = { userId: req.user?.id };
    if (status) query.overallStatus = status;
    
    const flows = await GenerationFlow.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-imageGeneration.characterAnalysis -imageGeneration.productAnalysis -videoGeneration.characterAnalysis -videoGeneration.sceneAnalysis');
    
    const count = await GenerationFlow.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        flows,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Submit feedback for flow
 */
export const submitFeedback = async (req, res) => {
  try {
    const { flowId } = req.params;
    const { imageRating, videoRating, comments, tags } = req.body;
    
    const flow = await GenerationFlow.findOneAndUpdate(
      { _id: flowId },
      {
        'feedback.imageRating': imageRating,
        'feedback.videoRating': videoRating,
        'feedback.comments': comments,
        'feedback.tags': tags
      },
      { new: true }
    );
    
    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }
    
    res.json({
      success: true,
      data: flow.feedback
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete flow
 */
export const deleteFlow = async (req, res) => {
  try {
    const { flowId } = req.params;
    
    const flow = await GenerationFlow.findOneAndDelete({
      _id: flowId
    });
    
    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Flow deleted successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Analyze images with AI (Gemini Vision)
 * Enhanced with USE CASE context for better results
 */
export const analyzeImages = async (req, res) => {
  try {
    const { flowId } = req.params;
    const {
      useCase = 'ecommerce',
      outfitComponents = 'full',
      targetAudience = 'general',
      contentGoal = 'sales'
    } = req.body;
    
    console.log(`🔍 Analyzing images for flow: ${flowId}`);
    console.log(`📋 Use Case: ${useCase}`);
    console.log(`👗 Outfit Components: ${outfitComponents}`);
    console.log(`🎯 Target Audience: ${targetAudience}`);
    console.log(`📈 Content Goal: ${contentGoal}`);
    
    // Find flow by ID only (no userId filter for testing)
    const flow = await GenerationFlow.findById(flowId);
    
    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }
    
    // Update status
    flow.imageGeneration.status = 'analyzing';
    await flow.save();
    
    // Parse outfit components
    const components = typeof outfitComponents === 'string' 
      ? outfitComponents.split(',').map(c => c.trim())
      : outfitComponents;
    
    // ✅ SAVE USE CASE PARAMS TO FLOW
    flow.useCase = useCase;
    flow.outfitComponents = components;
    flow.targetAudience = targetAudience;
    flow.contentGoal = contentGoal;
    
    // Analyze images with AI (FIXED: use named export)
    const analysis = await analyzeImagesForPrompt(
      flow.characterImage.path,
      flow.productImage.path,
      {
        useCase,
        outfitComponents: components,
        targetAudience,
        contentGoal
      }
    );
    
    // Save analysis to flow
    flow.imageGeneration.aiAnalysis = analysis;
    flow.imageGeneration.status = 'pending';
    flow.status = 'analyzed';
    await flow.save();
    
    console.log(`✅ Images analyzed for flow ${flowId}`);
    
    res.json({
      success: true,
      data: {
        analysis: analysis,
        message: 'Images analyzed successfully'
      }
    });
    
  } catch (error) {
    console.error('❌ Analyze images error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Build image prompt preview (without generating)
 */
export const buildImagePromptPreview = async (req, res) => {
  try {
    const { flowId } = req.params;
    const {
      customPrompt,
      characterStyle,
      productStyle,
      setting,
      lighting,
      cameraAngle,
      mood,
      colorPalette
    } = req.body;
    
    console.log(`📝 Building image prompt for flow: ${flowId}`);
    
    // Use findById to avoid ObjectId cast error with 'anonymous' string
    const flow = await GenerationFlow.findById(flowId);
    
    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }
    
    // Build style options
    const styleOptions = {
      characterStyle: characterStyle || 'realistic',
      productStyle: productStyle || 'elegant',
      setting: setting || 'studio',
      lighting: lighting || 'natural',
      cameraAngle: cameraAngle || 'eye-level',
      mood: mood || 'confident',
      colorPalette: colorPalette || 'vibrant'
    };
    
    // Get AI analysis if available
    const aiAnalysis = flow.imageGeneration.aiAnalysis || null;
    
    // Build base prompt
    const basePrompt = customPrompt || 'A professional fashion photo showcasing the outfit';
    
    // Build enhanced prompt
    const enhancedPrompt = imageGenService.buildEnhancedPrompt(basePrompt, styleOptions, aiAnalysis);
    
    // Get highlights for UI
    const highlights = imageGenService.getStyleHighlights(styleOptions, aiAnalysis);
    
    console.log(`✅ Prompt built for flow ${flowId}`);
    
    res.json({
      success: true,
      data: {
        prompt: enhancedPrompt,
        highlights: highlights,
        styleOptions: styleOptions
      }
    });
    
  } catch (error) {
    console.error('❌ Build prompt error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ========== HELPER FUNCTIONS ==========

async function analyzeCharacterImage(imagePath) {
  const { analyzeImage } = await import('../services/visionService.js');
  return await analyzeImage(imagePath, 'character');
}

async function analyzeProductImage(imagePath) {
  const { analyzeImage } = await import('../services/visionService.js');
  return await analyzeImage(imagePath, 'product');
}

async function buildImagePrompt(characterAnalysis, productAnalysis, stylePreferences, customPrompt) {
  return await promptBuilder.buildImagePrompt({
    characterAnalysis,
    productAnalysis,
    stylePreferences,
    customPrompt
  });
}

async function generateMultipleImages(characterImagePath, productImagePath, prompt, count = 4) {
  return await imageGenService.generateMultipleImages(
    characterImagePath,
    productImagePath,
    prompt,
    count
  );
}
