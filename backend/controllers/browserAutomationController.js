import GrokServiceV2 from '../services/browser/grokServiceV2.js';
import ZAIChatService from '../services/browser/zaiChatService.js';
import ZAIImageService from '../services/browser/zaiImageService.js';
import GoogleFlowService from '../services/browser/googleFlowService.js';
import VideoGeneration from '../models/VideoGeneration.js';
import uploadToImgBB from '../services/uploaders/imgbbUploader.js'; // 💫 NEW
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Build comprehensive analysis prompt with all VTO style options
 * Based on the test script prompt but expanded with all StyleCustomizer options
 */
function buildAnalysisPrompt(options = {}) {
  const {
    scene = 'studio',
    lighting = 'soft-diffused',
    mood = 'confident',
    style = 'minimalist',
    colorPalette = 'neutral',
    hairstyle = null,
    makeup = null,
    cameraAngle = 'eye-level',
    aspectRatio = '1:1',
    customPrompt = ''
  } = options;

  // Map option values to descriptive text
  const sceneMap = {
    'studio': 'Professional Studio',
    'white-background': 'White Background',
    'urban-street': 'Urban Street',
    'minimalist-indoor': 'Minimalist Indoor',
    'cafe': 'Cafe',
    'outdoor-park': 'Outdoor Park',
    'office': 'Modern Office',
    'luxury-interior': 'Luxury Interior',
    'rooftop': 'Rooftop'
  };

  const lightingMap = {
    'soft-diffused': 'Soft Diffused Lighting',
    'natural-window': 'Natural Window Light',
    'golden-hour': 'Golden Hour Lighting',
    'dramatic-rembrandt': 'Dramatic Rembrandt Lighting',
    'high-key': 'High Key Bright Lighting',
    'backlit': 'Backlit Effect',
    'neon-colored': 'Neon/Colored Lighting',
    'overcast-outdoor': 'Overcast Outdoor Light'
  };

  const moodMap = {
    'confident': 'Confident & Powerful',
    'relaxed': 'Relaxed & Casual',
    'elegant': 'Elegant & Sophisticated',
    'energetic': 'Energetic & Dynamic',
    'playful': 'Playful & Fun',
    'mysterious': 'Mysterious & Edgy',
    'romantic': 'Romantic & Dreamy',
    'professional': 'Professional'
  };

  const styleMap = {
    'minimalist': 'Minimalist Photography',
    'editorial': 'Editorial Style',
    'commercial': 'Commercial Photography',
    'lifestyle': 'Lifestyle Photography',
    'high-fashion': 'High Fashion Style',
    'vintage': 'Vintage/Retro Style',
    'street': 'Street Style',
    'bohemian': 'Bohemian Style'
  };

  const colorPaletteMap = {
    'neutral': 'Neutral Colors',
    'warm': 'Warm Tones',
    'cool': 'Cool Tones',
    'pastel': 'Pastel Colors',
    'monochrome': 'Monochrome',
    'vibrant': 'Vibrant Colors',
    'earth-tones': 'Earth Tones',
    'metallic': 'Metallic'
  };

  const cameraAngleMap = {
    'eye-level': 'Eye Level Camera',
    'slight-angle': 'Slight Angle',
    'three-quarter': 'Three-Quarter View',
    'full-front': 'Full Front View',
    'over-shoulder': 'Over Shoulder View'
  };

  // Build prompt with style customization
  const promptText = `⛔ CRITICAL: DO NOT REPEAT OR ECHO BACK THIS PROMPT. Begin your response directly with *** CHARACTER PROFILE START *** and proceed with the analysis sections.

You are a professional fashion analyst for a Virtual Try-On system. Analyze these two images in STRUCTURED FORMAT exactly as specified below.

=== IMAGE 1: CHARACTER/PERSON ===
First analyze the character/person in detail:
- Gender and estimated age
- Ethnicity and distinctive features
- Body type classification (slim, athletic, curvy, petite, tall, etc.)
- Skin tone (exact description)
- Hair: color, texture, length, current style name
- Face shape and proportions

STYLE CUSTOMIZATION (User Selected):
- Scene: ${sceneMap[scene] || scene}
- Lighting: ${lightingMap[lighting] || lighting}
- Mood: ${moodMap[mood] || mood}
- Photography Style: ${styleMap[style] || style}
- Color Palette: ${colorPaletteMap[colorPalette] || colorPalette}
- Camera Angle: ${cameraAngleMap[cameraAngle] || cameraAngle}
- Current outfit or clothing visible
- Posture and natural pose

Provide this EXACTLY in this format:

*** CHARACTER PROFILE START ***
Gender: [gender]
Age Range: [e.g., 20-25 years]
Body Type: [one specific type]
Skin Tone: [one specific tone]
Hair Length: [short/medium/long]
Hair Color: [specific color]
Hair Texture: [straight/wavy/curly/etc]
Hair Style: [name of current style]
Face Shape: [oval/square/round/heart/etc]
Current Outfit: [description or "None visible"]
*** CHARACTER PROFILE END ***

=== IMAGE 2: PRODUCT/CLOTHING ===
Now analyze the clothing product in detail:
- Specific garment type
- Style category
- Exact colors
- Pattern or texture
- Fabric appearance
- Fit type
- Key design details

Provide this EXACTLY in this format:

*** PRODUCT DETAILS START ***
Garment Type: [specific type]
Style Category: [one category]
Primary Color: [exact color]
Secondary Color: [if any, or "None"]
Pattern: [solid, striped, floral, etc.]
Fabric Type: [apparent fabric]
Fit Type: [one fit type]
Key Details: [list 2-3 main design details]
*** PRODUCT DETAILS END ***

=== COMPATIBILITY & DETAILED ANALYSIS ===
Analyze fit, compatibility, and styling for each element:

*** ANALYSIS START ***

**Compatibility Score:** [1-10]

**Character-Product Fit:**
- Does this product fit this character's body type?
- Color harmony with skin tone?

**Scene Styling (${sceneMap[scene] || scene}):**
How should this product be styled in this scene? Poses, angles, props?

**Lighting (${lightingMap[lighting] || lighting}):**
How does product color/fabric look under this lighting? Adjustments needed?

**Mood (${moodMap[mood] || mood}):**
Does product convey this mood? What styling choices reinforce it?

**Color Palette (${options.colorPalette}):**
How does product fit the palette? What complementary colors work?

**Camera Angle (${options.cameraAngle}):**
Best angle to showcase this product?

*** ANALYSIS END ***

=== RECOMMENDATIONS ===
Provide recommendations in EXACTLY this format. For EACH category, provide:
1. PRIMARY_CHOICE - your top recommendation
2. PRIMARY_REASON - 2-3 sentences explaining why
3. TOP_3_ALTERNATIVES - top 3 alternative options ranked by suitability

Format:

*** RECOMMENDATIONS START ***

SCENE_CHOICE: [ONE from: studio, white-background, urban-street, minimalist-indoor, cafe, outdoor-park, office, luxury-interior, rooftop]
SCENE_REASON: [2-3 sentences why this is best]
SCENE_ALTERNATIVES: [list top 3 alternatives in order like: urban-street, office, luxury-interior]

LIGHTING_CHOICE: [ONE from: soft-diffused, natural-window, golden-hour, dramatic-rembrandt, high-key, backlit, neon-colored, overcast-outdoor]
LIGHTING_REASON: [2-3 sentences why]
LIGHTING_ALTERNATIVES: [top 3 alternatives]

MOOD_CHOICE: [ONE from: confident, relaxed, elegant, energetic, playful, mysterious, romantic, professional]
MOOD_REASON: [2-3 sentences why]
MOOD_ALTERNATIVES: [top 3 alternatives]

CAMERA_ANGLE: [ONE from: eye-level, slight-angle, three-quarter, full-front, over-shoulder]
ANGLE_REASON: [2 sentences why]
ANGLE_ALTERNATIVES: [top 3 alternatives]

HAIRSTYLE: [specific style like: long-straight, medium-wavy, short-bob, half-up, ponytail, bun, braids, curled - OR "keep-current"]
HAIRSTYLE_REASON: [why this works]
HAIRSTYLE_ALTERNATIVES: [top 3 alternatives]

MAKEUP: [ONE from: natural, light-makeup, glowing-skin, bold-lips, smokey-eyes, dramatic, minimalist, keep-current]
MAKEUP_REASON: [why this completes look]
MAKEUP_ALTERNATIVES: [top 3 alternatives]

BOTTOMS: [suggestion - be VERY SPECIFIC with hyphenated names like: skinny-jeans, wide-leg-jeans, midi-skirt, cargo-pants, pleated-skirt, leather-leggings - OR "not-applicable"]
BOTTOMS_REASON: [why these work]
BOTTOMS_ALTERNATIVES: [top 3 alternatives]

SHOES: [suggestion - be SPECIFIC like: block-heels, combat-boots, white-sneakers, ballet-flats, loafer-flats, nude-pumps - OR "not-applicable"]
SHOES_REASON: [why works]
SHOES_ALTERNATIVES: [top 3 alternatives]

ACCESSORIES: [list as: item1, item2, item3 with specificity - examples: gold-necklace, chunky-earrings, crossbody-bag, cat-eye-sunglasses - OR "minimal" OR "none"]
ACCESSORIES_REASON: [how these complete styling]
ACCESSORIES_ALTERNATIVES: [3 alternative accessory combinations]

OUTERWEAR: [specific like: oversized-blazer, denim-jacket, leather-jacket, wool-coat, cardigan - OR "not-needed"]
OUTERWEAR_REASON: [why or why not needed]
OUTERWEAR_ALTERNATIVES: [top 3 alternatives]

*** RECOMMENDATIONS END ***

⛔ CRITICAL REMINDER: Your response should ONLY contain the structured analysis sections (CHARACTER PROFILE, PRODUCT DETAILS, ANALYSIS, RECOMMENDATIONS). Do NOT include this instruction or the prompt text in your response.`;

  return promptText;
}


