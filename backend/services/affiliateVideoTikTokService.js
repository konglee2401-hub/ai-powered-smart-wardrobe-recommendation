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
import { buildDetailedPrompt, buildFluxPrompt, getSceneReferenceInfo } from './smartPromptBuilder.js';
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
        model: 'Nano Banana Pro',
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
import SessionLogService from './sessionLogService.js';
import VietnamesePromptBuilder from './vietnamesePromptBuilder.js';
import axios from 'axios';
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

    // Validate files
    if (!req.files || !req.files.characterImage || !req.files.productImage) {
      return res.status(400).json({
        success: false,
        error: 'Both character and product images are required',
        stage: 'file-validation'
      });
    }

    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`📁 Created temp directory: ${tempDir}`);
    }

    const characterFile = req.files.characterImage[0];
    const productFile = req.files.productImage[0];
    
    // 💫 NEW: Save buffer to temp file if needed
    let characterFilePath = characterFile.path;
    let productFilePath = productFile.path;
    
    if (!characterFilePath && characterFile.buffer) {
      characterFilePath = path.join(tempDir, `character-${Date.now()}.jpg`);
      fs.writeFileSync(characterFilePath, characterFile.buffer);
      console.log(`💾 Saved character image to: ${characterFilePath}`);
    }
    
    if (!productFilePath && productFile.buffer) {
      productFilePath = path.join(tempDir, `product-${Date.now()}.jpg`);
      fs.writeFileSync(productFilePath, productFile.buffer);
      console.log(`💾 Saved product image to: ${productFilePath}`);
    }

    console.log(`📸 Character: ${characterFile.originalname} (${characterFile.size || characterFile.buffer?.length} bytes)`);
    console.log(`📦 Product: ${productFile.originalname} (${productFile.size || productFile.buffer?.length} bytes)`);

    const {
      videoDuration = 20,
      videoDurationUnit = 'seconds',
      voiceGender = 'female',
      voicePace = 'fast',
      productFocus = 'full-outfit',
      language = 'en',  // 💫 Support language selection: 'en' or 'vi'
      imageProvider = 'bfl',  // 💫 Default to BFL Playground
      videoProvider = 'grok',  // 💫 Default to Grok for video
      options = {},
      imageSource = { character: 'upload', product: 'upload' }  // 🎯 Track image source from frontend
    } = req.body;

    // Extract providers from options if not in body directly
    const finalImageProvider = options.imageProvider || imageProvider || 'bfl';
    const finalVideoProvider = options.videoProvider || videoProvider || 'grok';
    const providerClipDuration = getProviderClipDuration(finalVideoProvider);
    
    console.log(`\n🔌 PROVIDER CONFIGURATION:`);
    console.log(`  Image Provider: ${finalImageProvider}`);
    console.log(`  Video Provider: ${finalVideoProvider}`);
    console.log(`  Video clip duration/provider: ${providerClipDuration}s per video`);

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

7. OVERALL COMPATIBILITY (JSON):
   - Compatibility score: 1-10 how well product matches character
   - Why: Specific reasons for this score
   - Styling tips: How to maximize product appearance on this character

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
    "currentAccessories": "what they're wearing/accessories"
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
  "characterDescription": "2-3 sentence vivid description of character for image generation"
}

Focus: ${productFocus}
Use Case: TikTok Affiliate Video (9:16 vertical format, engaging styling)

