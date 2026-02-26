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
import GoogleFlowAutomationService from '../services/googleFlowAutomationService.js';
import PromptOption from '../models/PromptOption.js';
import path from 'path';
import fs from 'fs';

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
      analysis = null,  // NEW: Accept analysis from request
      selectedOptions = {},  // NEW: Accept selectedOptions from request
      options = {},
      imageCount = 2,
      imageSize = '1024x1024',
      preferredProvider = null,
      maxBudget = null,
      imageProvider = null, // Support explicit image provider selection
      useCase = 'change-clothes',
      productFocus = 'full-outfit'
    } = req.body;

    console.log(`📝 Prompt: ${prompt?.substring(0, 80) || '(will be built from analysis)'}`);
    console.log(`🎨 Negative: ${negativePrompt || 'none'}`);
    console.log(`🖼️  Image count: ${imageCount}`);
    if (imageProvider) {
      console.log(`🎯 Image Provider: ${imageProvider}`);
    }

    // If analysis and selectedOptions provided, build the prompt
    let finalPrompt = prompt;
    if (analysis && !prompt) {
      console.log('\n📝 Building prompt from analysis + selectedOptions...');
      const { buildDetailedPrompt } = await import('../services/smartPromptBuilder.js');
      
      const buildResult = await buildDetailedPrompt(
        analysis,
        selectedOptions,
        useCase,
        productFocus
      );
      
      finalPrompt = buildResult.prompt;
      console.log(`📬 Built prompt:\n${finalPrompt.substring(0, 200)}...\n`);
    }

    // Validate prompt
    if (!finalPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required (either provide prompt directly or analysis + selectedOptions)'
      });
    }

    // ============================================================
    // IMAGE GENERATION
    // ============================================================

    console.log('\n🎨 Generating images...');

    let generatedImages = [];
    let generationMetadata = {};

    // Handle Google Flow image generation
    if (imageProvider === 'google-flow') {
      console.log('🌐 Using Google Flow with enhanced image service\n');
      
      try {
        // Import and use the unified Google Flow service
        const { default: GoogleFlowAutomationService } = await import('../services/googleFlowAutomationService.js');
        
        // Create sample images if needed for testing
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // For now, create placeholder character and product images
        // In production, these would come from the user upload
        const charImagePath = path.join(tempDir, 'placeholder-character.jpg');
        const prodImagePath = path.join(tempDir, 'placeholder-product.jpg');

        // Create placeholder images if they don't exist
        if (!fs.existsSync(charImagePath) || !fs.existsSync(prodImagePath)) {
          console.log('📸 Creating placeholder images for Google Flow...');
          
          // Create a simple placeholder (1x1 white pixel)
          const placeholderData = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD0, 0xFF, 0xD9
          ]);
          
          fs.writeFileSync(charImagePath, placeholderData);
          fs.writeFileSync(prodImagePath, placeholderData);
          console.log('✅ Placeholder images created');
        }

        console.log(`📝 Final Prompt: ${finalPrompt.substring(0, 80)}...`);
        console.log(`🖼️  Downloading ${imageCount} images`);

        // Use imageGenerationService for proper multi-image handling
        const result = await runImageGeneration({
          prompt: finalPrompt,
          negativePrompt: negativePrompt || '',
          imageCount: imageCount,
          aspectRatio: selectedOptions?.aspectRatio || options?.aspectRatio || '9:16',
          personImagePath: charImagePath,
          productImagePath: prodImagePath,
          outputDir: path.join(process.cwd(), 'downloads')
        });

        if (result.success && result.results?.files) {
          // Convert file paths to URLs
          generatedImages = result.results.files.map((filePath, idx) => ({
            url: filePath,
            path: filePath,
            provider: 'Google Flow',
            model: 'Nano Banana Pro',
            isLocal: true
          }));

          generationMetadata = {
            total: imageCount,
            successful: generatedImages.length,
            failed: imageCount - generatedImages.length,
            providers: ['Google Flow'],
            errors: []
          };

          console.log(`\n✅ Google Flow generated ${generatedImages.length}/${imageCount} images`);
        } else {
          throw new Error(result.error || 'Google Flow generation failed');
        }

      } catch (googleFlowError) {
        console.error('❌ Google Flow generation failed:', googleFlowError.message);
        generationMetadata = {
          total: imageCount,
          successful: 0,
          failed: imageCount,
          providers: [],
          errors: [{ provider: 'Google Flow', error: googleFlowError.message }]
        };
      }
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
