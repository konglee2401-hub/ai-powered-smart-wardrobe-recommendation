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
import GoogleFlowAutomationService from './googleFlowAutomationService.js';
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
          filename: `Character-${flowId}.jpg`,  // 🔴 FIX: Use filename not filePath
          assetType: 'image',
          assetCategory: 'character-image',
          mimeType: 'image/jpeg',
          fileSize: fs.statSync(characterFilePath).size,  // 🔴 FIX: Get file size
          userId: 'system',  // 🔴 FIX: Required by AssetManager
          sessionId: flowId,
          // 🔴 FIX: Add required storage object
          storage: {
            location: 'local',
            filePath: characterFilePath,
            ...(characterDriveUrl && {
              location: 'google-drive',
              googleDriveId: characterDriveUrl
            })
          },
          metadata: {
            source: 'user-uploaded',
            uploadedFor: 'character',
            timestamp: new Date().toISOString(),
          }
        });

        if (characterAssetResult?.assetId) {
          console.log(`  ✅ Character Asset created: ${characterAssetResult.assetId}`);
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
          filename: `Product-${flowId}.jpg`,  // 🔴 FIX: Use filename not filePath
          assetType: 'image',
          assetCategory: 'product-image',
          mimeType: 'image/jpeg',
          fileSize: fs.statSync(productFilePath).size,  // 🔴 FIX: Get file size
          userId: 'system',  // 🔴 FIX: Required by AssetManager
          sessionId: flowId,
          // 🔴 FIX: Add required storage object
          storage: {
            location: 'local',
            filePath: productFilePath,
            ...(productDriveUrl && {
              location: 'google-drive',
              googleDriveId: productDriveUrl
            })
          },
          metadata: {
            source: 'user-uploaded',
            uploadedFor: 'product',
            timestamp: new Date().toISOString(),
          }
        });

        if (productAssetResult?.assetId) {
          console.log(`  ✅ Product Asset created: ${productAssetResult.assetId}`);
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
      scene: options.scene || analysis?.recommendations?.scene?.choice || 'studio',
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
      'en'  // Force English for consistency
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
      'en'  // Force English for consistency
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
      console.log(`  Change-clothes prompt: ${wearingPromptData?.prompt?.substring(0, 80) || 'N/A'}...`);
      console.log(`  Holding-product prompt: ${holdingPromptData?.prompt?.substring(0, 80) || 'N/A'}...`);
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

    let wearingImageResult = null;
    let holdingImageResult = null;
    
    try {
      // ✅ OPTIMIZED: Use GoogleFlowAutomationService for efficient component reuse
      const imageGen = new GoogleFlowAutomationService({
        type: 'image',
        projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',  // ✅ CORRECT PROJECT ID
        imageCount: 1,  // TikTok affiliate: Generate 1 image per prompt (x1) - We generate 2 different prompts
        headless: false
      });
      
      console.log('🚀 Initializing image generation service...');
      
      // Validate prompts before passing to generateMultiple
      const wearingPrompt = wearingPromptData?.prompt || '';
      const holdingPrompt = holdingPromptData?.prompt || '';
      
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

      // Map to expected format
      wearingImageResult = {
        imageUrl: wearingResult.imageUrl,
        screenshotPath: wearingResult.screenshotPath,
        downloadedAt: wearingResult.downloadedAt
      };
      
      holdingImageResult = {
        imageUrl: holdingResult.imageUrl,
        screenshotPath: holdingResult.screenshotPath,
        downloadedAt: holdingResult.downloadedAt
      };

      console.log(`✅ Wearing image generated: ${wearingResult?.imageUrl?.substring(0, 80) || 'N/A'}...`);
      console.log(`✅ Holding image generated: ${holdingResult?.imageUrl?.substring(0, 80) || 'N/A'}...`);
        
    } catch (imageGenError) {
      console.error('❌ Image generation failed:', imageGenError.message);
      throw new Error(`Image generation failed: ${imageGenError.message}`);
    }

    if (!wearingImageResult || !wearingImageResult.imageUrl) {
      throw new Error('Wearing image generation failed - no output URL');
    }
    if (!holdingImageResult || !holdingImageResult.imageUrl) {
      throw new Error('Holding image generation failed - no output URL');
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
        wearingImage: wearingImageResult.url,
        holdingImage: holdingImageResult.url,
        productImage: productFilePath
      },
      {
        videoDuration,
        voiceGender,
        voicePace,
        productFocus
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
        console.log(`   💡 OPTIMIZED MODE: Will generate ${videoSegments.length} videos in single browser session`);
        console.log(`   Segments: ${videoSegments.map(s => s.segment).join(', ')}`);
      } else {
        console.log(`   📹 STANDARD MODE: Generating single video`);
      }

      // ========== INITIALIZE SINGLE BROWSER SESSION ==========
      const videoGen = new GoogleFlowAutomationService({
        type: 'video',
        projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',  // ✅ CORRECT PROJECT ID
        headless: false,
        outputDir: tempDir,
        timeouts: {
          pageLoad: 30000,
          generation: Math.max(180000, (videoDuration + 60) * 1000)
        }
      });

      console.log(`\n📝 VIDEO GENERATION PARAMETERS:`);
      console.log(`  Reference image: wearing`);
      console.log(`  Duration: ${videoDuration}s`);
      console.log(`  Aspect ratio: 9:16 (TikTok)`);
      console.log(`  Quality: high`);
      console.log(`  Multiple segments: ${videoSegments.length}`);

      try {
        // Initialize browser ONCE for all segments
        console.log('\n🚀 Initializing video generation browser (reusable session)...');
        await videoGen.init();
        console.log('✅ Browser initialized');

        await videoGen.navigateToProject();
        console.log('✅ Navigated to Google Flow project');

        // Upload wearing image reference ONCE for all segments
        if (fs.existsSync(wearingImageResult.screenshotPath)) {
          console.log('\n📸 Uploading image reference (will be reused for all segments)...');
          await videoGen.uploadImage(wearingImageResult.screenshotPath);
          console.log('✅ Reference image uploaded');
        }

        // Switch to video tab ONCE
        console.log('\n📹 Switching to video generation mode...');
        await videoGen.switchToVideoTab();
        console.log('✅ Video tab active');

        await videoGen.selectVideoFromComponents();
        console.log('✅ Selected "Tạo video từ các thành phần" mode');

        // Verify video interface ONCE
        await videoGen.verifyVideoInterface();
        console.log('✅ Veo model verified');

        // ========== GENERATE VIDEOS FOR EACH SEGMENT ==========
        if (hasMultipleSegments) {
          console.log(`\n${'═'.repeat(70)}`);
          console.log(`🎯 MULTI-SEGMENT VIDEO GENERATION (${videoSegments.length} videos)`);
          console.log(`${'═'.repeat(70)}`);
          
          // 🔴 CRITICAL: Verify image is still selected before generation
          console.log(`\n✅ PRE-FLIGHT CHECKS:`);
          const imageStillSelected = await videoGen.verifyImageSelected();
          if (!imageStillSelected) {
            console.warn(`⚠️  WARNING: Image selection lost! Attempting to reselect...`);
            await videoGen.selectReferencePath(referenceImagePath);
            console.log(`   Reselection complete`);
          } else {
            console.log(`   ✅ Reference image still selected`);
          }

          for (let segIdx = 0; segIdx < videoSegments.length; segIdx++) {
            const segment = videoSegments[segIdx];
            const isFirstSegment = segIdx === 0;

            console.log(`\n📍 SEGMENT ${segIdx + 1}/${videoSegments.length}: ${segment.segment.toUpperCase()}`);
            console.log(`   Duration: ${segment.duration}s`);
            console.log(`   Image: ${segment.image}`);

            try {
              // Build prompt for this specific segment
              // 💫 Use Vietnamese prompts if language='vi'
              // Normalize language code: 'vi-VN' or 'vi_VN' → 'vi'
              const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
              let segmentPrompt;
              if (normalizedLanguage === 'vi') {
                segmentPrompt = VietnamesePromptBuilder.buildVideoGenerationPrompt(
                  segment.segment,
                  productFocus,
                  { name: analysis.product?.garment_type, details: analysis.product?.key_details }
                );
              } else {
                segmentPrompt = buildSegmentVideoPrompt(segment, analysis, {
                  videoDuration: segment.duration,
                  voiceGender,
                  voicePace,
                  productFocus
                });
              }

              console.log(`   Script length: ${segment.script.length} chars`);
              console.log(`   Prompt length: ${segmentPrompt.length} chars`);

              if (isFirstSegment) {
                // FIRST segment: Normal flow (images already uploaded)
                console.log(`   → FIRST SEGMENT: Using normal generation flow`);

                await videoGen.enterPrompt(segmentPrompt);
                console.log(`   ✓ Prompt entered`);

                await videoGen.waitForSendButtonEnabled();
                console.log(`   ✓ Send button enabled`);

                await videoGen.checkSendButton();
                console.log(`   ✓ Send button verified`);

                await videoGen.submit();
                console.log(`   ✓ Generation submitted`);

              } else {
                // SUBSEQUENT segments: Reuse button flow (no re-upload)
                console.log(`   → SEGMENT ${segIdx + 1}: Using REUSE optimization (no image re-upload)`);

                const segmentVideo = await videoGen.generateSegmentVideo(segmentPrompt);
                if (segmentVideo) {
                  allGeneratedVideos.push({
                    segment: segment.segment,
                    path: segmentVideo,
                    duration: segment.duration
                  });
                  console.log(`   ✅ Video generated: ${path.basename(segmentVideo)}`);
                  continue; // Skip to next segment
                } else {
                  console.warn(`   ⚠️  Segment video generation failed`);
                }
              }

              // Monitor generation for FIRST segment only (subsequent handled in generateSegmentVideo)
              if (isFirstSegment) {
                const maxWaitTime = Math.max(180000, (segment.duration + 60) * 1000);
                console.log(`   ⏳ Monitoring generation (timeout: ${(maxWaitTime / 1000).toFixed(0)}s)...`);
                const renderComplete = await videoGen.monitorGeneration();

                if (!renderComplete) {
                  console.warn(`   ⚠️  Generation timeout`);
                  throw new Error(`Segment ${segment.segment} generation timeout`);
                }
                console.log(`   ✓ Generation completed`);

                // Download video
                console.log(`   📥 Downloading video...`);
                const videoPath = await videoGen.downloadVideo();

                if (videoPath) {
                  allGeneratedVideos.push({
                    segment: segment.segment,
                    path: videoPath,
                    duration: segment.duration,
                    size: fs.statSync(videoPath).size
                  });
                  console.log(`   ✅ Video downloaded (${(allGeneratedVideos[0].size / 1024 / 1024).toFixed(2)}MB)`);
                } else {
                  console.warn(`   ⚠️  Video download returned no path`);
                }
              }

            } catch (segmentError) {
              console.error(`   ❌ Segment ${segIdx + 1} failed: ${segmentError.message}`);
              if (isFirstSegment) {
                throw segmentError; // Fail early if first segment fails
              }
              // Continue to next segment if not first
            }
          }

        } else {
          // SINGLE SEGMENT: Normal flow
          console.log(`\n📹 Generating single video from integrated prompt...`);

          // 💫 Use Vietnamese prompts if language='vi'
          // Normalize language code: 'vi-VN' or 'vi_VN' → 'vi'
          const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
          let videoPrompt;
          if (normalizedLanguage === 'vi') {
            videoPrompt = VietnamesePromptBuilder.buildVideoGenerationPrompt(
              'Hook',
              productFocus,
              { name: analysis.product?.garment_type, details: analysis.product?.key_details }
            );
          } else {
            videoPrompt = buildVideoPromptFromAnalysis(
              deepAnalysis.data,
              analysis,
              { videoDuration, voiceGender, voicePace, productFocus }
            );
          }

          console.log(`✅ Video prompt generated (${videoPrompt.length} chars)`);

          // Enter prompt
          console.log('\n📝 Entering video prompt...');
          await videoGen.enterPrompt(videoPrompt);
          console.log('✅ Prompt entered');

          // Wait for send button to be enabled
          console.log('\n⏳ Waiting for send button to enable...');
          await videoGen.waitForSendButtonEnabled();
          console.log('✅ Send button enabled');

          // Check send button
          console.log('\n✔️  Checking send button...');
          await videoGen.checkSendButton();
          console.log('✅ Send button verified');

          // Submit video generation
          console.log('\n⏳ Submitting video generation request...');
          await videoGen.submit();
          console.log('✅ Generation submitted');

          // Monitor generation
          const maxWaitTime = Math.max(180000, (videoDuration + 60) * 1000);
          console.log(`\n⏳ Monitoring generation (timeout: ${(maxWaitTime / 1000).toFixed(0)}s)...`);
          const renderComplete = await videoGen.monitorGeneration();

          if (!renderComplete) {
            throw new Error('Video generation timeout');
          }
          console.log('✅ Generation completed');

          // Download video
          console.log('\n📥 Downloading generated video...');
          const videoPath = await videoGen.downloadVideo();

          if (videoPath) {
            const videoSize = fs.statSync(videoPath).size;
            allGeneratedVideos.push({
              segment: 'combined',
              path: videoPath,
              duration: videoDuration,
              size: videoSize
            });
            console.log(`✅ Video downloaded (${(videoSize / 1024 / 1024).toFixed(2)}MB)`);
          }
        }

        // Store result
        videoGenerationResult = {
          videos: allGeneratedVideos,
          totalCount: allGeneratedVideos.length,
          status: allGeneratedVideos.length > 0 ? 'success' : 'no-videos'
        };

      } finally {
        // Always close browser (single close for all segments)
        try {
          await videoGen.close();
          console.log(`✅ Browser closed after all video generations`);
        } catch (closeError) {
          console.warn('⚠️  Warning closing browser:', closeError.message);
        }
      }

    } catch (videoError) {
      console.error('❌ Video generation failed:', videoError.message);
      console.warn('⚠️  Continuing with partial results...');
      videoGenerationResult = {
        videos: allGeneratedVideos,
        totalCount: allGeneratedVideos.length,
        error: videoError.message,
        status: 'partial-failure'
      };
    }

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
      await logger.storeArtifacts({
        characterImagePath: characterFilePath,
        productImagePath: productFilePath,
        generatedImagePaths: images,
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
    const { videoDuration, voiceGender, voicePace, productFocus } = config;

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
      console.log(`\n📝 Using VIETNAMESE deep analysis prompt`);
      deepAnalysisPrompt = VietnamesePromptBuilder.buildDeepAnalysisPrompt(
        productFocus,
        { videoDuration, voiceGender, voicePace }
      );
    } else {
      console.log(`\n📝 Using ENGLISH deep analysis prompt`);
      deepAnalysisPrompt = buildDeepAnalysisPrompt(
        analysis,
        {
          wearing: typeof wearingImage === 'string' ? wearingImage : wearingImage.url,
          holding: typeof holdingImage === 'string' ? holdingImage : holdingImage.url,
          product: productImage
        },
        { videoDuration, voiceGender, voicePace, productFocus }
      );
    }

    // 💫 NEW: Log the prompt being sent to ChatGPT
    console.log(`\n📤 CHATGPT PROMPT BEING SENT:`);
    console.log(`${'─'.repeat(80)}`);
    console.log(deepAnalysisPrompt);
    console.log(`${'─'.repeat(80)}\n`);

    // 🔴 CRITICAL: Initialize BEFORE content that might error
    console.log(`   🚀 Initializing ChatGPT Browser Automation...`);
    chatGPTService = new ChatGPTService({ headless: true });
    await chatGPTService.initialize();
    
    // Analyze all 3 images for video script generation
    console.log(`   📸 Analyzing images for video segment scripts...`);
    
    // Get file paths for images
    let wearingPath = wearingImage;
    let holdingPath = holdingImage;
    let productPath = productImage;

    // Convert URLs to local paths if needed
    if (typeof wearingImage === 'string' && wearingImage.startsWith('http')) {
      wearingPath = wearingImage;
    }
    if (typeof holdingImage === 'string' && holdingImage.startsWith('http')) {
      holdingPath = holdingImage;
    }
    if (typeof productImage === 'string' && productImage.startsWith('http')) {
      productPath = productImage;
    }

    // Call ChatGPT for video script generation
    const rawChatGPTResponse = await chatGPTService.analyzeMultipleImages(
      [wearingPath, holdingPath, productPath],
      deepAnalysisPrompt
    );

    // 💫 NEW: Log the raw response received from ChatGPT
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
        image: 'wearing'
      },
      {
        segment: 'wearing',
        duration: segmentDurations.wearing,
        script: `See how flawlessly it looks when worn – perfect fit, amazing style, incredibly comfortable. This ${productType} is a must-have!`,
        image: 'wearing'
      },
      {
        segment: 'holding',
        duration: segmentDurations.holding,
        script: `Check out the exquisite details – the quality is insane! Made with premium ${productMaterial}, designed for durability and elegance.`,
        image: 'holding'
      },
      {
        segment: 'cta',
        duration: segmentDurations.cta,
        script: `Don't miss out! Get yours now and elevate your wardrobe instantly. Limited stock available. Link in bio for exclusive deals! #Must-have`,
        image: 'product'
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
  
  // Try to find segment markers like [INTRO], [WEARING], [HOLDING], [CTA]
  const segmentPattern = /\[?(\w+)\]?\s*\((\d+)s?\)?\s*:?\s*([\s\S]*?)(?=\[?(?:INTRO|WEARING|HOLDING|CTA|OUTRO)|$)/gi;
  
  let match;
  while ((match = segmentPattern.exec(text)) !== null) {
    const [, segmentName, duration, script] = match;
    
    if (script && script.trim().length > 0) {
      segments.push({
        segment: segmentName.toLowerCase(),
        duration: parseInt(duration) || 5,
        script: script.trim(),
        image: getImageForSegment(segmentName)
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
      segments.push({
        segment: ['intro', 'wearing', 'holding', 'cta'][idx] || 'segment',
        duration: 5,
        script: line.replace(/^[^:]+:\s*/, '').trim(),
        image: ['wearing', 'wearing', 'holding', 'product'][idx] || 'wearing'
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
1. Wearing Image: Character styled wearing the product
2. Holding Image: Character holding/presenting the product
3. Product Image: Original product reference

YOUR TASK:
Generate content for a TikTok video (9:16 format, ${videoDuration} seconds).

IMPORTANT: Format your response with these EXACT section markers for parsing:

🎬 VIDEO SEGMENTS:
Create ${Math.ceil(videoDuration / 5)} short video segments. For EACH segment, use this format:
[SEGMENT_NAME] (duration_in_seconds):
Your narration text here (3-7 seconds of script)

Example:
[INTRO] (3s):
Check out this amazing new look!

[WEARING] (5s):
See how perfectly it fits and looks.

[HOLDING] (4s):
The details are absolutely stunning.

[CTA] (3s):
Get yours now! Link in bio!

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
    
    prompt += `. Setting: ${recommendations.scene || 'studio'}. Lighting: ${recommendations.lighting || 'professional'}. Mood: ${recommendations.mood || 'confident'}. High quality, professional photography.`;
    
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
    
    prompt += `. Close-up focus on the product to show details and quality. Setting: ${recommendations.scene || 'studio'}. Lighting: ${recommendations.lighting || 'professional'}. Mood: ${recommendations.mood || 'confident'}. High quality, professional photography.`;
    
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