CRITICAL: Return ONLY JSON, properly formatted, no markdown, no code blocks, no additional text.
      `;
      }

      // 🔴 CRITICAL: Use try-finally to GUARANTEE browser cleanup
      let chatGPTService = null;
      let rawResponse = null;  // 🔴 Declare outside try so it's accessible after finally
      try {
        // 🔐 STEP 1: Isolate with flowId to prevent parallel profile conflicts
        chatGPTService = new ChatGPTService({ headless: true, flowId });
        await chatGPTService.initialize();
        
        rawResponse = await chatGPTService.analyzeMultipleImages(
          [characterFilePath, productFilePath],
          analysisPrompt
        );
        
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

        console.log(`\n📊 Original images upload status:`);
        console.log(`   Character: ${characterDriveUrl ? '✅ On Google Drive' : '❌ NOT on Drive'}`);
        console.log(`   Product: ${productDriveUrl ? '✅ On Google Drive' : '❌ NOT on Drive'}`);
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
      console.log(`\n⚙️  Using default analysis object since real analysis failed`);
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
      console.log(`✅ Default analysis ready for image generation`);
    }

    // ============================================================
    // STEP 2: PARALLEL IMAGE GENERATION
    // ============================================================

    console.log('\n' + '─'.repeat(80));
    console.log('🎨 STEP 2: Parallel Image Generation');
    console.log('─'.repeat(80));
    console.log('  ├─ Image 1: change-clothes (character wearing product)');
    console.log('  └─ Image 2: character-holding-product (holding in hand)');

    await logger.startStage('image-generation');
    const step2Start = Date.now();

    // Build options for both use cases
    // Priority: UI options > Analysis recommendations > Defaults
    const baseOptions = {
      scene: options.scene || 'linhphap-tryon-room',
      lighting: options.lighting || analysis?.recommendations?.lighting?.choice || 'soft-diffused',
      mood: options.mood || analysis?.recommendations?.mood?.choice || 'confident',
      style: options.style || 'minimalist',
      colorPalette: options.colorPalette || 'neutral',
      cameraAngle: options.cameraAngle || analysis?.recommendations?.cameraAngle?.choice || 'eye-level',
      aspectRatio: '9:16', // TikTok format
      ...options
    };

    console.log(`\n📋 OPTIONS APPLIED:`);
    console.log(`  Scene: ${baseOptions.scene}`);
    console.log(`  Lighting: ${baseOptions.lighting}`);
    console.log(`  Mood: ${baseOptions.mood}`);
    console.log(`  Style: ${baseOptions.style}`);
    console.log(`  Color Palette: ${baseOptions.colorPalette}`);
    console.log(`  Camera Angle: ${baseOptions.cameraAngle}`);
    console.log(`  Aspect Ratio: ${baseOptions.aspectRatio} (TikTok)`);
    
    // Log analysis recommendations if available (for debugging)
    if (analysis?.recommendations) {
      console.log(`\n💡 ANALYSIS RECOMMENDATIONS USED:`);
      Object.entries(analysis.recommendations).forEach(([key, value]) => {
        if (value?.choice) {
          console.log(`  ${key}: ${value.choice} (${value.reason?.substring(0, 50) || ''}...)`);
        }
      });
    }

    // 🔥 IMAGE GENERATION STRATEGY: Generate 2 images (wearing + holding) for video segments
    // These are core images needed for the video script
    console.log(`\n🎬 IMAGE GENERATION STRATEGY:`);
    console.log(`  ✅ Generating 2 images: WEARING + HOLDING`);
    console.log(`  ✅ Used for intro, wearing, holding, product segments`);
    console.log(`  ✅ Character consistency across video`);

    // Build 2 prompts: wearing + holding
    // Use correct useCase values: 'change-clothes' for wearing, 'character-holding-product' for holding
    const generatePrompt1 = buildDetailedPrompt(
      analysis,
      baseOptions,
      'change-clothes',  // Image 1: Character wearing the product
      productFocus,
      language
    ).then(promptData => ({
      useCase: 'wearing',
      prompts: promptData
    }));

    const generatePrompt2 = buildDetailedPrompt(
      analysis,
      baseOptions,
      'character-holding-product',  // Image 2: Character holding the product
      productFocus,
      language
    ).then(promptData => ({
      useCase: 'holding',
      prompts: promptData
    }));

    // Wait for both prompts
    const [promptData1, promptData2] = await Promise.all([
      generatePrompt1,
      generatePrompt2
    ]);

    console.log(`\n✅ PROMPTS BUILT (2 images):`);
    try {
      const prompt1Text = promptData1?.prompts?.prompt || '';
      const prompt2Text = promptData2?.prompts?.prompt || '';
      
      // Check for proper structure in prompts
      console.log(`  Image 1 (wearing):`);
      console.log(`    Length: ${prompt1Text.length} chars`);
      console.log(`    Has MODE SWITCH: ${prompt1Text.includes('MODE SWITCH') ? '✓' : '✗'}`);
      console.log(`    Has IDENTITY LOCK: ${prompt1Text.includes('IDENTITY LOCK') ? '✓' : '✗'}`);
      console.log(`    Preview: ${prompt1Text.substring(0, 60)}...`);
      
      console.log(`  Image 2 (holding):`);
      console.log(`    Length: ${prompt2Text.length} chars`);
      console.log(`    Has MODE SWITCH: ${prompt2Text.includes('MODE SWITCH') ? '✓' : '✗'}`);
      console.log(`    Has IDENTITY LOCK: ${prompt2Text.includes('IDENTITY LOCK') ? '✓' : '✗'}`);
      console.log(`    Preview: ${prompt2Text.substring(0, 60)}...`);
      
      if (!prompt1Text.includes('MODE SWITCH') || !prompt2Text.includes('MODE SWITCH')) {
        console.warn(`\n⚠️  WARNING: Prompts may not have proper IMAGE REFERENCE MAPPING structure!`);
      }
    } catch (logErr) {
      console.log(`  ⚠️ Could not display prompt preview:`, logErr.message);
    }

    // ============================================================
    // STEP 2: GENERATE 2 IMAGES (wearing + holding)
    // ============================================================
    
    console.log('\n🌐 STEP 2: Generate 2 Images (Wearing + Holding)');
    console.log('─'.repeat(80));

    let imageResults = [];
    
    try {
      // ✅ Use GoogleFlowAutomationService - 2 images
      const imageGen = new GoogleFlowAutomationService({
        type: 'image',
        projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',  // ✅ CORRECT PROJECT ID
        imageCount: 1,  // Generate 1 image per prompt
        headless: false,
        debugMode: false  // ✅ PRODUCTION MODE
      });
      
      console.log('🚀 Initializing image generation service...');
      
      // Validate prompts
      const prompt1 = promptData1?.prompts?.prompt || '';
      const prompt2 = promptData2?.prompts?.prompt || '';
      
      if (!prompt1 || !prompt2) {
        throw new Error(`Invalid prompts: ${prompt1?.length || 0}, ${prompt2?.length || 0}`);
      }
      
      console.log(`📝 Prompt validation passed (both prompts ready)`);
      
      // 💫 SAVE STEP 1 ANALYSIS TO PREVIEW STORE (for frontend polling)
      updateFlowPreview(flowId, {
        status: 'step1-complete',
        step1: {
          wearingPrompt: prompt1,
          holdingPrompt: prompt2
        }
      });
      console.log(`📝 Step 1 analysis saved to preview store`);
      
      // Generate 2 images in single browser session using generateMultiple
      let multiGenResult;
      try {
        // Generate wearing + holding images
        // Use character image as the base, product image as reference (not worn directly)
        multiGenResult = await imageGen.generateMultiple(
          characterFilePath,
          productFilePath,  // ✅ Use actual product reference image (for context, not worn)
          [prompt1, prompt2]  // 2 prompts: wearing + holding
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
        resultsLength: multiGenResult?.results?.length,
        error: multiGenResult?.error
      });

      if (!multiGenResult || !multiGenResult.success || multiGenResult.results.length < 2) {
        throw new Error(`Failed to generate 2 images: ${multiGenResult?.error || 'Unknown error'}`);
      }

      // Extract both results
      imageResults = multiGenResult.results.map((result, idx) => {
        if (!result.success) {
          throw new Error(`Image ${idx + 1} generation failed: ${result.error}`);
        }
        const imageType = idx === 0 ? 'wearing' : 'holding';
        return {
          imageUrl: result.downloadedFile || result.href,
          screenshotPath: result.downloadedFile,
          downloadedAt: new Date().toISOString(),
          href: result.href,
          type: imageType  // wearing or holding
        };
      });

      console.log(`✅ Generated 2 images:`);
      imageResults.forEach((img, idx) => {
        console.log(`   Variation ${idx + 1}: ${img.screenshotPath?.substring(0, 60) || img.href}...`);
      });

      // 🔍 DEBUG: Show detailed imageResults structure
      console.log(`\n🔥 DEBUG: imageResults structure after generateMultiple():`);
      imageResults.forEach((img, idx) => {
        console.log(`\n  [${idx}] Type: ${img.type}`);
        console.log(`      screenshotPath: ${img.screenshotPath}`);
        console.log(`      href: ${img.href?.substring(0, 80) || 'N/A'}...`);
        console.log(`      downloadedAt: ${img.downloadedAt}`);
      });

      // 🔥 VALIDATION: Check if files are identical (duplicate detection)
      if (imageResults.length === 2 && imageResults[0].screenshotPath && imageResults[1].screenshotPath) {
        try {
          const hash1 = crypto
            .createHash('sha256')
            .update(fs.readFileSync(imageResults[0].screenshotPath))
            .digest('hex');
          
          const hash2 = crypto
            .createHash('sha256')
            .update(fs.readFileSync(imageResults[1].screenshotPath))
            .digest('hex');
          
          console.log(`\n🔥 FILE HASH COMPARISON:`);
          console.log(`      hash1 (wearing): ${hash1}`);
          console.log(`      hash2 (holding): ${hash2}`);
          
          if (hash1 === hash2) {
            console.warn(`\n⚠️  WARNING: Both files are IDENTICAL! (same content)`);
            console.warn(`      Path1: ${imageResults[0].screenshotPath}`);
            console.warn(`      Path2: ${imageResults[1].screenshotPath}`);
            console.warn(`      This indicates generateMultiple() may have generated the same image twice!`);
          } else {
            console.log(`\n✅ File hashes are DIFFERENT (images are unique)`);
          }
        } catch (hashErr) {
          console.log(`\n⚠️  Could not compute file hashes: ${hashErr.message}`);
        }
      }
        
    } catch (imageGenError) {
      console.error('❌ Image generation failed:', imageGenError.message);
      throw new Error(`Image generation failed: ${imageGenError.message}`);
    }

    if (!imageResults || imageResults.length < 2) {
      throw new Error(`Image generation failed - expected 2 images (wearing + holding), got ${imageResults?.length || 0}`);
    }

    const step2Duration = ((Date.now() - step2Start) / 1000).toFixed(2);

    await logger.endStage('image-generation', true);
    await logger.info('2 images generated successfully (wearing + holding)', 'image-generation-complete', {
      duration: step2Duration,
      imageCount: 2,
      images: imageResults.map(img => img.screenshotPath)
    });
    await logger.storeArtifacts({
      images: {
        wearing: imageResults[0]?.screenshotPath,
        holding: imageResults[1]?.screenshotPath
      }
    });

    console.log(`\n✅ STEP 2 COMPLETE: 2 images generated in ${step2Duration}s`);
    console.log(`  📸 Image 1 (wearing): ${imageResults[0]?.type || 'wearing'}`);
    console.log(`  📸 Image 2 (holding): ${imageResults[1]?.type || 'holding'}`);

    // 💫 SAVE STEP 2 IMAGES TO PREVIEW STORE (for frontend polling)
    updateFlowPreview(flowId, {
      status: 'step2-complete',
      step2: {
        imagePaths: imageResults.map(img => img.screenshotPath),
        imageCount: 2,
        duration: step2Duration,
        images: {
          wearing: imageResults[0]?.screenshotPath,
          holding: imageResults[1]?.screenshotPath
        }
      }
    });
    console.log(`📸 Step 2 images saved to preview store`);

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
      // ⚠️ SKIP UPLOAD if images from gallery (user explicitly doesn't want Drive upload)
      const skipCharacterUpload = imageSource.character === 'gallery';
      const skipProductUpload = imageSource.product === 'gallery';
      
      if (skipCharacterUpload || skipProductUpload) {
        console.log(`↩️  Skipping Google Drive upload for gallery images:`);
        if (skipCharacterUpload) console.log(`   - Character image from gallery (skipped)`);
        if (skipProductUpload) console.log(`   - Product image from gallery (skipped)`);
      }
      
      // Upload both images in parallel
      if (driveService) {
        const uploadPromises = imageResults
          .map((img, idx, arr) => {
            // 🎯 Skip upload if image source is gallery
            if (idx === 0 && skipCharacterUpload) return null;  // Don't upload character from gallery
            if (idx === 1 && skipProductUpload) return null;    // Don't upload product from gallery
            
            return { img, idx };
          })
          .filter(item => item !== null)  // Filter out skipped uploads
          .map(({ img, idx }) => {
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
                console.log(`   ✅ Image ${originalIdx}: Stored Drive ID = ${result.id}`);
                console.log(`      Drive Link: ${result.webViewLink}`);
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
    // STEP 3: DEEP CHATGPT ANALYSIS
    // ============================================================

    console.log('\n' + '─'.repeat(80));
    console.log('🤖 STEP 3: Deep ChatGPT Analysis');
    console.log('─'.repeat(80));
    const step3Start = Date.now();

    console.log(`📝 ANALYSIS INPUTS:`);
    console.log(`  Duration: ${videoDuration}s`);
    console.log(`  Voice: ${voiceGender} (${voicePace} pace)`);
    console.log(`  Focus: ${productFocus}`);
    console.log(`  Character images: 2 (wearing + holding)`);

    const deepAnalysis = await performDeepChatGPTAnalysis(
      analysis,
      {
        characterImages: imageResults.map(img => img.screenshotPath),  // ✅ Wearing + holding images
        productImage: productFilePath
      },
      {
        videoDuration,
        voiceGender,
        voicePace,
        productFocus,
        language,  // 💫 Add language to config
        flowId     // 🔴 CRITICAL: Pass flowId for ChatGPT browser session isolation
      }
    );

    // Even if ChatGPT analysis fails, we should have fallback structured data
    if (!deepAnalysis || !deepAnalysis.data) {
      throw new Error('Deep analysis failed: no data returned');
    }

    const step3Duration = ((Date.now() - step3Start) / 1000).toFixed(2);
    await logger.endStage('deep-analysis', true);
    await logger.storeAnalysis({
      videoScripts: deepAnalysis.data.videoScripts?.length || 0,
      voiceoverScript: deepAnalysis.data.voiceoverScript ? deepAnalysis.data.voiceoverScript.substring(0, 500) : '',
      hashtags: deepAnalysis.data.hashtags || [],
      duration: step3Duration
    });
    console.log(`\n✅ Deep analysis complete in ${step3Duration}s`);
    console.log(`📊 ANALYSIS OUTPUT:`);
    console.log(`  Video scripts: ${deepAnalysis.data.videoScripts?.length || 0} segments`);
    console.log(`  Voiceover script: ${deepAnalysis.data.voiceoverScript?.split('\n').length || 0} lines / ${deepAnalysis.data.voiceoverScript?.length || 0} chars`);
    console.log(`  Hashtags: ${deepAnalysis.data.hashtags?.length || 0} suggested: ${deepAnalysis.data.hashtags?.slice(0, 5).join(', ')}${deepAnalysis.data.hashtags?.length > 5 ? '...' : ''}`);

    // 💫 SAVE STEP 3 ANALYSIS TO PREVIEW STORE (for frontend polling)
    updateFlowPreview(flowId, {
      status: 'step3-complete',
      step3: {
        videoScripts: deepAnalysis.data.videoScripts || [],
        hashtags: deepAnalysis.data.hashtags || [],
        voiceoverScript: deepAnalysis.data.voiceoverScript || ''
      }
    });
    console.log(`📊 Step 3 analysis saved to preview store`);

    // ============================================================
    // STEP 4: VIDEO GENERATION (Using GoogleFlowAutomationService)
    // 💫 OPTIMIZED: Single browser session for multiple segments (if needed)
    // ============================================================

    console.log('\n' + '─'.repeat(80));
    console.log('🎬 STEP 4: Video Generation');
    console.log('─'.repeat(80));
    await logger.startStage('video-generation');
    const step4Start = Date.now();

    let videoGenerationResult = null;
    let allGeneratedVideos = [];
    
    try {
      // Detect if we have multiple video segments
      const videoSegments = deepAnalysis.data.videoScripts || [];
      const hasMultipleSegments = videoSegments.length > 1;

      console.log(`\n📊 VIDEO SEGMENTS DETECTED: ${videoSegments.length}`);
      if (hasMultipleSegments) {
        console.log(`   💡 MODE: Will generate ${videoSegments.length} videos sequentially`);
        console.log(`   Segments: ${videoSegments.map(s => s.segment).join(', ')}`);
      } else {
        console.log(`   📹 MODE: Generating single video`);
      }

      // ========== USE GOOGLE FLOW AUTOMATION FOR VIDEO GENERATION ==========
      // IMPORTANT: Create fresh instance for EACH segment because generateVideo()
      // calls init() and close() - each video needs its own browser session

      console.log(`\n📝 VIDEO GENERATION:`);
      console.log(`  Duration: ${videoDuration}s`);
      console.log(`  Aspect ratio: 9:16 (TikTok)`);
      console.log(`  Images: wearing, holding, product`);
      console.log(`  Segments: ${videoSegments.length}\n`);

      // Generate video for each segment
      for (let segIdx = 0; segIdx < videoSegments.length; segIdx++) {
        const segment = videoSegments[segIdx];
        const segmentNumber = segIdx + 1;
        
        // 🔴 CRITICAL: Create fresh instance for THIS segment
        // Because generateVideo() will call init() and close()
        const videoGen = new GoogleFlowAutomationService({
          type: 'video',  // 🔴 CRITICAL: Set to VIDEO, not image
          projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
          videoCount: 1,  // Generate 1 video per segment (default)
          headless: false,
          outputDir: tempDir,
          debugMode: false,
          timeouts: {
            pageLoad: 30000,
            generation: Math.max(300000, (videoDuration + 60) * 1000)
          }
        });
        
        console.log(`\n${'─'.repeat(80)}`);
        console.log(`📍 SEGMENT ${segmentNumber}/${videoSegments.length}: ${segment.segment.toUpperCase()}`);
        console.log(`${'─'.repeat(80)}`);
        console.log(`   Duration: ${segment.duration}s`);
        console.log(`   Script: ${segment.script.substring(0, 80)}...`);

        try {
          // Build segment-specific prompt
          const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
          let segmentPrompt;
          
          if (normalizedLanguage === 'vi') {
            // Vietnamese prompt builder
            segmentPrompt = VietnamesePromptBuilder.buildVideoGenerationPrompt(
              segment.segment,
              productFocus,
              { name: analysis.product?.garment_type, details: analysis.product?.key_details }
            );
          } else {
            // English prompt from segment script
            segmentPrompt = segment.script;
          }

          console.log(`   📝 Prompt length: ${segmentPrompt.length} chars`);

          // Call generateVideo() with character image variations
          const videoResult = await videoGen.generateVideo(
            segmentPrompt,
            imageResults[0].screenshotPath,  // Primary image (variation 1)
            imageResults[1].screenshotPath,  // Secondary image (variation 2)
            {
              download: true,
              outputPath: tempDir,
              reloadAfter: false  // Don't reload because we'll close browser anyway in generateVideo()
            }
          );

          if (videoResult.success && videoResult.path) {
            const videoSize = fs.statSync(videoResult.path).size;
            const videoInfo = {
              segment: segment.segment,
              duration: segment.duration,
              path: videoResult.path,
              size: videoSize,
              href: videoResult.href,
              sequenceNum: segIdx
            };
            allGeneratedVideos.push(videoInfo);
            
            console.log(`   ✅ VIDEO GENERATED`);
            console.log(`      Path: ${path.basename(videoResult.path)}`);
            console.log(`      Size: ${(videoSize / 1024 / 1024).toFixed(2)}MB`);
            console.log(`      Href: ${videoResult.href.substring(0, 60)}...`);
          } else {
            console.warn(`   ⚠️  VIDEO GENERATION FAILED: ${videoResult.error || 'unknown error'}`);
            if (segmentNumber === 1) {
              // Fail early if first segment fails
              throw new Error(`First segment generation failed: ${videoResult.error}`);
            }
            // Continue to next segment if not first
          }

        } catch (segmentError) {
          console.error(`   ❌ SEGMENT ${segmentNumber} ERROR: ${segmentError.message}`);
          if (segmentNumber === 1) {
            throw segmentError;  // Fail early if first segment fails
          }
          // Continue to next segment
        }
      }

      // Store result
      videoGenerationResult = {
        videos: allGeneratedVideos,
        totalCount: allGeneratedVideos.length,
        status: allGeneratedVideos.length > 0 ? 'success' : 'no-videos'
      };

      console.log(`\n${'═'.repeat(80)}`);
      console.log(`✅ VIDEO GENERATION COMPLETE: ${allGeneratedVideos.length}/${videoSegments.length} segments`);
      console.log(`${'═'.repeat(80)}\n`);

    } catch (error) {
      console.error(`❌ VIDEO GENERATION ERROR: ${error.message}`);
      videoGenerationResult = {
        videos: [],
        totalCount: 0,
        status: 'failed',
        error: error.message
      };

      // Don't fail the entire flow if video generation fails
      // Images have been generated successfully already
      await logger.error(error.message, 'video-generation-error');
    }

    // 🔴 NOTE: No finally block needed here!
    // Each segment's generateVideo() closes its own browser in its finally block
    // So all cleanup is already handled per-segment

    const step4Duration = ((Date.now() - step4Start) / 1000).toFixed(2);
    await logger.endStage('video-generation', allGeneratedVideos.length > 0);
    await logger.info(`Video generation completed`, 'video-generation-complete', {
      generatedCount: allGeneratedVideos.length,
      duration: step4Duration
    });
    await logger.storeArtifacts({
      videos: allGeneratedVideos.map(v => ({ segment: v.segment, path: v.path, size: v.size }))
    });
    console.log(`\n✅ STEP 4 COMPLETE: Generated ${allGeneratedVideos.length} video(s) in ${step4Duration}s`);

    updateFlowPreview(flowId, {
      status: videoGenerationResult?.success ? 'step4-complete' : 'step4-failed',
      step4: {
        videos: videoGenerationResult?.videos || [],
        totalCount: videoGenerationResult?.totalCount || 0,
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

    // 5.1: Save image variations
    try {
      // 💫 CHECK: Image variations - save first variation
      const wearingFilename = path.basename(imageResults[0].screenshotPath);
      let wearingAssetExists = await checkExistingAsset(wearingFilename, 'generated-image');
      
      if (wearingAssetExists) {
        console.log(`\n⏭️  Image variation 1 already exists in DB (skipping asset creation)`);
        console.log(`   Existing Asset ID: ${wearingAssetExists.assetId}`);
        if (wearingAssetExists.assetId) {
          // Add to saved assets list even if skipped
          savedAssets.images.push(wearingAssetExists);
        }
      } else {
        console.log('\n📸 Saving image variation 1 to database...');
        const wearingAssetResult = await AssetManager.saveAsset({
          filename: wearingFilename,
          mimeType: 'image/jpeg',
          fileSize: fs.existsSync(imageResults[0].screenshotPath) ? fs.statSync(imageResults[0].screenshotPath).size : 0,
          assetType: 'image',
          assetCategory: 'generated-image',
          userId: req.body.userId || 'system',
          sessionId: flowId,
          storage: {
            location: imageResults[0].googleDriveId ? 'hybrid' : 'local',  // 💫 hybrid = has both
            path: imageResults[0].screenshotPath,
            url: imageResults[0].href || imageResults[0].screenshotPath,
            // 💫 FIX: Include Drive metadata captured in Step 2.5
            googleDriveId: imageResults[0].googleDriveId || null,
            webViewLink: imageResults[0].googleDriveWebViewLink || null
          },
          cloudStorage: {
            location: 'google-drive',
            localPath: imageResults[0].screenshotPath,
            googleDriveId: imageResults[0].googleDriveId || null,
            webViewLink: imageResults[0].googleDriveWebViewLink || null,
            status: imageResults[0].googleDriveId ? 'synced' : 'pending',
            googleDrivePath: 'Affiliate AI/Images/Completed'
          },
          // 💫 FIX: Add sync status
          syncStatus: imageResults[0].googleDriveId ? 'synced' : 'pending',
          metadata: {
            format: 'jpeg',
            type: 'character-variation-1',
            flowId,
            // 💫 Include drive metadata for reference
            driveId: imageResults[0].googleDriveId || null
          },
          tags: ['generated', 'affiliate-video', 'character-variation']
        }, { verbose: true });

        if (wearingAssetResult.success) {
          savedAssets.images.push(wearingAssetResult.asset);
        }
      }
    } catch (assetError) {
      console.warn(`   ⚠️  Failed to save image variation 1: ${assetError.message}`);
    }

    // 5.2: Save other image variations (2 and 3)
    for (let varIdx = 1; varIdx < imageResults.length; varIdx++) {
      try {
        const imgFilename = path.basename(imageResults[varIdx].screenshotPath);
        let imgAssetExists = await checkExistingAsset(imgFilename, 'generated-image');
        
        if (imgAssetExists) {
          console.log(`\n⏭️  Image variation ${varIdx + 1} already exists in DB (skipping asset creation)`);
          if (imgAssetExists.assetId) {
            savedAssets.images.push(imgAssetExists);
          }
        } else {
          console.log(`\n📸 Saving image variation ${varIdx + 1} to database...`);
          const imgAssetResult = await AssetManager.saveAsset({
            filename: imgFilename,
            mimeType: 'image/jpeg',
            fileSize: fs.existsSync(imageResults[varIdx].screenshotPath) ? fs.statSync(imageResults[varIdx].screenshotPath).size : 0,
            assetType: 'image',
            assetCategory: 'generated-image',
            userId: req.body.userId || 'system',
            sessionId: flowId,
            storage: {
              location: imageResults[varIdx].googleDriveId ? 'hybrid' : 'local',  // 💫 hybrid = has both
              path: imageResults[varIdx].screenshotPath,
              url: imageResults[varIdx].href || imageResults[varIdx].screenshotPath,
              // 💫 FIX: Include Drive metadata captured in Step 2.5
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
            // 💫 FIX: Add sync status
            syncStatus: imageResults[varIdx].googleDriveId ? 'synced' : 'pending',
            metadata: {
              format: 'jpeg',
              type: `character-variation-${varIdx + 1}`,
              flowId,
              // 💫 Include drive metadata for reference
              driveId: imageResults[varIdx].googleDriveId || null
            },
            tags: ['generated', 'affiliate-video', 'character-variation']
          }, { verbose: true });

          if (imgAssetResult.success) {
            console.log(`   ✅ Image variation ${varIdx + 1} saved`);
            savedAssets.images.push(imgAssetResult.asset);
          }
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
            analysis: {
              character: analysis?.character || 'N/A',
              product: analysis?.product || 'N/A',
              compatibility: analysis?.compatibility || 'N/A'
            },
            driveUrls: {
              character: characterDriveUrl || null,
              product: productDriveUrl || null
            }
          },
          step2: {
            status: 'completed',
            duration: `${step2Duration}s`,
            images: {
              variation1: imageResults[0]?.screenshotPath || 'N/A',
              variation2: imageResults[1]?.screenshotPath || 'N/A',
              variation3: imageResults[2]?.screenshotPath || 'N/A'
            }
          },
          step3: {
            status: 'completed',
            duration: `${step3Duration}s`,
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
            videos: (videoGenerationResult?.videos || []).map(v => ({
              path: v.path,
              url: v.url,
              duration: v.duration,
              resolution: v.resolution
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
          productFocus,
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
    const { videoDuration, voiceGender, voicePace, productFocus, language = 'en', flowId } = config;

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
        { videoDuration, voiceGender, voicePace, productFocus, videoProvider, clipDuration }
      );
    }

    // 🔴 CRITICAL: Initialize BEFORE attempting image analysis
    console.log(`   🚀 Initializing ChatGPT Browser Automation...`);
    // 🔐 STEP 3: Isolate with flowId to prevent parallel profile conflicts
    chatGPTService = new ChatGPTService({ headless: true, flowId });
    await chatGPTService.initialize();
    
    // 💫 NEW: Log the 2 character images being uploaded to ChatGPT
    console.log(`\n📸 STEP 3: Uploading character images for ChatGPT segment analysis:`);
    characterImages.forEach((img, idx) => {
      const type = idx === 0 ? 'wearing' : 'holding';
      console.log(`   ├─ Character ${type}: ${img}`);
    });
    console.log(`   └─ Product image: ${productImage} (for reference)`);
    
    // Verify all images exist
    const allImages = [...characterImages, productImage];
    const missingImages = allImages.filter(img => !img || (typeof img === 'string' && !fs.existsSync(img)));
    if (missingImages.length > 0) {
      throw new Error(`Missing images for ChatGPT analysis: ${missingImages.length} image(s) not found or undefined`);
    }
    console.log(`   ✅ All ${allImages.length} images verified to exist`);

    // Call ChatGPT for video script generation with 2 character images (wearing + holding)
    const rawChatGPTResponse = await chatGPTService.analyzeMultipleImages(
      allImages,  // ✅ Pass 2 character images + product image
      deepAnalysisPrompt
    );

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
  const { videoDuration, voiceGender, voicePace, productFocus } = config;

  // 🔥 FIX: Calculate segment count based on actual generation time (~8s per video)
  // Not hardcoded, but realistic based on Google Flow generation speed
  const generationTimePerVideo = 8;  // seconds per video
  const segmentCount = Math.max(2, Math.ceil(videoDuration / generationTimePerVideo));

  return `