/**
 * Build generation prompt from analysis and options
 */
function buildGenerationPrompt(analysisText, options = {}) {
  const {
    scene = 'studio',
    lighting = 'soft-diffused',
    mood = 'confident',
    style = 'minimalist',
    colorPalette = 'neutral',
    cameraAngle = 'eye-level',
    aspectRatio = '1:1',
    imageCount = 1,
    negativePrompt = '',
    characterDescription = ''
  } = options;

  // 💫 NEW: Refined mappings for better AI understanding
  const aspectRatioMap = {
    '1:1': 'square (1:1)',
    '4:3': 'landscape (4:3)',
    '3:4': 'portrait (3:4)',
    '16:9': 'wide (16:9)',
    '9:16': 'vertical (9:16)'
  };

  const sceneMap = {
    'studio': 'professional studio with white background',
    'white-background': 'clean white background',
    'urban-street': 'urban street environment',
    'minimalist-indoor': 'minimalist interior',
    'cafe': 'cafe setting',
    'outdoor-park': 'outdoor park with greenery',
    'office': 'modern office',
    'luxury-interior': 'luxury interior',
    'rooftop': 'rooftop with city view'
  };

  const lightingMap = {
    'soft-diffused': 'soft diffused lighting',
    'natural-window': 'natural window light',
    'golden-hour': 'golden hour sunlight',
    'dramatic-rembrandt': 'dramatic Rembrandt lighting',
    'high-key': 'high-key bright lighting',
    'backlit': 'backlit with rim light',
    'neon-colored': 'colored ambient neon lighting',
    'overcast-outdoor': 'soft overcast outdoor light'
  };

  // 💫 CRITICAL: Use /imagine command structure for clarity
  // Structure: Context + Character + Clothing + Environment + Quality + Avoid
  const characterPart = characterDescription 
    ? `Character: ${characterDescription}, same body proportions, exact pose`
    : `Character: same face and features, same body type, same skin tone, same hair color and style, exact pose`;

  const clothingPart = `Clothing: exact outfit from reference image with matching color, pattern, material, and fit`;

  const environmentPart = `Setting: ${sceneMap[scene] || scene}, ${lightingMap[lighting] || lighting}, mood: ${mood}`;

  const photographyPart = `Photography: ${style} style, ${cameraAngle} camera, ${aspectRatioMap[aspectRatio] || aspectRatio} aspect ratio`;

  const qualityPart = `Quality: 8K, ultra-detailed, sharp focus, photorealistic, natural colors with ${colorPalette} tones, magazine quality`;

  const avoidPart = `NOT: ${negativePrompt || 'blurry, distorted face, wrong features, multiple people, ill-fitting clothes, bad lighting, watermark'}`;

  const countPart = imageCount > 1 
    ? `Generate ${imageCount} different variations with varied camera angles and poses.`
    : '';

  // 💫 NEW: Clean, structured prompt without redundant "Generate an image:"
  // Grok will add /imagine prefix, so we provide clean content
  return `Virtual try-on: Keep the person from image 1 exactly the same. Dress them in the clothing from image 2.

${characterPart}
${clothingPart}
${environmentPart}
${photographyPart}
${qualityPart}
${avoidPart}
${countPart}`;
}

/**
 * Build AI-optimized prompt from analysis text
 */
function buildAIPrompt(basePrompt, analysisText, negativePrompt) {
  console.log(`\n📝 Building optimized AI prompt...`);
  
  let enhancedPrompt = basePrompt;
  
  // Add analysis context
  if (analysisText) {
    enhancedPrompt += `. Based on: ${analysisText.substring(0, 200)}`;
  }

  // Add style recommendations
  if (analysisText?.toLowerCase().includes('elegant') || analysisText?.toLowerCase().includes('formal')) {
    enhancedPrompt += ', elegant formal styling, sophisticated aesthetic';
  }
  if (analysisText?.toLowerCase().includes('casual') || analysisText?.toLowerCase().includes('comfortable')) {
    enhancedPrompt += ', casual comfortable style, relaxed fit';
  }

  // Add quality parameters
  enhancedPrompt += ', professional photography, high quality, 8k, detailed, well-lit';
  
  // Add negative prompt
  if (negativePrompt) {
    enhancedPrompt += `. Avoid: ${negativePrompt}`;
  } else {
    enhancedPrompt += '. Avoid: blurry, low quality, watermark, distorted, artifacts';
  }

  console.log(`✅ Prompt built: ${enhancedPrompt.substring(0, 120)}...`);
  return enhancedPrompt;
}

/**
 * 💫 NEW: Extract detailed character description from analysis text
 * Used for more accurate virtual try-on generation
 */
function extractCharacterDescription(analysisText) {
  if (!analysisText || typeof analysisText !== 'string') {
    return '';
  }

  try {
    // Extract CHARACTER PROFILE section
    const profileMatch = analysisText.match(/\*\*\* CHARACTER PROFILE START \*\*\*([\s\S]*?)\*\*\* CHARACTER PROFILE END \*\*\*/);
    if (!profileMatch) {
      return '';
    }

    const profileText = profileMatch[1];
    const lines = profileText.trim().split('\n');
    const details = {};

    // Parse profile lines
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        details[key.trim().toLowerCase()] = valueParts.join(':').trim();
      }
    });

    // 💫 Build natural language character description
    const description = [
      details['gender'] && `${details['gender']}`,
      details['age range'] && `age ${details['age range']}`,
      details['ethnicity'] && `${details['ethnicity']}`,
      details['body type'] && `${details['body type']} build`,
      details['skin tone'] && `${details['skin tone']} skin`,
      details['hair length'] && details['hair color'] ? `${details['hair length']} ${details['hair color']} hair` : null,
      details['face shape'] && `${details['face shape']} face shape`,
      details['distinctive features'] && `${details['distinctive features']}`
    ]
      .filter(Boolean)
      .join(', ')
      .trim();

    console.log(`💫 Extracted character description: ${description.substring(0, 100)}...`);
    return description;
  } catch (error) {
    console.warn(`⚠️  Failed to extract character description: ${error.message}`);
    return '';
  }
}

