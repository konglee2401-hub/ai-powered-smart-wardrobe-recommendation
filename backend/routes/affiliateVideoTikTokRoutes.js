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
import { buildDetailedPrompt, getSceneReferenceInfo } from '../services/smartPromptBuilder.js';
import VietnamesePromptBuilder from '../services/vietnamesePromptBuilder.js';
import aiController from '../controllers/aiController.js';
import { buildAnalysisPrompt, normalizeOptionLibrary, parseRecommendations, autoSaveRecommendations } from '../controllers/browserAutomationController.js';
import upload from '../middleware/upload.js';
import fs from 'fs';
import path from 'path';
import { buildStoryboardBlueprint, buildFrameGenerationPlan, buildSegmentPlanningPrompt, parseSegmentPlanningResponse } from '../services/affiliateStoryboardService.js';
import { extractLastFrame, concatenateVideos, isFfmpegAvailable } from '../services/videoContinuityService.js';
import SessionLog from '../models/SessionLog.js';

const router = express.Router();

// 💾 In-memory flow state storage (in production, use Redis)
const flowStates = new Map();
const step2Jobs = new Map();
const cloneWorkflowState = (value) => JSON.parse(JSON.stringify(value || null));

function sanitizeWorkflowState(value) {
  if (value == null) return value;
  if (Buffer.isBuffer(value)) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeWorkflowState(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value !== 'object') return value;

  const next = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (['characterImageBuffer', 'productImageBuffer', 'audioBuffer'].includes(key)) continue;
    const sanitized = sanitizeWorkflowState(nestedValue);
    if (sanitized !== undefined) {
      next[key] = sanitized;
    }
  }
  return next;
}

async function persistFlowStateSnapshot(flowId, flowType = 'affiliate-tiktok') {
  const flowState = flowStates.get(flowId);
  if (!flowState) return null;

  const logger = new SessionLogService(flowId, flowType);
  await logger.init();
  const sanitizedState = sanitizeWorkflowState({ ...flowState, flowId });
  await logger.storeWorkflowState(sanitizedState, { merge: false });
  return sanitizedState;
}

function deriveResumeTarget(flowState = {}) {
  if (!flowState || typeof flowState !== 'object') {
    return { nextStep: 1, canContinue: false, shouldPoll: false, reason: 'missing-state' };
  }

  const status = String(flowState.status || '').toLowerCase();
  const step2Status = String(flowState.step2?.status || '').toLowerCase();
  const hasStep1 = Boolean(flowState.step1?.analysis);
  const hasStep2 = step2Status === 'completed' || Boolean(flowState.step2?.frameLibrary?.length);
  const hasStep3 = Boolean(flowState.step3?.segmentPlan?.length || flowState.step3?.videoScripts?.length);
  const hasStep4 = Boolean(flowState.step4?.videoPath || flowState.step4?.segmentVideos?.length);
  const hasStep5 = Boolean(flowState.step5?.voiceoverText || flowState.step5?.audioPath);
  const hasStep6 = Boolean(flowState.step6?.finalPackage);

  if (status === 'completed' || hasStep6) {
    return { nextStep: 6, canContinue: false, shouldPoll: false, reason: 'completed' };
  }

  if (status.includes('processing') || status.includes('generating') || status === 'resuming' || status === 'action_required') {
    return {
      nextStep: hasStep5 ? 6 : hasStep4 ? 5 : hasStep3 ? 4 : hasStep2 ? 3 : hasStep1 ? 2 : 1,
      canContinue: false,
      shouldPoll: true,
      reason: 'in-progress'
    };
  }

  if (!hasStep1) return { nextStep: 1, canContinue: false, shouldPoll: false, reason: 'missing-step1' };
  if (!hasStep2) return { nextStep: 2, canContinue: true, shouldPoll: false, reason: 'resume-step2' };
  if (!hasStep3) return { nextStep: 3, canContinue: true, shouldPoll: false, reason: 'resume-step3' };
  if (!hasStep4) return { nextStep: 4, canContinue: true, shouldPoll: false, reason: 'resume-step4' };
  if (!hasStep5) return { nextStep: 5, canContinue: true, shouldPoll: false, reason: 'resume-step5' };
  return { nextStep: 6, canContinue: true, shouldPoll: false, reason: 'resume-step6' };
}

function parseJsonField(value, fallback = null) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function extractAnalysisText(result) {
  if (!result) return '';
  if (typeof result === 'string') return result;
  if (result.success && typeof result.data === 'string') return result.data;
  if (result.success && result.data && typeof result.data === 'object') return JSON.stringify(result.data);
  if (typeof result.data === 'string') return result.data;
  if (typeof result === 'object') return JSON.stringify(result);
  return String(result || '');
}