You are a professional TikTok affiliate marketing content creator.

PRODUCT INFORMATION:
- Product: ${analysis.product?.garment_type}
- Color: ${analysis.product?.primary_color}
- Material: ${analysis.product?.fabric_type}
- Style: ${analysis.product?.style_category}
- Details: ${analysis.product?.key_details}

AVAILABLE CHARACTER IMAGES:
🔒 CHARACTER CONSISTENCY RULE: Both images show THE SAME CHARACTER wearing (pose 1) and holding (pose 2):
1. "Character Wearing" - Character wearing the product
2. "Character Holding" - Character holding/demonstrating the product

⚠️ FOR EACH SEGMENT: Choose 1 character image that best fits the narrative. You may choose the same image multiple times if it's the best fit.

YOUR TASK:
Create engaging TikTok video content (9:16 vertical, ${videoDuration}s total).

Generate ${segmentCount} video segments that naturally flow together. Each segment should feel like part of one cohesive story, not disconnected pieces.

⚠️ FORMAT REQUIREMENTS (MUST USE THESE MARKERS - PROVIDE EXACTLY ONE VERSION ONLY):

📹 VIDEO SEGMENTS (${segmentCount} total for ${videoDuration}s video):
Create exactly ${segmentCount} video segments that flow naturally. ChatGPT, you decide the pacing for each segment:

