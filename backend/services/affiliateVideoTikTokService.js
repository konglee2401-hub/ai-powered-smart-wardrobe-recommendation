/**
 * Affiliate Video TikTok Flow Service
 * 
 * Comprehensive flow for generating TikTok affiliate content:
 * - Parallel image generation (wearing + holding)
 * - Deep ChatGPT analysis for video production
 * - Voiceover script generation (female narrator)
 * - Hashtag suggestions
 * - Video generation
 * - TTS voice generation
 */

import { analyzeUnified } from './unifiedAnalysisService.js';
import { buildDetailedPrompt, buildFluxPrompt } from './smartPromptBuilder.js';
import GrokServiceV2 from './browser/grokServiceV2.js';
import BFLPlaygroundService from './browser/bflPlaygroundService.js';
import GoogleFlowAutomationService from './googleFlowAutomationService.js';
import ChatGPTService from './browser/chatgptService.js';
import GoogleDriveOAuthService from './googleDriveOAuth.js';

// ============================================================
// PROVIDER SELECTION HELPER
// ============================================================

/**
 * Get browser service for image generation based on provider
 * @param {string} provider - Provider ID: 'bfl', 'grok', 'google-flow'
 * @param {object} options - Service options (outputDir, headless, debugMode)
 * @returns {object} Browser service instance
 */
function getImageGenerationService(provider, options = {}) {
  const { outputDir, headless = false, debugMode = false } = options;
  
  console.log(`🔌 Selecting image generation provider: ${provider}`);
  
  switch (provider) {
    case 'bfl':
    case 'bfl-playground':
      return new BFLPlaygroundService({
        outputDir,
        headless,
        debugMode
      });
    case 'grok':
    case 'grok.com':
      return new GrokServiceV2({
        outputDir,
        headless,
        debugMode
      });
    case 'google-flow':
    case 'google':
      return new GoogleFlowAutomationService({
        type: 'image',
        aspectRatio: '9:16',
        imageCount: 1,
        model: 'Nano Banana 2',
        headless,
        ...options
      });
    default:
      console.warn(`⚠️ Unknown provider '${provider}', defaulting to Grok`);
      return new GrokServiceV2({
        outputDir,
        headless,
        debugMode
      });
  }
}

/**
 * Get browser service for video generation based on provider
 * @param {string} provider - Provider ID: 'grok', 'google-flow'
 * @param {object} options - Service options (outputDir, headless, debugMode)
 * @returns {object} Browser service instance
 */
function getVideoGenerationService(provider, options = {}) {
  const { outputDir, headless = false, debugMode = false } = options;
  
  console.log(`🔌 Selecting video generation provider: ${provider}`);
  
  switch (provider) {
    case 'grok':
    case 'grok.com':
      return new GrokServiceV2({
        outputDir,
        headless,
        debugMode
      });
    case 'google-flow':
    case 'google':
      return new GoogleFlowAutomationService({
        type: 'video',
        aspectRatio: '9:16',
        headless,
        ...options
      });
    default:
      console.warn(`⚠️ Unknown video provider '${provider}', defaulting to Grok`);
      return new GrokServiceV2({
        outputDir,
        headless,
        debugMode
      });
  }
}

/**
 * Get fixed clip duration per video provider.
 * - Google Flow: 8s/clip
 * - Grok Imagine: 10s/clip
 */
function getProviderClipDuration(provider = 'grok') {
  const normalized = String(provider || '').toLowerCase();
  if (normalized.includes('google')) return 8;
  return 10;
}
import PromptOption from '../models/PromptOption.js';
import Asset from '../models/Asset.js';
import AssetManager from '../utils/assetManager.js';
import { buildStoryboardBlueprint, buildFrameGenerationPlan, buildSegmentPlanningPrompt, parseSegmentPlanningResponse } from './affiliateStoryboardService.js';
import { extractLastFrame, concatenateVideos, isFfmpegAvailable } from './videoContinuityService.js';
import SessionLogService from './sessionLogService.js';
import VietnamesePromptBuilder from './vietnamesePromptBuilder.js';
import { renderAssignedPromptTemplate } from './promptTemplateResolver.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ============================================================
// MAIN AFFILIATE VIDEO TIKTOK FLOW
// ============================================================

/**
 * Main orchestrator for Affiliate Video TikTok flow
 * 
 * Flow:
 * 1. Unified analysis (character + product)
 * 2. Parallel image generation
 *    - Image 1: change-clothes (character wearing product)
 *    - Image 2: character-holding-product (character holding in hands)
 * 3. Deep ChatGPT analysis (all 3 images)
 *    - Video script segments
 *    - Voiceover script (female narrator, fast-paced)
 *    - Hashtag suggestions
 * 4. Video generation
 * 5. TTS voiceover generation
 */
// 💫 Global store for tracking flow preview data (for intermediate image display)
const flowPreviewStore = new Map();

/**
 * Helper: Extract JSON from ChatGPT response text
 * Handles various formats: pure JSON, markdown blocks, text with JSON
 */
function extractJsonFromResponse(rawResponse) {
  if (!rawResponse || rawResponse.length === 0) {
    return null;
  }

  let jsonStr = rawResponse.trim();

  // TRY 1: Direct parse
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Continue
  }

  // TRY 2: Remove markdown code blocks
  let cleaned = jsonStr;
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue
  }

  // TRY 3: Extract JSON block { ... }
  const jsonStart = jsonStr.indexOf('{');
  const jsonEnd = jsonStr.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    const jsonBlock = jsonStr.substring(jsonStart, jsonEnd + 1);
    try {
      return JSON.parse(jsonBlock);
    } catch (e) {
      // Continue
    }
  }

  return null;
}

/**
 * Get current flow preview data (for Step 2 image display)
 */
export function getFlowPreview(flowId) {
  return flowPreviewStore.get(flowId) || { status: 'not-found' };
}

/**
 * Update flow preview data with step 2 images
 */