function buildAffiliateStep1AnalysisShape(parsedRecommendations, productFocus = 'full-outfit') {
  const characterProfile = parsedRecommendations?.characterProfile || {};
  const productDetails = parsedRecommendations?.productDetails || {};

  return {
    ...parsedRecommendations,
    characterProfile,
    productDetails,
    character: { ...characterProfile },
    product: { ...productDetails, focus: productFocus },
    recommendations: Object.fromEntries(
      Object.entries(parsedRecommendations || {}).filter(([key, value]) => !['characterProfile', 'productDetails', 'analysis', 'newOptions', 'character', 'product', 'recommendations'].includes(key) && value)
    )
  };
}

function pickLegacyFrameKeys(frameLibrary = []) {
  const hookStart = frameLibrary.find((frame) => frame.frameKey === 'seg1_start') || frameLibrary[0] || null;
  const showcaseEnd = frameLibrary.find((frame) => frame.segmentName === 'showcase' && frame.role === 'end')
    || frameLibrary.find((frame) => frame.frameKey === 'seg2_end')
    || frameLibrary[1]
    || hookStart;

  return { hookStart, showcaseEnd };
}

function resolveFramePath(frameLibrary = [], frameKey) {
  return frameLibrary.find((frame) => frame.frameKey === frameKey)?.imagePath || null;
}

function buildStoryboardMetadata(step1Analysis, reqBody) {
  return buildStoryboardBlueprint(step1Analysis, {
    productFocus: reqBody.productFocus || 'full-outfit',
    videoDuration: Number(reqBody.videoDuration) || 20,
    clipDuration: 8
  });
}

function buildStep2Payload(flowState) {
  const step2 = flowState?.step2 || {};
  const frameLibrary = Array.isArray(step2.frameLibrary) ? step2.frameLibrary : [];
  const { hookStart, showcaseEnd } = pickLegacyFrameKeys(frameLibrary);

  return {
    storyboardBlueprint: step2.storyboardBlueprint || null,
    framePlan: step2.framePlan || [],
    frameLibrary,
    wearingImage: hookStart?.imagePath || null,
    holdingImage: showcaseEnd?.imagePath || null,
    wearingImageDriveUrl: step2.wearingImageDriveUrl || null,
    holdingImageDriveUrl: step2.holdingImageDriveUrl || null,
    step_duration: step2.duration || null,
    job: {
      status: step2.status || 'idle',
      progress: step2.progress || null,
      error: step2.error || null,
      startedAt: step2.startedAt || null,
      completedAt: step2.completedAt || null
    }
  };
}

