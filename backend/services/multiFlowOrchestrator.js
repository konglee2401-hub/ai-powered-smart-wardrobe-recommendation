import GrokServiceV2 from './browser/grokServiceV2.js';
import ZAIChatService from './browser/zaiChatService.js';
import ZAIImageService from './browser/zaiImageService.js';
import GoogleFlowService from './browser/googleFlowService.js';
import { uploadToImageHost } from './imageUploadService.js';
import path from 'path';
import fs from 'fs';

/**
 * Multi-Flow Orchestrator
 * Runs multiple browser automation flows in parallel
 */

class MultiFlowOrchestrator {
  constructor(options = {}) {
    this.options = options;
    this.results = [];
    this.errors = [];
  }

  /**
   * Available flow combinations
   */
  static FLOW_TYPES = {
    'grok-grok': {
      name: 'Grok → Grok',
      description: 'Analyze with Grok, generate with Grok',
      analysisService: 'grok',
      imageGenService: 'grok',
      requiresLogin: false
    },
    'zai-zai': {
      name: 'Z.AI Chat → Z.AI Image',
      description: 'Analyze with Z.AI Chat, generate with Z.AI Image',
      analysisService: 'zai-chat',
      imageGenService: 'zai-image',
      requiresLogin: true
    },
    'grok-flow': {
      name: 'Grok → Google Flow',
      description: 'Analyze with Grok, generate with Google Flow',
      analysisService: 'grok',
      imageGenService: 'google-flow',
      requiresLogin: true // Google Flow requires login
    },
    'zai-flow': {
      name: 'Z.AI Chat → Google Flow',
      description: 'Analyze with Z.AI Chat, generate with Google Flow',
      analysisService: 'zai-chat',
      imageGenService: 'google-flow',
      requiresLogin: true
    },
    'zai-grok': {
      name: 'Z.AI Chat → Grok',
      description: 'Analyze with Z.AI Chat, generate with Grok',
      analysisService: 'zai-chat',
      imageGenService: 'grok',
      requiresLogin: true // Z.AI requires login
    }
  };

