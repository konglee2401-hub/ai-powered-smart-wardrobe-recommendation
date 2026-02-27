/**
 * Affiliate Video TikTok Routes - Modular Step-by-Step API
 * 
 * Orchestrates TikTok video generation across 6 steps
 * - Session tracking throughout all steps
 * - Reuses existing services (image gen, video gen, TTS)
 * - No timeout risk (each step < 2 minutes)
 * - Real-time progress tracking
 */

import express from 'express';
import SessionLogService from '../services/sessionLogService.js';
import affiliateVideoTikTokService from '../services/affiliateVideoTikTokService.js';
import GoogleFlowAutomationService from '../services/googleFlowAutomationService.js';
import GoogleDriveOAuthService from '../services/googleDriveOAuth.js';
import MultiVideoGenerationService from '../services/multiVideoGenerationService.js';
import TTSService from '../services/ttsService.js';
import ChatGPTService from '../services/browser/chatgptService.js';
import { buildDetailedPrompt } from '../services/smartPromptBuilder.js';
import VietnamesePromptBuilder from '../services/vietnamesePromptBuilder.js';
import aiController from '../controllers/aiController.js';
import upload from '../middleware/upload.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 💾 In-memory flow state storage (in production, use Redis)
const flowStates = new Map();

/**
 * 🔵 STEP 1: ANALYZE IMAGES
 * POST /api/ai/affiliate-video-tiktok/step-1-analyze
 * 
 * Input: characterImage, productImage, flowId
 * Output: { success, analysis, flowId, step_duration }
 */