async function runStep2FrameGenerationJob(flowId, requestBody = {}) {
  const startedAt = Date.now();
  let logger = null;

  try {
    let flowState = flowStates.get(flowId);
    if (!flowState?.step1) {
      throw new Error('Step 1 not completed. Run Step 1 before Step 2.');
    }

    logger = new SessionLogService(flowId, 'affiliate-tiktok');
    await logger.init();
    await logger.startStage('step-2-generate-images');
    await logger.info('Starting Step 2: Frame Library Generation', 'step-2-init');

    const { analysis, characterImagePath, productImagePath, storyboardBlueprint: step1Blueprint } = flowState.step1;
    const {
      aspectRatio = '9:16',
      scene = '',
      lighting = 'soft-diffused',
      mood = 'confident',
      language = 'vi',
      characterName = '',
      characterDisplayName = '',
      productFocus = 'full-outfit'
    } = requestBody;

    const normalizedLanguage = (language || 'vi').split('-')[0].split('_')[0].toLowerCase();
    const storyboardBlueprint = step1Blueprint || buildStoryboardMetadata(analysis, requestBody);
    const framePlan = buildFrameGenerationPlan(analysis, storyboardBlueprint, {
      scene,
      lighting,
      mood,
      language: normalizedLanguage,
      characterName,
      characterDisplayName,
      productFocus
    });

    flowStates.set(flowId, {
      ...flowState,
      status: 'step2-processing',
      step2: {
        storyboardBlueprint,
        framePlan,
        frameLibrary: [],
        wearingImagePath: null,
        holdingImagePath: null,
        wearingPrompt: null,
        holdingPrompt: null,
        wearingImageDriveUrl: null,
        holdingImageDriveUrl: null,
        promptLanguage: normalizedLanguage,
        selectedOptions: { scene, lighting, mood, aspectRatio, language: normalizedLanguage },
        productImagePath,
        status: 'processing',
        startedAt: new Date().toISOString(),
        completedAt: null,
        error: null,
        progress: {
          phase: 'generating',
          message: 'Generating frame library in background',
          totalFrames: framePlan.frames.length,
          completedFrames: 0
        },
        duration: null
      },
      step3: null,
      step4: null,
      step5: null,
      step6: null
    });

    const prompts = framePlan.frames.map((frame) => frame.prompt);
    await persistFlowStateSnapshot(flowId);
    const imageGenService = new GoogleFlowAutomationService({
      type: 'image',
      aspectRatio,
      imageCount: 1,
      headless: true,
      outputDir: path.join(process.cwd(), 'temp', 'step-2-generate-images', flowId)
    });

    const multiGenResult = await imageGenService.generateMultiple(
      characterImagePath,
      productImagePath,
      prompts,
      { outputCount: 1 }
    );

    if (!multiGenResult?.success && !(multiGenResult?.results || []).some((result) => result?.success)) {
      throw new Error(multiGenResult?.error || 'Frame generation failed');
    }

    const frameLibrary = framePlan.frames.map((frame, index) => {
      const result = multiGenResult.results?.[index];
      if (!result?.success || !result?.downloadedFile) {
        throw new Error(`Frame generation failed for ${frame.key}: ${result?.error || 'missing file'}`);
      }

      return {
        frameKey: frame.key,
        segmentIndex: frame.segmentIndex,
        segmentName: frame.segmentName,
        role: frame.role,
        focus: frame.focus,
        purpose: frame.purpose,
        prompt: frame.prompt,
        imagePath: result.downloadedFile,
        href: result.href || null
      };
    });

    const { hookStart, showcaseEnd } = pickLegacyFrameKeys(frameLibrary);
    const step2Duration = ((Date.now() - startedAt) / 1000).toFixed(2);
    flowState = flowStates.get(flowId) || flowState;

    flowStates.set(flowId, {
      ...flowState,
      status: 'step2-complete',
      step2: {
        ...(flowState.step2 || {}),
        storyboardBlueprint,
        framePlan,
        frameLibrary,
        wearingImagePath: hookStart?.imagePath || null,
        holdingImagePath: showcaseEnd?.imagePath || null,
        wearingPrompt: hookStart?.prompt || null,
        holdingPrompt: showcaseEnd?.prompt || null,
        wearingImageDriveUrl: null,
        holdingImageDriveUrl: null,
        promptLanguage: normalizedLanguage,
        selectedOptions: { scene, lighting, mood, aspectRatio, language: normalizedLanguage },
        productImagePath,
        status: 'completed',
        completedAt: new Date().toISOString(),
        error: null,
        progress: {
          phase: 'completed',
          message: 'Frame library generation completed',
          totalFrames: frameLibrary.length,
          completedFrames: frameLibrary.length
        },
        duration: parseFloat(step2Duration)
      }
    });

    await persistFlowStateSnapshot(flowId);
    await logger.info('Step 2 frame library generation complete', 'step-2-complete', {
      frames: frameLibrary.length,
      storyboardTemplate: storyboardBlueprint.templateKey,
      duration: parseFloat(step2Duration)
    });
    await logger.endStage('step-2-generate-images', true);
  } catch (error) {
    const step2Duration = ((Date.now() - startedAt) / 1000).toFixed(2);
    const flowState = flowStates.get(flowId) || {};
    flowStates.set(flowId, {
      ...flowState,
      status: 'failed',
      step2: {
        ...(flowState.step2 || {}),
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: error.message,
        progress: {
          ...(flowState.step2?.progress || {}),
          phase: 'failed',
          message: error.message
        },
        duration: parseFloat(step2Duration)
      }
    });

    console.error(`\n? STEP 2 ERROR [${flowId}] after ${step2Duration}s:`, error.message);
    await persistFlowStateSnapshot(flowId);
    if (logger) {
      await logger.error(`Step 2 failed: ${error.message}`, 'step-2-error', { stack: error.stack, duration: parseFloat(step2Duration) });
      await logger.endStage('step-2-generate-images', false);
    }
  } finally {
    step2Jobs.delete(flowId);
  }
}

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
    logger = new SessionLogService(flowId, 'affiliate-tiktok');
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
    const productFocus = req.body.productFocus || 'full-outfit';
    const selectedCharacter = parseJsonField(req.body.selectedCharacter, null);
    const optionsLibrary = normalizeOptionLibrary(parseJsonField(req.body.optionsLibrary, {}));
    const analysisPrompt = buildAnalysisPrompt({
      scene: req.body.scene || 'studio',
      lighting: req.body.lighting || 'soft-diffused',
      mood: req.body.mood || 'confident',
      style: req.body.style || 'minimalist',
      colorPalette: req.body.colorPalette || 'neutral',
      cameraAngle: req.body.cameraAngle || 'eye-level',
      hairstyle: req.body.hairstyle || null,
      makeup: req.body.makeup || null,
      aspectRatio: req.body.aspectRatio || '9:16',
      useCase: 'affiliate-video-tiktok',
      productFocus,
      selectedCharacter,
      optionsLibrary
    });
    console.log(`\n?? Building analysis prompt...`);
    console.log(`  ? Prompt built (${analysisPrompt.length} chars)`);
    await logger.info(`Analysis prompt built (${analysisPrompt.length} characters)`, 'step-1-prompt', {
      optionLibraryCategories: Object.keys(optionsLibrary || {}),
      selectedCharacter: selectedCharacter?.alias || selectedCharacter?.name || null,
      productFocus
    });

    // ========== ANALYZE WITH CHATGPT ==========
    console.log(`\n?? Initializing ChatGPT Service...`);
    const chatGPTService = new ChatGPTService({ debug: false });
    await chatGPTService.initialize();
    console.log(`  ? ChatGPT browser initialized`);
    await logger.info(`ChatGPT service initialized`, 'step-1-chatgpt');

    console.log(`\n?? Analyzing images with ChatGPT...`);
    const analysisResult = await chatGPTService.analyzeMultipleImages(
      [characterImagePath, productImagePath],
      analysisPrompt
    );

    console.log(`  ? Analysis result received`);
    await logger.info(`ChatGPT analysis completed`, 'step-1-chatgpt');

    await chatGPTService.close();
    console.log(`  ? ChatGPT browser closed`);

    // ========== PARSE ANALYSIS RESULT ==========
    console.log(`\n?? Parsing analysis result...`);
    if (!analysisResult) {
      throw new Error('ChatGPT returned empty result');
    }

    const analysisText = extractAnalysisText(analysisResult);
    if (!analysisText) {
      throw new Error('No analysis text received from ChatGPT');
    }

    const parsedRecommendations = parseRecommendations(analysisText, optionsLibrary);
    const analysis = buildAffiliateStep1AnalysisShape(parsedRecommendations, productFocus);
    const storyboardBlueprint = buildStoryboardMetadata(analysis, req.body);
    analysis.storyboardBlueprint = storyboardBlueprint;
    const newOptionsCreated = await autoSaveRecommendations(parsedRecommendations);

    console.log(`  ? Analysis parsed with shared recommendation schema`);
    await logger.info(`Analysis parsed and normalized`, 'step-1-parse', {
      keys: Object.keys(analysis || {}),
      newOptionsCreated: newOptionsCreated.length,
      storyboardTemplate: storyboardBlueprint.templateKey,
      requiredFrames: storyboardBlueprint.requiredFrames.length
    });

    // ========== STORE AND RETURN ==========
    const step1Duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n? STEP 1 COMPLETE in ${step1Duration}s`);

    await logger.info(`Step 1 analysis complete`, 'step-1-complete', {
      analysis_keys: Object.keys(analysis || {}),
      duration: parseFloat(step1Duration),
      newOptionsCreated: newOptionsCreated.length
    });

    flowStates.set(flowId, {
      step1: {
        analysis,
        analysisText,
        newOptionsCreated,
        selectedCharacter,
        optionsLibrary,
        characterImageBuffer,
        productImageBuffer,
        characterImagePath,
        productImagePath,
        storyboardBlueprint,
        duration: parseFloat(step1Duration)
      },
      status: 'step1-complete',
      startedAt: new Date().toISOString()
    });

    await persistFlowStateSnapshot(flowId);
    res.json({
      success: true,
      flowId,
      step: 1,
      analysis,
      analysisText,
      newOptionsCreated,
      storyboardBlueprint,
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

  try {
    console.log(`
