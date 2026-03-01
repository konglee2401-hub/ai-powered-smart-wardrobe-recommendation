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
import { buildDetailedPrompt } from './smartPromptBuilder.js';
import GrokServiceV2 from './browser/grokServiceV2.js';
import ChatGPTService from './browser/chatgptService.js';
import GoogleDriveOAuthService from './googleDriveOAuth.js';
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
  return flowPreviewStore.get(flowId) || { status: 'not-found', step2Images: null };
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
  updateFlowPreview(flowId, { status: 'started', step2Images: null });

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
      options = {}
    } = req.body;

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
    const generateWearingPromise = buildDetailedPrompt(
      analysis,
      baseOptions,
      'change-clothes',
      productFocus,
      language  // Use selected language (en or vi)
    ).then(promptData => ({
      useCase: 'change-clothes',
      prompts: promptData
    }));

    // Promise 2: Generate character-holding-product image
    const generateHoldingPromise = buildDetailedPrompt(
      analysis,
      baseOptions,
      'character-holding-product',
      productFocus,
      language  // Use selected language (en or vi)
    ).then(promptData => ({
      useCase: 'character-holding-product',
      prompts: promptData
    }));

    // Wait for both prompts to be built
    const [wearingPromptData, holdingPromptData] = await Promise.all([
      generateWearingPromise,
      generateHoldingPromise
    ]);

    console.log(`\n✅ PROMPTS BUILT:`);
    try {
      console.log(`  Change-clothes prompt: ${wearingPromptData?.prompts?.prompt?.substring(0, 80) || 'N/A'}...`);
      console.log(`  Holding-product prompt: ${holdingPromptData?.prompts?.prompt?.substring(0, 80) || 'N/A'}...`);
    } catch (logErr) {
      console.log(`  ⚠️ Could not display prompt preview:`, logErr.message);
      console.log(`  Wearing data type: ${typeof wearingPromptData}, keys: ${Object.keys(wearingPromptData || {}).join(', ')}`);
      console.log(`  Holding data type: ${typeof holdingPromptData}, keys: ${Object.keys(holdingPromptData || {}).join(', ')}`);
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
    
    try {
      // ✅ SWITCHED TO GROK: More reliable image generation than Google Flow
      // Grok auto-redirects after 5-7s with Cloudflare bypass, no manual verification needed
      const imageGen = new GrokServiceV2({
        outputDir: outputDir,
        headless: false,
        debugMode: false  // ✅ PRODUCTION MODE
      });
      
      console.log('🚀 Initializing image generation service...');
      
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
      
      // Generate both images in single browser session with component reuse
      let multiGenResult;
      try {
        multiGenResult = await imageGen.generateMultiple(
          characterFilePath,
          productFilePath,
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

      if (!multiGenResult || typeof multiGenResult !== 'object') {
        throw new Error('generateMultiple returned invalid result');
      }

      console.log(`📊 Results breakdown:`, {
        totalResults: multiGenResult?.results?.length || 0,
        successful: multiGenResult?.results?.filter(r => r.success)?.length || 0,
        failed: multiGenResult?.results?.filter(r => !r.success)?.length || 0
      });

      // Show which images failed for debugging
      if (multiGenResult?.results) {
        multiGenResult.results.forEach((result, idx) => {
          if (!result.success) {
            console.error(`   ❌ IMAGE ${idx + 1} (${result.type}): ${result.error}`);
          }
        });
      }

      // ✅ NEW: Retry logic for IMAGE 1 (wearing) if only IMAGE 2 (holding) succeeded
      if (!multiGenResult.success && multiGenResult?.results?.length === 2) {
        const wearingResult = multiGenResult.results[0];
        const holdingResult = multiGenResult.results[1];
        
        // If IMAGE 1 failed but IMAGE 2 succeeded, retry IMAGE 1 once
        if (!wearingResult.success && holdingResult.success) {
          console.log('\n🔄 RETRY: IMAGE 1 (wearing) failed but IMAGE 2 succeeded');
          console.log('📍 Attempting to regenerate IMAGE 1...\n');
          
          try {
            const retryResult = await imageGen.generateImage(wearingPrompt, {
              download: true,
              outputPath: outputDir
            });
            
            // Update the results with retry result
            wearingResult.success = true;
            wearingResult.downloadedFile = retryResult.path;
            wearingResult.href = retryResult.url;
            wearingResult.url = retryResult.url;
            
            console.log('✅ IMAGE 1 retry successful');
            multiGenResult.success = true;
          } catch (retryError) {
            console.error(`❌ IMAGE 1 retry failed: ${retryError.message}`);
            // Continue without retry - will fail below
          }
        }
      }

      if (!multiGenResult.success || !Array.isArray(multiGenResult.results) || multiGenResult.results.length < 2) {
        const errorMsg = multiGenResult.error || 'Multi-generation failed or did not produce enough results';
        console.error(`❌ Generation failed:`, errorMsg);
        throw new Error(errorMsg);
      }

      // Extract results
      const wearingResult = multiGenResult.results[0];
      const holdingResult = multiGenResult.results[1];

      if (!wearingResult.success) {
        throw new Error(`Wearing image generation failed: ${wearingResult.error}`);
      }
      if (!holdingResult.success) {
        throw new Error(`Holding image generation failed: ${holdingResult.error}`);
      }

      // Map to expected format (use actual fields from generateMultiple)
      wearingImageResult = {
        imageUrl: wearingResult.downloadedFile || wearingResult.href,  // Local file path or Google Flow URL
        screenshotPath: wearingResult.downloadedFile,  // Downloaded file path
        downloadedAt: new Date().toISOString(),
        href: wearingResult.href  // Google Flow URL for reference
      };
      
      holdingImageResult = {
        imageUrl: holdingResult.downloadedFile || holdingResult.href,
        screenshotPath: holdingResult.downloadedFile,
        downloadedAt: new Date().toISOString(),
        href: holdingResult.href  // Google Flow URL for reference
      };

      console.log(`✅ Wearing image generated: ${wearingResult?.downloadedFile?.substring(0, 80) || wearingResult?.href || 'N/A'}...`);
      console.log(`✅ Holding image generated: ${holdingResult?.downloadedFile?.substring(0, 80) || holdingResult?.href || 'N/A'}...`);
        
    } catch (imageGenError) {
      console.error('❌ Image generation failed:', imageGenError.message);
      throw new Error(`Image generation failed: ${imageGenError.message}`);
    }

    if (!wearingImageResult || (!wearingImageResult.imageUrl && !wearingImageResult.href)) {
      throw new Error(`Wearing image generation failed - no output (screenshotPath: ${wearingImageResult?.screenshotPath || 'none'})`);
    }
    if (!holdingImageResult || (!holdingImageResult.imageUrl && !holdingImageResult.href)) {
      throw new Error(`Holding image generation failed - no output (screenshotPath: ${holdingImageResult?.screenshotPath || 'none'})`);
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

    console.log(`\n✅ STEP 2 COMPLETE: Both images generated in ${step2Duration}s`);
    console.log(`  ├─ Change-clothes (wearing): ${wearingImageResult.screenshotPath}`);
    console.log(`  └─ Holding-product: ${holdingImageResult.screenshotPath}`);

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

    // Google Flow downloads images directly, so use the paths from the results
    let wearingImagePath = wearingImageResult?.screenshotPath;  // ✅ Fixed: use screenshotPath not path
    let holdingImagePath = holdingImageResult?.screenshotPath;  // ✅ Fixed: use screenshotPath not path

    console.log(`📁 Image paths from Google Flow:`);
    console.log(`   Wearing: ${wearingImagePath}`);
    console.log(`   Holding: ${holdingImagePath}`);
    console.log(`\n⚡ Uploading both images in parallel...`);

    // 🛑 BARRIER CHECKPOINT: Ensure STEP 2.5 completes before STEP 3
    try {
      // Upload generated images using OAuth (PARALLEL instead of sequential)
      if (driveService && wearingImagePath && holdingImagePath) {
        const uploadPromises = [];

        // UPLOAD wearing image (non-blocking internally, but collected in array)
        if (fs.existsSync(wearingImagePath)) {
          uploadPromises.push(
            driveService.uploadFile(
              wearingImagePath,
              `Generated-Wearing-${flowId}.jpg`,
              driveService.folderStructure?.outputs,
              { 
                flowId, 
                type: 'change-clothes',
                timestamp: new Date().toISOString()
              }
            ).then(result => {
              console.log(`  ✅ Wearing image uploaded to Drive`);
              console.log(`     File ID: ${result.id}`);
              return result;
            }).catch(error => {
              console.warn(`  ⚠️ Wearing image upload failed: ${error.message}`);
              return null;
            })
          );
        }

        // Upload holding image (non-blocking internally, but collected in array)
        if (fs.existsSync(holdingImagePath)) {
          uploadPromises.push(
            driveService.uploadFile(
              holdingImagePath,
              `Generated-Holding-${flowId}.jpg`,
              driveService.folderStructure?.outputs,
              { 
                flowId, 
                type: 'character-holding-product',
                timestamp: new Date().toISOString()
              }
            ).then(result => {
              console.log(`  ✅ Holding image uploaded to Drive`);
              console.log(`     File ID: ${result.id}`);
              return result;
            }).catch(error => {
              console.warn(`  ⚠️ Holding image upload failed: ${error.message}`);
              return null;
            })
          );
        }

        // 🔴 CRITICAL: WAIT for ALL uploads to complete before proceeding to STEP 3
        if (uploadPromises.length > 0) {
          console.log(`\n⏳ Waiting for ${uploadPromises.length} uploads to complete...`);
          const uploadResults = await Promise.all(uploadPromises);
          const successCount = uploadResults.filter(r => r).length;
          console.log(`✅ Step 2.5 Complete: ${successCount}/${uploadPromises.length} uploads successful`);
        }
      } else {
        console.log(`⚠️ Skipping uploads (Drive service: ${!!driveService}, Files exist: ${fs.existsSync(wearingImagePath) && fs.existsSync(holdingImagePath)})`);
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

    const deepAnalysis = await performDeepChatGPTAnalysis(
      analysis,
      {
        wearingImage: wearingImageResult.screenshotPath,  // 🔴 FIX: use screenshotPath not .url
        holdingImage: holdingImageResult.screenshotPath,  // 🔴 FIX: use screenshotPath not .url
        productImage: productFilePath
      },
      {
        videoDuration,
        voiceGender,
        voicePace,
        productFocus,
        language  // 💫 Add language to config
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

    // ============================================================
    // STEP 4: VIDEO GENERATION (Using GrokServiceV2 - Actual Video via /imagine)
    // 🎬 Generate actual 10-second video with 720p resolution
    // Dynamically select images based on deep analysis recommendations
    // ============================================================

    console.log('\n' + '─'.repeat(80));
    console.log('🎬 STEP 4: Video Generation (via Grok /imagine)');
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

      // ========== INITIALIZE GROK BROWSER SESSION ==========
      const videoGen = new GrokServiceV2({
        outputDir: tempDir,
        headless: false,
        debugMode: false
      });

      console.log(`\n📝 VIDEO GENERATION PARAMETERS:`);
      console.log(`  Duration: 10s`);
      console.log(`  Resolution: 720p`);
      console.log(`  Format: TikTok-friendly (9:16 aspect ratio)`);
      console.log(`  Using: GrokServiceV2 /imagine page for native video generation`);

      try {
        // STEP 4.0: Initialize browser
        console.log('\n🚀 Initializing Grok browser for video generation...');
        await videoGen.initialize();
        console.log('✅ Grok browser initialized');

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
            videoPrompt = VietnamesePromptBuilder.buildVideoGenerationPrompt(
              'complete-tiktok-video',
              productFocus,
              { 
                name: analysis.product?.garment_type, 
                details: analysis.product?.key_details,
                scriptContent: scriptContent
              }
            );
          } else {
            const scriptContent = videoScripts.map(s => `${s.segment}: ${s.script}`).join(' ');
            videoPrompt = buildComprehensiveVideoPrompt(
              scriptContent,
              analysis,
              {
                videoDuration: 10,
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
          console.log(`   Duration: 10 seconds`);
          console.log(`   Resolution: 720p (9:16 TikTok format)`);
          console.log(`   Primary image: ${imageRecommendations.preferHolding ? 'Character holding product' : 'Character wearing product'}`);

          videoGenerationResult = {
            success: true,
            videos: [{
              type: 'tiktok-video',
              path: videoResult.path,
              url: videoResult.url,
              duration: 10,
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
          console.log(`\n✅ Grok browser closed`);
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
        videoDuration: '10s'
      });
    } else {
      console.error(`\n❌ STEP 4 FAILED: ${videoGenerationResult?.error || 'Unknown error'}`);
      await logger.error(`Video generation failed`, 'video-generation-failed', {
        error: videoGenerationResult?.error,
        duration: step4Duration
      });
    }

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
      // 💫 CHECK: Wearing image - skip if already exists
      const wearingFilename = path.basename(wearingImageResult.screenshotPath);
      let wearingAssetExists = await checkExistingAsset(wearingFilename, 'generated-image');
      
      if (wearingAssetExists) {
        console.log(`\n⏭️  Wearing image already exists in DB (skipping asset creation)`);
        console.log(`   Existing Asset ID: ${wearingAssetExists.assetId}`);
        if (wearingAssetExists.assetId) {
          // Add to saved assets list even if skipped
          savedAssets.images.push(wearingAssetExists);
        }
      } else {
        console.log('\n📸 Saving wearing image to database...');
        const wearingAssetResult = await AssetManager.saveAsset({
          filename: wearingFilename,
          mimeType: 'image/jpeg',
          fileSize: fs.existsSync(wearingImagePath) ? fs.statSync(wearingImagePath).size : 0,
          assetType: 'image',
          assetCategory: 'generated-image',
          userId: req.body.userId || 'system',
          sessionId: flowId,
          storage: {
            location: 'google-drive',
            googleDriveId: wearingImageResult.id,
            googleDrivePath: 'Affiliate AI/Images/Completed',
            url: wearingImageResult.url
          },
          metadata: {
            format: 'jpeg',
            type: 'character-wearing-product',
            flowId
          },
          tags: ['generated', 'affiliate-video', 'wearing']
        }, { verbose: true });

        if (wearingAssetResult.success) {
          savedAssets.images.push(wearingAssetResult.asset);
        }
      }
    } catch (assetError) {
      console.warn(`   ⚠️  Failed to save wearing image: ${assetError.message}`);
    }

    // 5.2: Save holding image
    try {
      // 💫 CHECK: Holding image - skip if already exists
      const holdingFilename = path.basename(holdingImageResult.screenshotPath);
      let holdingAssetExists = await checkExistingAsset(holdingFilename, 'generated-image');
      
      if (holdingAssetExists) {
        console.log(`\n⏭️  Holding image already exists in DB (skipping asset creation)`);
        console.log(`   Existing Asset ID: ${holdingAssetExists.assetId}`);
        if (holdingAssetExists.assetId) {
          // Add to saved assets list even if skipped
          savedAssets.images.push(holdingAssetExists);
        }
      } else {
        console.log('\n📸 Saving holding image to database...');
        const holdingAssetResult = await AssetManager.saveAsset({
          filename: holdingFilename,
          mimeType: 'image/jpeg',
          fileSize: fs.existsSync(holdingImagePath) ? fs.statSync(holdingImagePath).size : 0,
          assetType: 'image',
          assetCategory: 'generated-image',
          userId: req.body.userId || 'system',
          sessionId: flowId,
          storage: {
            location: 'google-drive',
            googleDriveId: holdingImageResult.id,
            googleDrivePath: 'Affiliate AI/Images/Completed',
            url: holdingImageResult.url
          },
          metadata: {
            format: 'jpeg',
            type: 'character-holding-product',
            flowId
          },
          tags: ['generated', 'affiliate-video', 'holding']
        }, { verbose: true });

        if (holdingAssetResult.success) {
          savedAssets.images.push(holdingAssetResult.asset);
        }
      }
    } catch (assetError) {
      console.warn(`   ⚠️  Failed to save holding image: ${assetError.message}`);
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
              wearing: wearingImageResult?.path || 'N/A',
              holding: holdingImageResult?.path || 'N/A'
            }
          },
          step3: {
            status: 'completed',
            duration: `${step3Duration}s`,
            analysis: {
              videoScripts: deepAnalysis?.data?.videoScripts?.length || 0,
              voiceoverLength: deepAnalysis?.data?.voiceoverScript?.length || 0,
              hashtags: deepAnalysis?.data?.hashtags || []
            }
          },
          step4: {
            status: videoGenerationResult?.error && videoGenerationResult?.totalCount === 0 ? 'failed' : 'completed',
            duration: `${step4Duration}s`,
            totalVideos: videoGenerationResult?.totalCount || 0,
            error: videoGenerationResult?.error || null
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
    const { videoDuration, voiceGender, voicePace, productFocus, language = 'en' } = config;

    console.log('\n🧠 STEP 3: Deep ChatGPT Analysis for Video Segment Scripts');
    console.log(`   Images: wearing, holding, product`);
    console.log(`   Voice: ${voiceGender} (${voicePace} pace)`);
    console.log(`   Duration: ${videoDuration}s`);

    // Build detailed prompt for ChatGPT video analysis
    // 💫 Use Vietnamese prompts if language='vi'
    // Normalize language code: 'vi-VN' or 'vi_VN' → 'vi'
    const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
    let deepAnalysisPrompt;
    if (normalizedLanguage === 'vi') {
      deepAnalysisPrompt = VietnamesePromptBuilder.buildDeepAnalysisPrompt(
        productFocus,
        { videoDuration, voiceGender, voicePace }
      );
    } else {
      deepAnalysisPrompt = buildDeepAnalysisPrompt(
        analysis,
        {
          wearing: typeof wearingImage === 'string' ? wearingImage : wearingImage.screenshotPath,
          holding: typeof holdingImage === 'string' ? holdingImage : holdingImage.screenshotPath,
          product: productImage
        },
        { videoDuration, voiceGender, voicePace, productFocus }
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
  const segmentPattern = /\[(\w+)\]\s*\((\d+)s?\)\s*(?:\[IMAGES?:\s*([^\]]+)\])?\s*:?\s*([\s\S]*?)(?=\[(?:INTRO|WEARING|HOLDING|CTA|OUTRO)|$)/gi;
  
  let match;
  while ((match = segmentPattern.exec(text)) !== null) {
    const [, segmentName, duration, imagesStr, script] = match;
    
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
        duration: parseInt(duration) || 5,
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
  const { wearing, holding, product } = images;
  const { videoDuration, voiceGender, voicePace, productFocus } = config;

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

YOUR TASK:
Generate content for a TikTok video (9:16 format, ${videoDuration} seconds).

IMPORTANT: Format your response with these EXACT section markers for parsing:

🎬 VIDEO SEGMENTS:
Create ${Math.ceil(videoDuration / 5)} short video segments. For EACH segment, use this format:
[SEGMENT_NAME] (duration_in_seconds) [IMAGES: image1, image2, ...] :
Your narration text here (3-7 seconds of script)
- Reason: Why these images work for this segment

Example:
[INTRO] (3s) [IMAGES: wearing, product]:
Check out this amazing new look! Perfect for any occasion.
- Reason: Show product on body combined with standalone product shot

[WEARING] (5s) [IMAGES: wearing]:
See how perfectly it fits and looks.
- Reason: Focus on fit and styling

[HOLDING] (4s) [IMAGES: holding, product]:
The details are absolutely stunning. Premium quality clear.
- Reason: Close-up details of the product

[CTA] (3s) [IMAGES: product]:
Get yours now! Link in bio! Limited stock!
- Reason: Product-focused call-to-action

🎙️ VOICEOVER:
Write a cohesive ${voiceGender} narrator script:
- Pace: ${voicePace}
- Tone: Enthusiastic, relatable, trendy
- Length: ~30-40 seconds
- Include pain points and product benefits
- End with strong CTA

#️⃣ HASHTAGS:
List 8-10 trending hashtags (include at least 3 of: #Fashion #TikTok #Affiliate #MustHave #StyleFind)
Format: #Hashtag1 #Hashtag2 #Hashtag3 etc.

REQUIREMENTS:
- Fast-paced, engaging narration
- Focus on product benefits and style appeal
- Optimize for affiliate conversion while maintaining authenticity
- Each segment should flow naturally into the next
- Image composition should vary: some segments 1 image, some 2 images, strategically selected
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