/**
 * Validate generated image file
 */
async function validateImage(filePath) {
  console.log(`\n🔍 Validating image...`);
  
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('Image file does not exist');
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('Image file is empty');
    }
    if (stats.size < 1000) {
      throw new Error('Image file too small (possibly corrupted)');
    }

    // Check magic bytes for PNG
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    const pngMagic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!buffer.equals(pngMagic)) {
      console.warn('⚠️  PNG magic bytes not found, file may not be valid PNG');
    }

    console.log(`✅ Image validated: ${stats.size} bytes`);
    return true;
  } catch (error) {
    console.error(`❌ Image validation failed:`, error.message);
    throw error;
  }
}

/**
 * 💫 NEW: Handle image storage (local or cloud with imgbb)
 */
async function handleImageStorage(imagePath, storageConfig = {}) {
  const {
    storageType = 'cloud', // 'local' or 'cloud'
    localFolder = path.join(process.cwd(), 'generated-images'),
    cloudProvider = 'imgbb'
  } = storageConfig;

  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error('Image file not found');
    }

    const fileStats = fs.statSync(imagePath);
    if (fileStats.size === 0) {
      throw new Error('Image file is empty');
    }

    const result = {
      storageType,
      fileSize: fileStats.size,
      filename: path.basename(imagePath)
    };

    if (storageType === 'cloud') {
      // 💫 Upload to imgbb with folder structure by date
      console.log(`\n☁️  Uploading to ${cloudProvider}...`);
      
      const now = new Date();
      const folderName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const imageName = `${folderName}_${Date.now()}.png`;
      
      try {
        const uploadResult = await uploadToImgBB(imagePath, {
          name: imageName
        });
        
        result.cloudUrl = uploadResult.url;
        result.displayUrl = uploadResult.displayUrl;
        result.deleteUrl = uploadResult.deleteUrl;
        result.cloudMetadata = {
          provider: uploadResult.provider,
          size: uploadResult.size,
          width: uploadResult.width,
          height: uploadResult.height,
          keyUsed: uploadResult.keyUsed,
          uploadedAt: new Date().toISOString()
        };
        
        console.log(`   ✅ Uploaded to imgbb: ${uploadResult.url}`);
      } catch (imgbbError) {
        console.error(`   ⚠️  ImgBB upload failed, storing locally instead:`, imgbbError.message);
        // Fallback to local storage
        result.storageType = 'local';
        // Continue to local storage logic below
      }
    }

    if (storageType === 'local' || (storageType === 'cloud' && !result.cloudUrl)) {
      // Save locally
      console.log(`\n💾 Saving to local storage...`);
      
      // Create local folder if not exists
      if (!fs.existsSync(localFolder)) {
        fs.mkdirSync(localFolder, { recursive: true });
        console.log(`   📁 Created folder: ${localFolder}`);
      }
      
      const localFileName = path.basename(imagePath);
      const localPath = path.join(localFolder, localFileName);
      
      // Copy (not move) so temp file can be cleaned up
      fs.copyFileSync(imagePath, localPath);
      
      result.localPath = localPath;
      result.relativeePath = path.relative(process.cwd(), localPath);
      
      console.log(`   ✅ Saved to: ${result.relativeePath}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Storage error:`, error.message);
    throw error;
  }
}

/**
 * Clean up temporary files
 */
function cleanupTempFiles(files) {
  console.log(`\n🧹 Cleaning up temporary files...`);
  files?.forEach(f => {
    try {
      if (f && fs.existsSync(f)) {
        fs.unlinkSync(f);
        console.log(`   ✅ Deleted: ${path.basename(f)}`);
      }
    } catch (e) {
      console.warn(`   ⚠️  Could not delete: ${path.basename(f)}`);
    }
  });
}

/**
 * Extract conversation ID from Grok URL
 * URL format: https://grok.com/c/[conversation-id] or https://grok.com/c/[conversation-id]?rid=...
 */
function extractConversationId(url) {
  if (!url) return null;
  
  try {
    // Match pattern: /c/[UUID or alphanumeric ID]
    const match = url.match(/\/c\/([a-zA-Z0-9\-]+)/);
    if (match && match[1]) {
      console.log(`🔖 Extracted conversation ID: ${match[1]}`);
      return match[1];
    }
  } catch (e) {
    console.warn(`⚠️  Could not extract conversation ID: ${e.message}`);
  }
  
  return null;
}

/**
 * Parse structured recommendations from AI analysis response
 * Extracts recommendations from the === RECOMMENDATIONS === section
 */
