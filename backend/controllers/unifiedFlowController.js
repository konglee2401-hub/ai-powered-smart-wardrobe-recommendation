/**
 * Unified Flow Controller
 * 
 * MAIN ENDPOINT: POST /api/ai/analyze-unified
 * 
 * Orchestrates the complete Phase 1 pipeline:
 * 1. Unified Analysis (both images together)
 * 2. Smart Prompt Building
 * 3. Smart Provider Selection
 * 4. Image Generation with fallback
 */

import { analyzeUnified } from '../services/unifiedAnalysisService.js';
import { buildDetailedPrompt } from '../services/smartPromptBuilder.js';
import { generateImages as generateImagesWithUnifiedService } from '../services/imageGenService.js'; // Use the new unified service
import { buildImageGenerationPrompt } from '../services/imagePromptBuilder.js'; // Import the new builder
import PromptOption from '../models/PromptOption.js';

// ============================================================
// MAIN UNIFIED ENDPOINT
// ============================================================

export async function analyzeUnifiedEndpoint(req, res) {
  const startTime = Date.now();

  try {
    console.log('\n🎬 UNIFIED FLOW CONTROLLER: Starting unified analysis...');

    // Extract request data
    const {
      useCase = 'change-clothes',
      productFocus = 'full-outfit',
      options = {},
      generateImages = true,
      imageCount = 2,
      imageSize = '1024x1024',
      preferredProvider = null,
      maxBudget = null
    } = req.body;

    // Validate files
    if (!req.files || !req.files.characterImage || !req.files.productImage) {
      return res.status(400).json({
        success: false,
        error: 'Both character and product images are required'
      });
    }

    const characterFile = req.files.characterImage[0];
    const productFile = req.files.productImage[0];

    console.log(`📸 Character: ${characterFile.originalname}`);
    console.log(`👗 Product: ${productFile.originalname}`);
    console.log(`🎯 Use Case: ${useCase}, Focus: ${productFocus}`);

    // ============================================================
    // STEP 1: UNIFIED ANALYSIS
    // ============================================================

    console.log('\n🔍 STEP 1: Unified Analysis...');

    const analysisResult = await analyzeUnified(characterFile.path, productFile.path, {
      useCase,
      productFocus
    });

    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Analysis failed',
        details: analysisResult.error
      });
    }

    const { data: analysis, metadata: analysisMetadata } = analysisResult;

    // ============================================================
    // RESPONSE: Analysis only (Prompt building & generation happen after)
    // ============================================================

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ ANALYSIS COMPLETE in ${duration}s`);

    res.json({
      success: true,
      data: {
        analysis: {
          character: analysis.character,
          product: analysis.product,
          compatibility: analysis.compatibility,
          recommendations: analysis.recommendations,
          pose: analysis.pose,
          stylingNotes: analysis.stylingNotes,
          promptKeywords: analysis.promptKeywords
        },
        metadata: {
          duration: `${duration}s`,
          useCase,
          productFocus,
          analysisDuration: analysisMetadata.duration
        }
      }
    });

  } catch (error) {
    console.error('💥 UNIFIED FLOW ERROR:', error);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    res.status(500).json({
      success: false,
      error: error.message,
      metadata: {
        duration: `${duration}s`,
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Build Prompt from Analysis - Takes analysis data and options, returns prompt
 * Now uses smart, use-case-aware prompt builder
 */
export async function buildPromptEndpoint(req, res) {
  try {
    console.log('\n🎨 BUILD PROMPT: Building smart, use-case-aware prompt from analysis...');

    const { 
      analysis, 
      selectedOptions = {},
      useCase = 'change-clothes',
      productFocus = 'full-outfit'
    } = req.body;

    if (!analysis) {
      return res.status(400).json({
        success: false,
        error: 'Analysis data is required'
      });
    }

    // Use provided options or AI recommendations - Include ALL selected options, not just hardcoded fields
    const finalOptions = {
      // Environment & Photography
      scene: selectedOptions.scene || analysis?.recommendations?.scene?.choice || 'studio',
      lighting: selectedOptions.lighting || analysis?.recommendations?.lighting?.choice || 'soft-diffused',
      mood: selectedOptions.mood || analysis?.recommendations?.mood?.choice || 'elegant',
      style: selectedOptions.style || analysis?.recommendations?.style?.choice || 'fashion-editorial',
      colorPalette: selectedOptions.colorPalette || analysis?.recommendations?.colorPalette?.choice || 'neutral',
      cameraAngle: selectedOptions.cameraAngle || analysis?.recommendations?.cameraAngle?.choice || 'three-quarter',
      
      // Appearance & Styling
      hairstyle: selectedOptions.hairstyle,
      makeup: selectedOptions.makeup,
      
      // Clothing & Accessories (PASS ALL CLOTHING OPTIONS, not hardcode)
      tops: selectedOptions.tops,
      bottoms: selectedOptions.bottoms,
      shoes: selectedOptions.shoes,
      accessories: selectedOptions.accessories,
      outerwear: selectedOptions.outerwear,
      
      // 💫 NEW: Include all remaining selected options
      ...Object.keys(selectedOptions).reduce((acc, key) => {
        if (!['scene', 'lighting', 'mood', 'style', 'colorPalette', 'cameraAngle', 'hairstyle', 'makeup', 'tops', 'bottoms', 'shoes', 'accessories', 'outerwear'].includes(key)) {
          acc[key] = selectedOptions[key];
        }
        return acc;
      }, {})
    };

    console.log(`🎯 UseCase: ${useCase}, ProductFocus: ${productFocus}`);

    // 🔍 LOG: Show all selected options being used
    console.log(`\n📊 OPTIONS SELECTED FOR GENERATION:`);
    const optionEntries = Object.entries(finalOptions).filter(([_, val]) => val != null);
    if (optionEntries.length > 0) {
      optionEntries.forEach(([key, value]) => {
        if (value) console.log(`   • ${key}: ${value}`);
      });
    } else {
      console.log(`   (No options selected, using defaults)`);
    }
    console.log('');

    // Build smart prompt with use-case awareness
    const promptResult = await buildDetailedPrompt(
      analysis, 
      finalOptions,
      useCase,
      productFocus
    );

    // Track option usage
    await trackOptionUsage(finalOptions);

    console.log(`✅ Prompt built (${useCase} mode):\n${promptResult.prompt.substring(0, 150)}...\n`);

    res.json({
      success: true,
      data: {
        prompt: {
          positive: promptResult.prompt,
          negative: promptResult.negativePrompt
        },
        selectedOptions: finalOptions,
        useCase,
        productFocus
      }
    });
  } catch (error) {
    console.error('💥 BUILD PROMPT ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ============================================================
// GENERATE UNIFIED ENDPOINT (for image generation only)
// ============================================================

export async function generateUnifiedEndpoint(req, res) {
  const startTime = Date.now();

  try {
    console.log('\n🎬 GENERATE UNIFIED ENDPOINT: Starting image generation...');

    // Extract request data
    const {
      prompt,
      negativePrompt = '',
      options = {},
      imageCount = 2,
      imageSize = '1024x1024',
      preferredProvider = null,
      maxBudget = null,
      imageProvider = null  // NEW: Support explicit image provider selection
    } = req.body;

    // Validate prompt
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`🎨 Negative: ${negativePrompt || 'none'}`);
    console.log(`🖼️  Image count: ${imageCount}`);
    if (imageProvider) {
      console.log(`🎯 Image Provider: ${imageProvider}`);
    }

    // ============================================================
    // IMAGE GENERATION
    // ============================================================

    console.log('\n🎨 Generating images...');

    let generatedImages = [];
    let generationMetadata = {};

    // Handle Google Flow image generation
    if (imageProvider === 'google-flow') {
      console.log('🌐 Using Google Flow for image generation\n');
      
      let googleFlowService = null;
      try {
        const GoogleFlowService = (await import('../services/browser/googleFlowService.js')).default;
        googleFlowService = new GoogleFlowService({ headless: false });
        
        await googleFlowService.initialize();
        
        const generatedUrls = [];
        
        // Generate requested number of images
        for (let i = 0; i < imageCount; i++) {
          try {
            console.log(`\n📸 Generating image ${i + 1}/${imageCount}...`);
            const result = await googleFlowService.generateImage(prompt, {
              index: i + 1,
              total: imageCount,
              download: true  // 💫 Enable automatic download
            });
            
            if (result && result.url) {
              generatedUrls.push({
                url: result.url,
                path: result.path,  // 💫 Store local file path for video generation
                provider: 'Google Flow',
                model: 'Nano Banana'
              });
              console.log(`✅ Image ${i + 1} generated successfully`);
              if (result.path) {
                console.log(`💾 Saved to: ${result.path}`);
              }
            }
          } catch (err) {
            console.error(`❌ Failed to generate image ${i + 1}: ${err.message}`);
          }
        }
        
        // ✅ Close browser after all images are downloaded
        if (googleFlowService) {
          console.log('\n🔒 Closing browser automation...');
          try {
            await googleFlowService.close();
            console.log('✅ Browser closed');
          } catch (closeErr) {
            console.warn(`⚠️  Browser close error: ${closeErr.message}`);
          }
        }
        
        generatedImages = generatedUrls;
        generationMetadata = {
          total: imageCount,
          successful: generatedUrls.length,
          failed: imageCount - generatedUrls.length,
          providers: ['Google Flow'],
          errors: []
        };
        
        console.log(`\n✅ Google Flow generated ${generatedUrls.length}/${imageCount} images`);
      } catch (googleFlowError) {
        console.error('❌ Google Flow image generation failed:', googleFlowError.message);
        
        // 🔒 Close browser even if there's an error
        if (googleFlowService) {
          try {
            await googleFlowService.close();
          } catch (e) {
            // ignore close errors during error handling
          }
        }
        
        generationMetadata = {
          total: imageCount,
          successful: 0,
          failed: imageCount,
          providers: [],
          errors: [{ provider: 'Google Flow', error: googleFlowError.message }]
        };
      }
    } else {
      // Use standard unified service for other providers
      const generationResult = await generateImagesWithUnifiedService(
        prompt,
        negativePrompt,
        'auto', // modelPreference
        imageCount
      );

      generatedImages = generationResult.results || [];
      generationMetadata = {
        total: generationResult.summary?.total || 0,
        successful: generationResult.summary?.successful || 0,
        failed: generationResult.summary?.failed || 0,
        providers: generationResult.summary?.providers || [],
        errors: generationResult.errors || []
      };

      console.log(`   ✅ Generated ${generatedImages.length}/${imageCount} images`);
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const response = {
      success: true,
      data: {
        generatedImages: generatedImages.map(img => ({
          url: img.url,
          path: img.path,  // 💫 Include local file path for post-processing
          provider: img.provider,
          model: img.model,
          timestamp: img.timestamp
        })),
        metadata: {
          duration: `${duration}s`,
          imageCount: generatedImages.length,
          promptLength: prompt.length,
          ...generationMetadata
        }
      }
    };

    console.log(`\n✅ IMAGE GENERATION COMPLETE in ${duration}s`);
    console.log(`   📊 Images: ${generatedImages.length}/${imageCount}`);

    res.json(response);

  } catch (error) {
    console.error('💥 GENERATE UNIFIED ERROR:', error);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    res.status(500).json({
      success: false,
      error: error.message,
      metadata: {
        duration: `${duration}s`,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Track usage of selected options
 */
async function trackOptionUsage(selectedOptions) {
  try {
    const optionValues = Object.values(selectedOptions).filter(Boolean);
    if (optionValues.length > 0) {
      await PromptOption.bulkIncrementUsage(optionValues);
    }
  } catch (error) {
    console.warn('Could not track option usage:', error.message);
  }
}

// ============================================================
// LEGACY ENDPOINTS (for backward compatibility)
// ============================================================

/**
 * Legacy endpoint - redirects to unified
 */
export async function analyzeCharacterEndpoint(req, res) {
  console.log('⚠️  LEGACY: analyzeCharacter called, consider using /api/ai/analyze-unified');

  // You can implement a simplified version or redirect
  return res.status(410).json({
    success: false,
    error: 'This endpoint is deprecated. Use POST /api/ai/analyze-unified instead.',
    migration: 'Send both character and product images to the new unified endpoint.'
  });
}

/**
 * Legacy endpoint - redirects to unified
 */
export async function analyzeProductEndpoint(req, res) {
  console.log('⚠️  LEGACY: analyzeProduct called, consider using /api/ai/analyze-unified');

  return res.status(410).json({
    success: false,
    error: 'This endpoint is deprecated. Use POST /api/ai/analyze-unified instead.',
    migration: 'Send both character and product images to the new unified endpoint.'
  });
}

// ============================================================
// MONITORING ENDPOINTS
// ============================================================

/**
 * Get provider and key status
 */
export async function getProviderStatus(req, res) {
  try {
    const { getKeyManager } = await import('../utils/keyManager.js');
    const keyManager = getKeyManager();

    const status = {
      providers: keyManager.getStats(),
      keys: keyManager.getKeyDetails(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Test key rotation
 */
export async function testKeyRotation(req, res) {
  try {
    const { executeWithKeyRotation } = await import('../utils/keyManager.js');

    // Test with a simple function
    const testFunction = async (key) => {
      console.log(`Testing key rotation with key ending in: ...${key.slice(-4)}`);
      return `success-${key.slice(-4)}`;
    };

    const result = await executeWithKeyRotation('OPENROUTER', testFunction);

    res.json({
      success: true,
      data: {
        result,
        message: 'Key rotation test successful'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

// Legacy exports for backward compatibility with existing routes
export const analyzeImages = analyzeUnifiedEndpoint;
export const buildImagePromptPreview = async (req, res) => {
  // Simplified version - just return prompt preview
  return res.status(501).json({ error: 'Use analyzeUnifiedEndpoint instead' });
};
export const createFlow = async (req, res) => {
  return res.status(501).json({ error: 'Use analyzeUnifiedEndpoint instead' });
};
export const generateImages = async (req, res) => {
  return res.status(501).json({ error: 'Use analyzeUnifiedEndpoint instead' });
};
export const generateVideo = async (req, res) => {
  return res.status(501).json({ error: 'Not implemented in Phase 1' });
};
export const buildVideoPromptPreview = async (req, res) => {
  return res.status(501).json({ error: 'Not implemented in Phase 1' });
};
export const getFlow = async (req, res) => {
  return res.status(501).json({ error: 'Not implemented in Phase 1' });
};
export const getFlowHistory = async (req, res) => {
  return res.status(501).json({ error: 'Not implemented in Phase 1' });
};
export const submitFeedback = async (req, res) => {
  return res.status(501).json({ error: 'Not implemented in Phase 1' });
};
export const deleteFlow = async (req, res) => {
  return res.status(501).json({ error: 'Not implemented in Phase 1' });
};

export default {
  analyzeUnifiedEndpoint,
  analyzeCharacterEndpoint,
  analyzeProductEndpoint,
  getProviderStatus,
  testKeyRotation,
  // Legacy exports
  analyzeImages,
  buildImagePromptPreview,
  createFlow,
  generateImages,
  generateVideo,
  buildVideoPromptPreview,
  getFlow,
  getFlowHistory,
  submitFeedback,
  deleteFlow
};