router.post('/step-1-analyze', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), async (req, res) => {
  const flowId = req.body.flowId || `flow-${Date.now()}`;
  const startTime = Date.now();
  let logger = null;

  try {
    console.log(`\n🔵 STEP 1: ANALYZE [${flowId}]`);
    
    // Initialize session logger
    console.log(`\n[INIT] Creating SessionLogService for ${flowId}...`);
    logger = new SessionLogService(flowId, 'one-click');
    console.log(`[INIT] SessionLogService created`);
    
    console.log(`[INIT] Calling logger.init()...`);
    const initResult = await logger.init();
    console.log(`[INIT] logger.init() returned: ${!!initResult}`);
    
    if (!initResult) {
      console.error(`[INIT] ❌ logger.init() failed - logs may not persist to MongoDB`);
    }
    
    console.log(`[INIT] Calling logger.startStage...`);
    await logger.startStage('step-1-analyze');
    console.log(`[INIT] startStage completed`);
    
    console.log(`[INIT] Calling logger.info...`);
    await logger.info('Starting Step 1: Image Analysis', 'step-1-init');
    console.log(`[INIT] ✅ Logger fully initialized`);

    // ========== VALIDATE IMAGES ==========
    console.log(`\n📋 Validating image uploads...`);
    if (!req.files) {
      const err = 'No files uploaded';
      await logger.error(err, 'step-1-validation');
      throw new Error(err);
    }

    if (!req.files?.characterImage?.[0]) {
      const err = 'Character image is required';
      await logger.error(err, 'step-1-validation');
      throw new Error(err);
    }

    if (!req.files?.productImage?.[0]) {
      const err = 'Product image is required';
      await logger.error(err, 'step-1-validation');
      throw new Error(err);
    }

    const characterFile = req.files.characterImage[0];
    const productFile = req.files.productImage[0];
    
    console.log(`📸 Character: ${characterFile.originalname} (${characterFile.size} bytes)`);
    console.log(`📦 Product: ${productFile.originalname} (${productFile.size} bytes)`);
    
    await logger.info(`Character image: ${characterFile.originalname} (${characterFile.size} bytes)`, 'step-1-files');
    await logger.info(`Product image: ${productFile.originalname} (${productFile.size} bytes)`, 'step-1-files');

    // ========== READ IMAGE BUFFERS ==========
    console.log(`\n🔍 Reading image buffers...`);
    let characterImageBuffer = characterFile.buffer;
    let productImageBuffer = productFile.buffer;
    
    // If buffer is not available, read from disk (diskStorage mode)
    if (!characterImageBuffer && characterFile.path) {
      console.log(`  📂 Reading character from disk: ${characterFile.path}`);
      characterImageBuffer = fs.readFileSync(characterFile.path);
      console.log(`  ✅ Character buffer loaded (${characterImageBuffer.length} bytes)`);
    }
    if (!productImageBuffer && productFile.path) {
      console.log(`  📂 Reading product from disk: ${productFile.path}`);
      productImageBuffer = fs.readFileSync(productFile.path);
      console.log(`  ✅ Product buffer loaded (${productImageBuffer.length} bytes)`);
    }

    if (!characterImageBuffer) {
      const err = 'Failed to load character image buffer';
      console.error(`❌ ${err}`);
      await logger.error(err, 'step-1-buffer');
      throw new Error(err);
    }

    if (!productImageBuffer) {
      const err = 'Failed to load product image buffer';
      console.error(`❌ ${err}`);
      await logger.error(err, 'step-1-buffer');
      throw new Error(err);
    }

    console.log(`✅ Both image buffers loaded successfully`);
    await logger.info(`Image buffers loaded (character: ${characterImageBuffer.length}B, product: ${productImageBuffer.length}B)`, 'step-1-buffer');

    // ========== SAVE IMAGES TO TEMP ==========
    console.log(`\n💾 Saving images to temp directory...`);
    const tempDir = path.join(process.cwd(), 'temp', 'step-1-analysis', flowId);
    console.log(`  📁 Temp directory: ${tempDir}`);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`  ✅ Temp directory created`);
    }

    const characterImagePath = path.join(tempDir, 'character.jpg');
    const productImagePath = path.join(tempDir, 'product.jpg');
    
    fs.writeFileSync(characterImagePath, characterImageBuffer);
    console.log(`  ✅ Character image saved: ${characterImagePath}`);
    
    fs.writeFileSync(productImagePath, productImageBuffer);
    console.log(`  ✅ Product image saved: ${productImagePath}`);

    // Verify files exist
    if (!fs.existsSync(characterImagePath)) {
      throw new Error(`Character image file not found after writing: ${characterImagePath}`);
    }
    if (!fs.existsSync(productImagePath)) {
      throw new Error(`Product image file not found after writing: ${productImagePath}`);
    }
    
    console.log(`✅ Both images verified on disk`);
    await logger.info(`Images saved to temp: character=${characterImagePath}, product=${productImagePath}`, 'step-1-save');

    // ========== BUILD ANALYSIS PROMPT ==========
    console.log(`\n🎯 Building analysis prompt...`);
    const analysisPrompt = affiliateVideoTikTokService.buildAnalysisPrompt();
    console.log(`  ✅ Prompt built (${analysisPrompt.length} chars)`);
    await logger.info(`Analysis prompt built (${analysisPrompt.length} characters)`, 'step-1-prompt');

    // ========== ANALYZE WITH CHATGPT ==========
    console.log(`\n🤖 Initializing ChatGPT Service...`);
    const chatGPTService = new ChatGPTService({ debug: false });
    await chatGPTService.initialize();
    console.log(`  ✅ ChatGPT browser initialized`);
    await logger.info(`ChatGPT service initialized`, 'step-1-chatgpt');
    
    console.log(`\n📊 Analyzing images with ChatGPT...`);
    const analysisResult = await chatGPTService.analyzeMultipleImages(
      [characterImagePath, productImagePath],
      analysisPrompt
    );
    
    console.log(`  ✅ Analysis result received`);
    await logger.info(`ChatGPT analysis completed`, 'step-1-chatgpt');
    
    await chatGPTService.close();
    console.log(`  ✅ ChatGPT browser closed`);

    // ========== PARSE ANALYSIS RESULT ==========
    console.log(`\n📝 Parsing analysis result...`);
    if (!analysisResult) {
      throw new Error('ChatGPT returned empty result');
    }

    console.log(`  Result success: ${analysisResult.success}`);
    console.log(`  Result type: ${typeof analysisResult.data}`);
    
    let analysis = null;
    
    // Case 1: Wrapped response { success: true, data: "..." }
    if (analysisResult && analysisResult.success && analysisResult.data) {
      try {
        if (typeof analysisResult.data === 'string') {
          console.log(`  📄 Parsing JSON from wrapped response...`);
          analysis = JSON.parse(analysisResult.data);
        } else {
          console.log(`  📦 Using object from wrapped response`);
          analysis = analysisResult.data;
        }
        console.log(`  ✅ Analysis parsed from wrapped response`);
        console.log(`     Keys: ${Object.keys(analysis).join(', ')}`);
      } catch (parseError) {
        console.warn(`⚠️ Could not parse wrapped data: ${parseError.message}`);
        await logger.warn(`Wrapped response parse failed`, 'step-1-parse');
        analysis = analysisResult.data || analysisResult;
      }
    } 
    // Case 2: Direct string response
    else if (typeof analysisResult === 'string') {
      console.log(`  📄 Parsing direct string response...`);
      try {
        analysis = JSON.parse(analysisResult);
        console.log(`  ✅ String parsed successfully`);
      } catch (parseError) {
        console.warn(`⚠️ Could not parse string: ${parseError.message}`);
        analysis = analysisResult;
      }
    }
    // Case 3: Direct object response
    else if (typeof analysisResult === 'object' && analysisResult !== null) {
      console.log(`  📦 Using object directly (not wrapped)`);
      console.log(`  Result keys: ${Object.keys(analysisResult).join(', ')}`);
      analysis = analysisResult;
    }

    if (!analysis) {
      throw new Error('No analysis data received from ChatGPT');
    }

    console.log(`✅ Analysis validated`);
    await logger.info(`Analysis parsed and validated`, 'step-1-parse', { keys: Object.keys(analysis) });

    // ========== STORE AND RETURN ==========
    const step1Duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ STEP 1 COMPLETE in ${step1Duration}s`);
    
    // Log step completion
    await logger.info(`Step 1 analysis complete`, 'step-1-complete', {
      analysis_keys: Object.keys(analysis || {}),
      duration: parseFloat(step1Duration)
    });

    // Store in flow state
    flowStates.set(flowId, {
      step1: {
        analysis: analysis,
        characterImageBuffer,
        productImageBuffer,
        characterImagePath,
        productImagePath,
        duration: parseFloat(step1Duration)
      }
    });

    res.json({
      success: true,
      flowId,
      step: 1,
      analysis: analysis,
      step_duration: parseFloat(step1Duration)
    });

  } catch (error) {
    const step1Duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ STEP 1 ERROR [${flowId}] after ${step1Duration}s:`, error.message);
    console.error(`   Stack:`, error.stack);
    
    if (logger) {
      await logger.error(`Step 1 failed: ${error.message}`, 'step-1-error', { 
        stack: error.stack,
        duration: parseFloat(step1Duration)
      });
      await logger.endStage('step-1-analyze', false);
    }
    
    res.status(500).json({
      success: false,
      flowId,
      step: 1,
      error: error.message,
      stage: 'analysis',
      duration: parseFloat(step1Duration)
    });
  }
});