  /**
   * Run single flow
   */
  async runSingleFlow(flowType, characterImagePath, clothingImagePath, options = {}) {
    const flow = MultiFlowOrchestrator.FLOW_TYPES[flowType];
    
    if (!flow) {
      throw new Error(`Unknown flow type: ${flowType}`);
    }

    const flowId = `${flowType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log('\n' + '='.repeat(80));
    console.log(`🚀 FLOW: ${flow.name}`);
    console.log('='.repeat(80));
    console.log(`Flow ID: ${flowId}`);
    console.log(`Character: ${path.basename(characterImagePath)}`);
    console.log(`Clothing: ${path.basename(clothingImagePath)}`);
    console.log(`Images to generate: ${options.imageCount || 1}`);
    console.log('');

    try {
      // STEP 1: Analysis
      console.log('📊 STEP 1: ANALYSIS');
      console.log('-'.repeat(80));
      
      const analysisResult = await this._runAnalysis(
        flow.analysisService,
        characterImagePath,
        clothingImagePath,
        options
      );

      console.log(`✅ Analysis complete (${analysisResult.analysis.length} chars)`);
      console.log('');

      // STEP 2: Generate Images
      console.log('🎨 STEP 2: IMAGE GENERATION');
      console.log('-'.repeat(80));
      
      const generatedImages = [];
      const imageCount = options.imageCount || 1;

      for (let i = 0; i < imageCount; i++) {
        console.log(`\n🖼️  Generating image ${i + 1}/${imageCount}...`);
        
        try {
          const imageResult = await this._runImageGeneration(
            flow.imageGenService,
            analysisResult.analysis,
            options,
            i
          );

          generatedImages.push(imageResult);
          console.log(`✅ Image ${i + 1} generated: ${imageResult.path}`);

        } catch (error) {
          console.error(`❌ Image ${i + 1} failed:`, error.message);
          generatedImages.push({
            error: error.message,
            index: i
          });
        }
      }

      console.log('');
      console.log('📤 STEP 3: UPLOAD TO IMAGE HOSTS');
      console.log('-'.repeat(80));

      // STEP 3: Upload to image hosts
      const uploadedImages = [];

      for (const image of generatedImages) {
        if (image.error) {
          uploadedImages.push(image);
          continue;
        }

        try {
          console.log(`\n📤 Uploading: ${path.basename(image.path)}`);
          
          const uploadResult = await uploadToImageHost(image.path, {
            provider: options.imageHostProvider || 'auto'
          });

          uploadedImages.push({
            ...image,
            uploaded: true,
            hostedUrl: uploadResult.url,
            deleteUrl: uploadResult.deleteUrl,
            provider: uploadResult.provider
          });

          console.log(`✅ Uploaded to ${uploadResult.provider}: ${uploadResult.url}`);

        } catch (error) {
          console.error(`❌ Upload failed:`, error.message);
          uploadedImages.push({
            ...image,
            uploaded: false,
            uploadError: error.message
          });
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('');
      console.log('='.repeat(80));
      console.log(`✅ FLOW COMPLETE: ${flow.name}`);
      console.log('='.repeat(80));
      console.log(`Duration: ${duration}s`);
      console.log(`Images generated: ${generatedImages.filter(img => !img.error).length}/${imageCount}`);
      console.log(`Images uploaded: ${uploadedImages.filter(img => img.uploaded).length}/${generatedImages.length}`);
      console.log('');

      return {
        flowId,
        flowType,
        flowName: flow.name,
        success: true,
        analysis: analysisResult,
        images: uploadedImages,
        duration: `${duration}s`,
        stats: {
          totalImages: imageCount,
          successfulGenerations: generatedImages.filter(img => !img.error).length,
          successfulUploads: uploadedImages.filter(img => img.uploaded).length,
          failures: generatedImages.filter(img => img.error).length
        }
      };

    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.error('');
      console.error('='.repeat(80));
      console.error(`❌ FLOW FAILED: ${flow.name}`);
      console.error('='.repeat(80));
      console.error(`Error: ${error.message}`);
      console.error(`Duration: ${duration}s`);
      console.error('');

      return {
        flowId,
        flowType,
        flowName: flow.name,
        success: false,
        error: error.message,
        duration: `${duration}s`
      };
    }
  }

  /**
   * Run multiple flows in parallel
   */
  async runMultipleFlows(flowTypes, characterImagePath, clothingImagePath, options = {}) {
    console.log('\n' + '█'.repeat(80));
    console.log('🚀 MULTI-FLOW ORCHESTRATION');
    console.log('█'.repeat(80));
    console.log(`Total flows: ${flowTypes.length}`);
    console.log(`Flows: ${flowTypes.join(', ')}`);
    console.log(`Images per flow: ${options.imageCount || 1}`);
    console.log(`Total images: ${flowTypes.length * (options.imageCount || 1)}`);
    console.log('█'.repeat(80) + '\n');

    const startTime = Date.now();

    // Run all flows in parallel
    const flowPromises = flowTypes.map(flowType => 
      this.runSingleFlow(flowType, characterImagePath, clothingImagePath, options)
        .catch(error => ({
          flowType,
          success: false,
          error: error.message
        }))
    );

    const results = await Promise.all(flowPromises);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Aggregate statistics
    const stats = {
      totalFlows: flowTypes.length,
      successfulFlows: results.filter(r => r.success).length,
      failedFlows: results.filter(r => !r.success).length,
      totalImagesGenerated: results.reduce((sum, r) => 
        sum + (r.stats?.successfulGenerations || 0), 0
      ),
      totalImagesUploaded: results.reduce((sum, r) => 
        sum + (r.stats?.successfulUploads || 0), 0
      ),
      totalDuration: `${duration}s`,
      averageFlowDuration: `${(duration / flowTypes.length).toFixed(2)}s`
    };

    console.log('\n' + '█'.repeat(80));
    console.log('✅ MULTI-FLOW ORCHESTRATION COMPLETE');
    console.log('█'.repeat(80));
    console.log(`Total duration: ${stats.totalDuration}`);
    console.log(`Successful flows: ${stats.successfulFlows}/${stats.totalFlows}`);
    console.log(`Total images generated: ${stats.totalImagesGenerated}`);
    console.log(`Total images uploaded: ${stats.totalImagesUploaded}`);
    console.log('█'.repeat(80) + '\n');

    return {
      success: true,
      results,
      stats
    };
  }

  /**
   * Run analysis with specified service
   */
  async _runAnalysis(serviceName, characterImagePath, clothingImagePath, options) {
    let service;

    switch (serviceName) {
      case 'grok':
        service = new GrokServiceV2({ headless: true });
        break;
      case 'zai-chat':
        service = new ZAIChatService({ headless: true });
        break;
      default:
        throw new Error(`Unknown analysis service: ${serviceName}`);
    }

    try {
      await service.initialize();

      const analysisPrompt = options.analysisPrompt || 
        'Analyze these two images. The first is a character/person, the second is clothing. ' +
        'Provide detailed analysis for generating a new image where the character wears the clothing. ' +
        'Include: character features, clothing details, style recommendations, accessories, background, lighting, and mood.';

      const analysis = await service.analyzeMultipleImages(
        [characterImagePath, clothingImagePath],
        analysisPrompt
      );

      return {
        service: serviceName,
        analysis
      };

    } finally {
      await service.close();
    }
  }

  /**
   * Run image generation with specified service
   */
  async _runImageGeneration(serviceName, analysis, options, index) {
    let service;

    switch (serviceName) {
      case 'grok':
        service = new GrokServiceV2({ headless: true });
        break;
      case 'zai-image':
        service = new ZAIImageService({ headless: true });
        break;
      case 'google-flow':
        service = new GoogleFlowService({ headless: false }); // Requires visible browser for login
        break;
      default:
        throw new Error(`Unknown image generation service: ${serviceName}`);
    }

    try {
      await service.initialize();

      // Generate prompt from analysis
      const generationPrompt = options.generationPrompt ||
        `Based on this analysis, generate a photorealistic image:\n\n${analysis.substring(0, 1000)}...\n\n` +
        `Create a high-quality fashion photograph with professional lighting and composition.`;

      // Ensure temp directory exists
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const outputPath = path.join(
        tempDir,
        `${serviceName}-gen-${Date.now()}-${index}.png`
      );

      const result = await service.generateImage(generationPrompt, {
        download: true,
        outputPath
      });

      return {
        service: serviceName,
        index,
        ...result
      };

    } finally {
      await service.close();
    }
  }
}

export default MultiFlowOrchestrator;