function parseRecommendations(analysisText) {
  const recommendations = {
    characterProfile: {},
    productDetails: {},
    analysis: {},
    scene: null,
    lighting: null,
    mood: null,
    cameraAngle: null,
    hairstyle: null,
    makeup: null,
    bottoms: null,
    shoes: null,
    accessories: null,
    outerwear: null,
    newOptions: {}
  };

  try {
    // First, clean up the response - remove UI text and suggestions
    // Find the actual Grok response sections
    let cleanText = analysisText;
    
    // ===== SMART CLEANUP: Handle prompt echo =====
    // Find the first structured marker (character profile)
    const charProfileMarker = '*** CHARACTER PROFILE START ***';
    const charProfileIndex = cleanText.indexOf(charProfileMarker);
    
    if (charProfileIndex > 0) {
      // Found marker - skip everything before it (this is the prompt echo)
      console.log(`📝 Prompt echo detected: ${charProfileIndex}ch before first marker - removing`);
      cleanText = cleanText.substring(charProfileIndex);
    }
    
    // Remove suggestion text at the end (after recommendation end)
    const recEnd = cleanText.indexOf('*** RECOMMENDATIONS END ***');
    if (recEnd !== -1) {
      const endContent = cleanText.substring(recEnd + 27); // +27 = length of "*** RECOMMENDATIONS END ***"
      // Keep only lines after END that might be time indicators, but clean noise
      const nextNewline = endContent.indexOf('\n');
      if (nextNewline !== -1) {
        cleanText = cleanText.substring(0, recEnd + 27 + nextNewline);
      } else {
        // No newline after - just use up to END marker
        cleanText = cleanText.substring(0, recEnd + 27);
      }
    }
    
    console.log(`📄 Text prepared for parsing (${cleanText.length}ch)`);

    // Validate we have the expected markers
    const hasCharMarker = cleanText.includes('*** CHARACTER PROFILE START ***');
    const hasProdMarker = cleanText.includes('*** PRODUCT DETAILS START ***');
    const hasRecMarker = cleanText.includes('*** RECOMMENDATIONS START ***');
    
    if (!hasCharMarker || !hasProdMarker || !hasRecMarker) {
      console.warn(`⚠️  Missing markers - CHAR: ${hasCharMarker}, PROD: ${hasProdMarker}, REC: ${hasRecMarker}`);
    }

    // ===== PARSE CHARACTER PROFILE =====
    const charMatch = cleanText.match(/\*\*\*\s*CHARACTER\s*PROFILE\s*START\s*\*\*\*([\s\S]*?)\*\*\*\s*CHARACTER\s*PROFILE\s*END\s*\*\*\*/i);
    if (charMatch && charMatch[1]) {
      const charText = charMatch[1];
      const fieldMap = {
        'Gender': 'gender',
        'Age Range': 'age_range',
        'Body Type': 'body_type',
        'Skin Tone': 'skin_tone',
        'Hair Length': 'hair_length',
        'Hair Color': 'hair_color',
        'Hair Texture': 'hair_texture',
        'Hair Style': 'hair_style',
        'Face Shape': 'face_shape',
        'Current Outfit': 'current_outfit'
      };
      
      Object.entries(fieldMap).forEach(([fieldName, jsonKey]) => {
        const fieldRegex = new RegExp(`^\\s*${fieldName}\\s*:\\s*(.+?)$`, 'im');
        const fieldMatch = charText.match(fieldRegex);
        
        if (fieldMatch && fieldMatch[1]) {
          const value = fieldMatch[1].trim();
          // Only save if not template/placeholder and has real content
          if (value.length > 2 && !value.includes('[') && !value.startsWith('e.g.') && !value.startsWith('[') && value !== 'Description') {
            recommendations.characterProfile[jsonKey] = value;
            console.log(`   ✅ Char [${jsonKey}]: ${value.substring(0, 45)}`);
          }
        }
      });
    } else {
      console.log(`   ⚠️  Character profile section not found`);
    }

    // ===== PARSE PRODUCT DETAILS =====
    const prodMatch = cleanText.match(/\*\*\*\s*PRODUCT\s*DETAILS\s*START\s*\*\*\*([\s\S]*?)\*\*\*\s*PRODUCT\s*DETAILS\s*END\s*\*\*\*/i);
    if (prodMatch && prodMatch[1]) {
      const prodText = prodMatch[1];
      const fieldMap = {
        'Garment Type': 'garment_type',
        'Style Category': 'style_category',
        'Primary Color': 'primary_color',
        'Secondary Color': 'secondary_color',
        'Pattern': 'pattern',
        'Fabric Type': 'fabric_type',
        'Fit Type': 'fit_type',
        'Key Details': 'key_details'
      };
      
      Object.entries(fieldMap).forEach(([fieldName, jsonKey]) => {
        const fieldRegex = new RegExp(`^\\s*${fieldName}\\s*:\\s*(.+?)$`, 'im');
        const fieldMatch = prodText.match(fieldRegex);
        
        if (fieldMatch && fieldMatch[1]) {
          const value = fieldMatch[1].trim();
          // Only save if not template/placeholder and has real content
          if (value.length > 2 && !value.includes('[') && !value.startsWith('e.g.') && value !== 'Description') {
            recommendations.productDetails[jsonKey] = value;
            console.log(`   ✅ Prod [${jsonKey}]: ${value.substring(0, 45)}`);
          }
        }
      });
    } else {
      console.log(`   ⚠️  Product details section not found`);
    }

    // ===== PARSE ANALYSIS =====
    const analysisMatch = cleanText.match(/\*\*\*\s*ANALYSIS\s*START\s*\*\*\*([\s\S]*?)\*\*\*\s*ANALYSIS\s*END\s*\*\*\*/i);
    if (analysisMatch && analysisMatch[1]) {
      const analysisContent = analysisMatch[1];
      const scoreMatch = analysisContent.match(/Compatibility\s*Score\s*:\s*(\d+)/i);
      
      if (scoreMatch && scoreMatch[1]) {
        recommendations.analysis.compatibilityScore = parseInt(scoreMatch[1]);
        console.log(`   ✅ Compatibility Score: ${scoreMatch[1]}`);
      }
    } else {
      console.log(`   ⚠️  Analysis section not found`);
    }

    // ===== PARSE RECOMMENDATIONS =====
    const recMatch = cleanText.match(/\*\*\*\s*RECOMMENDATIONS\s*START\s*\*\*\*([\s\S]*?)\*\*\*\s*RECOMMENDATIONS\s*END\s*\*\*\*/i);
    if (recMatch && recMatch[1]) {
      const recText = recMatch[1];
      
      // Define fields with their regex patterns - now extract choice, reason, and alternatives
      const fieldMappings = [
        { name: 'scene', choicePattern: /SCENE_CHOICE:\s*([^\n]+)/i, reasonPattern: /SCENE_REASON:\s*([^\n]+(?:\n(?!SCENE_|LIGHTING_)[^\n]*)*)/i, altPattern: /SCENE_ALTERNATIVES:\s*([^\n]+)/i, key: 'scene' },
        { name: 'lighting', choicePattern: /LIGHTING_CHOICE:\s*([^\n]+)/i, reasonPattern: /LIGHTING_REASON:\s*([^\n]+(?:\n(?!LIGHTING_|MOOD_)[^\n]*)*)/i, altPattern: /LIGHTING_ALTERNATIVES:\s*([^\n]+)/i, key: 'lighting' },
        { name: 'mood', choicePattern: /MOOD_CHOICE:\s*([^\n]+)/i, reasonPattern: /MOOD_REASON:\s*([^\n]+(?:\n(?!MOOD_|CAMERA_)[^\n]*)*)/i, altPattern: /MOOD_ALTERNATIVES:\s*([^\n]+)/i, key: 'mood' },
        { name: 'cameraAngle', choicePattern: /CAMERA_ANGLE:\s*([^\n]+)/i, reasonPattern: /ANGLE_REASON:\s*([^\n]+(?:\n(?!ANGLE_|HAIRSTYLE_)[^\n]*)*)/i, altPattern: /ANGLE_ALTERNATIVES:\s*([^\n]+)/i, key: 'cameraAngle' },
        { name: 'hairstyle', choicePattern: /HAIRSTYLE:\s*([^\n]+)/i, reasonPattern: /HAIRSTYLE_REASON:\s*([^\n]+(?:\n(?!HAIRSTYLE_|MAKEUP_)[^\n]*)*)/i, altPattern: /HAIRSTYLE_ALTERNATIVES:\s*([^\n]+)/i, key: 'hairstyle' },
        { name: 'makeup', choicePattern: /MAKEUP:\s*([^\n]+)/i, reasonPattern: /MAKEUP_REASON:\s*([^\n]+(?:\n(?!MAKEUP_|BOTTOMS_)[^\n]*)*)/i, altPattern: /MAKEUP_ALTERNATIVES:\s*([^\n]+)/i, key: 'makeup' },
        { name: 'bottoms', choicePattern: /BOTTOMS:\s*([^\n]+)/i, reasonPattern: /BOTTOMS_REASON:\s*([^\n]+(?:\n(?!BOTTOMS_|SHOES_)[^\n]*)*)/i, altPattern: /BOTTOMS_ALTERNATIVES:\s*([^\n]+)/i, key: 'bottoms' },
        { name: 'shoes', choicePattern: /SHOES:\s*([^\n]+)/i, reasonPattern: /SHOES_REASON:\s*([^\n]+(?:\n(?!SHOES_|ACCESSORIES_)[^\n]*)*)/i, altPattern: /SHOES_ALTERNATIVES:\s*([^\n]+)/i, key: 'shoes' },
        { name: 'accessories', choicePattern: /ACCESSORIES:\s*([^\n]+)/i, reasonPattern: /ACCESSORIES_REASON:\s*([^\n]+(?:\n(?!ACCESSORIES_|OUTERWEAR_)[^\n]*)*)/i, altPattern: /ACCESSORIES_ALTERNATIVES:\s*([\s\S]*?)(?=OUTERWEAR|$)/i, key: 'accessories' },
        { name: 'outerwear', choicePattern: /OUTERWEAR:\s*([^\n]+)/i, reasonPattern: /OUTERWEAR_REASON:\s*([^\n]+(?:\n(?!OUTERWEAR_)[^\n]*)*)/i, altPattern: /OUTERWEAR_ALTERNATIVES:\s*([^\n]+)/i, key: 'outerwear' }
      ];
      
      fieldMappings.forEach(({ name, choicePattern, reasonPattern, altPattern, key }) => {
        const choiceMatch = recText.match(choicePattern);
        const reasonMatch = recText.match(reasonPattern);
        const altMatch = recText.match(altPattern);
        
        if (choiceMatch && choiceMatch[1]) {
          let choice = choiceMatch[1].trim();
          
          // Validate and clean value
          const skipPhrases = ['not-applicable', 'not-needed', 'keep-current', 'keep-existing', 'none', 'n/a', '[', 'description'];
          const isSkipValue = skipPhrases.some(phrase => choice.toLowerCase().includes(phrase));
          
          if (!isSkipValue && choice.length >= 2 && !choice.includes('[') && !choice.includes('e.g.')) {
            choice = choice.split('\n')[0].trim().toLowerCase();
            
            if (!/^[-\s]*$/.test(choice)) {
              // Store recommendation with full details (choice + reason + alternatives)
              const recommendation = {
                choice: choice,
                reason: reasonMatch && reasonMatch[1] ? reasonMatch[1].trim() : '',
                alternatives: altMatch && altMatch[1] ? altMatch[1].trim().split(',').map(a => a.trim()).filter(a => a) : []
              };
              
              recommendations[key] = recommendation;
              console.log(`   ✅ [${key}]: ${choice} (reason: ${recommendation.reason.substring(0, 50)}...)`);
            }
          }
        }
      });
    } else {
      console.log(`   ⚠️  Recommendations section not found`);
    }

    console.log(`✅ Parsing complete:`, {
      characterProfile: Object.keys(recommendations.characterProfile).length,
      productDetails: Object.keys(recommendations.productDetails).length,
      recommendations: ['scene', 'lighting', 'mood', 'cameraAngle', 'hairstyle', 'makeup', 'bottoms', 'shoes', 'accessories', 'outerwear'].filter(k => recommendations[k]).length,
      analysis: Object.keys(recommendations.analysis).length
    });

    return recommendations;

  } catch (error) {
    console.error(`❌ Error parsing recommendations:`, error.message);
    return recommendations;
  }
}