?? STEP 2: QUEUE FRAME LIBRARY [${flowId}]`);

    if (!flowId) throw new Error('flowId is required');

    const flowState = flowStates.get(flowId);
    if (!flowState?.step1) {
      throw new Error('Step 1 not completed. Run Step 1 before Step 2.');
    }

    if (flowState.step2?.status === 'completed') {
      return res.json({
        success: true,
        flowId,
        step: 2,
        queued: false,
        ...buildStep2Payload(flowState)
      });
    }

    if (step2Jobs.has(flowId) || flowState.step2?.status === 'processing') {
      return res.status(202).json({
        success: true,
        flowId,
        step: 2,
        queued: true,
        status: flowState.step2?.status || 'processing',
        ...buildStep2Payload(flowState)
      });
    }

    const jobPromise = runStep2FrameGenerationJob(flowId, req.body);
    step2Jobs.set(flowId, jobPromise);

    const queuedState = flowStates.get(flowId) || flowState;
    return res.status(202).json({
      success: true,
      flowId,
      step: 2,
      queued: true,
      status: 'processing',
      message: 'Step 2 started in background. Poll /status/:flowId for progress.',
      ...buildStep2Payload(queuedState)
    });
  } catch (error) {
    console.error(`
? STEP 2 QUEUE ERROR [${flowId}]:`, error.message);
    res.status(500).json({
      success: false,
      flowId,
      step: 2,
      error: error.message,
      stage: 'frame-generation'
    });
  }
});
/**
 * ???? STEP 3: DEEP ANALYSIS
 * POST /api/ai/affiliate-video-tiktok/step-3-deep-analysis
 * 
 * Input: frameLibrary, analysis, flowId
 * Output: { success, videoScripts, metadata, hashtags, flowId, step_duration }
 */
router.post('/step-3-deep-analysis', async (req, res) => {
  const flowId = req.body.flowId;
  const startTime = Date.now();
  let logger = null;

  try {
    console.log(`
