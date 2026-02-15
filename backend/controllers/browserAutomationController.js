import GrokServiceV2 from '../services/browser/grokServiceV2.js';
import ZAIChatService from '../services/browser/zaiChatService.js';
import path from 'path';
import fs from 'fs';

/**
 * Browser Automation Controller
 * Handles browser-based AI operations
 */

// Ensure temp directory exists
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Analyze images using browser automation
 */
export async function analyzeBrowser(req, res) {
  let service = null;
  
  try {
    const { provider = 'grok' } = req.body;
    const characterImage = req.files?.characterImage?.[0];
    const clothingImage = req.files?.clothingImage?.[0];

    if (!characterImage || !clothingImage) {
      return res.status(400).json({
        error: 'Both character and clothing images are required'
      });
    }

    console.log(`\n🤖 Browser Analysis Request - Provider: ${provider}`);

    switch (provider) {
      case 'grok':
        service = new GrokServiceV2({ headless: true });
        await service.initialize();
        
        const result = await service.analyzeMultipleImages(
          [characterImage.path, clothingImage.path],
          'Analyze these two images. The first is a character/person, the second is clothing. ' +
          'Describe the character\'s features and the clothing details for fashion matching.'
        );
        
        await service.close();
        service = null;
        
        return res.json({
          success: true,
          analysis: result,
          provider,
          method: 'browser'
        });

      case 'zai-chat':
        service = new ZAIChatService({ headless: true });
        await service.initialize();
        
        const zaiResult = await service.analyzeImage(
          characterImage.path,
          'Analyze this character for fashion matching.'
        );
        
        await service.close();
        service = null;
        
        return res.json({
          success: true,
          analysis: zaiResult,
          provider,
          method: 'browser'
        });

      default:
        return res.status(400).json({
          error: `Unknown provider: ${provider}`
        });
    }

  } catch (error) {
    console.error('Browser analysis error:', error);
    
    // Clean up
    if (service) {
      try {
        await service.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Generate image using browser automation
 */
export async function generateImageBrowser(req, res) {
  let service = null;
  
  try {
    const { prompt, provider = 'grok' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required'
      });
    }

    console.log(`\n🎨 Browser Image Generation - Provider: ${provider}`);

    switch (provider) {
      case 'grok':
        service = new GrokServiceV2({ headless: true });
        await service.initialize();
        
        const result = await service.generateImage(prompt, {
          download: true,
          outputPath: path.join(tempDir, `grok-gen-${Date.now()}.png`)
        });
        
        await service.close();
        service = null;
        
        return res.json({
          success: true,
          imageUrl: result.url,
          imagePath: result.path,
          provider,
          method: 'browser'
        });

      case 'zai-image':
        // Dynamic import to avoid errors if not available
        try {
          const { default: ZAIImageService } = await import('../services/browser/zaiImageService.js');
          
          service = new ZAIImageService({ headless: true });
          await service.initialize();
          
          const zaiResult = await service.generateImage(prompt, {
            download: true,
            outputPath: path.join(tempDir, `zai-gen-${Date.now()}.png`)
          });
          
          await service.close();
          service = null;
          
          return res.json({
            success: true,
            imageUrl: zaiResult.url,
            imagePath: zaiResult.path,
            provider,
            method: 'browser'
          });
        } catch (importError) {
          return res.status(501).json({
            error: 'Z.AI Image service not available',
            details: importError.message
          });
        }

      case 'google-flow':
        // Dynamic import to avoid errors if not available
        try {
          const { default: GoogleFlowService } = await import('../services/browser/googleFlowService.js');
          
          service = new GoogleFlowService({ headless: false }); // Requires login
          await service.initialize();
          
          const flowResult = await service.generateImage(prompt, {
            download: true,
            outputPath: path.join(tempDir, `flow-gen-${Date.now()}.png`)
          });
          
          await service.close();
          service = null;
          
          return res.json({
            success: true,
            imageUrl: flowResult.url,
            imagePath: flowResult.path,
            provider,
            method: 'browser'
          });
        } catch (importError) {
          return res.status(501).json({
            error: 'Google Flow service not available',
            details: importError.message
          });
        }

      default:
        return res.status(400).json({
          error: `Unknown provider: ${provider}`
        });
    }

  } catch (error) {
    console.error('Browser image generation error:', error);
    
    // Clean up
    if (service) {
      try {
        await service.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Generate video using browser automation
 */
export async function generateVideoBrowser(req, res) {
  let service = null;
  
  try {
    const { prompt, provider = 'grok' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required'
      });
    }

    console.log(`\n🎬 Browser Video Generation - Provider: ${provider}`);

    switch (provider) {
      case 'grok':
        service = new GrokServiceV2({ headless: true });
        await service.initialize();
        
        const result = await service.generateVideo(prompt, {
          download: true,
          outputPath: path.join(tempDir, `grok-video-${Date.now()}.mp4`)
        });
        
        await service.close();
        service = null;
        
        return res.json({
          success: true,
          videoUrl: result.url,
          videoPath: result.path,
          provider,
          method: 'browser'
        });

      case 'google-flow':
        // Dynamic import to avoid errors if not available
        try {
          const { default: GoogleFlowService } = await import('../services/browser/googleFlowService.js');
          
          service = new GoogleFlowService({ headless: false }); // Requires login
          await service.initialize();
          
          const flowResult = await service.generateVideo(prompt, {
            download: true,
            outputPath: path.join(tempDir, `flow-video-${Date.now()}.mp4`)
          });
          
          await service.close();
          service = null;
          
          return res.json({
            success: true,
            videoUrl: flowResult.url,
            videoPath: flowResult.path,
            provider,
            method: 'browser'
          });
        } catch (importError) {
          return res.status(501).json({
            error: 'Google Flow service not available',
            details: importError.message
          });
        }

      default:
        return res.status(400).json({
          error: `Unknown provider: ${provider}`
        });
    }

  } catch (error) {
    console.error('Browser video generation error:', error);
    
    // Clean up
    if (service) {
      try {
        await service.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Full workflow: Analyze + Generate Image + Optional Video
 */
export async function fullWorkflowBrowser(req, res) {
  let service = null;
  
  try {
    const { 
      provider = 'grok',
      generateVideo = false 
    } = req.body;
    
    const characterImage = req.files?.characterImage?.[0];
    const clothingImage = req.files?.clothingImage?.[0];

    if (!characterImage || !clothingImage) {
      return res.status(400).json({
        error: 'Both character and clothing images are required'
      });
    }

    console.log(`\n🎯 Browser Full Workflow - Provider: ${provider}`);

    if (provider === 'grok') {
      service = new GrokServiceV2({ headless: true });
      await service.initialize();
      
      const result = await service.fullWorkflow(
        characterImage.path,
        clothingImage.path,
        {
          generateVideo,
          outputPath: path.join(tempDir, `workflow-image-${Date.now()}.png`),
          videoOutputPath: generateVideo ? path.join(tempDir, `workflow-video-${Date.now()}.mp4`) : null
        }
      );
      
      await service.close();
      service = null;
      
      return res.json({
        success: true,
        analysis: result.analysis,
        generatedImage: result.generatedImage,
        generatedVideo: result.generatedVideo,
        provider,
        method: 'browser'
      });
    }

    return res.status(400).json({
      error: `Full workflow not supported for provider: ${provider}`
    });

  } catch (error) {
    console.error('Browser full workflow error:', error);
    
    // Clean up
    if (service) {
      try {
        await service.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}