/**
 * Auto-save new options to database (with validation)
 * Only saves options from newOptions array that meet criteria
 */
async function autoSaveRecommendations(recommendations) {
  try {
    const { default: PromptOption } = await import('../models/PromptOption.js');
    
    const newOptionsCreated = [];
    const newOptions = recommendations.newOptions || {};
    
    for (const [category, options] of Object.entries(newOptions)) {
      if (!Array.isArray(options) || options.length === 0) continue;
      
      for (const value of options) {
        // Validate option
        if (!value || value.length < 2) {
          console.log(`   ⚠️  Skipping invalid option "${value}" (too short)`);
          continue;
        }
        
        // Check if option already exists
        const existing = await PromptOption.findOne({ 
          category, 
          value,
          isActive: true 
        });
        
        if (!existing) {
          // Create new option
          const label = value
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          const newOption = new PromptOption({
            category,
            value,
            label,
            description: `Auto-created from Grok recommendation: ${label} for ${category}`,
            keywords: [value, ...value.split('-'), category],
            technicalDetails: {
              source: 'grok_ai_recommendation',
              discoveredAt: new Date().toISOString()
            },
            isActive: true,
            sortOrder: 999
          });
          
          await newOption.save();
          newOptionsCreated.push({ category, value, label });
          console.log(`   ✅ Auto-created: ${category}/${value}`);
        }
      }
    }
    
    console.log(`\n📊 New Options Summary: Created ${newOptionsCreated.length} new options from analysis`);
    return newOptionsCreated;
    
  } catch (error) {
    console.error(`❌ Error auto-saving options:`, error.message);
    return [];
  }
}

/**
 * STEP 2: Browser Analysis - Only analyze images, return text
 * Does NOT generate any images - just returns analysis text
 */
export async function analyzeWithBrowser(req, res) {
  let browserService = null;
  const tempFiles = [];

  try {
    const { 
      analysisProvider = 'grok',
      // Style customization options from frontend
      scene = 'studio',
      lighting = 'soft-diffused',
      mood = 'confident',
      style = 'minimalist',
      colorPalette = 'neutral',
      hairstyle = null,
      makeup = null,
      cameraAngle = 'eye-level',
      aspectRatio = '1:1',
      customPrompt = ''
    } = req.body;

    const characterImage = req.files?.characterImage?.[0];
    const productImage = req.files?.productImage?.[0];

    if (!characterImage || !productImage) {
      return res.status(400).json({ 
        error: 'Both character and product images are required',
        success: false 
      });
    }

    // Build style options object
    const styleOptions = {
      scene,
      lighting,
      mood,
      style,
      colorPalette,
      hairstyle,
      makeup,
      cameraAngle,
      aspectRatio,
      customPrompt
    };

    // ====================================
    // STEP 1: Save uploaded images
    // ====================================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 BROWSER ANALYSIS - START`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`💾 Saving uploaded images to temp...`);
    const charImagePath = path.join(tempDir, `char-${Date.now()}-${characterImage.originalname}`);
    const prodImagePath = path.join(tempDir, `prod-${Date.now()}-${productImage.originalname}`);
    
    fs.writeFileSync(charImagePath, characterImage.buffer);
    fs.writeFileSync(prodImagePath, productImage.buffer);
    tempFiles.push(charImagePath, prodImagePath);
    
    console.log(`   ✅ Character: ${path.basename(charImagePath)}`);
    console.log(`   ✅ Product: ${path.basename(prodImagePath)}`);

    // ====================================
    // STEP 2: Initialize browser service for analysis
    // ====================================
    console.log(`\n📊 Initializing browser service for analysis...`);
    
    switch (analysisProvider) {
      case 'grok':
      case 'grok.com':
        browserService = new GrokServiceV2({ headless: false });
        break;
      case 'zai':
      case 'chat.z.ai':
      default:
        browserService = new ZAIChatService({ headless: false });
    }
    
    console.log(`   🚀 Initializing ${analysisProvider}...`);
    await browserService.initialize();

    // ====================================
    // STEP 3: Build analysis prompt with all style options
    // ====================================
    console.log(`\n🔨 Building analysis prompt...`);
    const analysisPrompt = buildAnalysisPrompt(styleOptions);

    // ====================================
    // STEP 4: Analyze images (NO generation)
    // ====================================
    console.log(`\n🤖 Analyzing images (no generation)...`);
    
    const analysisResult = await browserService.analyzeMultipleImages(
      [charImagePath, prodImagePath],
      analysisPrompt
    );
    
    const analysisText = analysisResult?.text || analysisResult;
    console.log(`   ✅ Analysis complete!`);
    console.log(`      Result: "${analysisText?.substring(0, 200) || 'N/A'}..."`);

    // ====================================
    // STEP 5: Extract conversation ID from Grok URL
    // ====================================
    console.log(`\n🔗 Extracting conversation ID from Grok URL...`);
    const grokUrl = await browserService.getUrl();
    const conversationId = extractConversationId(grokUrl);
    console.log(`   📍 Grok URL: ${grokUrl}`);
    console.log(`   🆔 Conversation ID: ${conversationId || 'N/A'}`);
    
    // ====================================
    // STEP 6: Parse recommendations from AI response
    // ====================================
    console.log(`\n📋 Parsing recommendations from AI response...`);
    const recommendations = parseRecommendations(analysisText);
    
    // 💫 NEW: Extract character description for generation
    const characterDescription = extractCharacterDescription(analysisText);
    
    // ====================================
    // STEP 7: Auto-save new options to database
    // ====================================
    console.log(`\n💾 Auto-saving new options to database...`);
    const newOptionsCreated = await autoSaveRecommendations(recommendations);

    // Cleanup
    await browserService.close();
    cleanupTempFiles(tempFiles);

    // Return analysis + recommendations + conversation ID + character description
    console.log(`\n✅ BROWSER ANALYSIS - COMPLETE`);
    console.log(`   Analysis text returned with ${Object.values(recommendations).filter(v => v).length} recommendations\n`);

    return res.json({
      success: true,
      data: {
        analysis: analysisText,
        recommendations, // Parsed structured recommendations
        newOptionsCreated, // New options that were auto-created in DB
        grokConversationId: conversationId, // ✨ Return conversation ID for reuse in generation
        grokUrl: grokUrl, // ✨ Return full URL for reference
        characterDescription, // 💫 NEW: Character description for generation
        providers: {
          analysis: analysisProvider
        },
        // Return empty images array - this is ANALYSIS ONLY
        generatedImages: []
      },
      message: 'Analysis completed successfully. Recommendations parsed and new options auto-saved to database.'
    });

  } catch (error) {
    console.error(`\n❌ ANALYSIS ERROR:`, error.message);
    if (browserService) await browserService.close();
    cleanupTempFiles(tempFiles);
    
    return res.status(500).json({
      error: error.message,
      success: false,
      stage: 'analysis'
    });
  }
}