?? STEP 3: DEEP ANALYSIS [${flowId}]`);

    if (!flowId) throw new Error('flowId is required');

    logger = new SessionLogService(flowId, 'affiliate-tiktok');
    await logger.init();
    await logger.startStage('step-3-deep-analysis');
    await logger.info('Starting Step 3: Segment Planning', 'step-3-init');

    const flowState = flowStates.get(flowId);
    if (!flowState?.step2 || !flowState?.step1) {
      throw new Error('Previous steps not found. Please run Steps 1 and 2 first.');
    }

    const { analysis, storyboardBlueprint } = flowState.step1;
    const { frameLibrary, productImagePath, promptLanguage } = flowState.step2;
    const { productFocus = 'full-outfit', language = promptLanguage || 'vi' } = req.body;
    const normalizedLanguage = (language || promptLanguage || 'vi').split('-')[0].split('_')[0].toLowerCase();

    if (!Array.isArray(frameLibrary) || frameLibrary.length === 0) {
      throw new Error('Frame library is missing from Step 2.');
    }

    const plannerPrompt = buildSegmentPlanningPrompt({
      analysis,
      blueprint: storyboardBlueprint,
      frameLibrary,
      productFocus,
      language: normalizedLanguage
    });

    const chatGPTService = new ChatGPTService({ debug: false });
    await chatGPTService.initialize();

    let plannerResult = null;
    try {
      plannerResult = await chatGPTService.analyzeMultipleImages(
        [...frameLibrary.map((frame) => frame.imagePath), productImagePath].filter(Boolean),
        plannerPrompt
      );
    } finally {
      await chatGPTService.close();
    }

    const parsedPlan = parseSegmentPlanningResponse(plannerResult, {
      analysis,
      blueprint: storyboardBlueprint,
      frameLibrary,
      productFocus,
      language: normalizedLanguage
    });

    const segmentPlan = (parsedPlan.segments || []).map((segment, index) => ({
      segmentIndex: segment.segmentIndex || index + 1,
      segmentName: segment.segmentName || storyboardBlueprint.segments?.[index]?.segmentName || ('segment-' + (index + 1)),
      durationSec: Number(segment.durationSec) || storyboardBlueprint.segments?.[index]?.durationSec || 6,
      startFrameKey: segment.startFrameKey || storyboardBlueprint.segments?.[index]?.startFrameKey,
      endFrameKey: segment.endFrameKey || storyboardBlueprint.segments?.[index]?.endFrameKey,
      videoPrompt: segment.videoPrompt || segment.script || '',
      voiceoverText: segment.voiceoverText || '',
      continuityTargetForNextSegment: segment.continuityTargetForNextSegment || null
    }));

    const step3Duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const voiceoverScript = parsedPlan.voiceoverScript || segmentPlan.map((segment) => segment.voiceoverText).join(' ');
    const hashtags = Array.isArray(parsedPlan.hashtags) ? parsedPlan.hashtags : [];

    flowStates.set(flowId, {
      ...flowState,
      step3: {
        storyboardBlueprint,
        frameLibrary,
        segmentPlan,
        videoScripts: segmentPlan,
        metadata: { storyboardTemplate: storyboardBlueprint.templateKey },
        hashtags,
        voiceoverScript,
        deepAnalysisPrompt: plannerPrompt,
        deepAnalysis: parsedPlan,
        productImagePath,
        language: normalizedLanguage,
        duration: parseFloat(step3Duration)
      },
      status: 'step3-complete'
    });

    await persistFlowStateSnapshot(flowId);
    await logger.info('Step 3 segment planning complete', 'step-3-complete', {
      segments: segmentPlan.length,
      hashtags: hashtags.length,
      duration: parseFloat(step3Duration)
    });

    res.json({
      success: true,
      flowId,
      step: 3,
      storyboardBlueprint,
      segmentPlan,
      videoScripts: segmentPlan,
      metadata: { storyboardTemplate: storyboardBlueprint.templateKey },
      voiceoverScript,
      hashtags,
      step_duration: parseFloat(step3Duration)
    });
  } catch (error) {
    console.error(`? STEP 3 ERROR [${flowId}]:`, error.message);
    if (logger) {
      await logger.error(error.message, 'step-3-error', { stack: error.stack });
    }

    res.status(500).json({
      success: false,
      flowId,
      step: 3,
      error: error.message,
      stage: 'segment-planning'
    });
  }
});

/**
 * ???? STEP 4: GENERATE VIDEO
 * POST /api/ai/affiliate-video-tiktok/step-4-generate-video
 * 
 * Input: segmentPlan, duration, flowId
 * Output: { success, videoPath, flowId, step_duration }
 */
router.post('/step-4-generate-video', async (req, res) => {
  const flowId = req.body.flowId;
  const startTime = Date.now();
  let logger = null;

  try {
    console.log(`