[SEGMENT_1] [CHARACTER IMAGE: choose wearing OR holding]
Natural script introducing the product with energy and hook

[SEGMENT_2] [CHARACTER IMAGE: choose wearing OR holding]  
Script showing the product in action, emphasizing fit and comfort

${segmentCount > 2 ? `[SEGMENT_3] [CHARACTER IMAGE: choose wearing OR holding]
Script highlighting quality, details, and premium feel

` : ''}[SEGMENT_${segmentCount}] [CHARACTER IMAGE: choose wearing OR holding]
Powerful call-to-action with urgency

✓ Each segment must feel natural and conversational (NOT robotic)
✓ Write segment scripts as flowing narratives, not bullet points
✓ Keep font size appropriate for script length (NO "Reason:" or explanations)
✓ Scripts should be TikTok-paced and engaging
✓ CHARACTER LOCK: Use the same character across all segments for consistency
✓ PROVIDE ONLY ONE VERSION OF THE SEGMENTS - DO NOT provide alternative formats or multiple versions

🎙️ VOICEOVER SCRIPT (IN VIETNAMESE):
Write one continuous ${voiceGender} narrator script (${voicePace} pace, 250-300 words) in VIETNAMESE language:
- Hook viewer immediately with Vietnamese appeal
- Build excitement about product benefits
- Highlight quality and style advantages
- End with compelling call-to-action in Vietnamese
- Make it sound natural and conversational for Vietnamese TikTok audience
- Format as one flowing paragraph (NOT bullet list unless it fits naturally)
- Use Vietnamese slang and expressions that resonate with Vietnamese viewers

⚠️ IMPORTANT: Voiceover MUST be in VIETNAMESE, not English
⚠️ DO NOT PROVIDE MULTIPLE VERSIONS - Only one voiceover script

#️⃣ HASHTAGS:
Generate 8-10 trending hashtags including:
- #Fashion #Affiliate #MustHave (required)
- 5-7 additional trending tags
Format: All tags on ONE line with spaces (#Tag1 #Tag2 #Tag3...)

CREATIVE GUIDELINES:
✓ Let your creativity shine - don't follow a template
✓ Use natural language, not stiff marketing speak
✓ Show personality and authenticity
✓ Focus on why the product matters to viewers
✓ Drive affiliate conversions through genuine enthusiasm
✓ Mix segment types naturally for better storytelling
✓ THE SAME CHARACTER APPEARS IN ALL SEGMENTS - this is intentional for recognition
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