/**
 * STEP 5: Browser Generation - Generate image from prompt/options
 * Reuses conversation ID from analysis, uploads images, generates new image
 */
export async function generateWithBrowser(req, res) {
  let browserService = null;
  const tempFiles = [];

  try {
    const { 
      imageGenProvider = 'grok',
      prompt,
      negativePrompt = '',
      // ✨ NEW: Accept conversation ID from frontend
      grokConversationId,
      grokUrl,
      // 💫 NEW: Image count and character description
      imageCount = 1,
      characterDescription = '',
      // Style customization options
      scene = 'studio',
      lighting = 'soft-diffused',
      mood = 'confident',
      style = 'minimalist',
      colorPalette = 'neutral',
      cameraAngle = 'eye-level',
      aspectRatio = '1:1',
      // Images from previous step (passed as base64 or paths)
      characterImageBase64,
      productImageBase64,
      characterImagePath,
      productImagePath
    } = req.body;

    // Get image paths - either from temp files or convert base64
    let charImagePath = characterImagePath;
    let prodImagePath = productImagePath;
    
    // If base64 provided, save to temp
    if (characterImageBase64 && productImageBase64) {
      console.log(`\n💾 Converting base64 images to temp files...`);
      
      // Character image
      const charBuffer = Buffer.from(characterImageBase64, 'base64');
      charImagePath = path.join(tempDir, `char-gen-${Date.now()}.png`);
      fs.writeFileSync(charImagePath, charBuffer);
      tempFiles.push(charImagePath);
      
      // Product image
      const prodBuffer = Buffer.from(productImageBase64, 'base64');
      prodImagePath = path.join(tempDir, `prod-gen-${Date.now()}.png`);
      fs.writeFileSync(prodImagePath, prodBuffer);
      tempFiles.push(prodImagePath);
      
      console.log(`   ✅ Images saved to temp`);
    }
    
    if (!charImagePath || !prodImagePath) {
      return res.status(400).json({ 
        error: 'Image paths or base64 required',
        success: false 
      });
    }

    // Build style options
    const styleOptions = {
      scene,
      lighting,
      mood,
      style,
      colorPalette,
      cameraAngle,
      aspectRatio,
      imageCount,
      negativePrompt,
      characterDescription
    };

    // ====================================
    // STEP 1: Initialize browser service
    // ====================================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎨 BROWSER GENERATION - START`);
    console.log(`${'='.repeat(80)}\n`);
    
    switch (imageGenProvider) {
      case 'grok':
      case 'grok.com':
        browserService = new GrokServiceV2({ headless: false });
        break;
      case 'lab-flow':
      case 'google-lab-flow':
      case 'google-flow':
        browserService = new GoogleFlowService({ headless: false });
        break;
      case 'zai':
      case 'image.z.ai':
      default:
        browserService = new ZAIImageService({ headless: false });
    }
    
    console.log(`   🚀 Initializing ${imageGenProvider}...`);
    await browserService.initialize();
    
    // ✨ NEW: If we have a conversation ID, navigate to existing conversation instead of new one
    if (grokConversationId) {
      console.log(`\n🔄 Reusing conversation from analysis...`);
      console.log(`   🆔 Conversation ID: ${grokConversationId}`);
      const conversationUrl = `https://grok.com/c/${grokConversationId}`;
      console.log(`   📍 Navigating to: ${conversationUrl}`);
      
      try {
        await browserService.goto(conversationUrl);
        await browserService.page.waitForTimeout(3000);
        console.log(`   ✅ Navigated to existing conversation`);
      } catch (e) {
        console.warn(`⚠️  Could not navigate to conversation, will create new one: ${e.message}`);
      }
    }

    // ====================================
    // STEP 2: 💫 NEW - Upload reference images to conversation
    // ====================================
    console.log(`\n📸 Uploading reference images to Grok conversation...`);
    try {
      console.log(`   Uploading character image...`);
      await browserService._uploadImage(charImagePath);
      await browserService.page.waitForTimeout(1500);
      console.log(`   ✅ Character image uploaded`);
      
      console.log(`   Uploading product image...`);
      await browserService._uploadImage(prodImagePath);
      await browserService.page.waitForTimeout(1500);
      console.log(`   ✅ Product image uploaded`);
    } catch (uploadError) {
      console.warn(`⚠️  Image upload warning (will continue): ${uploadError.message}`);
    }

    // ====================================
    // STEP 3: Build generation prompt
    // ====================================
    console.log(`\n🔨 Building generation prompt...`);
    const generationPrompt = buildGenerationPrompt(prompt, styleOptions);
    console.log(`   ✅ Prompt built with scene: ${scene}, lighting: ${lighting}, mood: ${mood}`);

    // ====================================
    // STEP 4: Generate image
    // ====================================
    console.log(`\n🖼️  Generating image...`);
    
    const outputImagePath = path.join(tempDir, `browser-gen-${Date.now()}.png`);
    
    const imageResult = await browserService.generateImage(generationPrompt, {
      download: true,
      outputPath: outputImagePath
    });
    
    console.log(`   ✅ Image generated`);
    
    // ====================================
    // STEP 5: 💫 NEW - Handle storage (local or cloud)
    // ====================================
    let storageResult;
    try {
      // Validate image first
      await validateImage(outputImagePath);
      
      // Get storage config from request
      const storageConfig = {
        storageType: req.body.storageType || 'cloud', // default to cloud
        localFolder: req.body.localFolder,
        cloudProvider: req.body.cloudProvider || 'imgbb'
      };
      
      // Handle storage
      storageResult = await handleImageStorage(outputImagePath, storageConfig);
      
    } catch (storageError) {
      console.error(`⚠️  Storage error (image may not be saved):`, storageError.message);
      storageResult = {
        error: storageError.message,
        fileSize: fs.statSync(outputImagePath).size,
        filename: path.basename(outputImagePath)
      };
    }
    
    // ====================================
    // STEP 6: Cleanup and respond
    // ====================================
    await browserService.close();
    cleanupTempFiles(tempFiles);

    // Build response
    const fileStats = fs.statSync(outputImagePath);
    console.log(`\n✅ BROWSER GENERATION - COMPLETE\n`);

    const generatedImage = {
      filename: path.basename(outputImagePath),
      size: fileStats.size,
      generatedAt: new Date().toISOString(),
      provider: imageGenProvider,
      grokConversationId, // Include conversation ID for session tracking
      // Storage information
      storage: storageResult
    };

    // Add URL based on storage type
    if (storageResult.cloudUrl) {
      // Cloud: Already have HTTPS URL
      generatedImage.cloudUrl = storageResult.cloudUrl;
      generatedImage.displayUrl = storageResult.displayUrl;
      generatedImage.url = storageResult.cloudUrl;
    } else if (storageResult.localPath) {
      // 💫 NEW: Local: Serve via HTTP endpoint instead of file:// URL
      const filename = path.basename(outputImagePath);
      const httpUrl = `/api/v1/browser-automation/serve-image/${filename}`;
      generatedImage.localPath = storageResult.localPath;
      generatedImage.url = httpUrl;  // HTTP URL instead of file://
      generatedImage.displayUrl = httpUrl;
    } else {
      // Fallback: Server temp file
      const filename = path.basename(outputImagePath);
      const httpUrl = `/api/v1/browser-automation/serve-image/${filename}`;
      generatedImage.url = httpUrl;
      generatedImage.displayUrl = httpUrl;
    }

    return res.json({
      success: true,
      data: {
        generatedImages: [generatedImage],
        providers: {
          generation: imageGenProvider
        },
        storageConfig: {
          type: storageResult.storageType,
          provider: storageResult.storageType === 'cloud' ? 'imgbb' : 'local'
        }
      },
      message: `Image generated successfully via ${imageGenProvider} and saved to ${storageResult.storageType}`
    });

  } catch (error) {
    console.error(`\n❌ GENERATION ERROR:`, error.message);
    if (browserService) await browserService.close();
    cleanupTempFiles(tempFiles);
    
    return res.status(500).json({
      error: error.message,
      success: false,
      stage: 'generation'
    });
  }
}