?? STEP 4: GENERATE VIDEO [${flowId}]`);

    if (!flowId) throw new Error('flowId is required');

    logger = new SessionLogService(flowId, 'affiliate-tiktok');
    await logger.init();
    await logger.startStage('step-4-generate-video');
    await logger.info('Starting Step 4: Sequential Frames Video Generation', 'step-4-init');

    const flowState = flowStates.get(flowId);
    if (!flowState?.step3 || !flowState?.step2) {
      throw new Error('Previous steps not found. Please run Steps 1-3 first.');
    }

    const { segmentPlan, frameLibrary } = flowState.step3;
    const { videoDuration = 20, aspectRatio = '9:16' } = req.body;

    if (!Array.isArray(segmentPlan) || segmentPlan.length === 0) {
      throw new Error('No segment plan available from Step 3');
    }

    const tempVideoDir = path.join(process.cwd(), 'temp', 'step-4-generate-video', flowId);
    if (!fs.existsSync(tempVideoDir)) {
      fs.mkdirSync(tempVideoDir, { recursive: true });
    }

    const ffmpegReady = await isFfmpegAvailable();
    const segmentVideos = [];
    let chainedStartFramePath = null;

    for (const segment of segmentPlan) {
      const startFramePath = chainedStartFramePath || resolveFramePath(frameLibrary, segment.startFrameKey);
      const endFramePath = resolveFramePath(frameLibrary, segment.endFrameKey);

      if (!startFramePath || !endFramePath) {
        throw new Error(`Missing frame path for segment ${segment.segmentIndex}: start=${segment.startFrameKey}, end=${segment.endFrameKey}`);
      }

      const videoGenService = new GoogleFlowAutomationService({
        type: 'video',
        aspectRatio,
        videoCount: 1,
        headless: false,
        outputDir: tempVideoDir,
        videoReferenceType: 'frames',
        timeouts: { generation: Math.max(300000, (Number(videoDuration) + 60) * 1000) }
      });

      const videoResult = await videoGenService.generateVideo(
        segment.videoPrompt,
        startFramePath,
        endFramePath,
        { download: true, reloadAfter: false }
      );

      if (!videoResult?.success || !videoResult?.path) {
        throw new Error(`Segment ${segment.segmentIndex} generation failed: ${videoResult?.error || 'unknown error'}`);
      }

      const extractedFramePath = await extractLastFrame(
        videoResult.path,
        path.join(tempVideoDir, 'segment-' + segment.segmentIndex + '-last-frame.jpg')
      );

      segmentVideos.push({
        segmentIndex: segment.segmentIndex,
        segmentName: segment.segmentName,
        startFramePath,
        endFramePath,
        chainedStartFrameUsed: Boolean(chainedStartFramePath),
        continuityFrameExtracted: extractedFramePath,
        ffmpegFrameExtractionAvailable: ffmpegReady,
        path: videoResult.path,
        metadata: videoResult
      });

      chainedStartFramePath = extractedFramePath || endFramePath;
    }

    const stitchedVideoPath = await concatenateVideos(
      segmentVideos.map((segment) => segment.path),
      path.join(tempVideoDir, 'stitched-' + flowId + '.mp4')
    );
    const assemblyStatus = stitchedVideoPath
      ? 'stitched'
      : segmentVideos.length > 1
        ? 'segments-only'
        : 'single-segment';
    const primaryVideoPath = stitchedVideoPath || segmentVideos[0]?.path || null;

    const step4Duration = ((Date.now() - startTime) / 1000).toFixed(2);

    flowStates.set(flowId, {
      ...flowState,
      step4: {
        videoPath: primaryVideoPath,
        stitchedVideoPath: stitchedVideoPath || null,
        segmentVideos,
        videoMetadata: {
          segmentCount: segmentVideos.length,
          ffmpegFrameExtractionAvailable: ffmpegReady,
          sequentialFramesMode: true,
          assemblyStatus,
          requiresAssembly: assemblyStatus === 'segments-only',
          ffmpegStitchingAvailable: Boolean(stitchedVideoPath) || segmentVideos.length <= 1
        },
        duration: parseFloat(step4Duration)
      },
      status: 'step4-complete'
    });

    await persistFlowStateSnapshot(flowId);
    await logger.info('Step 4 sequential video generation complete', 'step-4-complete', {
      segments: segmentVideos.length,
      stitchedVideoPath: stitchedVideoPath || null,
      assemblyStatus,
      duration: parseFloat(step4Duration)
    });

    res.json({
      success: true,
      flowId,
      step: 4,
      videoPath: primaryVideoPath,
      segmentVideos,
      stitchedVideoPath: stitchedVideoPath || null,
      assemblyStatus,
      requiresAssembly: assemblyStatus === 'segments-only',
      step_duration: parseFloat(step4Duration)
    });
  } catch (error) {

    console.error(`? STEP 4 ERROR [${flowId}]:`, error.message);
    if (logger) {
      await logger.error(error.message, 'step-4-error', { stack: error.stack });
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
 * ???? STEP 5: GENERATE VOICEOVER
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

    logger = new SessionLogService(flowId, 'affiliate-tiktok');
    await logger.init();
    await logger.startStage('step-5-generate-voiceover');
    await logger.info('Starting Step 5: Voiceover Generation', 'step-5-init');

    // Get flow state
    const flowState = flowStates.get(flowId);
    if (!flowState?.step3) {
      throw new Error('Step 3 analysis not found. Please run Steps 1-3 first.');
    }

    const { videoScripts, metadata, language: step3Language, voiceoverScript } = flowState.step3;
    const { voiceGender = 'female', voicePace = 'fast', language = step3Language || 'vi' } = req.body;

    if ((!videoScripts || videoScripts.length === 0) && !voiceoverScript) {
      throw new Error('No video scripts or voiceover script available for voiceover generation');
    }

    const voiceoverText = voiceoverScript || videoScripts
      .map(script => typeof script === 'object' ? script.voiceoverText || script.text || script.script || script.videoPrompt : script)
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
        voiceoverText,
        textLength: voiceoverText.length,
        wordCount: voiceoverText.split(' ').length,
        duration: parseFloat(step5Duration)
      }
    });

    // Log comprehensive info
    await persistFlowStateSnapshot(flowId);
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

    logger = new SessionLogService(flowId, 'affiliate-tiktok');
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
        },
        frameLibrary: (step2.frameLibrary || []).map((frame) => ({
          key: frame.frameKey,
          path: frame.imagePath,
          segmentIndex: frame.segmentIndex,
          role: frame.role
        }))
      },
      analysis: {
        character: step1?.analysis?.character,
        product: step1?.analysis?.product,
        videoScripts: step3.videoScripts,
        segmentPlan: step3.segmentPlan || step3.videoScripts,
        metadata: step3.metadata,
        hashtags: step3.hashtags,
        voiceoverScript: step3.voiceoverScript || null
      },
      videoSegments: step4.segmentVideos || []
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
    await persistFlowStateSnapshot(flowId);
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
/**
 * POST /api/ai/affiliate-video-tiktok/resume/:flowId
 * Restore a persisted affiliate flow snapshot from MongoDB into in-memory state.
 */
router.post('/resume/:flowId', async (req, res) => {
  try {
    const { flowId } = req.params;
    if (!flowId) {
      return res.status(400).json({ success: false, error: 'flowId is required' });
    }

    const session = await SessionLog.findOne({ sessionId: flowId }).select('sessionId status workflowState error updatedAt');
    if (!session?.workflowState) {
      return res.status(404).json({ success: false, error: 'No resumable workflow state found in DB', flowId });
    }

    const workflowState = cloneWorkflowState(session.workflowState);
    workflowState.status = workflowState.status || session.status || 'in-progress';
    flowStates.set(flowId, workflowState);

    const resume = deriveResumeTarget(workflowState);

    return res.json({
      success: true,
      flowId,
      status: workflowState.status,
      workflowState,
      sessionStatus: session.status,
      error: session.error || null,
      updatedAt: session.updatedAt,
      nextStep: resume.nextStep,
      canContinue: resume.canContinue,
      shouldPoll: resume.shouldPoll,
      reason: resume.reason
    });
  } catch (error) {
    console.error("Resume failed: ", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});
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
router.get('/status/:flowId', async (req, res) => {
  const { flowId } = req.params;

  let flowState = flowStates.get(flowId);
  if (!flowState) {
    const session = await SessionLog.findOne({ sessionId: flowId }).select('workflowState status');
    if (session?.workflowState) {
      flowState = cloneWorkflowState(session.workflowState);
      flowState.status = flowState.status || session.status || 'in-progress';
      flowStates.set(flowId, flowState);
    }
  }

  if (!flowState) {
    return res.status(404).json({
      success: false,
      error: 'Flow not found'
    });
  }

  const buildMediaPreview = (filePath, extra = {}) => {
    if (!filePath) return null;

    const normalizedPath = String(filePath);
    const exists = fs.existsSync(normalizedPath);
    const stats = exists ? fs.statSync(normalizedPath) : null;
    const ext = path.extname(normalizedPath || '').replace('.', '').toLowerCase();
    const tempRoot = path.join(process.cwd(), 'temp');
    const relativeTempPath = normalizedPath.startsWith(tempRoot)
      ? path.relative(tempRoot, normalizedPath).split(path.sep).join('/')
      : null;

    return {
      path: normalizedPath,
      previewUrl: relativeTempPath ? `/temp/${relativeTempPath}` : null,
      title: path.basename(normalizedPath),
      format: ext || null,
      sizeBytes: stats?.size || null,
      sizeLabel: stats?.size ? formatBytes(stats.size) : null,
      exists,
      ...extra
    };
  };

  const frameLibraryPreviews = (flowState.step2?.frameLibrary || []).map((frame) => buildMediaPreview(frame.imagePath, {
    kind: 'frame',
    frameKey: frame.frameKey,
    segmentIndex: frame.segmentIndex,
    segmentName: frame.segmentName,
    role: frame.role,
    purpose: frame.purpose,
    focus: frame.focus,
    href: frame.href || null
  }));
  const segmentVideoPreviews = (flowState.step4?.segmentVideos || []).map((segment) => buildMediaPreview(segment.path, {
    kind: 'segment-video',
    segmentIndex: segment.segmentIndex,
    segmentName: segment.segmentName,
    startFramePath: segment.startFramePath,
    endFramePath: segment.endFramePath,
    chainedStartFrameUsed: segment.chainedStartFrameUsed,
    continuityFrameExtracted: segment.continuityFrameExtracted,
    ffmpegFrameExtractionAvailable: segment.ffmpegFrameExtractionAvailable
  }));

  res.json({
    success: true,
    flowId,
    status: flowState.status || 'in-progress',
    totalDuration: flowState.totalDuration || null,
    flowState: {
      step1: {
        completed: !!flowState.step1,
        analysis: flowState.step1?.analysis,
        analysisText: flowState.step1?.analysisText,
        storyboardBlueprint: flowState.step1?.storyboardBlueprint || null,
        selectedCharacter: flowState.step1?.selectedCharacter,
        characterImage: buildMediaPreview(flowState.step1?.characterImagePath, { kind: 'character' }),
        productImage: buildMediaPreview(flowState.step1?.productImagePath, { kind: 'product' }),
        duration: flowState.step1?.duration
      },
      step2: {
        completed: flowState.step2?.status === 'completed',
        storyboardBlueprint: flowState.step2?.storyboardBlueprint || null,
        framePlan: flowState.step2?.framePlan || [],
        prompts: {
          language: flowState.step2?.promptLanguage || null,
          wearing: flowState.step2?.wearingPrompt || null,
          holding: flowState.step2?.holdingPrompt || null
        },
        selectedOptions: flowState.step2?.selectedOptions || null,
        images: {
          wearing: buildMediaPreview(flowState.step2?.wearingImagePath, {
            driveUrl: flowState.step2?.wearingImageDriveUrl || null,
            uploadedToDrive: Boolean(flowState.step2?.wearingImageDriveUrl),
            kind: 'wearing'
          }),
          holding: buildMediaPreview(flowState.step2?.holdingImagePath, {
            driveUrl: flowState.step2?.holdingImageDriveUrl || null,
            uploadedToDrive: Boolean(flowState.step2?.holdingImageDriveUrl),
            kind: 'holding'
          })
        },
        frameLibrary: frameLibraryPreviews,
        status: flowState.step2?.status || null,
        progress: flowState.step2?.progress || null,
        error: flowState.step2?.error || null,
        startedAt: flowState.step2?.startedAt || null,
        completedAt: flowState.step2?.completedAt || null,
        duration: flowState.step2?.duration
      },
      step3: {
        completed: !!flowState.step3,
        storyboardBlueprint: flowState.step3?.storyboardBlueprint || null,
        deepAnalysisPrompt: flowState.step3?.deepAnalysisPrompt || null,
        scripts: flowState.step3?.videoScripts || [],
        segmentPlan: flowState.step3?.segmentPlan || flowState.step3?.videoScripts || [],
        metadata: flowState.step3?.metadata || {},
        hashtags: flowState.step3?.hashtags || [],
        voiceoverScript: flowState.step3?.voiceoverScript || '',
        language: flowState.step3?.language || null,
        duration: flowState.step3?.duration
      },
      step4: {
        completed: !!flowState.step4,
        video: buildMediaPreview(flowState.step4?.videoPath, {
          ...(flowState.step4?.videoMetadata || {}),
          kind: 'video'
        }),
        stitchedVideo: buildMediaPreview(flowState.step4?.stitchedVideoPath, {
          ...(flowState.step4?.videoMetadata || {}),
          kind: 'stitched-video'
        }),
        segmentVideos: segmentVideoPreviews,
        duration: flowState.step4?.duration
      },
      step5: {
        completed: !!flowState.step5,
        audio: buildMediaPreview(flowState.step5?.audioPath, {
          voiceGender: flowState.step5?.voiceGender || null,
          voicePace: flowState.step5?.voicePace || null,
          language: flowState.step5?.language || null,
          textLength: flowState.step5?.textLength || null,
          wordCount: flowState.step5?.wordCount || null,
          kind: 'audio'
        }),
        voiceoverText: flowState.step5?.voiceoverText || '',
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






