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
    const sceneFile = req.files?.sceneImage?.[0];  // 💫 NEW: Optional scene image
    
    // 💫 NEW: Save buffer to temp file if needed
    let characterFilePath = characterFile.path;
    let productFilePath = productFile.path;
    let sceneFilePath = null;  // 💫 NEW: Optional scene image path
    
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
    
    // 💫 NEW: Handle optional scene image
    if (sceneFile) {
      sceneFilePath = sceneFile.path;
      if (!sceneFilePath && sceneFile.buffer) {
        sceneFilePath = path.join(tempDir, `scene-${Date.now()}.jpg`);
        fs.writeFileSync(sceneFilePath, sceneFile.buffer);
        console.log(`💾 Saved scene image to: ${sceneFilePath}`);
      }
    } else if (req.imageBuffers?.sceneImage) {
      // 💫 NEW: Handle scene image from controller buffer
      sceneFilePath = path.join(tempDir, `scene-${Date.now()}.jpg`);
      fs.writeFileSync(sceneFilePath, req.imageBuffers.sceneImage);
      console.log(`💾 Saved scene image (from buffer) to: ${sceneFilePath}`);
    }

    console.log(`📸 Character: ${characterFile.originalname} (${characterFile.size || characterFile.buffer?.length} bytes)`);
    console.log(`📦 Product: ${productFile.originalname} (${productFile.size || productFile.buffer?.length} bytes)`);
    if (sceneFilePath) {
      console.log(`🎬 Scene: ${path.basename(sceneFilePath)} (reference image for styling)`);  // 💫 NEW
    }

    const {
      videoDuration = 20,
      videoDurationUnit = 'seconds',
      voiceGender = 'female',
      voicePace = 'fast',
      productFocus = 'full-outfit',
      language = 'en',  // 💫 Support language selection: 'en' or 'vi'
      imageProvider = 'bfl',  // 💫 Default to BFL Playground
      videoProvider = 'grok',  // 💫 Default to Grok for video
      options = {}
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
      // 🔴 CRITICAL: BFL provider ALWAYS uses English for analysis
      // This ensures product info is in English for Flux prompts
      const analysisLanguage = finalImageProvider === 'bfl' ? 'en' : language;
      const normalizedLanguage = (analysisLanguage || 'en').split('-')[0].split('_')[0].toLowerCase();
      let analysisPrompt;
      
      if (normalizedLanguage === 'vi') {
        console.log(`\n📝 Using VIETNAMESE analysis prompt`);
        analysisPrompt = VietnamesePromptBuilder.buildCharacterAnalysisPrompt();
      } else {
        console.log(`\n📝 Using ENGLISH analysis prompt${finalImageProvider === 'bfl' ? ' (forced for BFL/Flux)' : ''}`);
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
        chatGPTService = new ChatGPTService({ headless: true });
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
          // Parse response
          try {
            console.log(`📝 Parsing ChatGPT JSON response...`);
            console.log(`   Response length: ${rawResponse.length} characters`);
            
            let jsonStr = rawResponse.trim();
            if (jsonStr.startsWith('```json')) {
              jsonStr = jsonStr.substring(7);
            } else if (jsonStr.startsWith('```')) {
              jsonStr = jsonStr.substring(3);
            }
            if (jsonStr.endsWith('```')) {
              jsonStr = jsonStr.substring(0, jsonStr.length - 3);
            }
            jsonStr = jsonStr.trim();
            
            analysis = JSON.parse(jsonStr);
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
          } catch (parseError) {
            analysisError = `JSON parse error: ${parseError.message}`;
            console.warn(`⚠️  Failed to parse ChatGPT JSON (non-blocking): ${analysisError}`);
            console.warn(`   Raw response preview: ${rawResponse.substring(0, 200)}...`);
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
      }

      if (!rawResponse || rawResponse.length === 0) {
        analysisError = 'ChatGPT analysis returned empty response';
        console.warn(`⚠️  Analysis failed (non-blocking): ${analysisError}`);
        console.warn(`   Continuing with default recommendations...`);
      } else {
        try {
          // Parse JSON response from ChatGPT
          console.log(`📝 Parsing ChatGPT JSON response...`);
          console.log(`   Response length: ${rawResponse.length} characters`);
          
          // Extract JSON from response (handle markdown code blocks if present)
          let jsonStr = rawResponse.trim();
          
          // Remove markdown code blocks if present
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.substring(7); // Remove ```json
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.substring(3); // Remove ```
          }
          
          if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.substring(0, jsonStr.length - 3); // Remove closing ```
          }
          
          jsonStr = jsonStr.trim();
          
          // Parse JSON
          analysis = JSON.parse(jsonStr);
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
          console.warn(`   Raw response preview: ${rawResponse.substring(0, 200)}...`);
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
    // 🔴 CRITICAL: BFL provider uses FLUX-OPTIMIZED prompts (~550-650 chars)
    // Flux 2 Klein safe zone: 600-900 chars, optimal ~750 chars
    // Other providers use standard detailed prompts
    const useFluxPrompts = finalImageProvider === 'bfl';
    console.log(`  Prompt mode: ${useFluxPrompts ? 'FLUX-OPTIMIZED (~600 chars)' : 'STANDARD'}`);
    
    let wearingPromptData, holdingPromptData;
    
    if (useFluxPrompts) {
      // Use ultra-compact Flux-optimized prompts for BFL
      const wearingResult = buildFluxPrompt('change-clothes', analysis, baseOptions);
      const holdingResult = buildFluxPrompt('character-holding-product', analysis, baseOptions);
      
      wearingPromptData = {
        useCase: 'change-clothes',
        prompts: { prompt: wearingResult.prompt, negativePrompt: wearingResult.negativePrompt }
      };
      holdingPromptData = {
        useCase: 'character-holding-product',
        prompts: { prompt: holdingResult.prompt, negativePrompt: holdingResult.negativePrompt }
      };
      
      console.log(`  Wearing prompt: ${wearingResult.charCount} chars`);
      console.log(`  Holding prompt: ${holdingResult.charCount} chars`);
    } else {
      // Use standard detailed prompts for other providers
      const effectivePromptLanguage = language;
      
      const generateWearingPromise = buildDetailedPrompt(
        analysis,
        baseOptions,
        'change-clothes',
        productFocus,
        effectivePromptLanguage
      ).then(promptData => ({
        useCase: 'change-clothes',
        prompts: promptData
      }));

      const generateHoldingPromise = buildDetailedPrompt(
        analysis,
        baseOptions,
        'character-holding-product',
        productFocus,
        effectivePromptLanguage
      ).then(promptData => ({
        useCase: 'character-holding-product',
        prompts: promptData
      }));

      [wearingPromptData, holdingPromptData] = await Promise.all([
        generateWearingPromise,
        generateHoldingPromise
      ]);
    }

    console.log(`\n✅ PROMPTS BUILT:`);
    try {
      console.log(`  Change-clothes prompt: ${wearingPromptData?.prompts?.prompt?.substring(0, 80) || 'N/A'}...`);
      console.log(`  Holding-product prompt: ${holdingPromptData?.prompts?.prompt?.substring(0, 80) || 'N/A'}...`);
    } catch (logErr) {
      console.log(`  ⚠️ Could not display prompt preview:`, logErr.message);
      console.log(`  Wearing data type: ${typeof wearingPromptData}, keys: ${Object.keys(wearingPromptData || {}).join(', ')}`);
      console.log(`  Holding data type: ${typeof holdingPromptData}, keys: ${Object.keys(holdingPromptData || {}).join(', ')}`);
    }

    // 💫 NEW: Extract and merge scene locked prompt if scene option is selected
    console.log(`\n🎬 INCORPORATING SCENE LOCKED PROMPT:`);
    if (baseOptions.scene) {
      try {
        const sceneRefInfo = await getSceneReferenceInfo(baseOptions.scene, baseOptions, language);
        
        if (sceneRefInfo && sceneRefInfo.prompt) {
          console.log(`  ✅ Scene locked prompt found for "${sceneRefInfo.sceneLabel}"`);
          console.log(`     Length: ${sceneRefInfo.prompt.length} chars`);
          
          // Merge scene locked prompt into both wearing and holding prompts
          if (wearingPromptData?.prompts?.prompt) {
            const sceneDirective = `\n\n[LOCKED SCENE DIRECTIVE]: ${sceneRefInfo.prompt}`;
            wearingPromptData.prompts.prompt += sceneDirective;
            console.log(`  ✅ Merged into change-clothes prompt (new total: ${wearingPromptData.prompts.prompt.length} chars)`);
          }
          
          if (holdingPromptData?.prompts?.prompt) {
            const sceneDirective = `\n\n[LOCKED SCENE DIRECTIVE]: ${sceneRefInfo.prompt}`;
            holdingPromptData.prompts.prompt += sceneDirective;
            console.log(`  ✅ Merged into holding-product prompt (new total: ${holdingPromptData.prompts.prompt.length} chars)`);
          }
          
          // Also pass scene locked prompt info in baseOptions for reference
          baseOptions.sceneLockedPrompt = sceneRefInfo.prompt;
          baseOptions.sceneLockedImageUrl = sceneRefInfo.imageUrl;
          baseOptions.useSceneLock = sceneRefInfo.useSceneLock;
        } else {
          console.log(`  ℹ️ No scene locked prompt for "${baseOptions.scene}"`);
        }
      } catch (sceneError) {
        console.warn(`  ⚠️ Could not extract scene locked prompt: ${sceneError.message}`);
        // Continue anyway - scene locked prompt is optional
      }
    } else {
      console.log(`  ℹ️ No scene option selected`);
    }

    // ============================================================
    // STEP 2: GENERATE BOTH IMAGES (Optimized - Single Browser)
    // ============================================================
    
    console.log('\n🌐 STEP 2: Generate Both Images (Wearing + Holding)');
    console.log('─'.repeat(80));

    // Create output directory for generated images
    const outputDir = path.join(tempDir, 'generated-images');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }

    let wearingImageResult = null;
    let holdingImageResult = null;
    
    // 🔴 CRITICAL: STEP 2 MUST COMPLETE FULLY BEFORE PROCEEDING
    try {
      // 💫 DYNAMIC PROVIDER: Use selected provider for image generation
      const imageGen = getImageGenerationService(finalImageProvider, {
        outputDir: outputDir,
        headless: false,
        debugMode: false  // ✅ PRODUCTION MODE
      });
      
      console.log(`🚀 Initializing image generation service (${finalImageProvider})...`);
      
      // Validate prompts before passing to generateMultiple
      const wearingPrompt = wearingPromptData?.prompts?.prompt || '';
      const holdingPrompt = holdingPromptData?.prompts?.prompt || '';
      
      if (!wearingPrompt || typeof wearingPrompt !== 'string' || wearingPrompt.trim().length === 0) {
        throw new Error(`Invalid wearing prompt: ${typeof wearingPrompt}, length: ${wearingPrompt?.length || 0}`);
      }
      if (!holdingPrompt || typeof holdingPrompt !== 'string' || holdingPrompt.trim().length === 0) {
        throw new Error(`Invalid holding prompt: ${typeof holdingPrompt}, length: ${holdingPrompt?.length || 0}`);
      }
      
      console.log(`📝 Prompt validation passed`);
      console.log(`   Wearing: ${wearingPrompt.substring(0, 80)}...`);
      console.log(`   Holding: ${holdingPrompt.substring(0, 80)}...`);
      
      updateFlowPreview(flowId, {
        status: 'step1-complete',
        step1: {
          wearingPrompt,
          holdingPrompt
        }
      });
      
      console.log(`\n🔄 Generating BOTH images (wearing + holding) from character & product...`);
      console.log(`   Character input: ${path.basename(characterFilePath)}`);
      console.log(`   Product input: ${path.basename(productFilePath)}`);
      if (sceneFilePath) {  // 💫 NEW: Log scene image if present
        console.log(`   Scene input: ${path.basename(sceneFilePath)}`);
      }
      console.log(`   Output directory: ${outputDir}`);
      console.log(`   Provider: ${finalImageProvider}`);
      
      // Generate both images using generateMultiple (all providers now support this interface)
      let multiGenResult;
      try {
        console.log(`\n⏳ Calling generateMultiple (this may take 60-180 seconds)...`);
        // 💫 NEW: Pass sceneImagePath and scene locked prompt info in options
        const genOptions = { outputDir };
        if (sceneFilePath) {
          genOptions.sceneImagePath = sceneFilePath;
        }
        // 💫 NEW: Pass scene locked prompt metadata
        if (baseOptions.sceneLockedPrompt) {
          genOptions.sceneLockedPrompt = baseOptions.sceneLockedPrompt;
          genOptions.sceneLockedImageUrl = baseOptions.sceneLockedImageUrl;
          genOptions.useSceneLock = baseOptions.useSceneLock;
          genOptions.sceneName = baseOptions.scene;
        }
        
        multiGenResult = await imageGen.generateMultiple(
          characterFilePath,
          productFilePath,
          [wearingPrompt, holdingPrompt],
          genOptions
        );
        console.log(`✅ generateMultiple completed (returned result object)`);
      } catch (genMultiError) {
        console.error('❌ generateMultiple threw error:', genMultiError.message);
        console.error('Stack:', genMultiError.stack);
        multiGenResult = {
          success: false,
          error: genMultiError.message,
          results: []
        };
      }

      console.log(`\n📊 Multi-generation result summary:`, {
        success: multiGenResult?.success,
        resultsType: typeof multiGenResult?.results,
        resultsLength: multiGenResult?.results?.length,
        error: multiGenResult?.error
      });

      if (!multiGenResult || typeof multiGenResult !== 'object') {
        throw new Error('generateMultiple returned invalid result (not an object)');
      }

      if (!Array.isArray(multiGenResult.results)) {
        throw new Error(`generateMultiple results is not an array: ${typeof multiGenResult.results}`);
      }

      console.log(`📊 Results breakdown:`, {
        totalResults: multiGenResult?.results?.length || 0,
        successful: multiGenResult?.results?.filter(r => r.success)?.length || 0,
        failed: multiGenResult?.results?.filter(r => !r.success)?.length || 0
      });

      // Show detailed output for each image
      if (multiGenResult?.results?.length > 0) {
        multiGenResult.results.forEach((result, idx) => {
          console.log(`\n   IMAGE ${idx + 1} (${result.type || 'unknown'}):`);
          console.log(`     Success: ${result.success}`);
          if (result.success) {
            console.log(`     Download: ${result.downloadedFile ? '✅ Local file' : '❌ No local file'}`);
            console.log(`     Path: ${result.downloadedFile || 'N/A'}`);
            console.log(`     URL: ${result.href || 'N/A'}`);
            if (result.downloadedFile && fs.existsSync(result.downloadedFile)) {
              const fileSize = fs.statSync(result.downloadedFile).size;
              console.log(`     File size: ${(fileSize / 1024).toFixed(2)} KB`);
            } else if (result.downloadedFile) {
              console.log(`     ⚠️ FILE NOT FOUND: ${result.downloadedFile}`);
            }
          } else {
            console.log(`     Error: ${result.error}`);
          }
        });
      }

      // ✅ STRICT VALIDATION: Both images MUST succeed
      if (multiGenResult.results.length < 2) {
        throw new Error(`Only ${multiGenResult.results.length} images returned, need 2 (wearing + holding)`);
      }

      const wearingResult = multiGenResult.results[0];
      const holdingResult = multiGenResult.results[1];

      // Strict check: both MUST have downloadedFile
      if (!wearingResult.success) {
        throw new Error(`IMAGE 1 (WEARING) FAILED: ${wearingResult.error}`);
      }
      if (!wearingResult.downloadedFile) {
        throw new Error(`IMAGE 1 (WEARING) has no downloadedFile - may not have completed. Got: ${JSON.stringify(wearingResult)}`);
      }
      if (!fs.existsSync(wearingResult.downloadedFile)) {
        throw new Error(`IMAGE 1 file does not exist: ${wearingResult.downloadedFile}`);
      }

      if (!holdingResult.success) {
        throw new Error(`IMAGE 2 (HOLDING) FAILED: ${holdingResult.error}`);
      }
      if (!holdingResult.downloadedFile) {
        throw new Error(`IMAGE 2 (HOLDING) has no downloadedFile - may not have completed. Got: ${JSON.stringify(holdingResult)}`);
      }
      if (!fs.existsSync(holdingResult.downloadedFile)) {
        throw new Error(`IMAGE 2 file does not exist: ${holdingResult.downloadedFile}`);
      }

      // ✅ Both images validated and exist - NOW map to expected format
      wearingImageResult = {
        imageUrl: wearingResult.downloadedFile,  // ✅ Use actual file path
        screenshotPath: wearingResult.downloadedFile,
        downloadedAt: new Date().toISOString(),
        href: wearingResult.href,
        type: 'wearing'
      };
      
      holdingImageResult = {
        imageUrl: holdingResult.downloadedFile,  // ✅ Use actual file path
        screenshotPath: holdingResult.downloadedFile,
        downloadedAt: new Date().toISOString(),
        href: holdingResult.href,
        type: 'holding'
      };

      console.log(`\n✅ BOTH IMAGES VALIDATED:`);
      console.log(`   IMAGE 1 (WEARING): ${wearingResult.downloadedFile}`);
      console.log(`     - File exists: YES`);
      console.log(`     - Size: ${(fs.statSync(wearingResult.downloadedFile).size / 1024).toFixed(2)} KB`);
      console.log(`   IMAGE 2 (HOLDING): ${holdingResult.downloadedFile}`);
      console.log(`     - File exists: YES`);
      console.log(`     - Size: ${(fs.statSync(holdingResult.downloadedFile).size / 1024).toFixed(2)} KB`);
        
    } catch (imageGenError) {
      console.error('\n' + '═'.repeat(80));
      console.error('🔴 STEP 2 FAILED - IMAGE GENERATION DID NOT COMPLETE');
      console.error('═'.repeat(80));
      console.error('Error:', imageGenError.message);
      console.error('Stack:', imageGenError.stack);
      console.error('═'.repeat(80));
      throw new Error(`STEP 2 FAILURE - Image generation incomplete: ${imageGenError.message}`);
    }

    // 🔴 FINAL VALIDATION before proceeding to STEP 3
    if (!wearingImageResult || !wearingImageResult.screenshotPath) {
      throw new Error(`VALIDATION FAILED: Wearing image missing (result: ${JSON.stringify(wearingImageResult)})`);
    }
    if (!holdingImageResult || !holdingImageResult.screenshotPath) {
      throw new Error(`VALIDATION FAILED: Holding image missing (result: ${JSON.stringify(holdingImageResult)})`);
    }
    if (!fs.existsSync(wearingImageResult.screenshotPath)) {
      throw new Error(`VALIDATION FAILED: Wearing image file not found: ${wearingImageResult.screenshotPath}`);
    }
    if (!fs.existsSync(holdingImageResult.screenshotPath)) {
      throw new Error(`VALIDATION FAILED: Holding image file not found: ${holdingImageResult.screenshotPath}`);
    }

    const step2Duration = ((Date.now() - step2Start) / 1000).toFixed(2);

    await logger.endStage('image-generation', true);
    await logger.info('Both images generated successfully', 'image-generation-complete', {
      duration: step2Duration,
      wearingImage: wearingImageResult.screenshotPath,
      holdingImage: holdingImageResult.screenshotPath
    });
    await logger.storeArtifacts({
      images: {
        wearing: wearingImageResult.screenshotPath,
        holding: holdingImageResult.screenshotPath
      }
    });

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`✅ STEP 2 COMPLETE: BOTH IMAGES SUCCESSFULLY GENERATED`);
    console.log(`${'═'.repeat(80)}`);
    console.log(`Duration: ${step2Duration}s`);
    console.log(`Image 1 (WEARING): ${wearingImageResult.screenshotPath}`);
    console.log(`Image 2 (HOLDING): ${holdingImageResult.screenshotPath}`);
    console.log(`${'═'.repeat(80)}\n`);

    // 💫 SAVE STEP 2 IMAGES TO PREVIEW STORE (for frontend polling)
    updateFlowPreview(flowId, {
      status: 'step2-complete',
      step2: {
        wearingImagePath: wearingImageResult.screenshotPath,
        holdingImagePath: holdingImageResult.screenshotPath,
        duration: step2Duration
      }
    });
    console.log(`📸 Step 2 images saved to preview store`);

    // ============================================================
    // STEP 2.5: UPLOAD GENERATED IMAGES TO GOOGLE DRIVE (PARALLEL)
    // ============================================================
    
    console.log('\n' + '─'.repeat(80));
    console.log('📤 STEP 2.5: Upload Generated Images to Google Drive (Parallel)');
    console.log('─'.repeat(80));

    // Use paths from STEP 2 results (verified to exist)
    let wearingImagePath = wearingImageResult.screenshotPath;  // ✅ From STEP 2
    let holdingImagePath = holdingImageResult.screenshotPath;  // ✅ From STEP 2

    console.log(`📁 Image paths from STEP 2 (verified to exist):`);
    console.log(`   Wearing: ${wearingImagePath}`);
    console.log(`   Holding: ${holdingImagePath}`);
    console.log(`\n⚡ Uploading both images in parallel...`);

    // 🛑 BARRIER CHECKPOINT: Ensure STEP 2.5 completes before STEP 3
    try {
      // Upload generated images using OAuth (PARALLEL instead of sequential)
      if (driveService && wearingImagePath && holdingImagePath) {
        const uploadTasks = [];
        const generatedTs = Date.now();

        const wearingExt = path.extname(wearingImagePath) || '.jpg';
        const holdingExt = path.extname(holdingImagePath) || '.jpg';

        const defaultWearingFilename = `Generated-Wearing-${flowId}-${generatedTs}${wearingExt}`;
        const defaultHoldingFilename = `Generated-Holding-${flowId}-${generatedTs + 1}${holdingExt}`;

        // Keep explicit generated filenames for DB asset creation later
        wearingImageResult.assetFilename = defaultWearingFilename;
        holdingImageResult.assetFilename = defaultHoldingFilename;

        // UPLOAD wearing image
        if (fs.existsSync(wearingImagePath)) {
          uploadTasks.push(
            driveService.uploadFile(
              wearingImagePath,
              defaultWearingFilename,
              {
                folderId: driveService.folderStructure?.outputs,
                description: 'Generated wearing image from affiliate flow',
                properties: {
                  flowId,
                  type: 'change-clothes',
                  timestamp: new Date().toISOString()
                }
              }
            ).then(result => ({ kind: 'wearing', result })).catch(error => {
              console.warn(`  ⚠️ Wearing image upload failed: ${error.message}`);
              return { kind: 'wearing', result: null };
            })
          );
        }

        // UPLOAD holding image
        if (fs.existsSync(holdingImagePath)) {
          uploadTasks.push(
            driveService.uploadFile(
              holdingImagePath,
              defaultHoldingFilename,
              {
                folderId: driveService.folderStructure?.outputs,
                description: 'Generated holding image from affiliate flow',
                properties: {
                  flowId,
                  type: 'character-holding-product',
                  timestamp: new Date().toISOString()
                }
              }
            ).then(result => ({ kind: 'holding', result })).catch(error => {
              console.warn(`  ⚠️ Holding image upload failed: ${error.message}`);
              return { kind: 'holding', result: null };
            })
          );
        }

        // 🔴 CRITICAL: WAIT for ALL uploads to complete before proceeding to STEP 3
        if (uploadTasks.length > 0) {
          console.log(`\n⏳ Waiting for ${uploadTasks.length} uploads to complete...`);
          const uploadResults = await Promise.all(uploadTasks);
          const successCount = uploadResults.filter(r => r?.result?.id).length;

          for (const upload of uploadResults) {
            if (upload.kind === 'wearing' && upload.result?.id) {
              wearingImageResult.id = upload.result.id;
              wearingImageResult.url = upload.result.webViewLink || null;
              wearingImageResult.assetFilename = upload.result.name || wearingImageResult.assetFilename;
              console.log(`  ✅ Wearing image uploaded to Drive`);
              console.log(`     File ID: ${upload.result.id}`);
            }

            if (upload.kind === 'holding' && upload.result?.id) {
              holdingImageResult.id = upload.result.id;
              holdingImageResult.url = upload.result.webViewLink || null;
              holdingImageResult.assetFilename = upload.result.name || holdingImageResult.assetFilename;
              console.log(`  ✅ Holding image uploaded to Drive`);
              console.log(`     File ID: ${upload.result.id}`);
            }
          }

          console.log(`✅ Step 2.5 Complete: ${successCount}/${uploadTasks.length} uploads successful`);
        }
      } else {
        console.log(`⚠️ Skipping uploads (Drive service: ${!!driveService}, Files exist: ${fs.existsSync(wearingImagePath) && fs.existsSync(holdingImagePath)})`);
      }
    } catch (uploadError) {
      console.warn(`⚠️ Step 2.5 upload error (non-blocking): ${uploadError.message}`);
      console.warn(`   Proceeding to Step 3 anyway...`);
    }

    // 🔴 BARRIER: Explicit checkpoint to ensure STEP 2 pipeline is complete
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🔄 [BARRIER CHECKPOINT] STEP 2 PIPELINE COMPLETE`);
    console.log(`${'═'.repeat(80)}`);
    console.log(`✅ Step 2: Image generation - DONE`);
    console.log(`   Wearing image: ${wearingImagePath}`);
    console.log(`   Holding image: ${holdingImagePath}`);
    console.log(`✅ Step 2.5: Image uploads - DONE`);
    console.log(`\n📋 VERIFIED DATA FOR STEP 3:`);
    console.log(`   wearingImagePath: ${fs.existsSync(wearingImagePath) ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   holdingImagePath: ${fs.existsSync(holdingImagePath) ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   productFilePath: ${fs.existsSync(productFilePath) ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`${'═'.repeat(80)}`);
    console.log(`🔄 NOW PROCEEDING TO STEP 3...\n`);
    
    // 🔴 ASSERT: If File doesn't exist, FAIL immediately
    if (!fs.existsSync(wearingImagePath)) {
      throw new Error(`BARRIER FAILED: Wearing image missing before STEP 3: ${wearingImagePath}`);
    }
    if (!fs.existsSync(holdingImagePath)) {
      throw new Error(`BARRIER FAILED: Holding image missing before STEP 3: ${holdingImagePath}`);
    }

    // ============================================================
    // STEP 3: DEEP CHATGPT ANALYSIS
    // ============================================================

    console.log('\n' + '─'.repeat(80));
    console.log('🤖 STEP 3: Deep ChatGPT Analysis (Using Generated Images)');
    console.log('─'.repeat(80));
    const step3Start = Date.now();

    console.log(`\n📸 IMAGES BEING SENT TO CHATGPT:`);
    console.log(`\n   1️⃣ WEARING IMAGE (Character wearing product):`);
    console.log(`      Path: ${wearingImagePath}`);
    console.log(`      Exists: ${fs.existsSync(wearingImagePath) ? '✅ YES' : '❌ NO'}`);
    if (fs.existsSync(wearingImagePath)) {
      const wearingSize = fs.statSync(wearingImagePath).size;
      console.log(`      Size: ${(wearingSize / 1024).toFixed(2)} KB`);
    }
    
    console.log(`\n   2️⃣ HOLDING IMAGE (Character holding product):`);
    console.log(`      Path: ${holdingImagePath}`);
    console.log(`      Exists: ${fs.existsSync(holdingImagePath) ? '✅ YES' : '❌ NO'}`);
    if (fs.existsSync(holdingImagePath)) {
      const holdingSize = fs.statSync(holdingImagePath).size;
      console.log(`      Size: ${(holdingSize / 1024).toFixed(2)} KB`);
    }
    
    console.log(`\n   3️⃣ PRODUCT IMAGE (Original product input):`);
    console.log(`      Path: ${productFilePath}`);
    console.log(`      Exists: ${fs.existsSync(productFilePath) ? '✅ YES' : '❌ NO'}`);
    if (fs.existsSync(productFilePath)) {
      const productSize = fs.statSync(productFilePath).size;
      console.log(`      Size: ${(productSize / 1024).toFixed(2)} KB`);
    }

    console.log(`\n📝 ANALYSIS REQUEST PARAMS:`);
    console.log(`  Duration: ${videoDuration}s`);
    console.log(`  Voice: ${voiceGender} (${voicePace} pace)`);
    console.log(`  Focus: ${productFocus}`);
    console.log(`  Language: ${language || 'en'}`);

    console.log(`\n⏳ Sending to ChatGPT for analysis...`);

    const deepAnalysis = await performDeepChatGPTAnalysis(
      analysis,
      {
        wearingImage: wearingImagePath,  // ✅ From STEP 2: wearing image
        holdingImage: holdingImagePath,  // ✅ From STEP 2: holding image
        productImage: productFilePath    // ✅ Original product input
      },
      {
        videoDuration,
        voiceGender,
        voicePace,
        productFocus,
        language,  // 💫 Add language to config
        videoProvider: finalVideoProvider,
        clipDuration: providerClipDuration
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
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`✅ STEP 3 COMPLETE: ChatGPT Analysis Done`);
    console.log(`${'═'.repeat(80)}`);
    console.log(`Duration: ${step3Duration}s`);
    console.log(`📊 ANALYSIS OUTPUT:`);
    console.log(`  Video scripts: ${deepAnalysis.data.videoScripts?.length || 0} segments`);
    console.log(`  Voiceover script: ${deepAnalysis.data.voiceoverScript?.split('\n').length || 0} lines / ${deepAnalysis.data.voiceoverScript?.length || 0} chars`);
    console.log(`  Hashtags: ${deepAnalysis.data.hashtags?.length || 0} suggested: ${deepAnalysis.data.hashtags?.slice(0, 5).join(', ')}${deepAnalysis.data.hashtags?.length > 5 ? '...' : ''}`);
    console.log(`${'═'.repeat(80)}\n`);
    // ============================================================
    updateFlowPreview(flowId, {
      status: 'step3-complete',
      step3: {
        videoScripts: deepAnalysis.data.videoScripts || [],
        hashtags: deepAnalysis.data.hashtags || [],
        voiceoverScript: deepAnalysis.data.voiceoverScript || ''
      }
    });

    // STEP 4: VIDEO GENERATION (Dynamic Provider Selection)
    // 🎬 Generate actual 10-second video with 720p resolution
    // Dynamically select images based on deep analysis recommendations
    // ============================================================

    console.log('\n' + '─'.repeat(80));
    console.log(`🎬 STEP 4: Video Generation (via ${finalVideoProvider})`);
    console.log('─'.repeat(80));
    await logger.startStage('video-generation');
    const step4Start = Date.now();

    let videoGenerationResult = null;
    
    try {
      // ========== EXTRACT IMAGE RECOMMENDATIONS FROM STEP 3 ==========
      const imageRecommendations = extractImageRecommendations(deepAnalysis);
      console.log(`\n📸 IMAGE SELECTION STRATEGY:`);
      console.log(`  Wearing image: ${wearingImagePath}`);
      console.log(`  Holding image: ${holdingImagePath}`);
      console.log(`  Product image: ${productFilePath}`);
      console.log(`  Deep analysis recommends:`);
      if (imageRecommendations.preferHolding) {
        console.log(`    → Use HOLDING image for main video (product showcase)`);
      } else {
        console.log(`    → Use WEARING image for main video (styling/fitting)`);
      }
      if (imageRecommendations.includeProduct) {
        console.log(`    → Include product image in context`);
      }

      // ========== INITIALIZE VIDEO GENERATION SERVICE (DYNAMIC) ==========
      const videoGen = getVideoGenerationService(finalVideoProvider, {
        outputDir: tempDir,
        headless: false,
        debugMode: false
      });

      console.log(`\n📝 VIDEO GENERATION PARAMETERS:`);
      console.log(`  Duration: ${providerClipDuration}s`);
      console.log(`  Resolution: 720p`);
      console.log(`  Format: TikTok-friendly (9:16 aspect ratio)`);
      console.log(`  Provider: ${finalVideoProvider}`);

      try {
        // STEP 4.0: Initialize browser
        console.log(`\n🚀 Initializing ${finalVideoProvider} browser for video generation...`);
        // Support both init() and initialize() methods (different providers use different names)
        if (typeof videoGen.init === 'function') {
          await videoGen.init();
        } else if (typeof videoGen.initialize === 'function') {
          await videoGen.initialize();
        } else {
          throw new Error(`Video service does not have init() or initialize() method`);
        }
        console.log(`✅ ${finalVideoProvider} browser initialized`);

        // STEP 4.1: Select primary image for video (wearing or holding based on analysis)
        const primaryImagePath = imageRecommendations.preferHolding && holdingImagePath ? holdingImagePath : wearingImagePath;
        const secondaryImagePath = imageRecommendations.preferHolding ? wearingImagePath : holdingImagePath;
        
        console.log(`\n🖼️  IMAGE SELECTION FOR VIDEO:`);
        console.log(`  Primary: ${path.basename(primaryImagePath)} (main character)`);
        console.log(`  Secondary: ${path.basename(secondaryImagePath)} (reference/context)`);
        if (productFilePath) {
          console.log(`  Product: ${path.basename(productFilePath)} (optional context)`);
        }

        // STEP 4.2: Build comprehensive video prompt
        console.log(`\n${'═'.repeat(80)}`);
        console.log(`🎯 GENERATING TIKTOK VIDEO`);
        console.log(`${'═'.repeat(80)}\n`);

        let videoPrompt;
        const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
        
        const videoScripts = deepAnalysis.data.videoScripts || [];
        
        // Build prompt based on which image is primary
        if (imageRecommendations.preferHolding) {
          // Use holding-focused prompt
          if (normalizedLanguage === 'vi') {
            videoPrompt = VietnamesePromptBuilder.buildHoldingProductPrompt({
              garment_type: analysis.product?.garment_type || 'sản phẩm',
              primary_color: analysis.product?.primary_color || 'màu chính',
              fabric_type: analysis.product?.fabric_type || 'chất vải',
              pattern: analysis.product?.pattern || 'màu trơn',
              key_details: analysis.product?.key_details || 'chi tiết',
              scene: 'phía sau trắng sạch',
              lighting: 'ánh sáng chuyên nghiệp',
              mood: 'chuyên nghiệp, tự tin',
              style: 'hiện đại, chuyên nghiệp'
            });
          } else {
            // Use English holding product prompt from smartPromptBuilder
            const holdingPrompt = buildCharacterHoldingProductPrompt(
              analysis,
              {
                outfitColor: analysis.product?.primary_color,
                outfitStyle: 'casual-professional',
                hairstyle: 'same',
                makeup: 'natural',
                scene: 'studio',
                lighting: 'professional',
                mood: 'confident',
                cameraAngle: 'eye-level',
                colorPalette: 'warm'
              },
              productFocus
            );
            videoPrompt = holdingPrompt;
          }
        } else {
          // Use wearing-focused prompt (default)
          if (normalizedLanguage === 'vi') {
            const scriptContent = videoScripts.map(s => `${s.segment}: ${s.script}`).join(' ');
            videoPrompt = VietnamesePromptBuilder.buildComprehensiveVideoPrompt(
              scriptContent,
              {
                name: analysis.product?.garment_type,
                details: analysis.product?.key_details,
                color: analysis.product?.primary_color,
                material: analysis.product?.fabric_type
              },
              {
                videoDuration: providerClipDuration,
                voiceGender,
                voicePace,
                productFocus,
                aspectRatio: '9:16',
                platform: 'TikTok'
              }
            );
          } else {
            const scriptContent = videoScripts.map(s => `${s.segment}: ${s.script}`).join(' ');
            videoPrompt = buildComprehensiveVideoPrompt(
              scriptContent,
              analysis,
              {
                videoDuration: providerClipDuration,
                voiceGender,
                voicePace,
                productFocus,
                aspectRatio: '9:16',
                platform: 'TikTok'
              }
            );
          }
        }

        if (!videoPrompt || videoPrompt.trim().length === 0) {
          throw new Error('Failed to generate video prompt');
        }

        console.log(`📝 Video prompt ready (${videoPrompt.length} characters)`);
        console.log(`   First 150 chars: "${videoPrompt.substring(0, 150)}..."\n`);

        // STEP 4.3: Generate video using /imagine page
        console.log('📤 Starting video generation...\n');
        
        const videoResult = await videoGen.generateVideo(
          videoPrompt,
          primaryImagePath,
          secondaryImagePath,
          {
            download: true,
            outputPath: tempDir,
            reloadAfter: false  // Don't reload after single video
          }
        );

        if (videoResult?.path && fs.existsSync(videoResult.path)) {
          const videoSize = fs.statSync(videoResult.path).size;
          console.log(`\n✅ VIDEO GENERATION SUCCESSFUL`);
          console.log(`   File: ${path.basename(videoResult.path)}`);
          console.log(`   Size: ${(videoSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`   Duration: ${providerClipDuration} seconds`);
          console.log(`   Resolution: 720p (9:16 TikTok format)`);
          console.log(`   Primary image: ${imageRecommendations.preferHolding ? 'Character holding product' : 'Character wearing product'}`);

          videoGenerationResult = {
            success: true,
            videos: [{
              type: 'tiktok-video',
              path: videoResult.path,
              url: videoResult.url,
              duration: providerClipDuration,
              resolution: '720p',
              size: videoSize,
              format: '9:16',
              primaryImage: imageRecommendations.preferHolding ? 'holding' : 'wearing'
            }],
            totalCount: 1,
            status: 'success',
            downloadedPath: videoResult.path
          };
        } else {
          throw new Error('Video generation returned no valid file path');
        }

      } finally {
        try {
          await videoGen.close();
          console.log(`\n✅ ${finalVideoProvider} browser closed`);
        } catch (closeError) {
          console.warn('⚠️  Warning closing browser:', closeError.message);
        }
      }

    } catch (videoError) {
      console.error('❌ Video generation failed:', videoError.message);
      console.error(`   Stack: ${videoError.stack.split('\n').slice(0, 3).join('\n')}`);
      
      videoGenerationResult = {
        success: false,
        videos: [],
        totalCount: 0,
        error: videoError.message,
        status: 'failure'
      };
    }

    const step4Duration = ((Date.now() - step4Start) / 1000).toFixed(2);
    await logger.endStage('video-generation', videoGenerationResult?.success);
    
    if (videoGenerationResult?.success) {
      console.log(`\n✅ STEP 4 COMPLETE: Generated ${videoGenerationResult.totalCount} video(s) in ${step4Duration}s`);
      await logger.info(`Video generation completed`, 'video-generation-complete', {
        generatedCount: videoGenerationResult.totalCount,
        duration: step4Duration,
        resolution: '720p',
        videoDuration: `${providerClipDuration}s`
      });
    } else {
      console.error(`\n❌ STEP 4 FAILED: ${videoGenerationResult?.error || 'Unknown error'}`);
      await logger.error(`Video generation failed`, 'video-generation-failed', {
        error: videoGenerationResult?.error,
        duration: step4Duration
      });
    }

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

    // 5.1: Save wearing image
    try {
      console.log('\n📸 Saving wearing image to database...');
      const wearingFileExt = path.extname(wearingImagePath) || '.jpg';
      const wearingFilename = wearingImageResult.assetFilename || `Generated-Wearing-${flowId}-${Date.now()}${wearingFileExt}`;
      const wearingOnDrive = !!wearingImageResult.id;

      const wearingAssetResult = await AssetManager.saveAsset({
        filename: wearingFilename,
        mimeType: 'image/jpeg',
        fileSize: fs.existsSync(wearingImagePath) ? fs.statSync(wearingImagePath).size : 0,
        assetType: 'image',
        assetCategory: 'generated-image',
        userId: req.body.userId || 'system',
        sessionId: flowId,
        storage: {
          location: wearingOnDrive ? 'google-drive' : 'local'
        },
        cloudStorage: wearingOnDrive ? {
          googleDriveId: wearingImageResult.id,
          googleDrivePath: 'Affiliate AI/Images/Completed',
          url: wearingImageResult.url,
          status: 'synced'
        } : undefined,
        localStorage: !wearingOnDrive ? {
          path: wearingImagePath,
          size: fs.existsSync(wearingImagePath) ? fs.statSync(wearingImagePath).size : 0
        } : undefined,
        metadata: {
          format: 'jpeg',
          type: 'character-wearing-product',
          flowId,
          sourcePath: wearingImageResult.screenshotPath
        },
        tags: ['generated', 'affiliate-video', 'wearing']
      }, { verbose: true });

      if (wearingAssetResult.success) {
        savedAssets.images.push(wearingAssetResult.asset);
      }
    } catch (assetError) {
      console.warn(`   ⚠️  Failed to save wearing image: ${assetError.message}`);
    }

    // 5.2: Save holding image
    try {
      console.log('\n📸 Saving holding image to database...');
      const holdingFileExt = path.extname(holdingImagePath) || '.jpg';
      const holdingFilename = holdingImageResult.assetFilename || `Generated-Holding-${flowId}-${Date.now()}${holdingFileExt}`;
      const holdingOnDrive = !!holdingImageResult.id;

      const holdingAssetResult = await AssetManager.saveAsset({
        filename: holdingFilename,
        mimeType: 'image/jpeg',
        fileSize: fs.existsSync(holdingImagePath) ? fs.statSync(holdingImagePath).size : 0,
        assetType: 'image',
        assetCategory: 'generated-image',
        userId: req.body.userId || 'system',
        sessionId: flowId,
        storage: {
          location: holdingOnDrive ? 'google-drive' : 'local'
        },
        cloudStorage: holdingOnDrive ? {
          googleDriveId: holdingImageResult.id,
          googleDrivePath: 'Affiliate AI/Images/Completed',
          url: holdingImageResult.url,
          status: 'synced'
        } : undefined,
        localStorage: !holdingOnDrive ? {
          path: holdingImagePath,
          size: fs.existsSync(holdingImagePath) ? fs.statSync(holdingImagePath).size : 0
        } : undefined,
        metadata: {
          format: 'jpeg',
          type: 'character-holding-product',
          flowId,
          sourcePath: holdingImageResult.screenshotPath
        },
        tags: ['generated', 'affiliate-video', 'holding']
      }, { verbose: true });

      if (holdingAssetResult.success) {
        savedAssets.images.push(holdingAssetResult.asset);
      }
    } catch (assetError) {
      console.warn(`   ⚠️  Failed to save holding image: ${assetError.message}`);
    }

    // 5.3: Save generated videos
    const allGeneratedVideos = videoGenerationResult?.videos || [];
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
              wearing: wearingImageResult?.url || wearingImageResult?.screenshotPath || 'N/A',
              holding: holdingImageResult?.url || holdingImageResult?.screenshotPath || 'N/A'
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
      if (wearingImageResult?.screenshotPath) {
        generatedImagePaths.push(wearingImageResult.screenshotPath);
      }
      if (holdingImageResult?.screenshotPath) {
        generatedImagePaths.push(holdingImageResult.screenshotPath);
      }

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
 */
async function performDeepChatGPTAnalysis(analysis, images, config) {
  let chatGPTService = null;  // 🔴 Declare outside try so finally can access it
  
  try {
    const { wearingImage, holdingImage, productImage } = images;
    const { videoDuration, voiceGender, voicePace, productFocus, language = 'en', videoProvider = 'grok', clipDuration } = config;

    console.log('\n🧠 STEP 3: Deep ChatGPT Analysis for Video Segment Scripts');
    console.log(`   Images: wearing, holding, product`);
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
          wearing: typeof wearingImage === 'string' ? wearingImage : wearingImage.screenshotPath,
          holding: typeof holdingImage === 'string' ? holdingImage : holdingImage.screenshotPath,
          product: productImage
        },
        { videoDuration, voiceGender, voicePace, productFocus, videoProvider, clipDuration }
      );
    }

    // 🔴 CRITICAL: Initialize BEFORE attempting image analysis
    console.log(`   🚀 Initializing ChatGPT Browser Automation...`);
    chatGPTService = new ChatGPTService({ headless: true });
    await chatGPTService.initialize();
    
    // 💫 NEW: Log the 3 images being uploaded to ChatGPT
    console.log(`\n📸 STEP 3: Uploading 3 images for ChatGPT analysis:`);
    console.log(`   ├─ Wearing image: ${wearingImage}`);
    console.log(`   ├─ Holding image: ${holdingImage}`);
    console.log(`   └─ Product image: ${productImage}`);
    
    // Verify all 3 images exist
    const imageFiles = [wearingImage, holdingImage, productImage];
    const missingImages = imageFiles.filter(img => !img || (typeof img === 'string' && !fs.existsSync(img)));
    if (missingImages.length > 0) {
      throw new Error(`Missing images for ChatGPT analysis: ${missingImages.length} image(s) not found or undefined`);
    }
    console.log(`   ✅ All 3 images verified to exist`);

    // Call ChatGPT for video script generation
    const rawChatGPTResponse = await chatGPTService.analyzeMultipleImages(
      [wearingImage, holdingImage, productImage],
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
      analysisData = parseDeepAnalysisResponse(rawChatGPTResponse, analysis);
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
function parseDeepAnalysisResponse(rawText, analysis) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Invalid response - expected string');
  }

  console.log(`\n🔍 PARSING CHATGPT RESPONSE`);
  console.log(`   Raw text length: ${rawText.length} characters`);

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

  // METHOD 2: Extract sections by markers (VIDEO SCRIPT, VOICEOVER, HASHTAGS)
  console.log(`   📍 METHOD 2: Extracting by section markers...`);
  
  const sections = {
    videoScripts: [],
    voiceoverScript: '',
    hashtags: []
  };

  // Extract VIDEO SCRIPT section
  const videoScriptMatch = rawText.match(
    /(?:VIDEO\s+SCRIPT|🎬\s+VIDEO\s+SEGMENTS)[\s\S]*?(?=(?:VOICEOVER|🎙️|HASHTAG|$))/i
  );
  
  if (videoScriptMatch) {
    console.log(`   ✅ Found VIDEO SCRIPT section (${videoScriptMatch[0].length}ch)`);
    sections.videoScripts = parseVideoSegments(videoScriptMatch[0]);
  }

  // Extract VOICEOVER section
  const voiceoverMatch = rawText.match(
    /(?:VOICEOVER|🎙️\s+VOICEOVER)[\s\S]*?(?=(?:HASHTAG|#️⃣|$))/i
  );
  
  if (voiceoverMatch) {
    console.log(`   ✅ Found VOICEOVER section (${voiceoverMatch[0].length}ch)`);
    // Clean voiceover text
    let voiceText = voiceoverMatch[0]
      .replace(/^(?:VOICEOVER|🎙️\s+VOICEOVER)[:\s]*/i, '')
      .trim();
    sections.voiceoverScript = voiceText;
  }

  // Extract HASHTAGS section
  const hashtagMatch = rawText.match(
    /(?:HASHTAG|#️⃣\s+HASHTAG)[\s\S]*?(?=$)/i
  );
  
  if (hashtagMatch) {
    console.log(`   ✅ Found HASHTAG section (${hashtagMatch[0].length}ch)`);
    sections.hashtags = parseHashtags(hashtagMatch[0]);
  }

  // METHOD 3: If no sections found, try to extract from raw text intelligently
  if (sections.videoScripts.length === 0 && sections.voiceoverScript.length === 0) {
    console.log(`   📍 METHOD 3: No sections found, attempting intelligent extraction...`);
    
    // Split by common segment markers
    const lines = rawText.split('\n');
    let currentScript = '';
    
    for (const line of lines) {
      // Check if line starts a new segment
      if (line.match(/^\[?(INTRO|WEARING|HOLDING|CTA|OUTRO)\]?/i)) {
        if (currentScript.length > 0) {
          sections.videoScripts.push({
            segment: 'generated',
            duration: 5,
            script: currentScript.trim(),
            image: 'wearing'
          });
        }
        currentScript = line;
      } else if (currentScript.length > 0) {
        currentScript += '\n' + line;
      }
    }
    
    // Add last script if any
    if (currentScript.length > 20) {
      sections.videoScripts.push({
        segment: 'generated',
        duration: 5,
        script: currentScript.trim(),
        image: 'wearing'
      });
    }
  }

  console.log(`   📊 Parsing complete:`);
  console.log(`      Video segments: ${sections.videoScripts.length}`);
  console.log(`      Voiceover length: ${sections.voiceoverScript.length}ch`);
  console.log(`      Hashtags: ${sections.hashtags.length}`);

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
  const { videoDuration, voiceGender, voicePace, productFocus, videoProvider = 'grok', clipDuration } = config;
  const providerDuration = clipDuration || getProviderClipDuration(videoProvider);
  const segmentCount = Math.max(2, Math.ceil(providerDuration / 2));

  return `
You are a professional video content creator for TikTok affiliate marketing.

PRODUCT INFORMATION:
- Name: ${analysis.product?.garment_type}
- Color: ${analysis.product?.primary_color}
- Material: ${analysis.product?.fabric_type}
- Style: ${analysis.product?.style_category}
- Key Details: ${analysis.product?.key_details}

IMAGES PROVIDED:
1. "wearing" - Character styled wearing the product
2. "holding" - Character holding/presenting the product
3. "product" - Original product reference

VIDEO GENERATION CONTEXT:
- Requested total campaign duration: ${videoDuration} seconds
- Current provider: ${videoProvider}
- Duration per generated video clip: ${providerDuration} seconds

YOUR TASK:
Generate content for ONE TikTok clip (9:16 format, ${providerDuration} seconds).

IMPORTANT: Return exactly these sections and formatting for parser compatibility.

🎬 VIDEO SEGMENTS:
Create ${segmentCount} short segments that fully fit inside ${providerDuration} seconds.
For each segment, use this exact format:
[SEGMENT_NAME] [startSecond-endSecond] [IMAGES: image1, image2, ...]:
Narration for that exact time range.
- Reason: Why these images work for this segment

Rules:
- First segment must start at 0.
- Last segment must end exactly at ${providerDuration}.
- Time ranges must be continuous with no gaps or overlaps.
- Allowed images: wearing, holding, product.

Example format:
[INTRO] [0-2s] [IMAGES: wearing, product]:
Hook line that grabs attention immediately.
- Reason: fast opening with body-fit + product clarity

[FEATURES] [2-6s] [IMAGES: wearing, holding]:
Highlight fit, material, and key details naturally.
- Reason: mix styling view and detail showcase

[CTA] [6-${providerDuration}s] [IMAGES: product]:
Strong purchase CTA and urgency.
- Reason: product-only frame improves conversion focus

🎙️ VOICEOVER:
Write a cohesive ${voiceGender} narrator script for exactly ${providerDuration} seconds.
- Pace: ${voicePace}
- Tone: Enthusiastic, relatable, trendy
- Include pain points and product benefits
- End with strong CTA

#️⃣ HASHTAGS:
List 8-10 trending hashtags (include at least 3 of: #Fashion #TikTok #Affiliate #MustHave #StyleFind)
Format: #Hashtag1 #Hashtag2 #Hashtag3 etc.

REQUIREMENTS:
- Fast-paced, engaging narration
- Focus on product benefits and style appeal
- Optimize for affiliate conversion while maintaining authenticity
- Segment timeline must be second-level accurate for downstream video generation
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

/**
 * Build comprehensive prompt for Grok video generation (/imagine page)
 * Optimized for actual video generation (not just frames)
 */
function buildComprehensiveVideoPrompt(scriptContent, characterAnalysis, config) {
  const { 
    videoDuration = 10, 
    voiceGender = 'female', 
    voicePace = 'moderate',
    productFocus = 'full-outfit',
    aspectRatio = '9:16',
    platform = 'TikTok'
  } = config;
  
  const product = characterAnalysis.product || {};
  const productName = product.garment_type || product.name || 'fashion product';
  const productColor = product.primary_color || product.color || 'fashionable';
  const productMaterial = product.fabric_type || product.material || 'premium quality';
  
  // Build the prompt for natural video generation
  let prompt = `Create a professional TikTok video (${aspectRatio} format, ${videoDuration} seconds):\n\n`;
  
  prompt += `📝 SCRIPT:\n`;
  prompt += `${scriptContent}\n\n`;
  
  prompt += `🎬 VISUAL ELEMENTS:\n`;
  prompt += `- Main subject: Model demonstrating a ${productColor} ${productName}\n`;
  prompt += `- Material: ${productMaterial}\n`;
  prompt += `- Focus: ${productFocus}\n`;
  prompt += `- Pacing: Fast-paced, engaging cuts for ${platform}\n`;
  prompt += `- Transitions: Smooth fades and quick cuts\n\n`;
  
  prompt += `🎙️ VOICEOVER:\n`;
  prompt += `- Gender: ${voiceGender}\n`;
  prompt += `- Pace: ${voicePace}\n`;
  prompt += `- Tone: Energetic, persuasive, authentic\n\n`;
  
  prompt += `🎨 STYLE & MOOD:\n`;
  prompt += `- Overall aesthetic: Modern, trendy, conversion-focused\n`;
  prompt += `- Lighting: Bright, professional, flattering\n`;
  prompt += `- Quality: 720p minimum resolution\n`;
  prompt += `- Aspect ratio: ${aspectRatio} (vertical for ${platform})\n\n`;
  
  prompt += `⏱️ TIMING: ${videoDuration} seconds total video length\n`;
  
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
};

/**
 * Extract image recommendations from deep analysis
 * Determines whether to use wearing or holding image as primary
 * @param {Object} deepAnalysis - Result from STEP 3 ChatGPT analysis
 * @returns {Object} { preferHolding, includeProduct }
 */
function extractImageRecommendations(deepAnalysis) {
  const videoScripts = deepAnalysis?.data?.videoScripts || [];
  
  // Count script types to determine which image is more useful
  let wearingCount = 0;
  let holdingCount = 0;
  let productShowcaseCount = 0;

  for (const script of videoScripts) {
    const segment = (script.segment || '').toLowerCase();
    const scriptText = (script.script || '').toLowerCase();
    
    // Detect segment type from script name/content
    if (segment.includes('wear') || segment.includes('wearing') || segment.includes('fit') || segment.includes('styling')) {
      wearingCount++;
    } else if (segment.includes('hold') || segment.includes('holding') || segment.includes('hand') || segment.includes('present')) {
      holdingCount++;
    }
    
    // Detect product showcase cues
    if (scriptText.includes('product') || scriptText.includes('detail') || scriptText.includes('quality') || scriptText.includes('close')) {
      productShowcaseCount++;
    }
  }

  console.log(`\n🔍 IMAGE RECOMMENDATION ANALYSIS:`);
  console.log(`   Wearing-focused segments: ${wearingCount}`);
  console.log(`   Holding-focused segments: ${holdingCount}`);
  console.log(`   Product showcase cues: ${productShowcaseCount}`);

  // Decision logic
  const preferHolding = holdingCount > wearingCount;
  const includeProduct = productShowcaseCount > 0;

  if (preferHolding) {
    console.log(`   ✅ DECISION: Use HOLDING image (character prominently displaying product)`);
  } else {
    console.log(`   ✅ DECISION: Use WEARING image (character styling with product)`);
  }

  if (includeProduct) {
    console.log(`   ✅ Context: Include product image for detail references`);
  }

  return {
    preferHolding,
    includeProduct,
    wearingCount,
    holdingCount,
    productShowcaseCount
  };
}

/**
 * Build character holding product prompt (English version)
 * Character prominently holds or presents product in hand
 */
function buildCharacterHoldingProductPrompt(analysis, selectedOptions = {}, productFocus = 'full-outfit') {
  const character = analysis.character || {};
  const product = analysis.product || {};

  let prompt = `[CHARACTER HOLDING PRODUCT COMPOSITION]\n`;
  prompt += `Purpose: Character prominently holding or presenting product for affiliate/marketing content\n`;
  prompt += `Focus: Character (60%) + Product in hand (40%)\n\n`;

  prompt += `[IMAGE REFERENCE MAPPING]\n`;
  prompt += `Character: Keep from reference image (face, body, pose)\n`;
  prompt += `Product: Character holds/presents in hand or elevated position\n\n`;

  // Character Section
  prompt += `=== CHARACTER (PRIMARY SUBJECT - 60% of focus) ===\n`;
  prompt += `The character is the MAIN SUBJECT - prominently featured\n\n`;

  prompt += `Character Description:\n`;
  if (character.age) prompt += `- Age: ${character.age}\n`;
  if (character.gender) prompt += `- Gender: ${character.gender}\n`;
  if (character.skinTone) prompt += `- Skin tone: ${character.skinTone}\n`;
  if (character.hair?.color && character.hair?.style) {
    prompt += `- Hair: ${character.hair.color} ${character.hair.style}\n`;
  }
  prompt += `- KEEP same face, body, appearance as reference\n\n`;

  prompt += `POSE & POSITIONING:\n`;
  prompt += `- Standing or seated, natural comfortable position\n`;
  prompt += `- Hands/arms prominently HOLDING or PRESENTING the product\n`;
  prompt += `- Product visible and well-placed in character's hands\n`;
  prompt += `- Expression: Engaged, interested, confident\n`;
  prompt += `- Looking at product OR making eye contact\n\n`;

  // Product Section
  prompt += `=== PRODUCT (SECONDARY FOCUS - IN HANDS) ===\n`;
  prompt += `The product is PROMINENTLY VISIBLE, held by character\n\n`;

  if (product.garment_type) {
    prompt += `Garment: ${product.garment_type}\n`;
  }
  if (product.style_category) {
    prompt += `Style: ${product.style_category}\n`;
  }

  prompt += `COLORS:\n`;
  if (product.primary_color) prompt += `  Primary: ${product.primary_color}\n`;
  if (product.secondary_color) prompt += `  Secondary: ${product.secondary_color}\n`;

  prompt += `MATERIAL & TEXTURE:\n`;
  if (product.fabric_type) {
    prompt += `  Fabric: ${product.fabric_type}\n`;
  }

  prompt += `\nHOW PRODUCT IS PRESENTED:\n`;
  prompt += `- Character HOLDS product clearly visible to camera\n`;
  prompt += `- Hand position: Natural, comfortable holding\n`;
  prompt += `- Product orientation: Clearly visible, not hidden\n`;
  prompt += `- Display angle: Shows product details best\n`;
  if (productFocus === 'full-outfit') {
    prompt += `- Garment held up or draped, clearly visible\n`;
  } else if (productFocus === 'accessory') {
    prompt += `- Accessory prominently held or displayed near face/chest\n`;
  }
  prompt += `- Lighting: Well-lit, colors true-to-life\n\n`;

  // Styling & Scene
  prompt += `=== STYLING & SCENE ===\n`;
  prompt += `- Background: Clean, uncluttered (does not compete with character)\n`;
  prompt += `- Lighting: Soft, flattering, even lighting on character and product\n`;
  prompt += `- Mood: Positive, engaging, professional presentation\n`;
  prompt += `- Camera angle: Eye-level or slightly below for engagement\n`;
  prompt += `- Frame: Character from waist up OR full-body showing hands clearly\n`;
  prompt += `- Quality: Magazine-quality, retail-ready, 8K detail\n`;

  return prompt;
}
