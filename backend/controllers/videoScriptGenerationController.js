/**
 * Video Script Generation Controller
 * Handles API requests for generating video scripts using ChatGPT
 */

import {
  generateVideoScriptWithChatGPT,
  generateVideoScriptVariations,
  generateMovementDetail,
  generateCameraMovementGuide,
  generateLightingGuide,
  generateMusicGuide,
  generateTemplateLibrary,
  closeChatGPTService
} from '../services/videoScriptGenerationService.js';

/**
 * Generate video script using ChatGPT
 * POST /api/video/generate-video-scripts
 */
export async function generateVideoScript(req, res) {
  try {
    const {
      scenarioId,
      style,
      duration,
      segments,
      productName,
      productDescription,
      productType,
      targetAudience
    } = req.body;

    // Validate required fields
    if (!scenarioId || !style || !duration || !segments || !productName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: scenarioId, style, duration, segments, productName'
      });
    }

    // Validate field types
    if (typeof duration !== 'number' || duration < 5 || duration > 120) {
      return res.status(400).json({
        success: false,
        error: 'Duration must be a number between 5 and 120 seconds'
      });
    }

    if (typeof segments !== 'number' || segments < 1 || segments > 6) {
      return res.status(400).json({
        success: false,
        error: 'Segments must be a number between 1 and 6'
      });
    }

    console.log('🎬 Controller: Generating video script for:', { scenarioId, productName, duration, segments });

    // Call ChatGPT service (now using browser automation - NO API KEY NEEDED)
    const result = await generateVideoScriptWithChatGPT({
      scenarioId,
      videoScenario: scenarioId,
      style,
      videoStyle: style,
      duration,
      totalDuration: duration,
      segments,
      segmentCount: segments,
      productName,
      productType: productType || productName,
      productDetails: productDescription || productName,
      productDescription: productDescription || productName,
      targetAudience: targetAudience || 'General Audience'
    });

    console.log('✅ Controller: Script generated successfully');
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Generate Video Script Error:', error);
    console.error('Error Stack:', error.stack);
    
    // Check if error is from Puppeteer/Browser initialization
    let errorMessage = error.message || 'Failed to generate video script';
    
    if (error.message?.includes('Puppeteer')) {
      errorMessage = 'Browser automation failed: Puppeteer not available. Install with: npm install puppeteer';
    } else if (error.message?.includes('ENOENT')) {
      errorMessage = 'Browser executable not found. Please install Chromium.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timeout: ChatGPT took too long to respond. Try again.';
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Generate multiple script variations
 * POST /api/video/generate-script-variations
 */
export async function generateScriptVariations(req, res) {
  try {
    const {
      scenarioId,
      style,
      duration,
      segments,
      productName,
      productDescription,
      productType,
      targetAudience,
      variationCount = 3
    } = req.body;

    // Validate required fields
    if (!scenarioId || !style || !duration || !segments || !productName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate variation count
    if (variationCount < 1 || variationCount > 5) {
      return res.status(400).json({
        success: false,
        error: 'Variation count must be between 1 and 5'
      });
    }

    // Call service (now using browser automation - NO API KEY NEEDED)
    const result = await generateVideoScriptVariations(
      {
        scenarioId,
        videoScenario: scenarioId,
        style,
        videoStyle: style,
        duration,
        totalDuration: duration,
        segments,
        segmentCount: segments,
        productName,
        productType: productType || productName,
        productDetails: productDescription || productName,
        productDescription: productDescription || productName,
        targetAudience: targetAudience || 'General Audience'
      },
      variationCount
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate Script Variations Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate script variations'
    });
  }
}

/**
 * Generate camera movement guide
 * POST /api/video/generate-camera-guide
 */
export async function generateCameraGuide(req, res) {
  try {
    const {
      scenarioId,
      style,
      duration,
      segments,
      productName,
      productDescription,
      productType,
      targetAudience
    } = req.body;

    // Validate required fields
    if (!scenarioId || !style || !duration || !productName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Call service (now using browser automation - NO API KEY NEEDED)
    const result = await generateCameraMovementGuide({
      scenarioId,
      scenario: scenarioId,
      style,
      videoStyle: style,
      duration,
      totalDuration: duration,
      segments: segments || 1,
      segmentCount: segments || 1,
      aspectRatio: '9:16',
      primaryFocus: productType || productName,
      productType: productType || productName,
      productDetails: productDescription || productName,
      productDescription: productDescription || productName,
      targetAudience: targetAudience || 'General Audience'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate Camera Guide Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate camera guide'
    });
  }
}

/**
 * Generate lighting guide
 * POST /api/video/generate-lighting-guide
 */
export async function generateLightingGuideHandler(req, res) {
  try {
    const {
      scenarioId,
      style,
      duration,
      segments,
      productName,
      productDescription,
      productType,
      targetAudience
    } = req.body;

    // Validate required fields
    if (!scenarioId || !style || !duration || !productName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Call service (now using browser automation - NO API KEY NEEDED)
    const result = await generateLightingGuide({
      scenarioId,
      scenario: scenarioId,
      style,
      lightingStyle: style,
      duration,
      totalDuration: duration,
      segments: segments || 1,
      segmentCount: segments || 1,
      primaryProduct: productType || productName,
      productType: productType || productName,
      productDetails: productDescription || productName,
      productDescription: productDescription || productName,
      skinTone: 'medium',
      targetAudience: targetAudience || 'General Audience'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate Lighting Guide Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate lighting guide'
    });
  }
}

/**
 * Generate music guide
 * POST /api/video/generate-music-guide
 */
export async function generateMusicGuideHandler(req, res) {
  try {
    const {
      scenarioId,
      style,
      duration,
      segments,
      productName,
      productDescription,
      productType,
      targetAudience
    } = req.body;

    // Validate required fields
    if (!scenarioId || !style || !duration || !productName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Call service (now using browser automation - NO API KEY NEEDED)
    const result = await generateMusicGuide({
      scenarioId,
      scenario: scenarioId,
      style,
      videoStyle: style,
      duration,
      totalDuration: duration,
      segments: segments || 1,
      segmentCount: segments || 1,
      primaryProduct: productType || productName,
      productType: productType || productName,
      productDetails: productDescription || productName,
      productDescription: productDescription || productName,
      targetAudience: targetAudience || 'General Audience'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate Music Guide Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate music guide'
    });
  }
}

/**
 * Get production template
 * GET /api/video/templates/:templateId
 */
export async function getProductionTemplate(req, res) {
  try {
    const { templateId } = req.params;

    // Import templates from frontend constants (via re-export if available)
    // For now, return a message indicating where to get templates
    const response = {
      success: true,
      message: 'Video production templates are available in frontend/src/constants/videoProductionTemplates.js',
      templateId,
      instructions: {
        path: '/api/video/list-templates',
        description: 'Get list of all available production templates'
      }
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Get Template Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get template'
    });
  }
}

/**
 * Health check - verify ChatGPT service availability
 * GET /api/video/health
 */
export async function healthCheck(req, res) {
  try {
    return res.status(200).json({
      success: true,
      service: 'Video Script Generation Service',
      status: 'operational',
      chatgptAvailable: true,
      mode: 'Browser Automation (NO API KEY REQUIRED)',
      features: [
        'generateVideoScript',
        'generateScriptVariations',
        'generateCameraGuide',
        'generateLightingGuide',
        'generateMusicGuide',
        'generateMovementDetail',
        'generateTemplateLibrary'
      ]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
}

export default {
  generateVideoScript,
  generateScriptVariations,
  generateCameraGuide,
  generateLightingGuideHandler,
  generateMusicGuideHandler,
  getProductionTemplate,
  healthCheck
};