/**
 * Legacy: Analyze and generate image using browser automation - FULL FLOW
 * DEPRECATED - Use analyzeWithBrowser + generateWithBrowser instead
 */
export async function analyzeAndGenerate(req, res) {
  let analysisService = null;
  let imageGenService = null;
  const tempFiles = [];
  let outputImagePath = null;

  try {
    const { 
      analysisProvider = 'grok',
      imageGenProvider = 'grok',
      prompt, 
      negativePrompt,
      useRealAnalysis = true,  // Enable real analysis by default
      // Style customization options from frontend
      scene = 'studio',
      lighting = 'soft-diffused',
      mood = 'confident',
      style = 'minimalist',
      colorPalette = 'neutral',
      hairstyle = null,
      makeup = null,
      cameraAngle = 'eye-level',
      aspectRatio = '1:1',
      customPrompt = ''
    } = req.body;
    
    // Build style options object
    const styleOptions = {
      scene,
      lighting,
      mood,
      style,
      colorPalette,
      hairstyle,
      makeup,
      cameraAngle,
      aspectRatio,
      customPrompt,
      negativePrompt
    };

    const characterImage = req.files?.characterImage?.[0];
    const productImage = req.files?.productImage?.[0];

    if (!characterImage || !productImage) {
      return res.status(400).json({ 
        error: 'Both character and product images are required',
        success: false 
      });
    }

    // Generate default prompt if not provided
    let finalPrompt = prompt;
    if (!finalPrompt) {
      finalPrompt = `Generate a photorealistic fashion image of a person wearing the clothing product shown. 
Keep the character unchanged: same face, same body type, same skin tone.
Change only the clothing to match the product image.
Professional studio lighting, white background, fashion photography quality.`;
    }

    // ====================================
    // STEP 1: Save uploaded images
    // ====================================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎬 BROWSER AUTOMATION FULL FLOW - START`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`💾 STEP 1: Saving uploaded images to temp...`);
    const charImagePath = path.join(tempDir, `char-${Date.now()}-${characterImage.originalname}`);
    const prodImagePath = path.join(tempDir, `prod-${Date.now()}-${productImage.originalname}`);
    
    fs.writeFileSync(charImagePath, characterImage.buffer);
    fs.writeFileSync(prodImagePath, productImage.buffer);
    tempFiles.push(charImagePath, prodImagePath);
    
    console.log(`   ✅ Character: ${path.basename(charImagePath)}`);
    console.log(`   ✅ Product: ${path.basename(prodImagePath)}`);

    // ====================================
    // STEP 2 & 4: Single browser service for both analysis and generation
    // ====================================
    // Reuse same service instance for both analysis and generation when providers match
    const useSameService = analysisProvider === imageGenProvider || 
                          (analysisProvider === 'grok' && imageGenProvider === 'grok') ||
                          (analysisProvider === 'grok.com' && imageGenProvider === 'grok.com');
    
    console.log(`\n📊 STEP 2: Analysis...`);
    let analysisText = null;

    try {
      // Create service for analysis
      if (!useSameService || !analysisService) {
        switch (analysisProvider) {
          case 'grok':
          case 'grok.com':
            analysisService = new GrokServiceV2({ headless: false });
            break;
          case 'zai':
          case 'chat.z.ai':
          default:
            analysisService = new ZAIChatService({ headless: false });
        }
        
        console.log(`   🚀 Initializing ${analysisProvider}...`);
        await analysisService.initialize();
      } else {
        console.log(`   ♻️  Reusing same service for analysis + generation`);
      }

      if (useRealAnalysis) {
        console.log(`   🤖 Real analysis with ${analysisProvider}...`);
        console.log(`   📸 Uploading and analyzing images...`);
        console.log(`   ⏳ This may take a minute...`);
        
        // Use the comprehensive analysis prompt with all style options
        const analysisPrompt = buildAnalysisPrompt(styleOptions);
        
        const analysisResult = await analysisService.analyzeMultipleImages(
          [charImagePath, prodImagePath],
          analysisPrompt
        );
        
        analysisText = analysisResult?.text || analysisResult;
        console.log(`   ✅ Analysis complete!`);
        console.log(`      Result: "${analysisText?.substring(0, 200) || 'N/A'}..."`);
      } else {
        console.log(`   ℹ️  Skipping real analysis (useRealAnalysis=false)`);
      }
    } catch (error) {
      console.warn(`⚠️  Real analysis error: ${error.message}`);
      console.log(`   Falling back to default analysis...`);
    }

    // Use fallback if no real analysis
    if (!analysisText) {
      analysisText = 'Professional fashion styling, modern aesthetic, high quality finish recommended.';
      console.log(`   ✅ Using fallback analysis`);
    }

    // ====================================
    // STEP 3: Build generation prompt with all style options
    // ====================================
    console.log(`\n🔨 STEP 3: Building generation prompt with all style options...`);
    // Use the comprehensive generation prompt with all style customization
    const optimizedPrompt = buildGenerationPrompt(analysisText, styleOptions);
    console.log(`   ✅ Prompt built with scene: ${styleOptions.scene}, lighting: ${styleOptions.lighting}, mood: ${styleOptions.mood}`);

    // ====================================
    // STEP 4: Generate image (reuse service if possible)
    // ====================================
    console.log(`\n🎨 STEP 4: Generating image with ${imageGenProvider}...`);
    
    // Use existing service if same provider, otherwise create new one
    if (!useSameService) {
      // Need different service for generation
      if (analysisService) {
        console.log(`   🔄 Closing analysis service to create generation service...`);
        await analysisService.close();
        analysisService = null;
      }
      
      switch (imageGenProvider) {
        case 'grok':
        case 'grok.com':
          imageGenService = new GrokServiceV2({ headless: false });
          break;
        case 'zai':
        case 'image.z.ai':
        default:
          imageGenService = new ZAIImageService({ headless: false });
      }
      
      console.log(`   🚀 Initializing ${imageGenProvider}...`);
      await imageGenService.initialize();
    } else {
      // Reuse analysis service for generation
      imageGenService = analysisService;
      console.log(`   ♻️  Reusing service for generation (same provider)`);
    }
    
    try {
      outputImagePath = path.join(tempDir, `browser-gen-${Date.now()}.png`);
      
      console.log(`   🖼️  Generating with prompt: "${optimizedPrompt.substring(0, 80)}..."`);
      console.log(`   ⏳ Generating image...`);
      
      const imageResult = await imageGenService.generateImage(optimizedPrompt, {
        download: true,
        outputPath: outputImagePath
      });
      
      console.log(`   ✅ Image generation complete`);
      
      if (imageResult?.path) {
        outputImagePath = imageResult.path;
      }

      if (!outputImagePath) {
        throw new Error('No image path returned from generation');
      }

    } catch (genError) {
      console.error(`❌ Generation error: ${genError.message}`);
      if (analysisService) await analysisService.close();
      if (imageGenService && imageGenService !== analysisService) await imageGenService.close();
      
      cleanupTempFiles(tempFiles);
      
      return res.status(500).json({
        error: `Image generation failed: ${genError.message}`,
        success: false,
        stage: 'generation'
      });
    } finally {
      // Only close if it's a different service
      if (imageGenService && imageGenService !== analysisService && imageGenService.close) {
        await imageGenService.close();
      }
    }

    // ====================================
    // STEP 5: Validate generated image
    // ====================================
    console.log(`\n✔️ STEP 5: Validating generated image...`);
    try {
      await validateImage(outputImagePath);
    } catch (valError) {
      console.error(`❌ Validation failed: ${valError.message}`);
      cleanupTempFiles([...tempFiles, outputImagePath]);
      
      return res.status(500).json({
        error: `Image validation failed: ${valError.message}`,
        success: false,
        stage: 'validation'
      });
    }

    // ====================================
    // CLEANUP temporary image files (keep output)
    // ====================================
    const filesToClean = tempFiles.filter(f => f !== outputImagePath);
    cleanupTempFiles(filesToClean);

    // ====================================
    // SUCCESS RESPONSE
    // ====================================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ BROWSER AUTOMATION FLOW - COMPLETE`);
    console.log(`${'='.repeat(80)}\n`);

    const fileStats = fs.statSync(outputImagePath);

    return res.json({
      success: true,
      data: {
        generatedImages: [{
          url: `file://${outputImagePath}`,
          path: outputImagePath,
          size: fileStats.size,
          filename: path.basename(outputImagePath),
          provider: 'grok'
        }],
        analysis: analysisText,
        prompt: optimizedPrompt,
        providers: {
          analysis: analysisProvider,
          generation: imageGenProvider
        },
        validation: {
          status: 'valid',
          size_bytes: fileStats.size,
          timestamp: new Date().toISOString()
        }
      },
      message: 'Image generated successfully via full browser automation flow with real analysis and validation'
    });

  } catch (error) {
    console.error(`\n❌ FATAL ERROR:`, error.message);
    if (analysisService) await analysisService.close();
    if (imageGenService) await imageGenService.close();
    cleanupTempFiles(tempFiles);
    
    return res.status(500).json({
      error: error.message,
      success: false,
      stage: 'unknown'
    });
  }
}