/**
 * 🟢 STEP 2: GENERATE IMAGES
 * POST /api/ai/affiliate-video-tiktok/step-2-generate-images
 * 
 * Input: characterImage, productImage, analysis, flowId
 * Output: { success, wearingImage, holdingImage, flowId, step_duration }
 */
router.post('/step-2-generate-images', async (req, res) => {
  const flowId = req.body.flowId;
  const startTime = Date.now();
  let logger = null;

  try {
    console.log(`\n🟢 STEP 2: GENERATE IMAGES [${flowId}]`);
    
    if (!flowId) throw new Error('flowId is required');

    logger = new SessionLogService(flowId, 'one-click');
    await logger.init();
    await logger.startStage('step-2-generate-images');
    await logger.info('Starting Step 2: Image Generation', 'step-2-init');

    // ========== VALIDATE PREVIOUS STEP ==========
    console.log(`\n🔍 Validating Step 1 output...`);
    const flowState = flowStates.get(flowId);
    console.log(`  Flow state exists: ${!!flowState}`);
    console.log(`  Step 1 exists: ${!!flowState?.step1}`);
    
    if (!flowState) {
      const err = `No flow state found for ${flowId}. Start with Step 1 first.`;
      console.error(`❌ ${err}`);
      await logger.error(err, 'step-2-validation');
      throw new Error(err);
    }

    if (!flowState.step1) {
      const err = `Step 1 not completed. Run Step 1 before Step 2.`;
      console.error(`❌ ${err}`);
      await logger.error(err, 'step-2-validation');
      throw new Error(err);
    }

    const { analysis, characterImageBuffer, productImageBuffer, characterImagePath, productImagePath } = flowState.step1;
    
    console.log(`  ✅ Step 1 analysis: ${!!analysis}`);
    console.log(`  ✅ Character buffer: ${!!characterImageBuffer} (${characterImageBuffer?.length} bytes)`);
    console.log(`  ✅ Product buffer: ${!!productImageBuffer} (${productImageBuffer?.length} bytes)`);
    console.log(`  ✅ Character path: ${characterImagePath}`);
    console.log(`  ✅ Product path: ${productImagePath}`);
    
    if (!analysis) {
      throw new Error('Step 1 analysis is missing');
    }

    if (!characterImageBuffer || !productImageBuffer) {
      throw new Error('Image buffers from Step 1 are missing');
    }

    await logger.info(`Step 1 validation successful`, 'step-2-validation', {
      analysis_keys: Object.keys(analysis),
      buffer_sizes: { character: characterImageBuffer.length, product: productImageBuffer.length }
    });

    const {
      videoDuration = 20,
      aspectRatio = '9:16',
      negativePrompt = ''
    } = req.body;

    // 💡 REUSE: Use GoogleFlowAutomationService for image generation
    const imageGenService = new GoogleFlowAutomationService({
      type: 'image',
      aspectRatio,
      imageCount: 2,
      headless: true
    });

    console.log('📝 Building prompts from analysis with buildDetailedPrompt...');
    
    // Build prompts using buildDetailedPrompt for proper Vietnamese support
    // (same method used in executeAffiliateVideoTikTokFlow)
    
    // Prepare base options for prompt building
    const baseOptions = {
      language: 'vi',  // Generate Vietnamese prompts
      style: 'professional',
      detailLevel: 'detailed'
    };
    
    // Determine product focus from analysis
    const productFocus = analysis.product?.focus || 'full-outfit';
    
    // Generate both prompts in parallel
    console.log('  📝 Building WEARING prompt (character wearing product)...');
    const wearingPromptData = await buildDetailedPrompt(
      analysis,
      baseOptions,
      'change-clothes',
      productFocus,
      'vi'  // Vietnamese
    );
    const wearingPrompt = wearingPromptData.prompt;
    
    console.log('  📝 Building HOLDING prompt (character holding product)...');
    const holdingPromptData = await buildDetailedPrompt(
      analysis,
      baseOptions,
      'character-holding-product',
      productFocus,
      'vi'  // Vietnamese
    );
    const holdingPrompt = holdingPromptData.prompt;

    console.log(`📝 Prompts built from analysis`);
    console.log(`  Wearing: ${wearingPrompt?.substring(0, 100) || 'N/A'}...`);
    console.log(`  Holding: ${holdingPrompt?.substring(0, 100) || 'N/A'}...`);

    // Generate both images using generateMultiple
    console.log(`🎨 Generating both images in parallel...`);
    
    let multiGenResult;
    try {
      multiGenResult = await imageGenService.generateMultiple(
        characterImagePath,
        productImagePath,
        [wearingPrompt, holdingPrompt]
      );
    } catch (genMultiError) {
      console.error('❌ generateMultiple threw error:', genMultiError.message);
      multiGenResult = {
        success: false,
        error: genMultiError.message,
        results: []
      };
    }

    console.log(`📊 Multi-generation result:`, {
      success: multiGenResult?.success,
      resultsType: typeof multiGenResult?.results,
      resultsLength: multiGenResult?.results?.length,
      error: multiGenResult?.error
    });

    if (!multiGenResult || typeof multiGenResult !== 'object' || !Array.isArray(multiGenResult?.results) || (multiGenResult?.results?.length || 0) < 2) {
      const errorMsg = multiGenResult?.error || 'Image generation failed - no results produced';
      throw new Error(errorMsg);
    }

    const wearingResult = multiGenResult.results[0];
    const holdingResult = multiGenResult.results[1];

    if (!wearingResult?.success) {
      throw new Error(`Wearing image generation failed: ${wearingResult?.error}`);
    }

    console.log(`✅ Wearing image generated: ${wearingResult.imageUrl}`);

    if (!holdingResult?.success) {
      throw new Error(`Holding image generation failed: ${holdingResult?.error}`);
    }

    console.log(`✅ Holding image generated: ${holdingResult.imageUrl}`);

    // ========== UPLOAD TO GOOGLE DRIVE ==========
    console.log(`\n📤 Uploading generated images to Google Drive...`);
    let wearingImageDriveUrl = null;
    let holdingImageDriveUrl = null;

    try {
      const driveService = new GoogleDriveOAuthService();
      
      const wearingFilePath = wearingResult.screenshotPath || wearingResult.imageUrl;
      const holdingFilePath = holdingResult.screenshotPath || holdingResult.imageUrl;

      // Upload wearing image
      console.log(`  📤 Uploading wearing image...`);
      const wearingUploadResult = await driveService.uploadFile(
        wearingFilePath,
        `wearing-${flowId}-${Date.now()}.jpg`,
        {
          description: `Affiliate TikTok - Character Wearing Product [${flowId}]`,
          properties: {
            flowId: flowId,
            type: 'wearing'
          }
        }
      );
      wearingImageDriveUrl = wearingUploadResult.webViewLink;
      console.log(`  ✅ Wearing image uploaded: ${wearingImageDriveUrl}`);

      // Upload holding image
      console.log(`  📤 Uploading holding image...`);
      const holdingUploadResult = await driveService.uploadFile(
        holdingFilePath,
        `holding-${flowId}-${Date.now()}.jpg`,
        {
          description: `Affiliate TikTok - Character Holding Product [${flowId}]`,
          properties: {
            flowId: flowId,
            type: 'holding'
          }
        }
      );
      holdingImageDriveUrl = holdingUploadResult.webViewLink;
      console.log(`  ✅ Holding image uploaded: ${holdingImageDriveUrl}`);

      await logger.info(`Images uploaded to Google Drive`, 'step-2-drive-upload', {
        wearing_url: wearingImageDriveUrl,
        holding_url: holdingImageDriveUrl
      });
    } catch (driveError) {
      console.warn(`⚠️  Google Drive upload failed: ${driveError.message}`);
      console.warn('   Continuing without Google Drive upload...');
      await logger.warn(`Google Drive upload skipped: ${driveError.message}`, 'step-2-drive-upload');
      // Continue without Drive upload - not critical
    }

    const step2Duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Update flow state - INCLUDE productImagePath for Step 3/4
    flowStates.set(flowId, {
      ...flowState,
      step2: {
        wearingImagePath: wearingResult.screenshotPath || wearingResult.imageUrl,
        holdingImagePath: holdingResult.screenshotPath || holdingResult.imageUrl,
        wearingImageDriveUrl: wearingImageDriveUrl,
        holdingImageDriveUrl: holdingImageDriveUrl,
        productImagePath: productImagePath,  // Keep for Step 3/4
        duration: parseFloat(step2Duration)
      }
    });

    // Log
    await logger.info(`Step 2 image generation complete`, 'step-2-complete', {
      wearing: wearingResult.screenshotPath || wearingResult.imageUrl,
      holding: holdingResult.screenshotPath || holdingResult.imageUrl,
      wearing_drive_url: wearingImageDriveUrl,
      holding_drive_url: holdingImageDriveUrl,
      duration: parseFloat(step2Duration)
    });

    console.log(`✅ STEP 2 COMPLETE in ${step2Duration}s`);

    res.json({
      success: true,
      flowId,
      step: 2,
      wearingImage: wearingResult.screenshotPath || wearingResult.imageUrl,
      holdingImage: holdingResult.screenshotPath || holdingResult.imageUrl,
      wearingImageDriveUrl: wearingImageDriveUrl,
      holdingImageDriveUrl: holdingImageDriveUrl,
      step_duration: parseFloat(step2Duration)
    });

  } catch (error) {
    const step2Duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ STEP 2 ERROR [${flowId}] after ${step2Duration}s:`, error.message);
    console.error(`   Stack:`, error.stack);
    
    if (logger) {
      await logger.error(`Step 2 failed: ${error.message}`, 'step-2-error', { 
        stack: error.stack,
        duration: parseFloat(step2Duration)
      });
      await logger.endStage('step-2-generate-images', false);
    }
    
    res.status(500).json({
      success: false,
      flowId,
      step: 2,
      error: error.message,
      stage: 'image-generation',
      duration: parseFloat(step2Duration)
    });
  }
});

/**
 * 🟡 STEP 3: DEEP ANALYSIS
 * POST /api/ai/affiliate-video-tiktok/step-3-deep-analysis
 * 
 * Input: wearingImage, holdingImage, analysis, flowId
 * Output: { success, videoScripts, metadata, hashtags, flowId, step_duration }
 */
router.post('/step-3-deep-analysis', async (req, res) => {
  const flowId = req.body.flowId;
  const startTime = Date.now();
  let logger = null;

  try {
    console.log(`\n🟡 STEP 3: DEEP ANALYSIS [${flowId}]`);
    
    if (!flowId) throw new Error('flowId is required');

    logger = new SessionLogService(flowId, 'one-click');
    await logger.init();
    await logger.startStage('step-3-deep-analysis');
    await logger.info('Starting Step 3: Deep Analysis', 'step-3-init');

    // Get flow state from previous steps
    const flowState = flowStates.get(flowId);
    if (!flowState?.step2 || !flowState?.step1) {
      throw new Error('Previous steps not found. Please run Steps 1 and 2 first.');
    }

    const { analysis } = flowState.step1;
    const { wearingImagePath, holdingImagePath, productImagePath } = flowState.step2;
    const { videoDuration = 20, productFocus = 'full-outfit', language = 'vi' } = req.body;

    console.log(`📸 Using images from Step 2:`);
    console.log(`   Wearing: ${wearingImagePath}`);
    console.log(`   Holding: ${holdingImagePath}`);
    console.log(`   Product: ${productImagePath}`);

    if (!productImagePath) {
      throw new Error('Product image path is missing from Step 2. Please complete Step 2 again.');
    }

    // 💡 REUSE: Build deep analysis prompt with language support
    console.log(`\n📝 Building deep analysis prompt (language: ${language})...`);
    let deepAnalysisPrompt;
    
    const normalizedLanguage = (language || 'vi').split('-')[0].split('_')[0].toLowerCase();
    
    if (normalizedLanguage === 'vi') {
      console.log(`   Using Vietnamese prompt builder...`);
      deepAnalysisPrompt = VietnamesePromptBuilder.buildDeepAnalysisPrompt(
        productFocus,
        { videoDuration, voiceGender: 'female', voicePace: 'fast' }
      );
    } else {
      console.log(`   Using English prompt builder...`);
      deepAnalysisPrompt = affiliateVideoTikTokService.buildDeepAnalysisPrompt(
        analysis,
        productFocus
      );
    }

    console.log(`🤖 Analyzing 3 images for video script generation...`);
    
    // Use ChatGPT Service for deep analysis with ALL 3 images
    const chatGPTService = new ChatGPTService({ debug: false });
    await chatGPTService.initialize();
    
    const deepAnalysisResult = await chatGPTService.analyzeMultipleImages(
      [wearingImagePath, holdingImagePath, productImagePath],
      deepAnalysisPrompt
    );
    
    await chatGPTService.close();

    // Parse deep analysis result
    let deepAnalysis = null;
    if (deepAnalysisResult && deepAnalysisResult.success) {
      try {
        if (typeof deepAnalysisResult.data === 'string') {
          deepAnalysis = JSON.parse(deepAnalysisResult.data);
        } else {
          deepAnalysis = deepAnalysisResult.data;
        }
      } catch (parseError) {
        console.warn('⚠️ Could not parse deep analysis as JSON');
        deepAnalysis = deepAnalysisResult.data || deepAnalysisResult;
      }
    }

    if (!deepAnalysis) {
      throw new Error('Deep analysis failed');
    }

    // Extract scripts, metadata, hashtags
    const videoScripts = deepAnalysis.data?.videoScripts || [];
    const metadata = deepAnalysis.data?.metadata || {};
    const hashtags = deepAnalysis.data?.hashtags || [];

    const step3Duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Update flow state - INCLUDE images for Step 4
    flowStates.set(flowId, {
      ...flowState,
      step3: {
        videoScripts,
        metadata,
        hashtags,
        wearingImagePath,      // For Step 4
        holdingImagePath,      // For Step 4
        productImagePath,      // For Step 4
        language: normalizedLanguage,  // Log which language was used
        duration: parseFloat(step3Duration)
      }
    });

    // Log
    await logger.info(`Step 3 deep analysis complete`, 'step-3-complete', {
      scripts_count: videoScripts.length,
      hashtags_count: hashtags.length,
      language: normalizedLanguage,
      duration: parseFloat(step3Duration)
    });

    console.log(`✅ STEP 3 COMPLETE in ${step3Duration}s`);
    console.log(`   Scripts: ${videoScripts.length}`);
    console.log(`   Hashtags: ${hashtags.length}`);

    res.json({
      success: true,
      flowId,
      step: 3,
      videoScripts,
      metadata,
      hashtags,
      step_duration: parseFloat(step3Duration)
    });

  } catch (error) {
    console.error(`❌ STEP 3 ERROR [${flowId}]:`, error.message);
    if (logger) {
      await logger.error(error.message, 'step-3-error', { 
        stack: error.stack 
      });
    }
    
    res.status(500).json({
      success: false,
      flowId,
      step: 3,
      error: error.message,
      stage: 'deep-analysis'
    });
  }
});

/**
 * 🔴 STEP 4: GENERATE VIDEO
 * POST /api/ai/affiliate-video-tiktok/step-4-generate-video
 * 
 * Input: wearingImage, holdingImage, videoScripts, duration, flowId
 * Output: { success, videoPath, flowId, step_duration }
 */
router.post('/step-4-generate-video', async (req, res) => {
  const flowId = req.body.flowId;
  const startTime = Date.now();
  let logger = null;

  try {
    console.log(`\n🔴 STEP 4: GENERATE VIDEO [${flowId}]`);
    
    if (!flowId) throw new Error('flowId is required');

    logger = new SessionLogService(flowId, 'one-click');
    await logger.init();
    await logger.startStage('step-4-generate-video');
    await logger.info('Starting Step 4: Video Generation', 'step-4-init');

    // Get flow state
    const flowState = flowStates.get(flowId);
    if (!flowState?.step3 || !flowState?.step2) {
      throw new Error('Previous steps not found. Please run Steps 1-3 first.');
    }

    const { wearingImagePath, holdingImagePath, productImagePath } = flowState.step3;
    const { videoScripts, language } = flowState.step3;
    const { videoDuration = 20, aspectRatio = '9:16' } = req.body;

    console.log(`📸 Using images from Step 3:`);
    console.log(`   Wearing: ${wearingImagePath}`);
    console.log(`   Holding: ${holdingImagePath}`);
    console.log(`   Product: ${productImagePath}`);
    console.log(`   Scripts count: ${videoScripts.length}`);
    console.log(`   Language: ${language}`);

    if (!wearingImagePath || !holdingImagePath || !productImagePath) {
      throw new Error('Required image paths missing from Step 3. Images: wearing=' + !!wearingImagePath + ', holding=' + !!holdingImagePath + ', product=' + !!productImagePath);
    }

    if (!videoScripts || videoScripts.length === 0) {
      throw new Error('No video scripts available from Step 3');
    }

    console.log(`🎬 Generating video with ${videoScripts.length} segments...`);

    // 💡 REUSE: Use MultiVideoGenerationService
    const videoGenService = new MultiVideoGenerationService();

    const videoGenResult = await videoGenService.generateMultiVideoSequence({
      sessionId: flowId,
      useCase: 'affiliate-video-tiktok',
      duration: videoDuration,
      refImage: wearingImagePath,
      analysis: {
        scripts: videoScripts,
        characterImage: wearingImagePath,
        holdingImage: holdingImagePath,
        productImage: productImagePath
      },
      quality: 'high',
      aspectRatio,
      language: language || 'vi'
    });

    if (!videoGenResult?.success || !videoGenResult?.videos?.[0]) {
      throw new Error(`Video generation failed: ${videoGenResult?.error}`);
    }

    const videoPath = videoGenResult.videos[0].path;
    console.log(`✅ Video generated: ${videoPath}`);

    const step4Duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Update flow state
    flowStates.set(flowId, {
      ...flowState,
      step4: {
        videoPath,
        videoMetadata: videoGenResult.videos[0],
        duration: parseFloat(step4Duration)
      }
    });

    // Log
    await logger.info(`Step 4 video generation complete`, 'step-4-complete', {
      video_path: videoPath,
      duration: parseFloat(step4Duration)
    });

    console.log(`✅ STEP 4 COMPLETE in ${step4Duration}s`);

    res.json({
      success: true,
      flowId,
      step: 4,
      videoPath,
      step_duration: parseFloat(step4Duration)
    });

  } catch (error) {
    console.error(`❌ STEP 4 ERROR [${flowId}]:`, error.message);
    if (logger) {
      await logger.error(error.message, 'step-4-error', { 
        stack: error.stack 
      });
    }
    
    res.status(500).json({
      success: false,
      flowId,
      step: 4,
      error: error.message,
      stage: 'video-generation'
    });
  }
});

/**
 * 🔵 STEP 5: GENERATE VOICEOVER
 * POST /api/ai/affiliate-video-tiktok/step-5-generate-voiceover
 * 
 * Input: voiceoverScript, voiceGender, voicePace, flowId
 * Output: { success, audioPath, audioBuffer, flowId, step_duration }
 */
router.post('/step-5-generate-voiceover', async (req, res) => {
  const flowId = req.body.flowId;
  const startTime = Date.now();
  let logger = null;

  try {
    console.log(`\n🔵 STEP 5: GENERATE VOICEOVER [${flowId}]`);
    
    if (!flowId) throw new Error('flowId is required');

    logger = new SessionLogService(flowId, 'one-click');
    await logger.init();
    await logger.startStage('step-5-generate-voiceover');
    await logger.info('Starting Step 5: Voiceover Generation', 'step-5-init');

    // Get flow state
    const flowState = flowStates.get(flowId);
    if (!flowState?.step3) {
      throw new Error('Step 3 analysis not found. Please run Steps 1-3 first.');
    }

    const { videoScripts, metadata, language: step3Language } = flowState.step3;
    const { voiceGender = 'female', voicePace = 'fast', language = step3Language || 'vi' } = req.body;

    if (!videoScripts || videoScripts.length === 0) {
      throw new Error('No video scripts available for voiceover generation');
    }

    // Build voiceover script from video scripts
    const voiceoverText = videoScripts
      .map(script => typeof script === 'object' ? script.text || script.script : script)
      .join(' ');

    console.log(`🎤 Generating voiceover`);
    console.log(`   Gender: ${voiceGender}`);
    console.log(`   Pace: ${voicePace}`);
    console.log(`   Language: ${language}`);
    console.log(`   Text length: ${voiceoverText.length} chars (${voiceoverText.split(' ').length} words)`);
    console.log(`   Text: ${voiceoverText.substring(0, 100)}...`);

    // 💡 REUSE: Use TTSService
    const ttsService = new TTSService();

    // Map voice settings to TTS voice name
    const voiceName = mapVoiceSettings(voiceGender, voicePace);

    const audioBuffer = await ttsService.generateAudio(
      voiceoverText,
      voiceName,
      language.toUpperCase()
    );

    if (!audioBuffer) {
      throw new Error('Audio generation failed');
    }

    // Save audio file
    const audioDir = path.join(process.cwd(), 'temp', 'voiceovers');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const audioFilename = `voiceover-${flowId}-${Date.now()}.mp3`;
    const audioPath = path.join(audioDir, audioFilename);
    fs.writeFileSync(audioPath, audioBuffer);

    console.log(`✅ Voiceover generated: ${audioPath}`);

    const step5Duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Update flow state - Include language and text for logging
    flowStates.set(flowId, {
      ...flowState,
      step5: {
        audioPath,
        audioBuffer: audioBuffer.toString('base64'),
        voiceGender,
        voicePace,
        language,
        textLength: voiceoverText.length,
        wordCount: voiceoverText.split(' ').length,
        duration: parseFloat(step5Duration)
      }
    });

    // Log comprehensive info
    await logger.info(`Step 5 voiceover generation complete`, 'step-5-complete', {
      audio_path: audioPath,
      audio_size: fs.statSync(audioPath).size,
      voice_gender: voiceGender,
      voice_pace: voicePace,
      language: language,
      text_length: voiceoverText.length,
      word_count: voiceoverText.split(' ').length,
      duration: parseFloat(step5Duration)
    });

    console.log(`✅ STEP 5 COMPLETE in ${step5Duration}s`);

    res.json({
      success: true,
      flowId,
      step: 5,
      audioPath,
      step_duration: parseFloat(step5Duration)
    });

  } catch (error) {
    console.error(`❌ STEP 5 ERROR [${flowId}]:`, error.message);
    if (logger) {
      await logger.error(error.message, 'step-5-error', { 
        stack: error.stack 
      });
    }
    
    res.status(500).json({
      success: false,
      flowId,
      step: 5,
      error: error.message,
      stage: 'voiceover-generation'
    });
  }
});

/**
 * 🟣 STEP 6: FINALIZE PACKAGE
 * POST /api/ai/affiliate-video-tiktok/step-6-finalize
 * 
 * Input: flowId, uploadToDrive
 * Output: { success, finalPackage, downloadUrl, flowId }
 */
router.post('/step-6-finalize', async (req, res) => {
  const flowId = req.body.flowId;
  const startTime = Date.now();
  let logger = null;

  try {
    console.log(`\n🟣 STEP 6: FINALIZE [${flowId}]`);
    
    if (!flowId) throw new Error('flowId is required');

    logger = new SessionLogService(flowId, 'one-click');
    await logger.init();
    await logger.startStage('step-6-finalize');
    await logger.info('Starting Step 6: Finalization', 'step-6-init');

    // Get flow state
    const flowState = flowStates.get(flowId);
    if (!flowState) {
      throw new Error('Flow state not found');
    }

    const { step1, step2, step3, step4, step5 } = flowState;

    if (!step4?.videoPath) {
      throw new Error('Video not found. Please complete Steps 1-4 first.');
    }

    console.log(`📦 Preparing final package...`);
    console.log(`   Video: ${step4.videoPath}`);
    console.log(`   Audio: ${step5?.audioPath || 'not available'}`);
    console.log(`   Wearing image: ${step2.wearingImagePath}`);
    console.log(`   Holding image: ${step2.holdingImagePath}`);
    console.log(`   Product image: ${step2.productImagePath}`);

    // 💡 TODO: Combine video + audio using FFmpeg
    // For now, just prepare the package
    let finalizedVideoPath = step4.videoPath;

    if (step5?.audioPath && fs.existsSync(step5.audioPath)) {
      console.log(`🎵 Audio available: ${step5.audioPath}`);
      console.log(`   Size: ${fs.statSync(step5.audioPath).size} bytes`);
      // TODO: Merge video + audio
      // finalizedVideoPath = await combineVideoAndAudio(step4.videoPath, step5.audioPath);
    }

    // Prepare final package with ALL necessary info
    const finalPackage = {
      type: 'affiliate-video-tiktok',
      flowId: flowId,
      timestamp: new Date().toISOString(),
      video: {
        path: finalizedVideoPath,
        metadata: step4.videoMetadata,
        duration: step4.duration
      },
      audio: {
        path: step5?.audioPath || null,
        voiceGender: step5?.voiceGender,
        voicePace: step5?.voicePace,
        language: step5?.language || step3.language,
        duration: step5?.duration || null
      },
      images: {
        character: {
          path: step1?.characterImagePath,
          original: true
        },
        product: {
          path: step2.productImagePath,
          original: true
        },
        wearing: {
          path: step2.wearingImagePath,
          generated: true,
          driveUrl: step2.wearingImageDriveUrl,
          method: 'google-flow'
        },
        holding: {
          path: step2.holdingImagePath,
          generated: true,
          driveUrl: step2.holdingImageDriveUrl,
          method: 'google-flow'
        }
      },
      analysis: {
        character: step1?.analysis?.character,
        product: step1?.analysis?.product,
        videoScripts: step3.videoScripts,
        metadata: step3.metadata,
        hashtags: step3.hashtags
      }
    };

    console.log(`📦 Final package prepared successfully`);

    const step6Duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Calculate total duration
    const totalDuration = Object.keys(flowState)
      .filter(key => key.startsWith('step'))
      .reduce((sum, key) => sum + (flowState[key].duration || 0), 0);

    // Update flow state with comprehensive final info
    flowStates.set(flowId, {
      ...flowState,
      step6: {
        finalPackage,
        duration: parseFloat(step6Duration)
      },
      status: 'completed',
      totalDuration: totalDuration
    });

    // Log comprehensive final summary
    await logger.info(`Step 6 finalization complete`, 'step-6-complete', {
      final_package_type: finalPackage.type,
      final_package_contents: {
        video: finalPackage.video.path,
        audio: finalPackage.audio.path,
        images_count: Object.keys(finalPackage.images).length,
        hashtags_count: finalPackage.analysis.hashtags.length
      },
      duration: parseFloat(step6Duration)
    });

    // Log overall flow completion
    await logger.info(`ENTIRE FLOW COMPLETED`, 'flow-complete', {
      flowId: flowId,
      status: 'completed',
      total_duration: totalDuration,
      step1_duration: flowState.step1?.duration,
      step2_duration: flowState.step2?.duration,
      step3_duration: flowState.step3?.duration,
      step4_duration: flowState.step4?.duration,
      step5_duration: flowState.step5?.duration,
      step6_duration: parseFloat(step6Duration),
      deliverables: {
        video: finalPackage.video.path,
        audio: finalPackage.audio.path,
        wear_image: finalPackage.images.wearing.path,
        holding_image: finalPackage.images.holding.path,
        product_image: finalPackage.images.product.path
      }
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ STEP 6 COMPLETE in ${step6Duration}s`);
    console.log(`✅ ENTIRE FLOW COMPLETED SUCCESSFULLY!`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 FINAL SUMMARY:`);
    console.log(`   Flow ID: ${flowId}`);
    console.log(`   Total Duration: ${totalDuration.toFixed(1)}s`);
    console.log(`   Step 1 (Analysis): ${flowState.step1?.duration.toFixed(1)}s`);
    console.log(`   Step 2 (Image Gen): ${flowState.step2?.duration.toFixed(1)}s`);
    console.log(`   Step 3 (Deep Analysis): ${flowState.step3?.duration.toFixed(1)}s`);
    console.log(`   Step 4 (Video Gen): ${flowState.step4?.duration.toFixed(1)}s`);
    console.log(`   Step 5 (Voiceover): ${flowState.step5?.duration.toFixed(1)}s`);
    console.log(`   Step 6 (Finalize): ${step6Duration}s`);
    console.log(`\n📦 OUTPUT ARTIFACTS:`);
    console.log(`   Video: ${finalPackage.video.path}`);
    console.log(`   Audio: ${finalPackage.audio.path}`);
    console.log(`   Wearing Image: ${finalPackage.images.wearing.path}`);
    console.log(`   Holding Image: ${finalPackage.images.holding.path}`);
    console.log(`   Product Image: ${finalPackage.images.product.path}`);
    console.log(`   Hashtags: ${finalPackage.analysis.hashtags.length}`);
    console.log(`${'='.repeat(80)}\n`);

    res.json({
      success: true,
      flowId,
      step: 6,
      finalPackage,
      total_duration: totalDuration,
      steps_summary: {
        step1: { duration: flowState.step1?.duration },
        step2: { duration: flowState.step2?.duration },
        step3: { duration: flowState.step3?.duration },
        step4: { duration: flowState.step4?.duration },
        step5: { duration: flowState.step5?.duration },
        step6: { duration: parseFloat(step6Duration) }
      }
    });

  } catch (error) {
    console.error(`❌ STEP 6 ERROR [${flowId}]:`, error.message);
    if (logger) {
      await logger.error(error.message, 'step-6-error', { 
        stack: error.stack 
      });
    }
    
    res.status(500).json({
      success: false,
      flowId,
      step: 6,
      error: error.message,
      stage: 'finalization'
    });
  }
});

/**
 * 📊 GET PROGRESS
 * GET /api/ai/affiliate-video-tiktok/progress/:flowId
 * 
 * Returns current progress and completed steps
 */
router.get('/progress/:flowId', (req, res) => {
  const { flowId } = req.params;

  const flowState = flowStates.get(flowId);
  if (!flowState) {
    return res.status(404).json({
      success: false,
      error: 'Flow not found'
    });
  }

  const completedSteps = Object.keys(flowState)
    .filter(key => key.startsWith('step'))
    .length;

  const totalSteps = 6;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  const summary = {};
  for (let i = 1; i <= totalSteps; i++) {
    const stepKey = `step${i}`;
    const stepData = flowState[stepKey];
    summary[`step${i}`] = {
      completed: !!stepData,
      duration: stepData?.duration || 0
    };
  }

  res.json({
    success: true,
    flowId,
    progress,
    completed_steps: completedSteps,
    total_steps: totalSteps,
    status: flowState.status || 'in-progress',
    steps: summary,
    started_at: flowState.startedAt || new Date().toISOString()
  });
});

/**
 * 📋 GET STATUS
 * GET /api/ai/affiliate-video-tiktok/status/:flowId
 * 
 * Returns complete flow status with outputs
 */
router.get('/status/:flowId', (req, res) => {
  const { flowId } = req.params;

  const flowState = flowStates.get(flowId);
  if (!flowState) {
    return res.status(404).json({
      success: false,
      error: 'Flow not found'
    });
  }

  res.json({
    success: true,
    flowId,
    status: flowState.status || 'in-progress',
    flowState: {
      step1: {
        completed: !!flowState.step1,
        analysis: flowState.step1?.analysis,
        duration: flowState.step1?.duration
      },
      step2: {
        completed: !!flowState.step2,
        images: {
          wearing: flowState.step2?.wearingImagePath,
          holding: flowState.step2?.holdingImagePath
        },
        duration: flowState.step2?.duration
      },
      step3: {
        completed: !!flowState.step3,
        scripts_count: flowState.step3?.videoScripts?.length,
        hashtags: flowState.step3?.hashtags,
        duration: flowState.step3?.duration
      },
      step4: {
        completed: !!flowState.step4,
        video: flowState.step4?.videoPath,
        duration: flowState.step4?.duration
      },
      step5: {
        completed: !!flowState.step5,
        audio: flowState.step5?.audioPath,
        duration: flowState.step5?.duration
      },
      step6: {
        completed: !!flowState.step6,
        finalPackage: flowState.step6?.finalPackage,
        duration: flowState.step6?.duration
      }
    }
  });
});

// ============================================================
// HELPERS
// ============================================================

/**
 * Map voice gender and pace to TTS voice name
 */
function mapVoiceSettings(gender, pace) {
  // Map to available TTS voices
  const voiceMap = {
    'female-fast': 'Puck',      // Female, energetic
    'female-normal': 'Aoede',   // Female, neutral
    'female-slow': 'Breeze',    // Female, calm
    'male-fast': 'Charon',      // Male, energetic
    'male-normal': 'Lark',      // Male, neutral
    'male-slow': 'Ember'        // Male, calm
  };

  return voiceMap[`${gender}-${pace}`] || 'Puck';
}

export default router;