function updateFlowPreview(flowId, updates) {
  const current = flowPreviewStore.get(flowId) || {};
  const updated = { ...current, ...updates, flowId, updatedAt: Date.now() };
  flowPreviewStore.set(flowId, updated);
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

function buildStoryboardMetadata(analysis, options = {}) {
  return buildStoryboardBlueprint(analysis, {
    productFocus: options.productFocus || 'full-outfit',
    videoDuration: Number(options.videoDuration) || 20,
    clipDuration: Number(options.clipDuration) || 8
  });
}

function buildManualActionPayload(step, error) {
  const manual = error?.manualIntervention || {};
  return {
    step,
    source: manual.source || 'unknown',
    actionType: manual.actionType || 'manual-action',
    message: manual.message || error?.message || 'Manual action required in browser',
    context: manual.context || null,
    retryable: true,
    detectedAt: Date.now()
  };
}
export async function executeAffiliateVideoTikTokFlow(req, res) {
  const startTime = Date.now();
  // 🔴 FIX: Accept flowId from request body if provided (for session continuity)
  // If not provided, generate new flowId
  const flowId = req.body.flowId || `flow-${Date.now()}`;
  const tempDir = path.join(process.cwd(), 'temp', 'tiktok-flows', flowId);
  
  // Initialize session logging
  const logger = new SessionLogService(flowId, 'one-click');
  await logger.init();
  
  // Initialize preview store for this flow
  updateFlowPreview(flowId, {
    status: 'started',
    step1: null,
    step2: null,
    step3: null,
    step4: null,
    step5: null
  });

  // 💫 NEW: Track when STEP 1 ChatGPT browser completely closes
  // Prevents STEP 3 from opening ChatGPT while STEP 1 browser still exists
  let step1ChatGPTServiceClosed = false;

  try {
    await logger.startStage('initialization');
    await logger.info(`Starting affiliate video TikTok flow`, 'flow-init', {flowId});
    console.log(`\n🎬 Affiliate TikTok Flow [${flowId}]`);

    // 💫 LOG: Detailed req.files structure
    console.log(`📊 req.files structure:`, {
      hasCharacterImage: !!req.files?.characterImage,
      characterImageLength: req.files?.characterImage?.length,
      characterImageKeys: req.files?.characterImage?.[0] ? Object.keys(req.files.characterImage[0]) : 'N/A',
      hasProductImage: !!req.files?.productImage,
      productImageLength: req.files?.productImage?.length,
      productImageKeys: req.files?.productImage?.[0] ? Object.keys(req.files.productImage[0]) : 'N/A'
    });

    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`📁 Created temp directory: ${tempDir}`);
    }

    // 💫 Process images: file upload OR base64 from JSON
    let characterFilePath, productFilePath, sceneImagePath = null;
    
    if (req.files?.characterImage && req.files?.productImage) {
      // ✅ Traditional file upload - use Multer uploaded files
      console.log(`📁 Using file uploads from Multer`);
      const characterFile = req.files.characterImage[0];
      const productFile = req.files.productImage[0];
      const sceneFile = req.files.sceneImage?.[0] || null;
      
      characterFilePath = characterFile.path;
      productFilePath = productFile.path;
      sceneImagePath = sceneFile?.path || null;
      
      console.log(`📸 Character: ${characterFile.originalname} (${characterFile.size} bytes)`);
      console.log(`📦 Product: ${productFile.originalname} (${productFile.size} bytes)`);
      if (sceneFile) {
        console.log(`🎭 Scene: ${sceneFile.originalname} (${sceneFile.size} bytes)`);
      }
    } else {
      // 💫 NEW: Accept base64-encoded images from JSON payload
      console.log(`📄 Using base64 images from JSON payload`);
    }

    // Extract parameters from request body
    const {
      characterImage: characterImageBase64 = null,  // 💫 NEW: Base64 from JSON payload
      productImage: productImageBase64 = null,      // 💫 NEW: Base64 from JSON payload
      sceneImage: sceneImageBase64 = null,         // 💫 NEW: Optional base64 scene image
      videoDuration = 20,
      videoDurationUnit = 'seconds',
      voiceGender = 'female',
      voicePace = 'fast',
      voiceName,  // 💫 NEW: Direct voice name from frontend
      productFocus = 'full-outfit',
      language = 'en',  // 💫 Support language selection: 'en' or 'vi'
      imageProvider = 'bfl',  // 💫 Default to BFL Playground
      videoProvider = 'grok',  // 💫 Default to Grok for video
      options = {},
      disableSceneReferenceTransfer = false,  // default false: allow auto scene locked image fallback
      imageSource = { character: 'upload', product: 'upload' },  // 🎯 Track image source from frontend
      useShortPrompt = false
    } = req.body;
    
    // 💫 FIX: Convert base64 images to files if not already provided by Multer
    if (!characterFilePath && characterImageBase64) {
      console.log(`🔄 Converting base64 character image to file...`);
      try {
        const cleanB64 = characterImageBase64.includes(',') 
          ? characterImageBase64.split(',')[1] 
          : characterImageBase64;
        const charBuffer = Buffer.from(cleanB64, 'base64');
        characterFilePath = path.join(tempDir, `character-${Date.now()}.jpg`);
        fs.writeFileSync(characterFilePath, charBuffer);
        console.log(`✅ Saved character image from base64: ${characterFilePath} (${charBuffer.length} bytes)`);
      } catch (charError) {
        console.error(`❌ Failed to process character image:`, charError.message);
        throw new Error(`Failed to process character image: ${charError.message}`);
      }
    }
    
    if (!productFilePath && productImageBase64) {
      console.log(`🔄 Converting base64 product image to file...`);
      try {
        const cleanB64 = productImageBase64.includes(',')
          ? productImageBase64.split(',')[1]
          : productImageBase64;
        const prodBuffer = Buffer.from(cleanB64, 'base64');
        productFilePath = path.join(tempDir, `product-${Date.now()}.jpg`);
        fs.writeFileSync(productFilePath, prodBuffer);
        console.log(`✅ Saved product image from base64: ${productFilePath} (${prodBuffer.length} bytes)`);
      } catch (prodError) {
        console.error(`❌ Failed to process product image:`, prodError.message);
        throw new Error(`Failed to process product image: ${prodError.message}`);
      }
    }
    
    // 🚨 VALIDATE: Ensure both paths exist
    if (!characterFilePath) {
      throw new Error(`❌ Character image not provided (no file upload or base64)`);
    }
    if (!productFilePath) {
      throw new Error(`❌ Product image not provided (no file upload or base64)`);
    }
    
    console.log(`✅ Both images ready: character=${characterFilePath}, product=${productFilePath}`);
    
    // Process scene image if provided
    if (sceneImageBase64 && !sceneImagePath) {
      console.log(`🔄 Converting base64 scene image to file...`);
      try {
        const cleanB64 = sceneImageBase64.includes(',')
          ? sceneImageBase64.split(',')[1]
          : sceneImageBase64;
        const sceneBuffer = Buffer.from(cleanB64, 'base64');
        sceneImagePath = path.join(tempDir, `scene-${Date.now()}.jpg`);
        fs.writeFileSync(sceneImagePath, sceneBuffer);
        console.log(`✅ Saved scene image from base64: ${sceneImagePath} (${sceneBuffer.length} bytes)`);
      } catch (sceneError) {
        console.warn(`⚠️ Failed to process scene image:`, sceneError.message);
      }
    }

    // 💫 NEW: Normalize image source and determine skip policies
    if (!productFilePath) {
      throw new Error(`❌ Product image not provided (no file upload or base64)`);
    }
    
    console.log(`✅ Both images ready: character=${characterFilePath}, product=${productFilePath}`);

    // 💫 NEW: Normalize image source and determine skip policies
    const normalizedImageSource = {
      character: String(imageSource?.character || 'upload').toLowerCase(),
      product: String(imageSource?.product || 'upload').toLowerCase()
    };
    const skipCharacterDriveUpload = normalizedImageSource.character === 'gallery';
    const skipProductDriveUpload = normalizedImageSource.product === 'gallery';
    const disableSceneTransfer = typeof disableSceneReferenceTransfer === 'string'
      ? disableSceneReferenceTransfer.toLowerCase() === 'true'
      : Boolean(disableSceneReferenceTransfer);
    const skipSceneReferenceNetworkTransfer = disableSceneTransfer;

    // Extract providers from options if not in body directly
    const finalImageProvider = options.imageProvider || imageProvider || 'bfl';
    const finalVideoProvider = options.videoProvider || videoProvider || 'grok';
    const providerClipDuration = getProviderClipDuration(finalVideoProvider);
    const shouldUseShortPrompt = typeof (options?.useShortPrompt ?? useShortPrompt) === 'string'
      ? String(options?.useShortPrompt ?? useShortPrompt).toLowerCase() === 'true'
      : Boolean(options?.useShortPrompt ?? useShortPrompt);
    
    console.log(`\n🔌 PROVIDER CONFIGURATION:`);
    console.log(`  Image Provider: ${finalImageProvider}`);
    console.log(`  Video Provider: ${finalVideoProvider}`);
    console.log(`  Video clip duration/provider: ${providerClipDuration}s per video`);
    console.log(`  Image source: character=${normalizedImageSource.character}, product=${normalizedImageSource.product}`);
    console.log(`  Prompt style: ${shouldUseShortPrompt ? 'short' : 'full'}`);
    if (skipCharacterDriveUpload || skipProductDriveUpload) {
      console.log('  Drive upload policy: skip original image upload for gallery-selected inputs');
    }
    if (skipSceneReferenceNetworkTransfer) {
      console.log('  Scene reference policy: no network download/upload in affiliate flow');
    }

    // Resolve optional scene reference for Google Flow image generation
    // Priority: uploaded scene file/base64 -> scene locked image by selected scene/aspect
    let finalSceneImagePath = sceneImagePath;

    if (!finalSceneImagePath && sceneImageBase64) {
      try {
        const cleanB64 = String(sceneImageBase64).includes(',')
          ? String(sceneImageBase64).split(',')[1]
          : String(sceneImageBase64);
        const sceneBuffer = Buffer.from(cleanB64, 'base64');
        if (sceneBuffer.length > 0) {
          finalSceneImagePath = path.join(tempDir, `scene-base64-${Date.now()}.jpg`);
          fs.writeFileSync(finalSceneImagePath, sceneBuffer);
          console.log(`💾 Saved scene image from base64: ${finalSceneImagePath}`);
        }
      } catch (sceneDecodeError) {
        console.warn(`⚠️ Failed to decode sceneImage base64: ${sceneDecodeError.message}`);
      }
    }

    if (!finalSceneImagePath) {
      if (skipSceneReferenceNetworkTransfer) {
        console.log('↩️  Skipping scene locked image download (network transfer disabled for affiliate flow)');
      } else {
        try {
          const selectedAspectRatio = String(options?.aspectRatio || '9:16');
          const sceneInfo = await getSceneReferenceInfo(options.scene, { aspectRatio: selectedAspectRatio }, language);
          const sceneImageUrl = sceneInfo?.imageUrl ? String(sceneInfo.imageUrl).trim() : '';


          if (sceneImageUrl) {
            const isHttpUrl = /^https?:\/\//i.test(sceneImageUrl);
            const sceneExtFromUrl = (() => {
              try {
                return path.extname(new URL(sceneImageUrl).pathname) || '.jpg';
              } catch {
                return path.extname(sceneImageUrl) || '.jpg';
              }
            })();
            const targetScenePath = path.join(tempDir, `scene-locked-${Date.now()}${sceneExtFromUrl}`);

            if (isHttpUrl) {
              const sceneResponse = await axios.get(sceneImageUrl, { responseType: 'arraybuffer', timeout: 20000 });
              fs.writeFileSync(targetScenePath, Buffer.from(sceneResponse.data));
              finalSceneImagePath = targetScenePath;
            } else {
              const normalizedRelative = sceneImageUrl.replace(/^\/+/, '');
              const candidatePaths = [
                path.resolve(process.cwd(), normalizedRelative),
                path.resolve(process.cwd(), '..', normalizedRelative)
              ];

              const localScenePath = candidatePaths.find(p => fs.existsSync(p));
              if (localScenePath) {
                fs.copyFileSync(localScenePath, targetScenePath);
                finalSceneImagePath = targetScenePath;
              } else {
                const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
                const absoluteSceneUrl = `${appBaseUrl.replace(/\/$/, '')}/${normalizedRelative}`;
                const sceneResponse = await axios.get(absoluteSceneUrl, { responseType: 'arraybuffer', timeout: 20000 });
                fs.writeFileSync(targetScenePath, Buffer.from(sceneResponse.data));
                finalSceneImagePath = targetScenePath;
              }
            }

            if (finalSceneImagePath) {
              console.log(`🎭 Using scene locked image (${options.scene || 'default'}): ${finalSceneImagePath}`);
            }
          }
        } catch (sceneLockedError) {
          console.warn(`⚠️ Could not load scene locked image: ${sceneLockedError.message}`);
        }
      }
    }


    // ============================================================
    // STEP 1: CHATGPT BROWSER AUTOMATION ANALYSIS (Non-blocking)
    // ============================================================

    console.log('\n🔍 STEP 1: ChatGPT Browser Automation Analysis...');
    const step1Start = Date.now();
    let step1Duration = '0';  // Will be calculated later

    console.log(`📋 STEP 1 DETAILS: Analysis using ChatGPT Browser Automation`);
    console.log(`  Provider: ChatGPT (Browser Automation)`);
    console.log(`  Input 1: ${characterFilePath}`);
    console.log(`  Input 2: ${productFilePath}`);
    
    let analysis = null;
    let analysisError = null;
    let rawResponse = null;

    try {
      // Use ChatGPT Browser Automation (not OpenAI API, not Gemini)
      // 💫 Get appropriate prompt based on language
      // Normalize language code: 'vi-VN' or 'vi_VN' → 'vi'
      const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
      let analysisPrompt;
      
      if (normalizedLanguage === 'vi') {
        console.log(`\n📝 Using VIETNAMESE analysis prompt`);
        analysisPrompt = VietnamesePromptBuilder.buildCharacterAnalysisPrompt();
      } else {
        console.log(`\n📝 Using ENGLISH analysis prompt`);
        analysisPrompt = `
You are an expert fashion stylist and virtual try-on specialist. Analyze these two images extensively to provide detailed styling recommendations.

===== IMAGE LABELING =====
Image 1 = CHARACTER (Person to be dressed)
Image 2 = PRODUCT (Garment/Outfit to be applied)

===== TASK =====
1. ANALYZE CHARACTER (Image 1) - Extract profile details
2. ANALYZE PRODUCT (Image 2) - Extract garment specifications  
3. GENERATE RECOMMENDATIONS - Scene, lighting, mood, styling for virtual try-on
4. RETURN STRUCTURED JSON - Formatted for image generation systems

===== CHARACTER PROFILE ANALYSIS =====
From Image 1, extract and describe:

Age & Demographics:
- Estimated age range
- Gender identification
- Complexion/skin tone

Physical Characteristics:
- Hair: Color, style, length (e.g., "Brown, long wavy hair")
- Facial features: Notable characteristics (e.g., "Round face, defined cheekbones")
- Body type: Build description (e.g., "Athletic, slim, curvy, petite")
- Height indication: Apparent height

Current Pose & Position:
- Body position: Standing, sitting, walking, etc.
- Arm position: Where are the arms?
- Head position: Angle, tilt, gaze direction
- Leg position: Stance details
- Overall pose orientation: Front-facing, angled, profile

Current Accessories/Styling:
- Current clothing: What they're wearing now
- Accessories: Jewelry, bags, etc.
- Hairstyle details: Exact description
- Makeup appears: Natural, subtle, dramatic, none

Posture & Energy:
- Confidence level conveyed
- Energy/vibe: Casual, professional, playful, formal
- Presence: How the person carries themselves

===== PRODUCT SPECIFICATION ANALYSIS =====
From Image 2, extract and describe:

Garment Basics:
- Type: What is it? (shirt, dress, jacket, pants, etc.)
- Category: Casual, formal, athletic, evening, etc.
- Season appropriateness: Summer, winter, all-season

Color Information:
- Primary color: Main color of garment
- Secondary color: Any accent or secondary color
- Pattern: Solid, striped, printed, textured, etc.
- Color psychology: What mood does it convey?

Material & Construction:
- Fabric type: Cotton, silk, linen, polyester, blend, etc.
- Appearance texture: Smooth, textured, fuzzy, shiny, matte
- Weight: Heavy, medium, light, flowing
- Stretch: Does it appear form-fitting or relaxed?

Design Details:
- Neckline: Crew, V-neck, scoop, polo, turtleneck, etc.
- Sleeves: Short, long, 3/4, sleeveless, cap sleeves, etc.
- Fit style: Slim, fitted, regular, oversized, boyfriend, etc.
- Length: Cropped, regular, long, maxi, etc.
- Waist definition: Belted, cinched, natural, flowing
- Key features: Pockets, buttons, zippers, ruffles, prints, cut-outs, etc.

Style Context:
- Formality level: Casual to formal spectrum
- Target use: Everyday, weekend, work, evening, party, etc.
- Style aesthetic: Minimalist, trendy, classic, edgy, romantic, athletic, etc.
- Price positioning: Budget, mid-range, luxury feel

Garment Compatibility:
- Best body types: Who would wear this well?
- Height suitability: Tall, petite, all heights
- Skill level: Easy to wear, needs styling, professional fit

===== RECOMMENDATION GENERATION =====
Based on character × product compatibility, recommend:

1. SCENE/SETTING (JSON):
   - Best environment: studio, outdoor, urban, nature, luxury, casual, etc.
   - Why this scene: Consider product style and character vibe
   - Background details: What complement character + product?

2. LIGHTING (JSON):
   - Lighting type: Soft diffused, hard direct, golden hour, neon, dramatic, etc.
   - Why this lighting: How to best showcase product on character
   - Technical: How does light enhance garment appearance?

3. MOOD/ATMOSPHERE (JSON):
   - Mood: Confident, playful, sophisticated, casual, energetic, serene, etc.
   - Why this mood: Match character energy + product style
   - Emotional impact: What feeling should viewer get?

4. CAMERA ANGLE (JSON):
   - Best angle: Eye-level, low angle, high angle, profile, 3/4, etc.
   - Why this angle: Show character fit in product, body proportions, product details
   - Framing: Head and shoulders? Full body? Close-up?

5. HAIRSTYLE (JSON):
   - Keep current: Yes/No
   - Why: Does current hair complement product or need change for styling?
   - Alternative: If change recommended, what would be better?

6. MAKEUP (JSON):
   - Makeup level: None, natural, subtle, moderate, dramatic
   - Why: Does makeup complement product and intended vibe?
   - Focus: Eyes, lips, overall? Warm or cool tones?

7. HOLDING PRODUCT STRATEGY (JSON):
   - Recommend the most natural product presentation method for this exact product type.
   - Prioritize realism for apparel sets (e.g., top+skirt, separate pieces, full outfits):
     * hanger method (preferred for full outfit / set pieces)
     * hand-only fold method (for small/flexible pieces)
     * arm-drape method
     * mannequin torso / display board method (only if truly needed)
   - Specify hand placement, support points, and product orientation to keep silhouette visible.
   - Goal: the holding shot must look natural, commercially believable, and easy to match with scene-locked background.

8. CAMERA & LENS LOCK (JSON):
   - Define a consistent camera plan to be reused for BOTH wearing and holding image generation.
   - Include:
     * camera angle / perspective
     * shot framing (full body, 3/4, medium, close-up)
     * lens recommendation (e.g., 35mm, 50mm, 85mm equivalent)
     * camera-to-subject distance
     * subject-to-background distance
     * horizon / eye-level alignment notes
   - Goal: character geometry and perspective must blend naturally into locked scene without looking composited.

9. OVERALL COMPATIBILITY (JSON):
   - Compatibility score: 1-10 how well product matches character
   - Why: Specific reasons for this score
   - Styling tips: How to maximize product appearance on this character

===== CHARACTER IDENTITY LOCK (CRITICAL FOR VIDEO) =====
For video generation, character MUST remain IDENTICAL across all segments:
- Face geometry, skin tone, facial features: EXACT same in all frames
- Body shape, height, proportions: NEVER change regardless of angle
- Hair: SAME color, style, length throughout
- Distinctive features: Moles, scars, tattoos - ALL visible features must remain consistent
- Posture and build: Same lean/curvy/athletic profile in every segment

===== MOTION DESCRIPTIONS (FOR VIDEO SEGMENTS) =====
Provide detailed second-by-second motion for each segment type:

INTRO segment (0-5 seconds):
- Second 0-2: [Describes initial pose, gaze, hand position]
- Second 2-4: [Describes first movement - head turn, hand gesture, or body shift]
- Second 4-5: [Describes transition to next action]

WEARING segment (5-11 seconds):
- Second 0-2: [Body language showing off product - turning, gesturing]
- Second 2-4: [Hand movement - pointing to garment details, adjusting fit]
- Second 4-6: [Full body movement - walking, posing, arms movement]
- Second 6-8: [Facial expression - smile, confident gaze toward camera]
- Second 8-11: [Final pose - standing confidently, hands positioned naturally]

HOLDING segment (11-16 seconds):
- Second 0-2: [How character holds product - hand position, grip type]
- Second 2-4: [Arm height and angle - showing product clearly]
- Second 4-6: [Facial expression - pride/confidence in showing product]
- Second 6-11: [Slight movements while holding - rotating product, slight pose changes]
- Second 11-16: [Direct eye contact with camera, inviting expression]

CTA segment (16-20 seconds):
- Second 0-2: [Final outfit pose - standing tall, confident]
- Second 2-4: [Gesture toward camera - inviting/engaging motion]
- Second 4-6: [Hand to product - touching/tapping product area]
- Second 6-20: [Hold strong pose - steady frame, confident expression, eye contact]

===== LIP SYNC GUIDANCE (IF VOICEOVER EXISTS) =====
If Vietnamese voiceover is present, sync character mouth movements with audio:
- Mouth naturally open during vowels (ả, ơ, ư sounds)
- Lips together during consonants (m, b, p, d, t)
- Keep mouth movements subtle and natural - no exaggerated lip-popping
- Maintain consistent speaking style throughout all segments

===== OUTPUT FORMAT =====
Return ONLY valid JSON, no other text. Structure:

{
  "character": {
    "age": "estimated age or range",
    "gender": "identified gender",
    "skinTone": "description",
    "hair": {
      "color": "color",
      "style": "style name",
      "length": "length"
    },
    "facialFeatures": "brief description",
    "bodyType": "body type description",
    "currentPose": "detailed pose description",
    "currentAccessories": "what they're wearing/accessories",
    "identityLock": {
      "faceGeometry": "exact description of face shape and key features",
      "distinctiveFeatures": "any moles, scars, tattoos, marks to preserve",
      "buildType": "lean/athletic/curvy/petite - must remain consistent",
      "skinToneConsistency": "must be exact same tone in all frames"
    }
  },
  "product": {
    "garment_type": "what is it",
    "category": "category",
    "primary_color": "primary color",
    "secondary_color": "secondary color or empty string",
    "pattern": "pattern description",
    "fabric_type": "fabric material",
    "neckline": "neckline type",
    "sleeves": "sleeve type",
    "fit_type": "fit description",
    "length": "garment length",
    "key_details": "special design features"
  },
  "recommendations": {
    "scene": {
      "choice": "recommended setting",
      "reason": "why this scene works"
    },
    "lighting": {
      "choice": "lighting type",
      "reason": "why this lighting enhances the look"
    },
    "mood": {
      "choice": "mood/vibe",
      "reason": "why this mood"
    },
    "cameraAngle": {
      "choice": "recommended angle",
      "reason": "why this angle shows the product best"
    },
    "cameraLock": {
      "framing": "recommended framing for both wearing/holding",
      "lens": "recommended focal length (e.g., 50mm)",
      "cameraDistance": "camera-to-subject distance",
      "subjectBackgroundDistance": "subject-to-background distance",
      "horizonAlignment": "eye-level/horizon guidance",
      "reason": "why this lock improves scene consistency"
    },
    "poseForScene": {
      "wearing": "detailed pose recommendation for wearing shot to match scene perspective",
      "holding": "detailed pose recommendation for holding shot to match scene perspective",
      "reason": "why these poses feel natural in the scene"
    },
    "poseGuidance": "global pose constraints to avoid rigid pasted full-body look",
    "holdingPresentation": {
      "method": "hanger | hand-only | arm-drape | mannequin-support",
      "reason": "why this method is realistic for this product",
      "handPlacement": "how hands should hold/support",
      "orientation": "how to orient product to camera",
      "notes": "extra practical notes"
    },
    "hairstyle": {
      "choice": "keep-current or specific recommendation",
      "reason": "styling rationale"
    },
    "makeup": {
      "choice": "makeup level and style",
      "reason": "why this makeup complements the look"
    },
    "compatibilityScore": {
      "score": 8,
      "reason": "why this score"
    }
  },
  "characterDescription": "2-3 sentence vivid description of character for image generation",
  "motionDescriptions": {
    "intro": "second-by-second detailed motion for intro segment",
    "wearing": "second-by-second detailed motion for wearing segment",
    "holding": "second-by-second detailed motion for holding segment",
    "cta": "second-by-second detailed motion for CTA segment"
  },
  "lipSyncGuidance": "lip sync timing and mouth movement guidance if voiceover present"
}

Focus: ${productFocus}
Use Case: TikTok Affiliate Video (9:16 vertical format, engaging styling)

CRITICAL: Return ONLY JSON, properly formatted, no markdown, no code blocks, no additional text.
      `;
      }


      const hasSceneReference = Boolean(finalSceneImagePath && fs.existsSync(finalSceneImagePath));
      const selectedSceneForAnalysis = options.scene || 'linhphap-tryon-room';
      const sceneLockedPromptForAnalysis = options.sceneLockedPrompt || options.sceneLockOverridePrompt || '';
      const sceneContextLine = sceneLockedPromptForAnalysis
        ? `Scene lock: ${sceneLockedPromptForAnalysis}`
        : `Scene key: ${selectedSceneForAnalysis}`;

      const assignedAnalysisTemplate = await renderAssignedPromptTemplate({
        criteria: {
          page: 'AffiliateVideoTikTokFlow',
          context: 'chatgpt-analysis',
          field: 'analysisPrompt',
          useCase: 'affiliate-video-tiktok-analysis',
          templateType: 'text',
        },
        runtimeValues: {
          language: normalizedLanguage,
          productFocus,
          selectedScene: selectedSceneForAnalysis,
          sceneContextLine,
          hasSceneReference,
          videoDuration,
          imageProvider: finalImageProvider,
          videoProvider: finalVideoProvider,
          aspectRatio: options?.aspectRatio || '9:16',
        },
      });

      if (assignedAnalysisTemplate?.rendered?.prompt) {
        analysisPrompt = assignedAnalysisTemplate.rendered.prompt;
      } else if ((language || 'en').split('-')[0].split('_')[0].toLowerCase() === 'vi') {
        analysisPrompt += `

===== PHÂN TÍCH SCENE REFERENCE (BẮT BUỘC) =====
`;
        analysisPrompt += `${sceneContextLine}
`;
        analysisPrompt += hasSceneReference
          ? `Image 3 = SCENE REFERENCE. Bắt buộc dùng scene này để tư vấn pose tự nhiên cho nhân vật.
`
          : `Không có Image 3, hãy dựa trên Scene lock/Scene key để tư vấn pose tự nhiên.
`;
        analysisPrompt += `Hãy tư vấn pose cụ thể cho cả WEARING và HOLDING để nhân vật hòa hợp với phối cảnh scene (hướng người, vị trí chân tay, trọng tâm cơ thể, khoảng cách camera). Tránh giữ cứng pose từ ảnh nhân vật gốc.
`;
      } else {
        analysisPrompt += `

===== SCENE REFERENCE ANALYSIS (REQUIRED) =====
`;
        analysisPrompt += `${sceneContextLine}
`;
        analysisPrompt += hasSceneReference
          ? `Image 3 = SCENE REFERENCE. You MUST use this scene to recommend natural poses for the character.
`
          : `Image 3 is unavailable. Use scene lock/scene key context to recommend natural poses.
`;
        analysisPrompt += `Provide concrete pose guidance for BOTH wearing and holding shots so the character fits the scene perspective naturally (body orientation, limb placement, weight distribution, camera distance). Do NOT freeze the original full-body pose rigidly.
`;
      }

      // 🔴 CRITICAL: Use try-finally to GUARANTEE browser cleanup
      let chatGPTService = null;
      try {
        // 🔐 STEP 1: Isolate with flowId to prevent parallel profile conflicts
        chatGPTService = new ChatGPTService({ headless: false, flowId });

        const analysisImages = hasSceneReference
          ? [characterFilePath, productFilePath, finalSceneImagePath]
          : [characterFilePath, productFilePath];

        let chatgptAttempt = 0;
        while (chatgptAttempt < 2) {
          try {
            await chatGPTService.initialize();
            rawResponse = await chatGPTService.analyzeMultipleImages(
              analysisImages,
              analysisPrompt
            );
            break;
          } catch (chatgptError) {
            if (chatgptError?.code !== 'CHATGPT_MANUAL_INTERVENTION_REQUIRED' || chatgptAttempt >= 1) {
              throw chatgptError;
            }

            const actionRequired = buildManualActionPayload('step1', chatgptError);
            updateFlowPreview(flowId, {
              status: 'action_required',
              actionRequired,
              step1: { waitingForManualAction: true, actionRequired }
            });
            await logger.warn(actionRequired.message, 'step-1-manual-action', actionRequired);

            const resolved = await chatGPTService.waitForManualResolution({ timeoutMs: 5 * 60 * 1000, pollMs: 2000 });
            if (!resolved) {
              throw new Error('Timed out waiting for manual ChatGPT verification');
            }

            updateFlowPreview(flowId, {
              status: 'resuming',
              actionRequired: null,
              step1: { waitingForManualAction: false, resumedAfterManualAction: true }
            });
            await logger.info('Manual ChatGPT verification resolved. Resuming Step 1.', 'step-1-manual-resolved');
            chatgptAttempt += 1;
          }
        }
        
        // Save rawResponse to use in fallback if parsing fails
        if (!rawResponse || rawResponse.length === 0) {
          analysisError = 'ChatGPT analysis returned empty response';
          console.warn(`⚠️  Analysis failed (non-blocking): ${analysisError}`);
          console.warn(`   Continuing with default recommendations...`);
          analysis = null;
        } else {
          // Parse response with intelligent JSON extraction
          try {
            console.log(`📝 Parsing ChatGPT JSON response...`);
            console.log(`   Response length: ${rawResponse.length} characters`);
            
            analysis = extractJsonFromResponse(rawResponse);
            
            if (analysis) {
              console.log(`✅ JSON parsed successfully`);
              
              if (!analysis.character || !analysis.product || !analysis.recommendations) {
                console.warn(`⚠️  Incomplete analysis structure, but processing anyway`);
              }
              
              step1Duration = ((Date.now() - step1Start) / 1000).toFixed(2);
              console.log(`✅ Analysis complete in ${step1Duration}s`);
              console.log(`\n📊 ANALYSIS RESULTS:`);
              console.log(`  Character profile: ${analysis.character?.age || 'N/A'}`);
              console.log(`  Product type: ${analysis.product?.garment_type || 'N/A'}`);
              console.log(`  Key recommendations: ${Object.keys(analysis.recommendations || {}).join(', ')}`);
            } else {
              throw new Error(`Could not extract valid JSON from response`);
            }
          } catch (parseError) {
            analysisError = `JSON parse error: ${parseError.message}`;
            console.warn(`⚠️  Failed to parse ChatGPT JSON (non-blocking): ${analysisError}`);
            console.warn(`   Raw response preview: ${rawResponse.substring(0, 300)}...`);
            analysis = null;
          }
        }
      } finally {
        // 🔴 GUARANTEE: Always close ChatGPT browser
        if (chatGPTService) {
          try {
            console.log(`\n🔒 Closing ChatGPT browser (STEP 1)...`);
            await chatGPTService.close();
            console.log(`✅ ChatGPT browser closed`);
          } catch (closeError) {
            console.error(`⚠️  Error closing ChatGPT browser: ${closeError.message}`);
          }
        }
        // 💫 NEW: Mark STEP 1 ChatGPT cleanup complete
        step1ChatGPTServiceClosed = true;
        console.log(`✅ STEP 1: ChatGPT cleanup tracking - MARKED COMPLETE`);
      }

      if (!rawResponse || rawResponse.length === 0) {
        analysisError = 'ChatGPT analysis returned empty response';
        console.warn(`⚠️  Analysis failed (non-blocking): ${analysisError}`);
        console.warn(`   Continuing with default recommendations...`);
      } else {
        try {
          console.log(`📝 Parsing ChatGPT JSON response...`);
          console.log(`   Response length: ${rawResponse.length} characters`);
          
          analysis = extractJsonFromResponse(rawResponse);
          
          if (!analysis) {
            throw new Error(`Could not extract valid JSON from response`);
          }
          
          console.log(`✅ JSON parsed successfully`);
          
          // Validate structure
          if (!analysis.character || !analysis.product || !analysis.recommendations) {
            console.warn(`⚠️  Incomplete analysis structure, but processing anyway`);
          }
          
          step1Duration = ((Date.now() - step1Start) / 1000).toFixed(2);
          console.log(`✅ Analysis complete in ${step1Duration}s`);
          console.log(`\n📊 ANALYSIS RESULTS:`);
          console.log(`  Character profile: ${analysis.character?.age || 'N/A'}`);
          console.log(`  Product type: ${analysis.product?.garment_type || 'N/A'}`);
          console.log(`  Key recommendations: ${Object.keys(analysis.recommendations || {}).join(', ')}`);
        } catch (parseError) {
          analysisError = `JSON parse error: ${parseError.message}`;
          console.warn(`⚠️  Failed to parse ChatGPT JSON (non-blocking): ${analysisError}`);
          console.warn(`   Raw response preview: ${rawResponse.substring(0, 300)}...`);
          console.warn(`   Continuing with fallback analysis...`);
          analysis = null;
        }
      }
    } catch (step1Error) {
      analysisError = step1Error.message;
      console.warn(`⚠️  Analysis error (non-blocking): ${analysisError}`);
      console.warn(`   Proceeding to image generation with fallback analysis...`);
    }

    // ============================================================
    // STEP 1.5: UPLOAD ORIGINAL IMAGES TO GOOGLE DRIVE (OAuth)
    // ============================================================

    console.log('\n' + '─'.repeat(80));
    console.log('📤 STEP 1.5: Upload Original Images to Google Drive');
    console.log('─'.repeat(80));

    let characterDriveUrl = null;
    let productDriveUrl = null;
    let driveService = null;

    // 💫 Helper function: Check if asset with same filename already exists
    const checkExistingAsset = async (originalFilename, assetCategory) => {
      try {
        const existingAsset = await Asset.findOne({
          filename: originalFilename,
          assetCategory,
          status: 'active'
        });
        return existingAsset;
      } catch (err) {
        console.warn(`⚠️ Error checking existing asset: ${err.message}`);
        return null;
      }
    };

    try {
      if (skipCharacterDriveUpload && skipProductDriveUpload) {
        console.log('↩️  Skipping Step 1.5 Google Drive upload for original images (both selected from gallery)');
      } else {
        // GoogleDriveOAuthService is a singleton instance, not a class constructor
        driveService = GoogleDriveOAuthService;

        // Authenticate with Google Drive using OAuth
        console.log(`🔐 Authenticating with Google Drive (OAuth)...`);
        const authResult = await driveService.authenticate();

        if (!authResult.authenticated && !authResult.configured) {
          console.log(`⚠️  Google Drive OAuth not configured, skipping upload`);
          console.log(`   To enable: Add OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET to .env`);
        } else {
          console.log(`✅ Google Drive authenticated`);

          // 💫 CHECK: Character image - skip if already exists
          let characterAssetExists = null;
          if (fs.existsSync(characterFilePath)) {
            characterAssetExists = await checkExistingAsset(characterFile.originalname, 'character-image');
            if (characterAssetExists) {
              console.log(`\n⏭️  Character image already exists (skipping upload & asset creation)`);
              console.log(`   Existing Asset ID: ${characterAssetExists.assetId}`);
              if (characterAssetExists.storage?.googleDriveId) {
                characterDriveUrl = characterAssetExists.storage.googleDriveId;
              }
            }
          }

          // Upload character image only if it doesn't exist
          if (!characterAssetExists && fs.existsSync(characterFilePath)) {
            if (skipCharacterDriveUpload) {
              console.log(`\n↩️  Skipping character original upload (gallery source)`);
            } else {
              try {
                console.log(`\n📤 Uploading character image...`);
                console.log(`   Path: ${characterFilePath}`);

                const charBuffer = fs.readFileSync(characterFilePath);
                const charUploadResult = await driveService.uploadCharacterImage(
                  charBuffer,
                  `Character-${flowId}.jpg`,
                  {
                    flowId,
                    timestamp: new Date().toISOString()
                  }
                );

                // 💫 FIX: Check if it was actual Drive upload (has webViewLink) NOT just local fallback
                if (charUploadResult?.webViewLink) {
                  characterDriveUrl = charUploadResult.id;  // 🔴 FIX: Store FILE ID, not full URL
                  console.log(`  ✅ Character image uploaded to Drive`);
                  console.log(`     File ID: ${charUploadResult.id}`);
                  console.log(`     Drive Link: ${charUploadResult.webViewLink}`);
                } else if (charUploadResult?.source === 'local-storage') {
                  console.warn(`  ⚠️ Character image fallback to local (not on Drive)`);
                  console.warn(`     Error: ${charUploadResult.error}`);
                } else {
                  console.warn(`  ⚠️ Character upload returned unexpected result: ${JSON.stringify(charUploadResult)}`);
                }
              } catch (charUploadError) {
                console.warn(`  ❌ Character upload failed: ${charUploadError.message}`);
              }
            }
          }

          // 💫 CHECK: Product image - skip if already exists
          let productAssetExists = null;
          if (fs.existsSync(productFilePath)) {
            productAssetExists = await checkExistingAsset(productFile.originalname, 'product-image');
            if (productAssetExists) {
              console.log(`\n⏭️  Product image already exists (skipping upload & asset creation)`);
              console.log(`   Existing Asset ID: ${productAssetExists.assetId}`);
              if (productAssetExists.storage?.googleDriveId) {
                productDriveUrl = productAssetExists.storage.googleDriveId;
              }
            }
          }

          // Upload product image only if it doesn't exist
          if (!productAssetExists && fs.existsSync(productFilePath)) {
            if (skipProductDriveUpload) {
              console.log(`\n↩️  Skipping product original upload (gallery source)`);
            } else {
              try {
                console.log(`\n📤 Uploading product image...`);
                console.log(`   Path: ${productFilePath}`);

                const prodBuffer = fs.readFileSync(productFilePath);
                const prodUploadResult = await driveService.uploadProductImage(
                  prodBuffer,
                  `Product-${flowId}.jpg`,
                  {
                    flowId,
                    timestamp: new Date().toISOString()
                  }
                );

                // 💫 FIX: Check if it was actual Drive upload (has webViewLink) NOT just local fallback
                if (prodUploadResult?.webViewLink) {
                  productDriveUrl = prodUploadResult.id;  // 🔴 FIX: Store FILE ID, not full URL
                  console.log(`  ✅ Product image uploaded to Drive`);
                  console.log(`     File ID: ${prodUploadResult.id}`);
                  console.log(`     Drive Link: ${prodUploadResult.webViewLink}`);
                } else if (prodUploadResult?.source === 'local-storage') {
                  console.warn(`  ⚠️ Product image fallback to local (not on Drive)`);
                  console.warn(`     Error: ${prodUploadResult.error}`);
                } else {
                  console.warn(`  ⚠️ Product upload returned unexpected result: ${JSON.stringify(prodUploadResult)}`);
                }
              } catch (prodUploadError) {
                console.warn(`  ❌ Product upload failed: ${prodUploadError.message}`);
              }
            }
          }

          console.log(`\n📊 Original images upload status:`);
          console.log(`   Character: ${skipCharacterDriveUpload ? '↩️  Skipped (gallery source)' : (characterDriveUrl ? '✅ On Google Drive' : '❌ NOT on Drive')}`);
          console.log(`   Product: ${skipProductDriveUpload ? '↩️  Skipped (gallery source)' : (productDriveUrl ? '✅ On Google Drive' : '❌ NOT on Drive')}`);
        }
      }
    } catch (driveError) {
      console.warn(`⚠️ Google Drive upload error: ${driveError.message}`);
    }

    // ============================================================
    // STEP 1.6: CREATE ASSET RECORDS FOR CHARACTER & PRODUCT IMAGES
    // ============================================================

    console.log('\n' + '─'.repeat(80));
    console.log('💾 STEP 1.6: Create Asset Records for Original Images');
    console.log('─'.repeat(80));

    // Create Asset record for Character image
    if (fs.existsSync(characterFilePath)) {
      try {
        console.log(`\n📝 Creating Asset for character image...`);
        
        const characterAssetResult = await AssetManager.saveAsset({
          filename: `Character-${flowId}.jpg`,
          assetType: 'image',
          assetCategory: 'character-image',
          mimeType: 'image/jpeg',
          fileSize: fs.statSync(characterFilePath).size,
          userId: 'system',
          sessionId: flowId,
          // 🔴 FIX: Add BOTH storage objects
          storage: {
            location: characterDriveUrl ? 'google-drive' : 'local',
            filePath: characterFilePath,
            ...(characterDriveUrl && {
              googleDriveId: characterDriveUrl
            })
          },
          // 💫 NEW: Populate cloudStorage for gallery/sync
          cloudStorage: characterDriveUrl ? {
            location: 'google-drive',
            googleDriveId: characterDriveUrl,
            webViewLink: null,  // Will be fetched later if needed
            thumbnailLink: null,
            status: 'synced',  // Already uploaded
            syncedAt: new Date()
          } : undefined,
          // 💫 NEW: Populate localStorage for offline access
          localStorage: {
            location: 'local',
            path: characterFilePath,
            fileSize: fs.statSync(characterFilePath).size,
            verified: fs.existsSync(characterFilePath)
          },
          metadata: {
            source: 'user-uploaded',
            uploadedFor: 'character',
            timestamp: new Date().toISOString(),
          }
        });

        if (characterAssetResult?.asset?.assetId) {
          console.log(`  ✅ Character Asset created: ${characterAssetResult.asset.assetId}`);
        } else {
          console.warn(`  ⚠️ Character Asset creation returned: ${JSON.stringify(characterAssetResult)}`);
        }
      } catch (charAssetError) {
        console.warn(`  ⚠️ Character Asset creation failed: ${charAssetError.message}`);
      }
    }

    // Create Asset record for Product image
    if (fs.existsSync(productFilePath)) {
      try {
        console.log(`\n📝 Creating Asset for product image...`);
        
        const productAssetResult = await AssetManager.saveAsset({
          filename: `Product-${flowId}.jpg`,
          assetType: 'image',
          assetCategory: 'product-image',
          mimeType: 'image/jpeg',
          fileSize: fs.statSync(productFilePath).size,
          userId: 'system',
          sessionId: flowId,
          // 🔴 FIX: Add BOTH storage objects
          storage: {
            location: productDriveUrl ? 'google-drive' : 'local',
            filePath: productFilePath,
            ...(productDriveUrl && {
              googleDriveId: productDriveUrl
            })
          },
          // 💫 NEW: Populate cloudStorage for gallery/sync
          cloudStorage: productDriveUrl ? {
            location: 'google-drive',
            googleDriveId: productDriveUrl,
            webViewLink: null,  // Will be fetched later if needed
            thumbnailLink: null,
            status: 'synced',  // Already uploaded
            syncedAt: new Date()
          } : undefined,
          // 💫 NEW: Populate localStorage for offline access
          localStorage: {
            location: 'local',
            path: productFilePath,
            fileSize: fs.statSync(productFilePath).size,
            verified: fs.existsSync(productFilePath)
          },
          metadata: {
            source: 'user-uploaded',
            uploadedFor: 'product',
            timestamp: new Date().toISOString(),
          }
        });

        if (productAssetResult?.asset?.assetId) {
          console.log(`  ✅ Product Asset created: ${productAssetResult.asset.assetId}`);
        } else {
          console.warn(`  ⚠️ Product Asset creation returned: ${JSON.stringify(productAssetResult)}`);
        }
      } catch (prodAssetError) {
        console.warn(`  ⚠️ Product Asset creation failed: ${prodAssetError.message}`);
      }
    }

    console.log(`\n✅ Asset records created for original images`);

// ============================================================
    // CREATE FALLBACK ANALYSIS if real analysis failed
    // ============================================================

    if (!analysis) {
      console.log(`
??  Using default analysis object since real analysis failed`);
      analysis = {
        character: {
          name: 'Model',
          bodyType: 'average',
          skinTone: 'medium',
          hairColor: 'brown'
        },
        product: {
          name: 'Product',
          type: 'apparel',
          color: 'varies',
          material: 'quality fabric'
        },
        recommendations: {},
        hashtags: ['FashionTrend', 'StyleInspo', 'ProductReview'],
        vibes: ['professional', 'modern', 'elegant']
      };
      console.log(`? Default analysis ready for image generation`);
    }

    const storyboardBlueprint = buildStoryboardMetadata(analysis, {
      productFocus,
      videoDuration,
      clipDuration: providerClipDuration
    });
    analysis.storyboardBlueprint = storyboardBlueprint;

    updateFlowPreview(flowId, {
      status: 'step1-complete',
      step1: {
        analysis,
        storyboardBlueprint,
        summaryPrompt: rawResponse || null,
        wearingPrompt: null,
        holdingPrompt: null
      }
    });

    // ============================================================
    // STEP 2: FRAME LIBRARY GENERATION
    // ============================================================

    console.log('\n' + '?'.repeat(80));
    console.log('?? STEP 2: Frame Library Generation');
    console.log('?'.repeat(80));

    await logger.startStage('image-generation');
    const step2Start = Date.now();

    const baseOptions = {
      scene: options.scene || 'linhphap-tryon-room',
      lighting: options.lighting || analysis?.recommendations?.lighting?.choice || 'soft-diffused',
      mood: options.mood || analysis?.recommendations?.mood?.choice || 'confident',
      style: options.style || 'minimalist',
      colorPalette: options.colorPalette || 'neutral',
      cameraAngle: options.cameraAngle || analysis?.recommendations?.cameraAngle?.choice || 'eye-level',
      cameraLock: options.cameraLock || analysis?.recommendations?.cameraLock || {},
      holdingPresentation: options.holdingPresentation || analysis?.recommendations?.holdingPresentation || {},
      poseGuidance: options.poseGuidance || analysis?.recommendations?.poseGuidance || '',
      poseForScene: options.poseForScene || analysis?.recommendations?.poseForScene || {},
      aspectRatio: '9:16',
      ...options
    };

    const normalizedPromptLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
    const framePlan = buildFrameGenerationPlan(analysis, storyboardBlueprint, {
      scene: baseOptions.scene,
      lighting: baseOptions.lighting,
      mood: baseOptions.mood,
      language: normalizedPromptLanguage,
      characterName: analysis?.character?.name || '',
      characterDisplayName: analysis?.character?.name || '',
      productFocus
    });

    let imageResults = [];
    let frameLibrary = [];
    let step2PreviewItems = framePlan.frames.map((frame) => ({
      key: frame.key,
      label: `${frame.segmentName} ${frame.role}`,
      status: 'queued',
      prompt: frame.prompt,
      frameKey: frame.key,
      segmentIndex: frame.segmentIndex,
      segmentName: frame.segmentName,
      role: frame.role,
      focus: frame.focus,
      purpose: frame.purpose,
      path: null,
      href: null,
      driveId: null,
      driveUrl: null,
      error: null
    }));

    updateFlowPreview(flowId, {
      status: 'step1-complete',
      step1: {
        analysis,
        storyboardBlueprint,
        summaryPrompt: rawResponse || null,
        promptSummary: framePlan.frames.map((frame) => `[${frame.key}] ${frame.prompt}`).join('\n\n'),
        wearingPrompt: framePlan.frames[0]?.prompt || null,
        holdingPrompt: framePlan.frames[1]?.prompt || null
      }
    });

    updateFlowPreview(flowId, {
      status: 'step2-generating',
      step2: {
        storyboardBlueprint,
        framePlan: framePlan.frames,
        imagePaths: [],
        imageCount: step2PreviewItems.length,
        completedCount: 0,
        duration: null,
        items: [...step2PreviewItems],
        images: {}
      }
    });

    try {
      const imageGen = new GoogleFlowAutomationService({
        type: 'image',
        projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
        imageCount: 1,
        headless: false,
        debugMode: false
      });

      console.log('?? Initializing frame generation service...');
      console.log(`?? Storyboard template: ${storyboardBlueprint.templateKey}`);
      console.log(`?? Required frames: ${framePlan.frames.length}`);

      const multiGenResult = await imageGen.generateMultiple(
        characterFilePath,
        productFilePath,
        framePlan.frames.map((frame) => frame.prompt),
        {
          outputCount: 1,
          ...(finalSceneImagePath ? { sceneImagePath: finalSceneImagePath } : {}),
          onPromptStart: async ({ index }) => {
            if (!step2PreviewItems[index]) return;
            step2PreviewItems[index] = { ...step2PreviewItems[index], status: 'generating' };
            updateFlowPreview(flowId, {
              status: 'step2-generating',
              step2: {
                storyboardBlueprint,
                framePlan: framePlan.frames,
                imagePaths: step2PreviewItems.filter((item) => item.path).map((item) => item.path),
                imageCount: step2PreviewItems.length,
                completedCount: step2PreviewItems.filter((item) => item.status === 'completed').length,
                duration: null,
                items: [...step2PreviewItems],
                images: {}
              }
            });
          },
          onPromptComplete: async ({ index, result }) => {
            if (!step2PreviewItems[index]) return;
            step2PreviewItems[index] = {
              ...step2PreviewItems[index],
              status: result?.success ? 'completed' : 'failed',
              path: result?.downloadedFile || null,
              href: result?.href || null,
              error: result?.success ? null : (result?.error || 'Generation failed')
            };
            updateFlowPreview(flowId, {
              status: 'step2-generating',
              step2: {
                storyboardBlueprint,
                framePlan: framePlan.frames,
                imagePaths: step2PreviewItems.filter((item) => item.path).map((item) => item.path),
                imageCount: step2PreviewItems.length,
                completedCount: step2PreviewItems.filter((item) => item.status === 'completed').length,
                duration: null,
                items: [...step2PreviewItems],
                images: {}
              }
            });
          }
        }
      );

      if (!multiGenResult?.success && !(multiGenResult?.results || []).some((result) => result?.success)) {
        throw new Error(multiGenResult?.error || 'Frame library generation failed');
      }

      frameLibrary = framePlan.frames.map((frame, index) => {
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
          href: result.href || null,
          downloadedAt: new Date().toISOString(),
          type: frame.key
        };
      });

      imageResults = frameLibrary.map((frame) => ({
        imageUrl: frame.imagePath,
        screenshotPath: frame.imagePath,
        downloadedAt: frame.downloadedAt,
        href: frame.href,
        type: frame.frameKey,
        frameKey: frame.frameKey,
        segmentIndex: frame.segmentIndex,
        segmentName: frame.segmentName,
        role: frame.role,
        focus: frame.focus,
        purpose: frame.purpose,
        prompt: frame.prompt
      }));
    } catch (imageGenError) {
      console.error('? Frame library generation failed:', imageGenError.message);
      throw new Error(`Frame library generation failed: ${imageGenError.message}`);
    }

    if (!imageResults || imageResults.length === 0) {
      throw new Error('Frame library generation failed - no images returned');
    }

    const { hookStart, showcaseEnd } = pickLegacyFrameKeys(frameLibrary);
    const step2Duration = ((Date.now() - step2Start) / 1000).toFixed(2);

    await logger.endStage('image-generation', true);
    await logger.info('Frame library generated successfully', 'image-generation-complete', {
      duration: step2Duration,
      imageCount: imageResults.length,
      storyboardTemplate: storyboardBlueprint.templateKey,
      images: imageResults.map((img) => img.screenshotPath)
    });
    await logger.storeArtifacts({
      images: {
        wearing: hookStart?.imagePath || null,
        holding: showcaseEnd?.imagePath || null,
        frameLibrary: imageResults.map((img) => img.screenshotPath)
      }
    });

    updateFlowPreview(flowId, {
      status: 'step2-complete',
      step2: {
        storyboardBlueprint,
        framePlan: framePlan.frames,
        frameLibrary,
        imagePaths: imageResults.map((img) => img.screenshotPath),
        imageCount: imageResults.length,
        completedCount: imageResults.length,
        duration: step2Duration,
        items: imageResults.map((img) => ({
          key: img.frameKey,
          label: `${img.segmentName} ${img.role}`,
          status: 'completed',
          prompt: img.prompt,
          frameKey: img.frameKey,
          segmentIndex: img.segmentIndex,
          segmentName: img.segmentName,
          role: img.role,
          focus: img.focus,
          purpose: img.purpose,
          path: img.screenshotPath,
          href: img.href || null,
          driveId: img.googleDriveId || null,
          driveUrl: img.googleDriveWebViewLink || null,
          error: null
        })),
        images: {
          wearing: hookStart?.imagePath || null,
          holding: showcaseEnd?.imagePath || null
        }
      }
    });
    // ============================================================
    // STEP 2.5: UPLOAD GENERATED IMAGES TO GOOGLE DRIVE
    // ============================================================
    
    console.log('\n' + '─'.repeat(80));
    console.log('📤 STEP 2.5: Upload Generated Images to Google Drive (2 images)');
    console.log('─'.repeat(80));

    console.log(`📁 Image paths from Google Flow:`);
    imageResults.forEach((img, idx) => {
      console.log(`   ${img.type || (idx === 0 ? 'wearing' : 'holding')}: ${img.screenshotPath}`);
    });
    console.log(`\n⚡ Uploading 2 images in parallel...`);
    console.log(`🎯 Image sources: character=${imageSource.character}, product=${imageSource.product}`);

    // 🛑 BARRIER CHECKPOINT: Ensure STEP 2.5 completes before STEP 3
    try {
      // Upload generated images in parallel (always upload Step 2 outputs)
      if (driveService) {
        const uploadPromises = imageResults.map((img, idx) => {

          const imgType = img.type || (idx === 0 ? 'wearing' : 'holding');
          const uploadFileName = `Generated-${imgType}-${flowId}.jpg`;
          
          // 🔍 DEBUG: Log upload details before execution
          console.log(`\n🔥 DEBUG: Preparing upload [${idx}]:`);
          console.log(`   imgType: ${imgType}`);
          console.log(`   screenshotPath: ${img.screenshotPath}`);
          console.log(`   uploadFileName: ${uploadFileName}`);
          console.log(`   file exists: ${fs.existsSync(img.screenshotPath)}`);
          if (fs.existsSync(img.screenshotPath)) {
            console.log(`   file size: ${(fs.statSync(img.screenshotPath).size / 1024).toFixed(2)}KB`);
          }
          
          return driveService.uploadFile(
            img.screenshotPath,
            uploadFileName,
            driveService.folderStructure?.outputs,
            { 
              flowId, 
              type: 'character-image',
              imageType: imgType,
              timestamp: new Date().toISOString()
            }
          ).then(result => {
            console.log(`  ✅ ${imgType.toUpperCase()} uploaded to Drive (ID: ${result.id})`);
            return result;
          }).catch(error => {
            console.warn(`  ⚠️ ${imgType.toUpperCase()} upload failed: ${error.message}`);
            return null;
          });
        });  // ← End of map()

        if (uploadPromises.length > 0) {
          console.log(`\n⏳ Waiting for ${uploadPromises.length} uploads to complete...`);
          const uploadResults = await Promise.all(uploadPromises);
          const successCount = uploadResults.filter(r => r).length;
          console.log(`✅ Step 2.5 Complete: ${successCount}/${uploadPromises.length} uploads successful`);
          
          // 💫 CRITICAL FIX: Capture Google Drive metadata from upload results
          console.log(`\n📌 CAPTURING DRIVE METADATA`);
          uploadResults.forEach((result, idx) => {
            if (result && result.id) {
              // Find the corresponding image in imageResults
              const originalIdx = idx;  // Map back to imageResults index
              if (imageResults[originalIdx]) {
                imageResults[originalIdx].googleDriveId = result.id;
                imageResults[originalIdx].googleDriveWebViewLink = result.webViewLink;
                if (step2PreviewItems[originalIdx]) {
                  step2PreviewItems[originalIdx] = {
                    ...step2PreviewItems[originalIdx],
                    driveId: result.id,
                    driveUrl: result.webViewLink || null
                  };
                }
                console.log(`   ??? Image ${originalIdx}: Stored Drive ID = ${result.id}`);
                console.log(`      Drive Link: ${result.webViewLink}`);
              }
            }
          });
          updateFlowPreview(flowId, {
            status: 'step2-generating',
            step2: {
              storyboardBlueprint,
              framePlan: framePlan.frames,
              frameLibrary,
              imagePaths: step2PreviewItems.filter(item => item.path).map(item => item.path),
              imageCount: step2PreviewItems.length,
              completedCount: step2PreviewItems.filter(item => item.status === 'completed').length,
              duration: null,
              items: [...step2PreviewItems],
              images: {
                wearing: hookStart?.imagePath || null,
                holding: showcaseEnd?.imagePath || null
              }
            }
          });
        }
      } else {
        console.log(`⚠️ Skipping uploads (Drive service not available)`);
      }
    } catch (uploadError) {
      console.warn(`⚠️ Step 2.5 upload error (non-blocking): ${uploadError.message}`);
      console.warn(`   Proceeding to Step 3 anyway...`);
    }

    // 🔴 BARRIER: Explicit checkpoint to ensure STEP 2.5 is complete
    console.log(`\n🔄 [BARRIER CHECKPOINT] Step 2 pipeline complete`);
    console.log(`   ✅ Step 2: Image generation - DONE`);
    console.log(`   ✅ Step 2.5: Image uploads - DONE`);
    console.log(`   🔄 Proceeding to Step 3...\n`);

    // 💫 NEW: CRITICAL - Wait for STEP 1 ChatGPT to fully close before STEP 3 opens
    console.log(`🔒 STEP 3 BARRIER: Ensuring STEP 1 ChatGPT browser fully closed...`);
    if (!step1ChatGPTServiceClosed) {
      console.warn(`⚠️  STEP 1 ChatGPT service not marked as closed yet`);
      // Wait up to 10 seconds for STEP 1 to complete its cleanup
      let waitCount = 0;
      while (!step1ChatGPTServiceClosed && waitCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
      }
      
      if (!step1ChatGPTServiceClosed) {
        console.warn(`⚠️  STEP 1 ChatGPT didn't close after 10s, proceeding anyway (risk of parallel browsers)`);
      } else {
        console.log(`✅ STEP 1 ChatGPT confirmed closed`);
      }
    } else {
      console.log(`✅ STEP 1 ChatGPT already closed`);
    }
    console.log(`✅ STEP 3 BARRIER: Safe to open new ChatGPT instance\n`);

    // ============================================================
    // STEP 3: STORYBOARD SEGMENT PLANNING
    // ============================================================

    console.log('\n' + '-'.repeat(80));
    console.log('STEP 3: Storyboard Segment Planning');
    console.log('-'.repeat(80));
    const step3Start = Date.now();

    console.log(`ANALYSIS INPUTS:`);
    console.log(`  Duration: ${videoDuration}s`);
    console.log(`  Voice: ${voiceGender} (${voicePace} pace)`);
    console.log(`  Focus: ${productFocus}`);
    console.log(`  Frame library: ${frameLibrary.length} frames`);

    const plannerPrompt = buildSegmentPlanningPrompt({
      analysis,
      blueprint: storyboardBlueprint,
      frameLibrary,
      productFocus,
      language: normalizedPromptLanguage
    });

    let plannerResult = '';
    let plannerService = null;
    try {
      plannerService = new ChatGPTService({ headless: false, flowId });
      let plannerAttempt = 0;
      while (plannerAttempt < 2) {
        try {
          await plannerService.initialize();
          plannerResult = await plannerService.analyzeMultipleImages(
            [...frameLibrary.map((frame) => frame.imagePath), productFilePath],
            plannerPrompt
          );
          break;
        } catch (plannerError) {
          if (plannerError?.code !== 'CHATGPT_MANUAL_INTERVENTION_REQUIRED' || plannerAttempt >= 1) {
            throw plannerError;
          }

          const actionRequired = buildManualActionPayload('step3', plannerError);
          updateFlowPreview(flowId, {
            status: 'action_required',
            actionRequired,
            step3: { waitingForManualAction: true, actionRequired }
          });
          await logger.warn(actionRequired.message, 'step-3-manual-action', actionRequired);

          const resolved = await plannerService.waitForManualResolution({ timeoutMs: 5 * 60 * 1000, pollMs: 2000 });
          if (!resolved) {
            throw new Error('Timed out waiting for manual ChatGPT verification');
          }

          updateFlowPreview(flowId, {
            status: 'resuming',
            actionRequired: null,
            step3: { waitingForManualAction: false, resumedAfterManualAction: true }
          });
          await logger.info('Manual ChatGPT verification resolved. Resuming Step 3.', 'step-3-manual-resolved');
          plannerAttempt += 1;
        }
      }
    } finally {
      if (plannerService) {
        try {
          await plannerService.close();
        } catch (plannerCloseError) {
          console.warn(`Failed to close Step 3 ChatGPT browser: ${plannerCloseError.message}`);
        }
      }
    }

    const parsedPlan = parseSegmentPlanningResponse(plannerResult, {
      analysis,
      blueprint: storyboardBlueprint,
      frameLibrary,
      productFocus,
      language: normalizedPromptLanguage
    });

    const segmentPlan = (parsedPlan.segments || []).map((segment, index) => ({
      segmentIndex: segment.segmentIndex || index + 1,
      segmentName: segment.segmentName || storyboardBlueprint.segments?.[index]?.segmentName || ('segment-' + (index + 1)),
      segment: segment.segmentName || storyboardBlueprint.segments?.[index]?.segmentName || ('segment-' + (index + 1)),
      durationSec: Number(segment.durationSec) || storyboardBlueprint.segments?.[index]?.durationSec || providerClipDuration,
      duration: Number(segment.durationSec) || storyboardBlueprint.segments?.[index]?.durationSec || providerClipDuration,
      startFrameKey: segment.startFrameKey || storyboardBlueprint.segments?.[index]?.startFrameKey,
      endFrameKey: segment.endFrameKey || storyboardBlueprint.segments?.[index]?.endFrameKey,
      videoPrompt: segment.videoPrompt || segment.script || '',
      script: segment.videoPrompt || segment.script || '',
      voiceoverText: segment.voiceoverText || '',
      continuityTargetForNextSegment: segment.continuityTargetForNextSegment || null
    }));

    const voiceoverScript = parsedPlan.voiceoverScript || segmentPlan.map((segment) => segment.voiceoverText).join(' ');
    const hashtags = Array.isArray(parsedPlan.hashtags) ? parsedPlan.hashtags : [];
    const deepAnalysis = {
      success: true,
      data: {
        storyboardBlueprint,
        frameLibrary,
        segmentPlan,
        videoScripts: segmentPlan,
        voiceoverScript,
        hashtags,
        metadata: { storyboardTemplate: storyboardBlueprint.templateKey },
        deepAnalysisPrompt: plannerPrompt,
        rawPlannerResponse: plannerResult
      }
    };

    const step3Duration = ((Date.now() - step3Start) / 1000).toFixed(2);
    await logger.endStage('deep-analysis', true);
    await logger.storeAnalysis({
      videoScripts: deepAnalysis.data.videoScripts?.length || 0,
      voiceoverScript: voiceoverScript.substring(0, 500),
      hashtags,
      storyboardTemplate: storyboardBlueprint.templateKey,
      duration: step3Duration
    });

    updateFlowPreview(flowId, {
      status: 'step3-complete',
      step3: {
        storyboardBlueprint,
        deepAnalysisPrompt: plannerPrompt,
        videoScripts: segmentPlan,
        segmentPlan,
        hashtags,
        voiceoverScript
      }
    });
    // ============================================================
    // STEP 4: SEQUENTIAL FRAMES VIDEO GENERATION
    // ============================================================

    console.log('\n' + '-'.repeat(80));
    console.log('STEP 4: Sequential Frames Video Generation');
    console.log('-'.repeat(80));
    await logger.startStage('video-generation');
    const step4Start = Date.now();

    let videoGenerationResult = null;
    let allGeneratedVideos = [];
    const plannedSegments = deepAnalysis.data.segmentPlan || deepAnalysis.data.videoScripts || [];
    const segmentPrompts = plannedSegments.map((segment) => segment.videoPrompt || segment.script || '');

    try {
      if (!Array.isArray(plannedSegments) || plannedSegments.length === 0) {
        throw new Error('No segment plan available from Step 3');
      }

      const tempVideoDir = path.join(tempDir, 'segment-videos');
      if (!fs.existsSync(tempVideoDir)) {
        fs.mkdirSync(tempVideoDir, { recursive: true });
      }

      const ffmpegReady = await isFfmpegAvailable();
      const step4PreviewItems = plannedSegments.map((segment, idx) => ({
        key: `segment-${segment.segmentIndex || idx + 1}`,
        label: segment.segmentName || segment.segment || `Segment ${idx + 1}`,
        status: 'queued',
        duration: segment.durationSec || segment.duration || providerClipDuration,
        prompt: segment.videoPrompt || segment.script || '',
        path: null,
        href: null,
        error: null
      }));

      updateFlowPreview(flowId, {
        status: 'step4-generating',
        step4: {
          videos: [...step4PreviewItems],
          totalCount: step4PreviewItems.length,
          completedCount: 0,
          error: null
        }
      });

      const segmentVideos = [];
      let chainedStartFramePath = null;

      for (const [segmentIndex, segment] of plannedSegments.entries()) {
        const startFramePath = chainedStartFramePath || resolveFramePath(frameLibrary, segment.startFrameKey);
        const endFramePath = resolveFramePath(frameLibrary, segment.endFrameKey);

        if (!startFramePath || !endFramePath) {
          throw new Error(`Missing frame path for segment ${segment.segmentIndex}: start=${segment.startFrameKey}, end=${segment.endFrameKey}`);
        }

        step4PreviewItems[segmentIndex] = {
          ...step4PreviewItems[segmentIndex],
          status: 'generating'
        };
        updateFlowPreview(flowId, {
          status: 'step4-generating',
          step4: {
            videos: [...step4PreviewItems],
            totalCount: step4PreviewItems.length,
            completedCount: step4PreviewItems.filter((item) => item.status === 'completed').length,
            error: null
          }
        });

        const videoGenService = new GoogleFlowAutomationService({
          type: 'video',
          aspectRatio: '9:16',
          videoCount: 1,
          headless: false,
          outputDir: tempVideoDir,
          debugMode: false,
          videoReferenceType: 'frames',
          timeouts: {
            pageLoad: 30000,
            generation: Math.max(300000, (videoDuration + 60) * 1000)
          }
        });

        const videoResult = await videoGenService.generateVideo(
          segment.videoPrompt || segment.script || '',
          startFramePath,
          endFramePath,
          {
            download: true,
            reloadAfter: false,
            ...(finalSceneImagePath ? { sceneImagePath: finalSceneImagePath } : {})
          }
        );

        if (!videoResult?.success || !videoResult?.path) {
          throw new Error(`Segment ${segment.segmentIndex} generation failed: ${videoResult?.error || 'unknown error'}`);
        }

        const extractedFramePath = await extractLastFrame(
          videoResult.path,
          path.join(tempVideoDir, `segment-${segment.segmentIndex}-last-frame.jpg`)
        );

        const segmentVideo = {
          segmentIndex: segment.segmentIndex,
          segment: segment.segmentName || segment.segment || `segment-${segment.segmentIndex}`,
          segmentName: segment.segmentName || segment.segment || `segment-${segment.segmentIndex}`,
          duration: segment.durationSec || segment.duration || providerClipDuration,
          startFrameKey: segment.startFrameKey,
          endFrameKey: segment.endFrameKey,
          startFramePath,
          endFramePath,
          chainedStartFrameUsed: Boolean(chainedStartFramePath),
          continuityFrameExtracted: extractedFramePath,
          ffmpegFrameExtractionAvailable: ffmpegReady,
          path: videoResult.path,
          href: videoResult.href || null,
          metadata: videoResult
        };

        segmentVideos.push(segmentVideo);
        allGeneratedVideos.push(segmentVideo);
        chainedStartFramePath = extractedFramePath || endFramePath;

        step4PreviewItems[segmentIndex] = {
          ...step4PreviewItems[segmentIndex],
          status: 'completed',
          path: videoResult.path,
          href: videoResult.href || null,
          error: null
        };
        updateFlowPreview(flowId, {
          status: 'step4-generating',
          step4: {
            videos: [...step4PreviewItems],
            totalCount: step4PreviewItems.length,
            completedCount: step4PreviewItems.filter((item) => item.status === 'completed').length,
            error: null
          }
        });
      }

      const stitchedVideoPath = await concatenateVideos(
        segmentVideos.map((segment) => segment.path),
        path.join(tempVideoDir, `stitched-${flowId}.mp4`)
      );
      const assemblyStatus = stitchedVideoPath
        ? 'stitched'
        : segmentVideos.length > 1
          ? 'segments-only'
          : 'single-segment';
      const primaryVideoPath = stitchedVideoPath || segmentVideos[0]?.path || null;

      videoGenerationResult = {
        success: segmentVideos.length > 0,
        videos: segmentVideos,
        totalCount: segmentVideos.length,
        status: segmentVideos.length > 0 ? 'success' : 'no-videos',
        videoPath: primaryVideoPath,
        stitchedVideoPath: stitchedVideoPath || null,
        assemblyStatus,
        requiresAssembly: assemblyStatus === 'segments-only',
        ffmpegFrameExtractionAvailable: ffmpegReady
      };
    } catch (error) {
      console.error(`STEP 4 generation error: ${error.message}`);
      videoGenerationResult = {
        success: false,
        videos: [],
        totalCount: 0,
        status: 'failed',
        error: error.message
      };
      await logger.error(error.message, 'video-generation-error');
    }

    const step4Duration = ((Date.now() - step4Start) / 1000).toFixed(2);
    await logger.endStage('video-generation', allGeneratedVideos.length > 0);
    await logger.info('Video generation completed', 'video-generation-complete', {
      generatedCount: allGeneratedVideos.length,
      duration: step4Duration,
      assemblyStatus: videoGenerationResult?.assemblyStatus || null
    });
    await logger.storeArtifacts({
      videos: allGeneratedVideos.map((v) => ({ segment: v.segment, path: v.path, size: v.size || 0 }))
    });

    updateFlowPreview(flowId, {
      status: videoGenerationResult?.success ? 'step4-complete' : 'step4-failed',
      step4: {
        videos: (videoGenerationResult?.videos || []).map((video, idx) => ({
          key: `segment-${video.segmentIndex || idx + 1}`,
          label: video.segmentName || video.segment || `Segment ${idx + 1}`,
          status: 'completed',
          duration: video.duration,
          prompt: segmentPrompts?.[idx] || '',
          path: video.path || null,
          href: video.href || null,
          error: null
        })),
        totalCount: videoGenerationResult?.totalCount || 0,
        completedCount: videoGenerationResult?.totalCount || 0,
        assemblyStatus: videoGenerationResult?.assemblyStatus || null,
        stitchedVideoPath: videoGenerationResult?.stitchedVideoPath || null,
        error: videoGenerationResult?.error || null
      }
    });
    // ============================================================
    // STEP 5: 💫 AUTO-SAVE GENERATED ASSETS TO DATABASE
    // ============================================================

    console.log('\n' + '─'.repeat(80));
    console.log('💾 STEP 5: Auto-saving assets to database');
    console.log('─'.repeat(80));

    const savedAssets = {
      images: [],
      videos: []
    };

    // 5.1 + 5.2: Save image variations (always create new assets per flowId)
    for (let varIdx = 0; varIdx < imageResults.length; varIdx++) {
      try {
        const variationNumber = varIdx + 1;
        const fileExt = path.extname(imageResults[varIdx].screenshotPath || '').toLowerCase() || '.jpg';
        const normalizedExt = fileExt === '.jpeg' ? '.jpg' : fileExt;
        const mimeType = normalizedExt === '.png' ? 'image/png' : 'image/jpeg';
        const uniqueFilename = `Generated-${flowId}-variation-${String(variationNumber).padStart(2, '0')}${normalizedExt}`;

        console.log(`\n📸 Saving image variation ${variationNumber} to database...`);
        const imgAssetResult = await AssetManager.saveAsset({
          filename: uniqueFilename,
          mimeType,
          fileSize: fs.existsSync(imageResults[varIdx].screenshotPath) ? fs.statSync(imageResults[varIdx].screenshotPath).size : 0,
          assetType: 'image',
          assetCategory: 'generated-image',
          userId: req.body.userId || 'system',
          sessionId: flowId,
          storage: {
            location: imageResults[varIdx].googleDriveId ? 'hybrid' : 'local',
            path: imageResults[varIdx].screenshotPath,
            url: imageResults[varIdx].href || imageResults[varIdx].screenshotPath,
            googleDriveId: imageResults[varIdx].googleDriveId || null,
            webViewLink: imageResults[varIdx].googleDriveWebViewLink || null
          },
          cloudStorage: {
            location: 'google-drive',
            localPath: imageResults[varIdx].screenshotPath,
            googleDriveId: imageResults[varIdx].googleDriveId || null,
            webViewLink: imageResults[varIdx].googleDriveWebViewLink || null,
            status: imageResults[varIdx].googleDriveId ? 'synced' : 'pending',
            googleDrivePath: 'Affiliate AI/Images/Completed'
          },
          syncStatus: imageResults[varIdx].googleDriveId ? 'synced' : 'pending',
          metadata: {
            format: normalizedExt.replace('.', ''),
            type: `character-variation-${variationNumber}`,
            flowId,
            driveId: imageResults[varIdx].googleDriveId || null
          },
          tags: ['generated', 'affiliate-video', 'character-variation', `variation-${variationNumber}`]
        }, { verbose: true });

        if (imgAssetResult.success) {
          console.log(`   ✅ Image variation ${variationNumber} saved`);
          savedAssets.images.push(imgAssetResult.asset);
        }
      } catch (assetError) {
        console.warn(`   ⚠️  Failed to save image variation ${varIdx + 1}: ${assetError.message}`);
      }
    }

    // 5.3: Save generated videos

    for (const videoData of allGeneratedVideos) {
      try {
        console.log(`\n🎬 Saving video (${videoData.segment}) to database...`);
        const videoAssetResult = await AssetManager.saveAsset({
          filename: path.basename(videoData.path),
          mimeType: 'video/mp4',
          fileSize: videoData.size || 0,
          assetType: 'video',
          assetCategory: 'generated-video',
          userId: req.body.userId || 'system',
          sessionId: flowId,
          storage: {
            location: 'local',
            localPath: videoData.path,
            url: `/api/v1/browser-automation/serve-video/${path.basename(videoData.path)}`
          },
          metadata: {
            format: 'mp4',
            segment: videoData.segment,
            duration: videoData.duration,
            flowId
          },
          tags: ['generated', 'affiliate-video', 'video-segment', videoData.segment]
        }, { verbose: true });

        if (videoAssetResult.success) {
          savedAssets.videos.push(videoAssetResult.asset);
        }
      } catch (assetError) {
        console.warn(`   ⚠️  Failed to save video ${videoData.segment}: ${assetError.message}`);
      }
    }

    console.log(`\n✅ Asset saving complete: ${savedAssets.images.length} images, ${savedAssets.videos.length} videos`);

    // ============================================================
    // FINAL RESULTS COMPILATION
    // ============================================================

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 💫 Build response with error handling
    try {
      console.log(`\n📋 Building response object...`);
      
      const responseData = {
        success: true,
        flowId,
        data: {
          step1: {
            status: 'completed',
            duration: `${step1Duration}s`,
            analysis,
            storyboardBlueprint,
            driveUrls: {
              character: characterDriveUrl || null,
              product: productDriveUrl || null
            }
          },
          step2: {
            status: 'completed',
            duration: `${step2Duration}s`,
            storyboardBlueprint,
            framePlan: framePlan.frames,
            frameLibrary,
            images: {
              wearing: hookStart?.imagePath || null,
              holding: showcaseEnd?.imagePath || null
            },
            imageCount: imageResults.length
          },
          step3: {
            status: 'completed',
            duration: `${step3Duration}s`,
            storyboardBlueprint,
            deepAnalysisPrompt: plannerPrompt,
            segmentPlan: deepAnalysis?.data?.segmentPlan || [],
            analysis: {
              videoScripts: deepAnalysis?.data?.videoScripts || [],
              voiceoverScript: deepAnalysis?.data?.voiceoverScript || '',
              voiceoverLength: deepAnalysis?.data?.voiceoverScript?.length || 0,
              hashtags: deepAnalysis?.data?.hashtags || []
            }
          },
          step4: {
            status: videoGenerationResult?.error && videoGenerationResult?.totalCount === 0 ? 'failed' : 'completed',
            duration: `${step4Duration}s`,
            totalVideos: videoGenerationResult?.totalCount || 0,
            videoPath: videoGenerationResult?.videoPath || null,
            stitchedVideoPath: videoGenerationResult?.stitchedVideoPath || null,
            assemblyStatus: videoGenerationResult?.assemblyStatus || null,
            requiresAssembly: Boolean(videoGenerationResult?.requiresAssembly),
            videos: (videoGenerationResult?.videos || []).map(v => ({
              segmentIndex: v.segmentIndex,
              segmentName: v.segmentName || v.segment,
              path: v.path,
              href: v.href || null,
              duration: v.duration,
              startFrameKey: v.startFrameKey,
              endFrameKey: v.endFrameKey,
              continuityFrameExtracted: v.continuityFrameExtracted || null
            })),
            error: videoGenerationResult?.error || null
          },
          step5: {
            status: 'completed',
            ttsText: deepAnalysis?.data?.voiceoverScript || '',
            savedAssets: {
              images: savedAssets.images.length,
              videos: savedAssets.videos.length
            }
          }
        },
        metadata: {
          totalDuration: `${totalDuration}s`,
          flowId,
          videoDuration,
          voiceGender,
          voicePace,
          voiceName: voiceName || 'aoede',
          productFocus,
          storyboardTemplate: storyboardBlueprint?.templateKey || null,
          timestamp: new Date().toISOString(),
          savedAssets: {
            images: savedAssets.images.length,
            videos: savedAssets.videos.length
          }
        }
      };

      updateFlowPreview(flowId, {
        status: 'completed',
        step5: {
          ttsText: deepAnalysis?.data?.voiceoverScript || '',
          hashtags: deepAnalysis?.data?.hashtags || []
        },
        final: {
          totalDuration: `${totalDuration}s`,
          videos: (videoGenerationResult?.videos || []).map(v => v.path || v.url).filter(Boolean)
        }
      });

      // Mark session as completed and store final artifacts
      const generatedImagePaths = [];
      imageResults.forEach((img, idx) => {
        if (img?.screenshotPath) {
          console.log(`   📸 Image variation ${idx + 1}: ${img.screenshotPath}`);
          generatedImagePaths.push(img.screenshotPath);
        }
      });

      await logger.storeArtifacts({
        characterImagePath: characterFilePath,
        productImagePath: productFilePath,
        generatedImagePaths: generatedImagePaths,
        videoSegmentPaths: savedAssets.videos
      });
      await logger.markCompleted();
      
      console.log(`✅ Flow completed [${flowId}]`);
      
      // Send response
      res.json(responseData);
    } catch (responseError) {
      console.error(`💥 ERROR building/sending response: ${responseError.message}`);
      console.error(`Stack: ${responseError.stack}`);
      
      // Send error response
      res.status(500).json({
        success: false,
        error: `Response compilation error: ${responseError.message}`,
        stage: 'response-building',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    await logger.markFailed(error.message);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    res.status(500).json({
      success: false,
      error: error.message,
      flowId,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    });
  }
}

// ============================================================
// DEEP CHATGPT ANALYSIS
// ============================================================

/**
 * Perform deep ChatGPT analysis with all 3 images
 * Returns: video scripts, voiceover script, hashtags
 * 
 * 🔴 CRITICAL: Ensures ChatGPT browser is always closed, even on errors
 * Uses flowId to isolate browser session (prevent profile conflicts)
 */
async function performDeepChatGPTAnalysis(analysis, images, config) {
  let chatGPTService = null;  // 🔴 Declare outside try so finally can access it
  
  try {
    const { characterImages, productImage } = images;  // ✅ Updated: 2 character images (wearing + holding)
    const { videoDuration, voiceGender, voicePace, productFocus, language = 'en', videoProvider = 'grok', clipDuration = 10, flowId } = config;

    console.log('\n🧠 STEP 3: Deep ChatGPT Analysis for Video Segment Scripts');
    console.log(`   Character images: 2 (wearing + holding)`);
    console.log(`   Voice: ${voiceGender} (${voicePace} pace)`);
    console.log(`   Duration target: ${videoDuration}s`);
    console.log(`   Provider clip: ${clipDuration || getProviderClipDuration(videoProvider)}s (${videoProvider})`);

    // Build detailed prompt for ChatGPT video analysis
    // 💫 Use Vietnamese prompts if language='vi'
    // Normalize language code: 'vi-VN' or 'vi_VN' → 'vi'
    const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
    let deepAnalysisPrompt;
    if (normalizedLanguage === 'vi') {
      deepAnalysisPrompt = VietnamesePromptBuilder.buildDeepAnalysisPrompt(
        productFocus,
        { videoDuration, voiceGender, voicePace, clipDuration: clipDuration || getProviderClipDuration(videoProvider), videoProvider }
      );
    } else {
      deepAnalysisPrompt = buildDeepAnalysisPrompt(
        analysis,
        {
          images: characterImages  // ✅ Pass 2 character images (wearing + holding)
        },
        { videoDuration, voiceGender, voicePace, productFocus, videoProvider, clipDuration: clipDuration || getProviderClipDuration(videoProvider) }
      );
    }

    // 🔴 CRITICAL: Initialize BEFORE attempting image analysis
    console.log(`   🚀 Initializing ChatGPT Browser Automation...`);
    // 🔐 STEP 3: Isolate with flowId to prevent parallel profile conflicts
    chatGPTService = new ChatGPTService({ headless: false, flowId });
    
    // ???? NEW: Log the 2 character images being uploaded to ChatGPT
    console.log(`\n???? STEP 3: Uploading character images for ChatGPT segment analysis:`);
    characterImages.forEach((img, idx) => {
      const type = idx === 0 ? 'wearing' : 'holding';
      console.log(`   ?????? Character ${type}: ${img}`);
    });
    console.log(`   ?????? Product image: ${productImage} (for reference)`);
    
    // Verify all images exist
    const allImages = [...characterImages, productImage];
    const missingImages = allImages.filter(img => !img || (typeof img === 'string' && !fs.existsSync(img)));
    if (missingImages.length > 0) {
      throw new Error(`Missing images for ChatGPT analysis: ${missingImages.length} image(s) not found or undefined`);
    }
    console.log(`   ??? All ${allImages.length} images verified to exist`);

    let rawChatGPTResponse = null;
    let chatgptAttempt = 0;
    while (chatgptAttempt < 2) {
      try {
        await chatGPTService.initialize();
        rawChatGPTResponse = await chatGPTService.analyzeMultipleImages(
          allImages,  // ??? Pass 2 character images + product image
          deepAnalysisPrompt
        );
        break;
      } catch (chatgptError) {
        if (chatgptError?.code !== 'CHATGPT_MANUAL_INTERVENTION_REQUIRED' || chatgptAttempt >= 1) {
          throw chatgptError;
        }

        const actionRequired = buildManualActionPayload('step3', chatgptError);
        updateFlowPreview(flowId, {
          status: 'action_required',
          actionRequired,
          step3: { waitingForManualAction: true, actionRequired }
        });
        if (config.logger?.warn) {
          await config.logger.warn(actionRequired.message, 'step-3-manual-action', actionRequired);
        }

        const resolved = await chatGPTService.waitForManualResolution({ timeoutMs: 5 * 60 * 1000, pollMs: 2000 });
        if (!resolved) {
          throw new Error('Timed out waiting for manual ChatGPT verification');
        }

        updateFlowPreview(flowId, {
          status: 'resuming',
          actionRequired: null,
          step3: { waitingForManualAction: false, resumedAfterManualAction: true }
        });
        if (config.logger?.info) {
          await config.logger.info('Manual ChatGPT verification resolved. Resuming Step 3.', 'step-3-manual-resolved');
        }
        chatgptAttempt += 1;
      }
    }

    // 💫 NEW: Log the raw response received from ChatGPT (not the long prompt)
    console.log(`\n📥 CHATGPT RAW RESPONSE RECEIVED:`);
    console.log(`${'─'.repeat(80)}`);
    console.log(rawChatGPTResponse);
    console.log(`${'─'.repeat(80)}\n`);

    // 💫 PARSE the raw text response into structured data
    let analysisData = null;
    try {
      analysisData = parseDeepAnalysisResponse(rawChatGPTResponse, analysis, videoDuration);
    } catch (parseError) {
      console.warn(`⚠️  Failed to parse ChatGPT response: ${parseError.message}`);
      console.log('   Using fallback structured generation...');
    }

    // If parsing failed or returned no data, use fallback
    if (!analysisData || !analysisData.videoScripts || analysisData.videoScripts.length === 0) {
      console.warn(`⚠️  Deep analysis returned no valid scripts, using structured generation...`);
      // Fall back to structured generation if ChatGPT analysis fails
      const fallbackData = generateStructuredVideoContent(analysis, { videoDuration, voiceGender, voicePace, productFocus });
      
      // 💫 NEW: Log the fallback data being used
      console.log(`\n⚠️  USING FALLBACK STRUCTURED DATA:`);
      console.log(`${'─'.repeat(80)}`);
      console.log(JSON.stringify(fallbackData, null, 2));
      console.log(`${'─'.repeat(80)}\n`);
      
      return {
        success: true,  // Still return success since we have fallback data
        data: fallbackData,
        source: 'fallback-structured'
      };
    }
    
    console.log(`✅ Deep analysis complete:`);
    console.log(`   Video segments: ${analysisData.videoScripts?.length || 4}`);
    console.log(`   Voiceover length: ${analysisData.voiceoverScript?.length || 0} chars`);
    console.log(`   Hashtags: ${analysisData.hashtags?.length || 0}`);

    return {
      success: true,
      data: analysisData,
      source: 'chatgpt-analysis'
    };
  } catch (error) {
    console.error('⚠️  Deep ChatGPT Browser analysis error:', error.message);
    console.warn(`   Falling back to structured video generation...`);
    
    // Always return success with fallback data instead of failing
    const fallbackData = generateStructuredVideoContent(analysis, config);
    
    // 💫 NEW: Log the error and fallback data
    console.log(`\n❌ CHATGPT ANALYSIS ERROR - USING FALLBACK:`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`Error: ${error.message}`);
    console.log(`\nFallback Data:`);
    console.log(JSON.stringify(fallbackData, null, 2));
    console.log(`${'─'.repeat(80)}\n`);
    
    return {
      success: true,  // Return success so main flow continues
      data: fallbackData,
      source: 'fallback-error-catch',
      error: error.message  // Include error for debugging
    };
  } finally {
    // 🔴 CRITICAL: ALWAYS close ChatGPT browser, even if error occurred
    if (chatGPTService) {
      try {
        console.log(`\n🔒 Closing ChatGPT browser...`);
        await chatGPTService.close();
        console.log(`✅ ChatGPT browser closed successfully`);
      } catch (closeError) {
        console.error(`⚠️  Error closing ChatGPT browser: ${closeError.message}`);
      }
    }
  }
}

/**
 * Generate structured video content as fallback if ChatGPT analysis fails
 */
function generateStructuredVideoContent(analysis, config) {
  const { videoDuration, voiceGender, voicePace, productFocus } = config;
  
  const productName = analysis.product?.garment_type || analysis.product?.name || 'product';
  const productType = analysis.product?.garment_type || 'item';
  const productColor = analysis.product?.primary_color || analysis.product?.color || 'beautiful';
  const productMaterial = analysis.product?.fabric_type || analysis.product?.material || 'quality fabric';

  // Segment durations based on video length
  const segmentDurations = calculateSegmentDurations(videoDuration);

  return {
    videoScripts: [
      {
        segment: 'intro',
        duration: segmentDurations.intro,
        script: `Introducing the amazing ${productName} that will transform your style! ${productColor} and absolutely stunning.`,
        imageComposition: ['wearing', 'product']  // Multi-image composition
      },
      {
        segment: 'wearing',
        duration: segmentDurations.wearing,
        script: `See how flawlessly it looks when worn – perfect fit, amazing style, incredibly comfortable. This ${productType} is a must-have!`,
        imageComposition: ['wearing']  // Single image
      },
      {
        segment: 'holding',
        duration: segmentDurations.holding,
        script: `Check out the exquisite details – the quality is insane! Made with premium ${productMaterial}, designed for durability and elegance.`,
        imageComposition: ['holding', 'product']  // Multi-image composition
      },
      {
        segment: 'cta',
        duration: segmentDurations.cta,
        script: `Don't miss out! Get yours now and elevate your wardrobe instantly. Limited stock available. Link in bio for exclusive deals! #Must-have`,
        imageComposition: ['product']  // Single image
      }
    ],
    voiceoverScript: generateVoiceoverScript(productName, productColor, voicePace),
    hashtags: generateHashtagsForTikTok(analysis.product, productFocus)
  };
}

/**
 * Calculate segment durations based on video length
 */
function calculateSegmentDurations(totalDuration) {
  // Distribute duration across segments (intro, wearing, holding, cta)
  // Typical ratio: intro 15%, wearing 25%, holding 25%, cta 35%
  return {
    intro: Math.floor(totalDuration * 0.15),
    wearing: Math.floor(totalDuration * 0.25),
    holding: Math.floor(totalDuration * 0.25),
    cta: Math.ceil(totalDuration * 0.35)
  };
}

/**
 * Generate voiceover script for TikTok
 */
function generateVoiceoverScript(productName, productColor, voicePace) {
  const pace = voicePace === 'fast' ? '!!!' : voicePace === 'slow' ? '...' : '! ';
  const openers = [
    `OMG check this out${pace}`,
    `You NEED to see this${pace}`,
    `This just dropped and it's everything${pace}`,
    `Game changer alert${pace}`,
    `This is insane${pace}`
  ];
  
  const opener = openers[Math.floor(Math.random() * openers.length)];
  
  return `${opener} This gorgeous ${productColor} ${productName} is literally everything${pace} The quality${pace} the fit${pace} INCREDIBLE${pace} Perfect for any vibe you're going for${pace} Trust me, you're going to love this${pace} Get yours now, link in bio${pace} #MustHave #FashionHaul #ProductReview`;
}

/**
 * Generate TikTok hashtags based on product
 */
function generateHashtagsForTikTok(product, productFocus) {
  const baseHashtags = [
    '#Affiliate',
    '#FashionHaul',
    '#ProductReview',
    '#MustHave',
    '#TikTokShop',
    '#Fashion',
    '#StyleInspo',
    '#ShopWithMe'
  ];

  // Add focus-specific hashtags
  const focusHashtags = {
    'full-outfit': ['#OutfitOfTheDay', '#Fashion', '#OOTD'],
    'top': ['#TopOfTheDay', '#ShirtStyle', '#TopLook'],
    'bottom': ['#BottomStyle', '#FitCheck', '#DressCode'],
    'shoes': ['#ShoesAddict', '#ShoeGame', '#StepItUp'],
    'accessories': ['#AccessoryGoals', '#StyleAccessories', '#AccesoryHaul']
  };

  const focus = productFocus || 'full-outfit';
  const contextHashtags = focusHashtags[focus] || focusHashtags['full-outfit'];

  const trendingHashtags = [
    '#ForYouPage',
    '#FYP',
    '#Viral',
    '#TikTok',
    '#Shopping'
  ];

  // Combine and deduplicate
  const allHashtags = [...new Set([...baseHashtags, ...contextHashtags, ...trendingHashtags])];
  
  // Return top 10 hashtags
  return allHashtags.slice(0, 10);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Build the prompt for deep ChatGPT analysis
 */
/**
 * Parse raw ChatGPT response into structured video content
 * Handles multiple response formats: JSON, markdown sections, plain text
 */
function parseDeepAnalysisResponse(rawText, analysis, videoDuration = 20) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Invalid response - expected string');
  }

  // 🔥 NEW: Calculate optimal number of segments based on video duration
  // Google Flow generates ~8s per video, so for 20s duration we need at least 3 segments
  // (20s / 8s = 2.5, rounded up to 3)
  const generationTimePerVideo = 8;  // Google Flow generation time in seconds
  const minSegmentsForDuration = Math.max(2, Math.ceil(videoDuration / generationTimePerVideo));
  
  console.log(`\n🔍 PARSING CHATGPT RESPONSE`);
  console.log(`   Raw text length: ${rawText.length} characters`);
  console.log(`   📊 Video duration: ${videoDuration}s / Gen time: ${generationTimePerVideo}s → Need ${minSegmentsForDuration} segments`);

  // METHOD 1: Try to extract JSON if it exists
  console.log(`   📍 METHOD 1: Checking for embedded JSON...`);
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.videoScripts || parsed.segments) {
          console.log(`   ✅ Found valid JSON structure`);
          return {
            videoScripts: parsed.videoScripts || parsed.segments || [],
            voiceoverScript: parsed.voiceoverScript || parsed.voiceover || '',
            hashtags: parsed.hashtags || parsed.tags || []
          };
        }
      } catch (jsonErr) {
        console.log(`   ⚠️  JSON parsing failed: ${jsonErr.message}`);
      }
    }
  } catch (e) {
    // Continue to next method
  }

  // METHOD 2: Extract sections by markers ([SEGMENT_1], [SEGMENT_2], etc.)
  console.log(`   📍 METHOD 2: Extracting by markers [SEGMENT_N]...`);
  
  const sections = {
    videoScripts: [],
    voiceoverScript: '',
    hashtags: []
  };

  // Extract [SEGMENT_N] blocks - each segment can span multiple lines
  // Pattern: [SEGMENT_N] ... [CHARACTER IMAGE: ...] ... "script text" ... or narrative text
  const segmentBlockPattern = /\[SEGMENT_(\d+)\]([\s\S]*?)(?=\[SEGMENT_|\[VOICEOVER|🎙️|#️⃣HASHTAG|#[A-Za-z]|$)/gi;
  
  let segmentMatch;
  let foundCount = 0;
  
  while ((segmentMatch = segmentBlockPattern.exec(rawText)) !== null) {
    // 🔥 FIX: Stop after extracting expected number of segments
    // ChatGPT sometimes provides duplicate versions - only take the first set
    if (foundCount >= minSegmentsForDuration) {
      console.log(`   ℹ️  Stopping segment extraction (found ${foundCount}, expected ${minSegmentsForDuration})`);
      break;
    }
    
    const [completeBlock, segmentNum, segmentContent] = segmentMatch;
    
    // Extract the script from the segment block
    // Look for quoted text or narrative text after the image line
    const scriptPatterns = [
      /[""]([^""]+?)[""]/, // Quoted text with smart quotes
      /["']([^'"]+?)["']/, // Single quotes
      /"([^"]+?)"/, // Regular double quotes
      /(?:\[CHARACTER IMAGE:[^\]]*\]\s*\n\s*)(.{20,}?)(?=\[|#|$)/ // Text after CHARACTER IMAGE line
    ];
    
    let scriptText = '';
    for (const pattern of scriptPatterns) {
      const match = segmentContent.match(pattern);
      if (match && match[1] && match[1].length > 10) {
        scriptText = match[1].trim().replace(/\n\s+/g, ' ');
        break;
      }
    }
    
    // If still no script found, take the whole content after removing markers
    if (!scriptText) {
      scriptText = segmentContent
        .replace(/\[CHARACTER IMAGE:[^\]]*\]/g, '')
        .replace(/^[\s\n-*#+0-9.]+/, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('['))
        .join(' ')
        .trim();
    }
    
    if (scriptText && scriptText.length > 10) {
      sections.videoScripts.push({
        segment: `segment_${segmentNum}`,
        duration: Math.floor(videoDuration / minSegmentsForDuration),  // Distribute evenly
        script: scriptText,
        imageComposition: ['character']
      });
      foundCount++;
    }
  }
  
  if (foundCount > 0) {
    console.log(`   ✅ Found ${foundCount} video segments with [SEGMENT_N] markers`);
  }

  // Extract VOICEOVER section (🎙️ VOICEOVER, VOICEOVER:, etc.)
  console.log(`   📍 METHOD 2b: Extracting VOICEOVER section...`);
  const voiceoverMatch = rawText.match(
    /(?:🎙️\s*VOICEOVER|VOICEOVER\s*:)[\s\n]*([\s\S]*?)(?=(?:#️⃣|HASHTAG|#[A-Za-z]|$))/i
  );
  
  if (voiceoverMatch) {
    const voiceText = voiceoverMatch[1]
      .replace(/^[\s\n-]+/, '')
      .trim()
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join(' ')  // Join lines with space
      .replace(/\s+/g, ' ')  // Collapse multiple spaces
      .trim();
    
    if (voiceText && voiceText.length > 10) {
      sections.voiceoverScript = voiceText;
      console.log(`   ✅ Found VOICEOVER (${voiceText.length}ch)`);
    }
  }

  // Extract HASHTAGS section (#️⃣ HASHTAGS or just #hashtags)
  console.log(`   📍 METHOD 2c: Extracting HASHTAGS...`);
  const allTags = (rawText.match(/#[A-Za-z0-9]+/g) || []).map(tag => tag.substring(1));
  if (allTags.length > 0) {
    sections.hashtags = allTags;
    console.log(`   ✅ Found ${allTags.length} hashtags`);
  }

  // METHOD 3: If no segments found, try intelligent extraction from unstructured text
  if (sections.videoScripts.length === 0) {
    console.log(`   📍 METHOD 3: No markers found, attempting intelligent extraction...`);
    
    // If response was a long paragraph without structure, try to break it intelligently
    const paragraphs = rawText.split('\n\n').filter(p => p.trim().length > 20);
    
    // Create segment names based on calculated need (not hardcoded as 4)
    const allSegmentNames = ['intro', 'wearing', 'holding', 'cta', 'bonus1', 'bonus2'];
    const segmentCount = Math.min(minSegmentsForDuration, allSegmentNames.length, paragraphs.length);
    const segmentNames = allSegmentNames.slice(0, segmentCount);
    
    console.log(`   📊 Attempting to extract ${segmentCount} segments from ${paragraphs.length} paragraphs`);
    
    paragraphs.slice(0, segmentCount).forEach((para, idx) => {
      const segName = segmentNames[idx] || 'segment';
      const cleanText = para
        .replace(/^[\s\n-*#+0-9.]+/, '')  // Remove bullets, numbers, markers
        .trim();
      
      if (cleanText.length > 10) {
        sections.videoScripts.push({
          segment: segName,
          duration: Math.floor(videoDuration / segmentCount),  // Distribute duration evenly
          script: cleanText,
          imageComposition: [getImageForSegment(segName)]
        });
      }
    });
    
    if (sections.videoScripts.length > 0) {
      console.log(`   ✅ Extracted ${sections.videoScripts.length} segments from paragraphs`);
    }
  }
    
    // Extract any unstructured voiceover text (longer paragraphs)
    if (sections.voiceoverScript.length === 0 && sections.videoScripts.length > 0) {
      const voiceParagraphs = rawText.split('\n\n').filter(p => p.trim().length > 50);
      const voiceText = voiceParagraphs
        .filter(p => !p.includes('[') && !p.includes('#'))  // Skip structured sections
        .join(' ')
        .trim();
      
      if (voiceText.length > 20) {
        sections.voiceoverScript = voiceText;
        console.log(`   ✅ Extracted voiceover from remaining text (${voiceText.length}ch)`);
      }
    }

  console.log(`   📊 Parsing complete:`);
  console.log(`      Video segments: ${sections.videoScripts.length}`);
  console.log(`      Voiceover length: ${sections.voiceoverScript.length}ch`);
  console.log(`      Hashtags: ${sections.hashtags.length}`);

  // Validate minimum requirements
  if (sections.videoScripts.length < 2) {
    console.warn(`⚠️  PARSING WARNING: Got ${sections.videoScripts.length} segments, need at least 2`);
  }

  return sections;
}

/**
 * Parse video segments from text
 */
function parseVideoSegments(text) {
  const segments = [];
  
  // Try to find segment markers like [INTRO], [WEARING], [HOLDING], [CTA] with optional [IMAGES: ...]
  // Pattern: [SEGMENT_NAME] (duration) [IMAGES: image1, image2] : script\n- Reason: reason text
  const segmentPattern = /\[(\w+)\]\s*(?:\((\d+)s?\)|\[(\d{1,2})-(\d{1,2})s?\])\s*(?:\[IMAGES?:\s*([^\]]+)\])?\s*:?\s*([\s\S]*?)(?=\[(?:INTRO|WEARING|HOLDING|CTA|OUTRO)|$)/gi;
  
  let match;
  while ((match = segmentPattern.exec(text)) !== null) {
    const [, segmentName, durationRaw, startSecond, endSecond, imagesStr, script] = match;
    const computedDuration = durationRaw
      ? parseInt(durationRaw, 10)
      : Math.max(1, (parseInt(endSecond || '0', 10) - parseInt(startSecond || '0', 10)));
    
    // Parse image composition from [IMAGES: wearing, product, ...]
    let imageComposition = [];
    if (imagesStr) {
      imageComposition = imagesStr
        .split(',')
        .map(img => img.trim().toLowerCase())
        .filter(img => ['wearing', 'holding', 'product'].includes(img));
    }
    
    // Fallback to default if no images specified
    if (imageComposition.length === 0) {
      imageComposition = [getImageForSegment(segmentName)];
    }
    
    if (script && script.trim().length > 0) {
      // Extract just the script part (remove the "- Reason: ..." part if present)
      const scriptOnly = script.split('\n').filter(line => !line.match(/^\s*-\s*Reason/))[0] || script;
      
      segments.push({
        segment: segmentName.toLowerCase(),
        duration: computedDuration || 5,
        script: scriptOnly.trim(),
        imageComposition: imageComposition  // NEW: Store array of images
      });
    }
  }

  // If no segments found by pattern, split by lines
  if (segments.length === 0) {
    const lines = text
      .split('\n')
      .filter(l => l.trim().length > 10)
      .slice(0, 4); // Maximum 4 segments
    
    lines.forEach((line, idx) => {
      const segmentName = ['intro', 'wearing', 'holding', 'cta'][idx] || 'segment';
      segments.push({
        segment: segmentName,
        duration: 5,
        script: line.replace(/^[^:]+:\s*/, '').trim(),
        imageComposition: [getImageForSegment(segmentName)]  // NEW: Wrap in array
      });
    });
  }

  return segments;
}

/**
 * Get appropriate image for segment type
 */
function getImageForSegment(segmentName) {
  const name = segmentName.toLowerCase();
  if (name.includes('intro') || name.includes('start')) return 'wearing';
  if (name.includes('wear') || name.includes('styled')) return 'wearing';
  if (name.includes('hold') || name.includes('product')) return 'holding';
  if (name.includes('cta') || name.includes('call')) return 'product';
  if (name.includes('end') || name.includes('outro')) return 'product';
  return 'wearing';
}

/**
 * Parse hashtags from text
 */
function parseHashtags(text) {
  // Find all #hashtags
  const hashtagMatches = text.match(/#\w+/g) || [];
  return hashtagMatches.map(tag => tag.substring(1)); // Remove # prefix
}

function buildDeepAnalysisPrompt(analysis, images, config) {
  const { images: characterImages = [] } = images;  // ✅ Updated: 2 character images (wearing + holding)
  const { videoDuration, voiceGender, voicePace, productFocus, videoProvider = 'grok' } = config;

  // 🔥 FIX: Calculate segment count based on VIDEO PROVIDER clip duration
  // Google Flow: 8s/clip → 20s = 3 segments, 30s = 4 segments
  // Grok: 10s/clip → 20s = 2 segments, 30s = 3 segments
  const generateTimePerVideo = getProviderClipDuration(videoProvider);
  const segmentCount = Math.max(2, Math.ceil(videoDuration / generateTimePerVideo));

  return `
You are a professional TikTok affiliate video director & script writer.

PRODUCT INFORMATION:
- Product: ${analysis.product?.garment_type}
- Color: ${analysis.product?.primary_color}
- Material: ${analysis.product?.fabric_type}
- Style: ${analysis.product?.style_category}
- Details: ${analysis.product?.key_details}

CHARACTER INFORMATION:
- Age/Gender: ${analysis.character?.age} ${analysis.character?.gender}
- Body Type: ${analysis.character?.bodyType}
- Hair: ${analysis.character?.hair?.color} ${analysis.character?.hair?.style}

AVAILABLE CHARACTER IMAGES:
🔒 CHARACTER CONSISTENCY: Both images show THE SAME CHARACTER:
1. "Wearing" - Character WEARING the product (showing fit on body)
2. "Holding" - Character HOLDING/DISPLAYING the product (close-up showcase)

VIDEO CONSTRAINTS:
- Total Duration: ${videoDuration}s (exactly)
- Provider: ${videoProvider === 'google-flow' ? 'Google Flow (8s max per clip)' : 'Grok Imagine (10s max per clip)'}
- Segments Needed: ${segmentCount} (60s = ${Math.ceil(60 / generateTimePerVideo)} segments, ${videoDuration}s = ${segmentCount} segments)
- Format: Vertical 9:16 TikTok

YOUR TASK:
Create ${segmentCount} connected video segments with COMPLETE VISUAL DIRECTIONS + SCRIPTS.
Each segment flows naturally into the next (NOT disconnected pieces).

⚠️ CRITICAL FORMAT - FOLLOW EXACTLY:

[SEGMENT_#] [TIME RANGE: Xs-Ys] [START_FRAME: wearing/holding/product]
**VISUAL DIRECTION:**
- Camera: [describe angle/movement: fixed/zoom-in/zoom-out/pan left/pan right with speed]
- Character Pose: [describe starting pose and any movement transitions]
- Product Focus: [describe what product part is shown: full-body/face/torso/hands/detail]
- Movement: [describe character movement if any: walking/gesturing/posing/turning]
- Duration per action: [when pose changes within segment]

**SCRIPT:**
[Write 1-2 sentence narrative script that syncs with the visual direction]
[Script should guide lip-sync timing if character speaks]

**LIP-SYNC GUIDE** (if narrator speaking at timestamps):
- Seconds X-Y: [emotion/mouth shape: smiling/talking/neutral]
- Seconds X-Y: [next emotion/action]

---

TIME RANGE CALCULATION GUIDE:
You have ${videoDuration} total seconds for ${segmentCount} segments.
Distribute evenly or strategically:
- SEGMENT 1 (Hook): 2-3s CRITICAL to grab attention
- SEGMENT 2-N (Features): ${Math.floor(videoDuration / segmentCount)}-${Math.ceil(videoDuration / segmentCount)}s each
- SEGMENT_${segmentCount} (CTA): 2-3s with urgency

Example time allocation for ${videoDuration}s:
${(() => {
  let distribution = [];
  for (let i = 1; i <= segmentCount; i++) {
    const segDuration = Math.ceil(videoDuration / segmentCount);
    const startTime = (i - 1) * segDuration;
    const endTime = i === segmentCount ? videoDuration : i * segDuration;
    distribution.push('  [SEGMENT_' + i + ']: ' + startTime + '-' + endTime + 's (' + (endTime - startTime) + 's)');
  }
  return distribution.join('\n');
})()}

VISUAL DIRECTION EXAMPLES:

🎬 WEARING IMAGE SEGMENT:
- Camera: Slow zoom-in from full-body to torso (2 seconds)
- Character Pose: Standing, turning slowly to show product fit from different angles
- Movement: Natural 90° turn, slight hand gestures to emphasize fit
- Product Focus: Showing how product fits on body, flattering angle
- Lip-sync: [Smiling while describing product quality - seconds 0-2]

🎬 HOLDING IMAGE SEGMENT:
- Camera: Fixed close-up on hands and product
- Character Pose: Holding product up slightly, fingers pointing to details
- Movement: Slight hand rotation to show product from multiple angles
- Product Focus: Close-up of material, color, quality details
- Lip-sync: [Animated, excited expressions while highlighting features - seconds X-Y]

🎬 PRODUCT SHOT SEGMENT:
- Camera Layer product shot over background (zoom to fill frame)
- Character Pose: N/A for product-only shots, OR character partially visible
- Movement: Subtle fade-in/fade-out, or gentle rotation
- Product Focus: Full product display, premium feel
- Lip-sync: [Narrator voiceover synchronized with on-screen text]

---

📝 COMPLETE RESPONSE FORMAT:

[SEGMENT_1] [TIME RANGE: 0-Xs] [START_FRAME: wearing]
**VISUAL DIRECTION:**
- Camera: [specific movement]
- Pose: [starting position + transitions]
- Product Focus: [what's shown]
- Movement: [character actions]
- Duration: [timing of each action]

**SCRIPT:**
[Your script here]

**LIP-SYNC GUIDE:**
- 0-1s: [emotion 1]
- 1-Xs: [emotion 2]

---

🎙️ VOICEOVER SCRIPT (VIETNAMESE ONLY):
Write complete ${voiceGender} narrator script (${voicePace} pace) for entire ${videoDuration}s video.
- Must be 100% VIETNAMESE (NO ENGLISH)
- Hook: 0-3s critical period - grab attention immediately
- Features: Describe product benefits with Vietnamese appeal
- CTA: Final 2-3s with urgency and action call
- Format: One flowing paragraph, conversational tone
- Character will lip-sync parts of this narrator voiceover

⚠️ VOICEOVER RULES:
✓ EXCLUSIVELY in VIETNAMESE - not English
✓ Natural Vietnamese expressions and slang
✓ Synchronized with segment timing
✓ One continuous script (not multiple versions)
✓ Make segments about 250-300 total words for natural pacing

#️⃣ HASHTAGS:
8-10 trending tags: #Fashion #Affiliate #MustHave #[5-7 more viral tags]
Format all on one line.

---

✅ RESPONSE VALIDATION:
✓ Exactly ${segmentCount} segments (not more, not less)
✓ Total time = ${videoDuration}s (no gaps, no overlaps)
✓ Each segment has [START_FRAME], camera direction, pose, movement, script, lip-sync
✓ Voiceover is 100% VIETNAMESE
✓ Scripts are conversational and TikTok-paced
✓ Only ONE version per segment
✓ Character is THE SAME across all segments
`;
}

/**
 * Generate trending hashtag based on product
 */
function generateTrendingHashtag(product) {
  if (!product) return 'NewArrivals';
  
  const type = product.garment_type?.toLowerCase() || '';
  if (type.includes('dress')) return 'DressOfTheDay';
  if (type.includes('shirt') || type.includes('top')) return 'TopToTry';
  if (type.includes('pant') || type.includes('jean')) return 'BottomsGoal';
  if (type.includes('shoe')) return 'ShoeGame';
  
  return 'StyleFind';
}

/**
 * Format voiceover script for TTS
 */
export function formatVoiceoverForTTS(script, config = {}) {
  const {
    voiceGender = 'female',
    voicePace = 'fast',
    voiceEmotions = ['enthusiastic', 'friendly']
  } = config;

  return {
    text: script,
    voice: `${voiceGender}-${voicePace}`,
    emotions: voiceEmotions,
    audioFormat: 'mp3',
    sampleRate: 44100
  };
}

/**
 * Build video prompt for a specific segment
 * Used in multi-segment generation to create focused prompts
 */
function buildSegmentVideoPrompt(segment, characterAnalysis, config) {
  const { videoDuration, voiceGender, voicePace, productFocus } = config;
  
  const product = characterAnalysis.product || {};
  const productName = product.garment_type || product.name || 'product';
  const productColor = product.primary_color || product.color || 'beautiful';
  const productMaterial = product.fabric_type || product.material || 'quality fabric';

  const segmentDirections = {
    intro: `Start with an engaging hook. Make it exciting and TikTok-worthy. The ${productName} in ${productColor} is the star.`,
    wearing: `Show the ${productName} being worn. Focus on fit, comfort, and style. The character looks amazing.`,
    holding: `Close-up of the ${productName}. Highlight quality and details. Made with ${productMaterial}.`,
    cta: `Strong call-to-action. Tell viewers to buy now or click the link. Create urgency.`,
    outro: `Wrap up with final thoughts. Leave them wanting more.`
  };

  const direction = segmentDirections[segment.segment] || 'Create an engaging video segment';

  // 🔴 IMPROVED: Simpler, more concise prompt that Veo can handle better
  return `VIDEO: ${segment.segment.toUpperCase()}
Duration: ${videoDuration}s
Script: "${segment.script}"

Direction: ${direction}

Style: Fast-paced TikTok video, ${voiceGender} voice (${voicePace} pace), product focus: ${productFocus}`;
}

/**
 * Build comprehensive video prompt from analysis data
 * Combines video scripts, voiceover, hashtags, and product details
 */
function buildVideoPromptFromAnalysis(deepAnalysis, characterAnalysis, config) {
  const { videoDuration, voiceGender, voicePace, productFocus } = config;
  
  const product = characterAnalysis.product || {};
  const productName = product.garment_type || product.name || 'product';
  const productColor = product.primary_color || product.color || 'beautiful';
  
  // Build prompt from video scripts and voiceover
  let prompt = `📺 VIDEO GENERATION PROMPT\n\n`;
  
  // Add video scripts with timing
  if (deepAnalysis.videoScripts && Array.isArray(deepAnalysis.videoScripts)) {
    prompt += `🎬 VIDEO SEGMENTS:\n`;
    deepAnalysis.videoScripts.forEach((script, idx) => {
      prompt += `\n[${script.segment.toUpperCase()}] (${script.duration}s)\n`;
      prompt += `${script.script}\n`;
    });
    prompt += `\n`;
  }
  
  // Add voiceover script
  if (deepAnalysis.voiceoverScript) {
    prompt += `🎙️ VOICEOVER:\n`;
    prompt += `${deepAnalysis.voiceoverScript}\n\n`;
  }
  
  // Add visual directions
  prompt += `👁️ VISUAL DIRECTION:\n`;
  prompt += `- Duration: ${videoDuration}s\n`;
  prompt += `- Format: TikTok vertical (9:16)\n`;
  prompt += `- Style: Professional, trendy, engaging\n`;
  prompt += `- Product: ${productName} (${productColor})\n`;
  prompt += `- Focus: ${productFocus || 'full-outfit'}\n`;
  prompt += `- Voice tone: ${voiceGender} narrator (${voicePace} pace)\n`;
  prompt += `- Mood: Energetic, authentic, conversion-focused\n`;
  
  // Add hashtags
  if (deepAnalysis.hashtags && Array.isArray(deepAnalysis.hashtags)) {
    prompt += `\n#️⃣ HASHTAGS:\n`;
    prompt += deepAnalysis.hashtags.slice(0, 10).join(' ');
    prompt += `\n`;
  }
  
  // Add technical specifications
  prompt += `\n⚙️ TECHNICAL SPECS:\n`;
  prompt += `- Resolution: 1080p preferred\n`;
  prompt += `- Frame rate: 24fps\n`;
  prompt += `- Transitions: Smooth, quick cuts for TikTok\n`;
  prompt += `- Music: Trending TikTok audio recommended\n`;
  
  return prompt;
}

export default {
  executeAffiliateVideoTikTokFlow,
  performDeepChatGPTAnalysis,
  formatVoiceoverForTTS,
  buildVideoPromptFromAnalysis,
  getFlowPreview,
  
  // 💫 NEW: Helper functions for modular step endpoints
  /**
   * Build analysis prompt for Step 1
   */
  buildAnalysisPrompt: () => {
    return `
You are an expert fashion stylist and virtual try-on specialist. Analyze these two images extensively to provide detailed styling recommendations.

===== IMAGE LABELING =====
Image 1 = CHARACTER (Person to be dressed)
Image 2 = PRODUCT (Garment/Outfit to be applied)

===== TASK =====
1. ANALYZE CHARACTER (Image 1) - Extract profile details
2. ANALYZE PRODUCT (Image 2) - Extract garment specifications  
3. GENERATE RECOMMENDATIONS - Scene, lighting, mood, styling for virtual try-on
4. RETURN STRUCTURED JSON - Formatted for image generation systems

===== CHARACTER PROFILE ANALYSIS =====
From Image 1, extract and describe:

Age & Demographics:
- Estimated age range
- Gender identification
- Complexion/skin tone

Physical Characteristics:
- Hair: Color, style, length
- Facial features: Notable characteristics
- Body type: Build description
- Height indication: Apparent height

Current Pose & Position:
- Body position: Standing, sitting, walking
- Arm position
- Head position
- Leg position
- Overall pose orientation

Current Styling:
- Current clothing
- Accessories
- Hairstyle details
- Makeup appearance

===== PRODUCT SPECIFICATION ANALYSIS =====
From Image 2, extract and describe:

Garment Basics:
- Type: What is it?
- Category: Casual, formal, athletic, etc.
- Color Information

Material & Construction:
- Fabric type
- Appearance texture
- Weight: Heavy, medium, light
- Stretch: Form-fitting or relaxed?

Design Details:
- Neckline
- Sleeves
- Fit style
- Length
- Key features

===== RECOMMENDATION GENERATION =====
Based on character × product compatibility, recommend:

1. SCENE/SETTING
2. LIGHTING  
3. MOOD/ATMOSPHERE
4. CAMERA ANGLE
5. HOLDING PRODUCT STRATEGY (how to hold/present naturally based on product type: hanger vs hand-only vs support tool)
6. CAMERA & LENS LOCK for both wearing and holding (framing, focal length, distance, horizon alignment)

Return as JSON with clear sections.
    `;
  },

  /**
   * Build wearing prompt for Step 2
   */
  buildWearingPrompt: (analysis) => {
    if (!analysis) return "Generate a professional image of a model wearing the product";
    
    const character = analysis.character || {};
    const product = analysis.product || {};
    const recommendations = analysis.recommendations || {};

    let prompt = `Professional fashion image of a ${character.age_range || 'elegant'} person`;
    
    if (character.hair) prompt += `, with ${character.hair}`;
    if (character.body_type) prompt += `, ${character.body_type} figure`;
    
    prompt += ` wearing ${product.garment_type || 'beautiful outfit'}`;
    
    if (product.primary_color) prompt += ` in ${product.primary_color}`;
    if (product.fabric_type) prompt += ` made of ${product.fabric_type}`;
    
    prompt += `. Scene locked background: ${recommendations.sceneLockedPrompt || recommendations.scene || 'linhphap-tryon-room'}. Lighting: ${recommendations.lighting || 'professional'}. Mood: ${recommendations.mood || 'confident'}. High quality, professional photography.`;
    
    return prompt;
  },

  /**
   * Build holding prompt for Step 2
   */
  buildHoldingPrompt: (analysis) => {
    if (!analysis) return "Generate a professional image of a model holding the product";
    
    const character = analysis.character || {};
    const product = analysis.product || {};
    const recommendations = analysis.recommendations || {};

    let prompt = `Professional fashion image of a ${character.age_range || 'elegant'} person`;
    
    if (character.hair) prompt += `, with ${character.hair}`;
    if (character.body_type) prompt += `, ${character.body_type} figure`;
    
    prompt += ` holding ${product.garment_type || 'beautiful product'}`;
    
    if (product.primary_color) prompt += ` in ${product.primary_color}`;
    
    prompt += `. Close-up focus on the product to show details and quality. Scene locked background: ${recommendations.sceneLockedPrompt || recommendations.scene || 'linhphap-tryon-room'}. Lighting: ${recommendations.lighting || 'professional'}. Mood: ${recommendations.mood || 'confident'}. High quality, professional photography.`;
    
    return prompt;
  },

  /**
   * Build deep analysis prompt for Step 3
   */
  buildDeepAnalysisPrompt: (analysis, productFocus) => {
    return `
You are a TikTok content strategist and fashion expert. Based on the character and product analysis, create compelling TikTok content.

ANALYSIS PROVIDED:
${JSON.stringify(analysis, null, 2)}

TASK:
1. Generate 3-5 short video scripts (each 15-30 seconds for TikTok)
2. Create engaging hashtags (10-15 relevant ones)
3. Suggest video segments and flow
4. Provide copy for each segment

SCRIPT REQUIREMENTS:
- Concise and engaging (TikTok style)
- Focus on: ${productFocus || 'full outfit appeal'}
- Include call-to-action
- Make it shareable and relatable

Return as JSON with:
{
  "videoScripts": [
    { "segment": "intro", "text": "...", "duration": 5 },
    { "segment": "wearing", "text": "...", "duration": 10 },
    { "segment": "holding", "text": "...", "duration": 10 },
    { "segment": "cta", "text": "...", "duration": 5 }
  ],
  "hashtags": ["#fashion", ...],
  "metadata": {
    "tone": "engaging, energetic",
    "hook": "strong visual + trending audio",
    "message": "main selling point"
  }
}
    `;
  }
};