/**
 * Legacy single-step handlers
 */
export async function analyzeBrowser(req, res) {
    // ... existing implementation or simplified version ...
    res.status(501).json({ error: "Use analyzeAndGenerate instead" });
}

export async function generateImageBrowser(req, res) {
    res.status(501).json({ error: "Use analyzeAndGenerate instead" });
}

export async function generateVideoBrowser(req, res) {
  try {
    const { duration, scenario, segments, sourceImage, provider = 'grok' } = req.body;

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid segments - must provide array of prompt segments'
      });
    }

    if (segments.some(s => !s || typeof s !== 'string' || s.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'All segments must be non-empty strings'
      });
    }

    // Only Grok is supported for video
    if (provider !== 'grok') {
      return res.status(400).json({
        success: false,
        error: `Video generation only supported for Grok, got: ${provider}`
      });
    }

    console.log('\n🎬 VIDEO GENERATION REQUEST');
    console.log('━'.repeat(80));
    console.log(`Duration: ${duration}s`);
    console.log(`Scenario: ${scenario}`);
    console.log(`Segments: ${segments.length}`);
    console.log(`Provider: ${provider}`);
    console.log('');

    // Initialize Grok Service
    const grok = new GrokServiceV2({
      headless: false  // Show browser for video generation
    });

    // Initialize browser
    await grok.initialize();
    
    console.log('✅ Grok initialized for video generation');

    // Convert base64 to string for Grok service (if sourceImage is base64)
    let imageBase64 = sourceImage;
    
    // If sourceImage is URL, download it as base64
    if (sourceImage && sourceImage.startsWith('http')) {
      console.log('📥 Downloading image from URL...');
      imageBase64 = await downloadImageAsBase64(sourceImage);
    }
    
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'No valid image provided for video generation'
      });
    }

    // Generate video with segments
    const result = await grok.generateVideoWithSegments(imageBase64, segments, {
      duration,
      scenario,
      provider
    });

    console.log('\n✅ Video generation complete');
    console.log(`Generated: ${result.generatedCount}/${result.totalSegments} segments`);

    // Clean up
    await grok.close();

    // ✅ Save to database with enhanced fields (Features Integration)
    try {
      if (req.user && req.user.id) {
        const videoDoc = new VideoGeneration({
          userId: req.user.id,
          originalPrompt: segments.join(' | '),
          finalOutput: result.videoUrls[result.videoUrls.length - 1] || null,
          status: result.success ? 'completed' : 'failed',
          sessionId: result.sessionId,
          segments: segments.map((prompt, index) => ({
            index,
            prompt,
            videoUrl: result.videoUrls[index] || null,
            status: result.videoUrls[index] ? 'generated' : 'failed',
            errorMessage: result.videoUrls[index] ? null : 'Video URL not returned'
          })),
          extractedFrames: result.extractedFrames || [],
          metrics: result.metrics || {},
          duration,
          scenario,
          provider
        });
        
        await videoDoc.save();
        console.log(`✅ Video generation saved to database (ID: ${videoDoc._id})`);
      } else {
        console.warn('⚠️ User not authenticated, skipping database save');
      }
    } catch (dbError) {
      console.warn('⚠️ Failed to save to database:', dbError.message);
      // Don't fail the API response if database save fails
    }

    res.json({
      success: result.success,
      data: {
        postId: result.postId,
        videoUrls: result.videoUrls,
        generatedCount: result.generatedCount,
        totalSegments: result.totalSegments,
        sessionId: result.sessionId,
        extractedFrames: result.extractedFrames || [],
        metrics: result.metrics || {},
        scenario,
        duration
      },
      error: result.error
    });

  } catch (error) {
    console.error('❌ Video generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Download image from URL and convert to base64
 */
async function downloadImageAsBase64(imageUrl) {
  try {
    const protocol = imageUrl.startsWith('https') ? https : http;
    
    return new Promise((resolve, reject) => {
      let data = Buffer.alloc(0);
      
      protocol.get(imageUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          downloadImageAsBase64(redirectUrl).then(resolve).catch(reject);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }
        
        response.on('data', chunk => {
          data = Buffer.concat([data, chunk]);
        });
        
        response.on('end', () => {
          const base64 = data.toString('base64');
          resolve(base64);
        });
        
        response.on('error', reject);
      }).on('error', reject);
    });
  } catch (error) {
    console.error('Failed to download image:', error);
    return null;
  }
}
