import GrokServiceV2 from '../services/browser/grokServiceV2.js';
import ZAIChatService from '../services/browser/zaiChatService.js';
import ZAIImageService from '../services/browser/zaiImageService.js';
import GoogleFlowService from '../services/browser/googleFlowService.js';
import ChatGPTService from '../services/browser/chatgptService.js';
import GoogleFlowAutomationService from '../services/googleFlowAutomationService.js';
import VideoGeneration from '../models/VideoGeneration.js';
import Asset from '../models/Asset.js'; // 💫 Asset model for hybrid storage
import uploadToImgBB from '../services/uploaders/imgbbUploader.js'; // 💫 NEW
import AssetManager from '../utils/assetManager.js'; // 💫 Asset manager for saving generated assets
import HybridStorage from '../services/hybridStorageSync.js'; // 💫 Hybrid storage (local + Drive sync)
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
 * RETURNS JSON FORMAT for clean parsing
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

  // Build prompt with IMPROVED JSON format for clean extraction
  const promptText = `You are a professional fashion analyst. Analyze the two images and respond with ONLY this exact JSON structure (NO other text):

{
  "character": {
    "gender": "string",
    "age_range": "string",
    "body_type": "string",
    "body_type_short": "slim|athletic|curvy|petite|tall|average",
    "skin_tone": "string",
    "hair_color": "string",
    "hair_length": "short|medium|long",
    "hair_texture": "straight|wavy|curly",
    "hair_style": "string - specific style name",
    "face_shape": "oval|square|round|heart|oblong"
  },
  "product": {
    "garment_type": "string - specific type",
    "style_category": "string",
    "primary_color": "string",
    "secondary_color": "string or null",
    "pattern": "solid|striped|floral|geometric|printed|plaid|other",
    "fabric_type": "string - cotton, silk, wool, etc",
    "fit_type": "tight|fitted|regular|loose|oversized",
    "key_details": "string - 2-3 main features"
  },
  "analysis": {
    "compatibility_score": 1-10,
    "fit_assessment": "Does product fit body type well? Any issues?",
    "color_harmony": "How does color work with skin tone?",
    "styling_notes": "Key styling recommendations"
  },
  "recommendations": {
    "scene": {
      "choice": "ONE value from: studio, white-background, urban-street, minimalist-indoor, cafe, outdoor-park, office, luxury-interior, rooftop",
      "reason": "2-3 sentences why this scene works best"
    },
    "lighting": {
      "choice": "ONE from: soft-diffused, natural-window, golden-hour, dramatic-rembrandt, high-key, backlit, neon-colored, overcast-outdoor",
      "reason": "why this lighting"
    },
    "mood": {
      "choice": "ONE from: confident, relaxed, elegant, energetic, playful, mysterious, romantic, professional",
      "reason": "why this mood"
    },
    "cameraAngle": {
      "choice": "ONE from: eye-level, slight-angle, three-quarter, full-front, over-shoulder",
      "reason": "why this angle"
    },
    "hairstyle": {
      "choice": "specific style like ponytail, bun, waves, etc OR keep-current",
      "reason": "why this hairstyle"
    },
    "makeup": {
      "choice": "ONE from: natural, light-makeup, glowing-skin, smokey-eyes, bold-lips, winged-eyeliner, contoured, matte-finish, glossy-lips, bronzed, dramatic, minimalist, keep-current",
      "reason": "why this makeup"
    },
    "bottoms": {
      "choice": "specific like skinny-jeans, midi-skirt, etc OR not-applicable",
      "reason": "why these bottoms"
    },
    "shoes": {
      "choice": "specific like block-heels, white-sneakers, ballet-flats, etc OR not-applicable",
      "reason": "why these shoes"
    },
    "accessories": {
      "choice": "comma-separated list like: gold-necklace, hoop-earrings, crossbody-bag OR minimal OR none",
      "reason": "how these accessories complete the look"
    },
    "outerwear": {
      "choice": "specific like blazer, denim-jacket, wool-coat, etc OR not-needed",
      "reason": "why or why not needed"
    }
  }
}

CRITICAL RULES:
1. Return ONLY the JSON object - no other text before or after
2. All choice values MUST be from the provided lists above
3. Reasons must be 1-2 sentences max
4. Use lowercase for all choice values with hyphens where shown
5. If a recommendation is not applicable, use "not-applicable" or "not-needed"`;

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
 * Parse JSON recommendations from AI analysis response
 * Much simpler and more reliable than regex-based parsing
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
    // Try to extract JSON from response
    let jsonText = analysisText;
    
    // If response contains extra text, try to find JSON block
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`⚠️  No JSON found in response, attempting text parsing fallback...`);
      return recommendations;
    }
    
    jsonText = jsonMatch[0];
    console.log(`📄 Found JSON block (${jsonText.length} chars)`);
    
    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (jsonErr) {
      // Try to fix common JSON issues
      console.log(`   Attempting to fix JSON format...`);
      jsonText = jsonText
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/'/g, '"');     // Single to double quotes
      
      try {
        parsed = JSON.parse(jsonText);
      } catch (retryErr) {
        console.error(`❌ Failed to parse JSON:`, retryErr.message);
        return recommendations;
      }
    }
    
    // Extract character profile
    if (parsed.character && typeof parsed.character === 'object') {
      recommendations.characterProfile = {
        gender: parsed.character.gender || '',
        age_range: parsed.character.age_range || '',
        body_type: parsed.character.body_type || '',
        skin_tone: parsed.character.skin_tone || '',
        hair_color: parsed.character.hair_color || '',
        hair_length: parsed.character.hair_length || '',
        hair_texture: parsed.character.hair_texture || '',
        hair_style: parsed.character.hair_style || '',
        face_shape: parsed.character.face_shape || ''
      };
      console.log(`   ✅ Character profile extracted: ${Object.keys(recommendations.characterProfile).length} fields`);
    }
    
    // Extract product details
    if (parsed.product && typeof parsed.product === 'object') {
      recommendations.productDetails = {
        garment_type: parsed.product.garment_type || '',
        style_category: parsed.product.style_category || '',
        primary_color: parsed.product.primary_color || '',
        secondary_color: parsed.product.secondary_color || '',
        pattern: parsed.product.pattern || '',
        fabric_type: parsed.product.fabric_type || '',
        fit_type: parsed.product.fit_type || '',
        key_details: parsed.product.key_details || ''
      };
      console.log(`   ✅ Product details extracted: ${Object.keys(recommendations.productDetails).length} fields`);
    }
    
    // Extract analysis
    if (parsed.analysis && typeof parsed.analysis === 'object') {
      recommendations.analysis = {
        compatibilityScore: parsed.analysis.compatibility_score || 0,
        fitAssessment: parsed.analysis.fit_assessment || '',
        colorHarmony: parsed.analysis.color_harmony || '',
        stylingNotes: parsed.analysis.styling_notes || ''
      };
      console.log(`   ✅ Analysis extracted: score ${recommendations.analysis.compatibilityScore}`);
    }
    
    // Extract recommendations
    if (parsed.recommendations && typeof parsed.recommendations === 'object') {
      const recs = parsed.recommendations;
      
      [
        'scene', 'lighting', 'mood', 'cameraAngle', 'hairstyle', 
        'makeup', 'bottoms', 'shoes', 'accessories', 'outerwear'
      ].forEach(key => {
        if (recs[key] && typeof recs[key] === 'object') {
          let choice = (recs[key].choice || '').toLowerCase().trim();
          const reason = (recs[key].reason || '').trim();
          
          // ✅ NEW: Support comma-separated multiple values
          // Example: "gold-bracelet, structured-handbag" → ["gold-bracelet", "structured-handbag"]
          let choiceArray = [];
          if (choice && choice.includes(',')) {
            // Split by comma and clean each value
            choiceArray = choice
              .split(',')
              .map(c => c.toLowerCase().trim())
              .filter(c => c && c.length > 0 && c !== 'not-applicable');
            console.log(`   ℹ️  ${key}: Multi-value (${choiceArray.length} items)`);
          } else if (choice && choice.length > 0 && choice !== 'not-applicable') {
            choiceArray = [choice];
          }
          
          // Store as array (supports both single and multi-select)
          recommendations[key] = {
            choice: choiceArray.length === 1 ? choiceArray[0] : choiceArray, // Single string or array
            choiceArray: choiceArray, // Always keep array version for components
            reason: reason,
            isMulti: choiceArray.length > 1, // Flag for multi-value
            alternatives: recs[key].alternatives?.length > 0 
              ? recs[key].alternatives.map(a => (typeof a === 'string' ? a.toLowerCase().trim() : '')) 
              : []
          };
          
          // Filter empty alternatives
          recommendations[key].alternatives = recommendations[key].alternatives.filter(
            a => a && a.length > 0 && a !== 'not-applicable'
          );
          
          if (choiceArray.length > 0) {
            const display = choiceArray.length > 1 ? choiceArray.join(' + ') : choiceArray[0];
            console.log(`   ✅ ${key}: ${display}`);
          }
        }
      });
    }
    
    console.log(`✅ JSON parsing complete!`);
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
      case 'chatgpt':
      case 'chatgpt-browser':
        browserService = new ChatGPTService({ headless: false });
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
    // STEP 4.5: Validate response is not empty
    // ====================================
    if (!analysisText || (typeof analysisText === 'string' && analysisText.trim().length === 0)) {
      console.error(`❌ CRITICAL: AI returned empty response!`);
      console.error(`   Provider: ${analysisProvider}`);
      console.error(`   Response length: ${analysisText?.length || 0} characters`);
      
      // Try to use fallback provider
      console.warn(`⚠️  Attempting fallback provider...`);
      if (analysisProvider !== 'grok') {
        console.log(`   Trying Grok instead of ${analysisProvider}...`);
        // Create new service for fallback
        const fallbackService = new GrokServiceV2({ headless: false });
        await fallbackService.initialize();
        
        const fallbackResult = await fallbackService.analyzeMultipleImages(
          [charImagePath, prodImagePath],
          analysisPrompt
        );
        
        const fallbackText = fallbackResult?.text || fallbackResult;
        
        if (fallbackText && fallbackText.trim().length > 0) {
          console.log(`   ✅ Fallback succeeded! Got ${fallbackText.length}ch from Grok`);
          await fallbackService.close();
          
          // Continue with fallback result
          const recommendations = parseRecommendations(fallbackText);
          const characterDescription = extractCharacterDescription(fallbackText);
          const newOptionsCreated = await autoSaveRecommendations(recommendations);
          
          cleanupTempFiles(tempFiles);
          
          return res.json({
            success: true,
            data: {
              analysis: fallbackText,
              recommendations,
              newOptionsCreated,
              grokConversationId: null,
              grokUrl: null,
              characterDescription,
              providers: {
                analysis: 'grok',
                fallback: true,
                originalProvider: analysisProvider
              },
              generatedImages: []
            },
            message: 'Analysis completed with fallback provider (original provider returned empty response)'
          });
        } else {
          await fallbackService.close();
          throw new Error(`Both ${analysisProvider} and Grok returned empty responses. Please try again.`);
        }
      } else {
        throw new Error(`Grok returned empty response. Please check your internet connection and try again.`);
      }
    }
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
      generationProvider = 'grok',  // 💫 Image generation provider selection
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
      productImagePath,
      language = 'en'  // 💫 Accept language parameter for Vietnamese support
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

    // 🔍 LOG: Show all options before sending to Google Flow
    console.log(`\n📒 GOOGLE FLOW OPTIONS SUMMARY:`);
    console.log(`   Scene: ${scene}`);
    console.log(`   Lighting: ${lighting}`);
    console.log(`   Mood: ${mood}`);
    console.log(`   Style: ${style}`);
    console.log(`   Color Palette: ${colorPalette}`);
    console.log(`   Camera Angle: ${cameraAngle}`);
    console.log(`   Aspect Ratio: ${aspectRatio}`);
    console.log(`   Image Count: ${imageCount}`);
    console.log(`   Negative Prompt: ${negativePrompt || '(none)'}\n`);

    // ====================================
    // 💫 NEW: Check if using Google Flow image generation
    // ====================================
    if (generationProvider === 'google-flow') {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🎯 IMAGE GENERATION - GOOGLE FLOW`);
      console.log(`${'='.repeat(80)}\n`);

      try {
        // 💫 Ensure aspect ratio is correctly passed to Google Flow
        console.log(`   🎯 Passing aspect ratio to Google Flow: ${aspectRatio}`);
        const genResult = await runImageGeneration({
          personImagePath: charImagePath,
          productImagePath: prodImagePath,
          prompt: prompt,
          negativePrompt: negativePrompt,  // 💫 Include negative prompt
          imageCount: imageCount,
          aspectRatio: aspectRatio,  // 💫 CRITICAL: Aspect ratio passed here
          outputDir: path.join(tempDir, 'image-gen-results')
        });

        // Cleanup temp files
        // 💫 IMPORTANT: CHANGED - Don't cleanup here! Files needed for video generation
        // cleanupTempFiles(tempFiles);  // ✅ REMOVED - cleanup moved to end of response

        // 💫 CHECK: Verify generation was successful
        if (!genResult.success || !genResult.results?.files || genResult.results.files.length === 0) {
          const errorMsg = genResult.error || 'Policy violation detected - images could not be generated after 3 attempts. Please change images and try again.';
          console.error(`❌ Generation failed with empty results:`, errorMsg);
          cleanupTempFiles(tempFiles);
          
          return res.json({
            success: false,
            data: {
              generatedImages: [],
              count: 0,
              expectedCount: imageCount,
              aspectRatio: aspectRatio,
              providers: { generation: 'google-flow' },
              error: errorMsg,
              retryable: false  // 💫 CHANGED: Not retryable after 3 attempts - need to change images
            },
            message: `Google Flow generation failed: ${errorMsg}`
          });
        }

        console.log(`✅ Google Flow image generation complete`);
        
        // 💫 IMPROVED: Create full URL with backend domain so frontend can access from port 3000
        // Files are saved to temp/google-flow-downloads/, and serveGeneratedImage endpoint serves them
        global.generatedImagePaths = global.generatedImagePaths || {};
        
        const generatedImages = (genResult.results?.files || []).map((filePath, idx) => {
          const filename = path.basename(filePath);
          
          // 💫 FULL URL: Include backend domain so frontend (port 3000) can fetch from backend (5000)
          // This resolves the ERR_FILE_NOT_FOUND issue when GalleryPicker tries to load images via blob URLs
          const imageUrl = `http://localhost:5000/api/v1/browser-automation/generated-image/${filename}`;
          
          // Store full path in global for backwards compatibility
          global.generatedImagePaths[filename] = filePath;
          // Auto-cleanup after 1 hour
          setTimeout(() => delete global.generatedImagePaths[filename], 60 * 60 * 1000);
          
          try {
            const size = fs.statSync(filePath).size;
            console.log(`  Image ${idx + 1}: ${filename} (${Math.round(size / 1024)}KB) → ${imageUrl}`);
            return {
              url: imageUrl,        // HTTP path with backend domain
              filename: filename,
              provider: 'google-flow',
              size: size
            };
          } catch (e) {
            console.error(`⚠️ Failed to stat ${filePath}:`, e.message);
            return {
              url: imageUrl,
              filename: filename,
              provider: 'google-flow',
              size: 0
            };
          }
        });

        console.log(`📤 Response: ${generatedImages.length} images ready`);
        console.log(`   URLs: ${generatedImages.map(img => img.url).join(', ')}`);
        console.log(`   File paths: ${(genResult.results?.files || []).join(', ')}`);
        
        // 💫 IMPORTANT: Store file paths globally so video generation can access them
        // This is a temporary solution - video generation will read from these paths
        global.lastGeneratedImagePaths = genResult.results?.files || [];
        global.lastInputImagePaths = {
          character: charImagePath,
          product: prodImagePath
        };
        
        // Auto-cleanup after 30 minutes if not used
        const cleanupTimeout = setTimeout(() => {
          console.log('🧹 Auto-cleaning generated image paths (30 min timeout)');
          delete global.lastGeneratedImagePaths;
          delete global.lastInputImagePaths;
        }, 30 * 60 * 1000);
        
        global.imageCleanupTimeout = cleanupTimeout;
        
        return res.json({
          success: true,
          data: {
            generatedImages: generatedImages,
            count: generatedImages.length,
            expectedCount: imageCount,
            aspectRatio: aspectRatio,
            providers: {
              generation: 'google-flow'
            },
            // 💫 NEW: Also return file paths for backend-to-backend communication
            filePaths: {
              generatedImages: genResult.results?.files || [],
              characterImage: charImagePath,
              productImage: prodImagePath
            }
          },
          message: `Images generated successfully via Google Labs Flow`
        });

      } catch (genError) {
        console.error(`❌ Google Flow Image Generation Error:`, genError.message);
        console.error(`Stack:`, genError.stack);
        cleanupTempFiles(tempFiles);
        
        return res.status(500).json({
          error: `Google Flow image generation failed: ${genError.message}`,
          success: false,
          stage: 'image-generation'
        });
      }
    }

    // ====================================
    // STEP 1: Initialize browser service (for Grok provider)
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
      
      // Read image buffer
      const imageBuffer = fs.readFileSync(outputImagePath);
      const filename = path.basename(outputImagePath);
      
      // ✅ STEP 1: Save locally (instant, non-blocking)
      console.log(`\n💾 Saving image locally...`);
      const localResult = await HybridStorage.saveImageLocally(imageBuffer, filename);
      
      if (!localResult.success) {
        throw new Error(`Failed to save image locally: ${localResult.error}`);
      }
      console.log(`   ✅ Local saved: ${localResult.localPath}`);
      
      // ✅ STEP 2: Create asset with BOTH storage locations
      const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const asset = {
        assetId: assetId,
        filename: filename,
        mimeType: 'image/png',
        fileSize: localResult.fileSize,
        assetType: 'image',
        assetCategory: 'generated-image',
        
        // Local: Immediately available
        localStorage: {
          location: 'local',
          path: localResult.localPath,
          fileSize: localResult.fileSize,
          savedAt: new Date(),
          verified: true
        },
        
        // Cloud: Will be synced in background
        cloudStorage: {
          location: 'google-drive',
          status: 'pending'
        },
        
        syncStatus: 'pending',
        userId: 'anonymous',
        generatedAt: new Date()
      };
      
      // Save to database
      await Asset.create(asset);
      console.log(`   ✅ Asset saved to DB: ${assetId}`);
      
      // ✅ Return immediately with LOCAL image URL
      storageResult = {
        success: true,
        assetId: assetId,
        localPath: localResult.localPath,
        fileSize: localResult.fileSize,
        url: `/api/assets/proxy/${assetId}?source=local`,
        storage: 'hybrid-local'  // Indicates using hybrid storage
      };
      
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
      storage: storageResult,
      assetId: storageResult.assetId  // Add asset ID
    };

    // Add URL based on storage type
    if (storageResult.url) {
      // Hybrid storage: Use the proxy URL (handles local + cloud fallback)
      generatedImage.url = storageResult.url;
      generatedImage.displayUrl = storageResult.url;
      generatedImage.assetId = storageResult.assetId;
    } else if (storageResult.cloudUrl) {
      // Legacy cloud storage: HTTPS URL
      generatedImage.cloudUrl = storageResult.cloudUrl;
      generatedImage.displayUrl = storageResult.displayUrl;
      generatedImage.url = storageResult.cloudUrl;
    } else if (storageResult.localPath) {
      // Legacy local storage: HTTP endpoint
      const filename = path.basename(outputImagePath);
      const httpUrl = `/api/v1/browser-automation/serve-image/${filename}`;
      generatedImage.localPath = storageResult.localPath;
      generatedImage.url = httpUrl;
      generatedImage.displayUrl = httpUrl;
    } else {
      // Fallback: Server temp file
      const filename = path.basename(outputImagePath);
      const httpUrl = `/api/v1/browser-automation/serve-image/${filename}`;
      generatedImage.url = httpUrl;
      generatedImage.displayUrl = httpUrl;
    }

    // ====================================
    // STEP 7: 💫 AUTO-SAVE ASSET TO DATABASE
    // ====================================
    try {
      console.log(`\n💾 Auto-saving asset to database...`);
      const assetResult = await AssetManager.saveAsset({
        filename: generatedImage.filename,
        mimeType: 'image/jpeg',
        fileSize: generatedImage.size,
        assetType: 'image',
        assetCategory: 'generated-image',
        userId: req.body.userId || 'anonymous',
        sessionId: req.body.sessionId,
        storage: {
          location: storageResult.storageType === 'cloud' ? 'google-drive' : 'local',
          localPath: storageResult.localPath,
          url: generatedImage.url,
          ...storageResult.cloudMetadata && { cloudMetadata: storageResult.cloudMetadata }
        },
        metadata: {
          format: 'jpeg',
          provider: imageGenProvider,
          grokConversationId: grokConversationId
        },
        tags: ['generated', 'browser-automation', imageGenProvider, scene, mood]
      }, { verbose: true });

      if (assetResult.success) {
        generatedImage.assetId = assetResult.asset.assetId;
        generatedImage.savedToDb = true;
        generatedImage.assetAction = assetResult.action; // 'created' or 'updated'
        console.log(`   ✅ Asset saved with ID: ${assetResult.asset.assetId}`);
      } else {
        console.warn(`   ⚠️  Asset save failed: ${assetResult.error}`);
        generatedImage.savedToDb = false;
      }
    } catch (assetError) {
      console.error(`   ❌ Error saving asset: ${assetError.message}`);
      generatedImage.savedToDb = false;
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
/**
 * 📸 BROWSER ANALYZE: Analyze character and product images
 * POST /api/flows/browser/analyze
 * Returns: Detailed analysis of character and product
 */
export async function analyzeBrowser(req, res) {
  let analysisService = null;
  const tempFiles = [];

  try {
    const { 
      analysisProvider = 'grok',
      useRealAnalysis = true
    } = req.body;
    
    const characterImage = req.files?.characterImage?.[0];
    const productImage = req.files?.productImage?.[0];

    if (!characterImage || !productImage) {
      return res.status(400).json({ 
        error: 'Both characterImage and productImage are required',
        success: false 
      });
    }

    console.log(`\n🔍 BROWSER ANALYSIS - START`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Provider: ${analysisProvider}`);

    // Save temp images
    const charImagePath = path.join(tempDir, `char-${Date.now()}-${characterImage.originalname}`);
    const prodImagePath = path.join(tempDir, `prod-${Date.now()}-${productImage.originalname}`);
    
    fs.writeFileSync(charImagePath, characterImage.buffer);
    fs.writeFileSync(prodImagePath, productImage.originalname);
    tempFiles.push(charImagePath, prodImagePath);

    console.log(`✅ Saved character image: ${path.basename(charImagePath)}`);
    console.log(`✅ Saved product image: ${path.basename(prodImagePath)}\n`);

    // Initialize analysis service
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

    console.log(`🚀 Initializing ${analysisProvider}...`);
    await analysisService.initialize();

    let analysisText = null;
    if (useRealAnalysis) {
      console.log(`🤖 Running real analysis...\n`);
      
      const analysisPrompt = buildAnalysisPrompt({});
      
      const analysisResult = await analysisService.analyzeMultipleImages(
        [charImagePath, prodImagePath],
        analysisPrompt
      );
      
      analysisText = analysisResult?.text || analysisResult;
      console.log(`✅ Analysis complete!`);
      console.log(`Result length: ${analysisText?.length || 0} characters\n`);
    } else {
      console.log(`⏭️  Skipping real analysis\n`);
      analysisText = 'Professional fashion styling, modern aesthetic recommended.';
    }

    // Close service
    if (analysisService) {
      await analysisService.close();
    }

    // Cleanup temp files
    cleanupTempFiles(tempFiles);

    console.log(`✅ BROWSER ANALYSIS - COMPLETE\n`);

    return res.json({
      success: true,
      data: {
        analysis: analysisText,
        provider: analysisProvider,
        timestamp: new Date().toISOString()
      },
      message: 'Analysis completed successfully'
    });

  } catch (error) {
    console.error(`❌ Analysis error:`, error.message);
    if (analysisService) await analysisService.close();
    cleanupTempFiles(tempFiles);
    
    return res.status(500).json({
      error: error.message,
      success: false,
      stage: 'analysis'
    });
  }
}

/**
 * 🎨 BROWSER GENERATE IMAGE: Generate image from analysis + styling options
 * POST /api/flows/browser/generate-image
 * Body: { characterImage, productImage, analysis, scene, lighting, mood, style, colorPalette, etc. }
 */
export async function generateImageBrowser(req, res) {
  let imageGenService = null;
  const tempFiles = [];
  let outputImagePath = null;

  try {
    const {
      imageGenProvider = 'grok',
      analysis,
      scene = 'studio',
      lighting = 'soft-diffused',
      mood = 'confident',
      style = 'minimalist',
      colorPalette = 'neutral',
      hairstyle = null,
      makeup = null,
      cameraAngle = 'eye-level',
      shoes = null,
      accessories = null,
      aspectRatio = '1:1'
    } = req.body;

    if (!analysis) {
      return res.status(400).json({
        error: 'Analysis object is required',
        success: false
      });
    }

    // Get images for reference (optional for styling)
    const characterImage = req.files?.characterImage?.[0];
    const productImage = req.files?.productImage?.[0];

    console.log(`\n🎨 BROWSER IMAGE GENERATION - START`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Provider: ${imageGenProvider}`);
    console.log(`Scene: ${scene}, Lighting: ${lighting}, Mood: ${mood}`);
    if (hairstyle) console.log(`Hairstyle override: ${hairstyle}`);
    if (makeup) console.log(`Makeup override: ${makeup}`);
    if (shoes) console.log(`Shoes: ${shoes}`);
    if (accessories) console.log(`Accessories: ${accessories}`);
    console.log('');

    // Save temp images if provided
    let charImagePath = null;
    let prodImagePath = null;
    
    if (characterImage) {
      charImagePath = path.join(tempDir, `char-${Date.now()}-${characterImage.originalname}`);
      fs.writeFileSync(charImagePath, characterImage.buffer);
      tempFiles.push(charImagePath);
      console.log(`✅ Saved character image for reference`);
    }
    
    if (productImage) {
      prodImagePath = path.join(tempDir, `prod-${Date.now()}-${productImage.originalname}`);
      fs.writeFileSync(prodImagePath, productImage.buffer);
      tempFiles.push(prodImagePath);
      console.log(`✅ Saved product image for reference`);
    }

    // Build style options
    const styleOptions = {
      scene,
      lighting,
      mood,
      style,
      colorPalette,
      cameraAngle,
      hairstyle,
      makeup,
      shoes,
      accessories,
      aspectRatio,
      negativePrompt: 'blurry, distorted, bad lighting, ill-fitting clothes'
    };

    console.log(`\n🔨 Building generation prompt...`);
    const generationPrompt = buildGenerationPrompt(analysis, styleOptions);
    console.log(`✅ Prompt built successfully\n`);

    // Initialize image generation service
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

    console.log(`🚀 Initializing ${imageGenProvider}...`);
    await imageGenService.initialize();

    try {
      outputImagePath = path.join(tempDir, `browser-gen-${Date.now()}.png`);
      
      console.log(`🖼️  Generating image with prompt...`);
      console.log(`⏳ This may take a minute...\n`);
      
      const imageResult = await imageGenService.generateImage(generationPrompt, {
        download: true,
        outputPath: outputImagePath
      });
      
      console.log(`✅ Image generation complete`);
      
      if (imageResult?.path) {
        outputImagePath = imageResult.path;
      }

      if (!outputImagePath || !fs.existsSync(outputImagePath)) {
        throw new Error('Image generation failed - no output file');
      }

      // Validate image
      console.log(`\n✔️ Validating generated image...`);
      try {
        await validateImage(outputImagePath);
      } catch (valError) {
        console.warn(`⚠️  Validation warning: ${valError.message}`);
        // Don't fail on validation warning
      }

      // Close service
      if (imageGenService) {
        await imageGenService.close();
      }

      // Cleanup temp files but keep output
      const filesToClean = tempFiles.filter(f => f !== outputImagePath);
      cleanupTempFiles(filesToClean);

      const fileStats = fs.statSync(outputImagePath);

      console.log(`✅ BROWSER IMAGE GENERATION - COMPLETE\n`);

      return res.json({
        success: true,
        data: {
          generatedImage: {
            url: `file://${outputImagePath}`,
            path: outputImagePath,
            size: fileStats.size,
            filename: path.basename(outputImagePath),
            provider: imageGenProvider
          },
          prompt: generationPrompt,
          styleOptions,
          validation: {
            status: 'valid',
            size_bytes: fileStats.size,
            timestamp: new Date().toISOString()
          }
        },
        message: 'Image generated successfully with style customization'
      });

    } catch (genError) {
      console.error(`❌ Generation error: ${genError.message}`);
      if (imageGenService) await imageGenService.close();
      cleanupTempFiles(tempFiles);
      
      return res.status(500).json({
        error: `Generation failed: ${genError.message}`,
        success: false,
        stage: 'generation'
      });
    }

  } catch (error) {
    console.error(`❌ Fatal error:`, error.message);
    if (imageGenService) await imageGenService.close();
    cleanupTempFiles(tempFiles);
    
    return res.status(500).json({
      error: error.message,
      success: false,
      stage: 'generation'
    });
  }
}

/**
 * 📸 Serve generated images from storage
 * GET /v1/browser-automation/generated-image/:id
 * 
 * ID format: This can be either:
 * 1. A full path lookup via global.generatedImagePaths (backwards compat)
 * 2. A direct filename (new approach - searches common locations)
 */
export async function serveGeneratedImage(req, res) {
  try {
    const { id } = req.params;
    
    console.log(`📍 serveGeneratedImage: Looking up ${id}`);
    
    let filePath = null;
    
    // 💫 NEW: First check if it's in global mapping (backwards compatibility)
    if (global.generatedImagePaths && global.generatedImagePaths[id]) {
      filePath = global.generatedImagePaths[id];
      console.log(`✓ Found in global mapping: ${filePath}`);
    } else {
      // 💫 NEW: Try direct filename lookup in known locations
      const searchPaths = [
        path.join(tempDir, 'google-flow-downloads', id),
        path.join(tempDir, 'image-gen-results', id),
        path.join(tempDir, id)
      ];
      
      console.log(`🔍 Global mapping miss. Searching in ${searchPaths.length} locations...`);
      
      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          filePath = searchPath;
          console.log(`✓ Found at: ${searchPath}`);
          break;
        }
      }
    }
    
    if (!filePath || !fs.existsSync(filePath)) {
      console.warn(`⚠️ Generated image not found: ${id}`);
      console.warn(`   Checked locations: temp/google-flow-downloads/${id}, temp/image-gen-results/${id}, temp/${id}`);
      return res.status(404).json({
        success: false,
        error: 'Image not found or expired'
      });
    }
    
    // Security check: ensure path is within temp directory
    const realPath = path.resolve(filePath);
    const tempBasePath = path.resolve(tempDir);
    
    if (!realPath.startsWith(tempBasePath)) {
      console.error(`🚨 Security violation: Attempted to access file outside temp dir:`, realPath);
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = contentTypeMap[ext] || 'image/jpeg';
    
    // 💫 IMPROVED: Get file stats for logging
    const stats = fs.statSync(filePath);
    console.log(`📸 Streaming ${path.basename(filePath)} (${Math.round(stats.size / 1024)}KB)`);
    
    // Stream the image file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Length', stats.size);
    
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (err) => {
      console.error(`❌ Error streaming file ${filePath}:`, err.message, err.code);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream image' });
      } else {
        res.end();
      }
    });
    
    fileStream.on('end', () => {
      console.log(`✓ File stream completed: ${path.basename(filePath)}`);
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Error serving generated image:', error.message);
    console.error('   Stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export async function generateVideoBrowser(req, res) {
  try {
    const { duration, scenario, segments, sourceImage, provider = 'grok', videoProvider = 'grok', aspectRatio = '16:9', language = 'en' } = req.body;
    
    // Accept both provider and videoProvider for backward compatibility
    const selectedProvider = videoProvider || provider || 'grok';
    
    console.log(`📝 Language: ${language}`);  // 💫 Log language
    
    // 💫 Validate aspect ratio
    const validAspectRatios = ['16:9', '9:16'];
    const selectedAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '16:9';

    // 💫 DEBUG: Log provider selection
    console.log('\n🎬 [Backend] generateVideoBrowser received:', {
      resquestProvider: provider,
      requestVideoProvider: videoProvider,
      selectedProvider: selectedProvider,
      hasVideoProvider: !!videoProvider,
      hasProvider: !!provider,
      duration,
      scenario,
      segmentCount: segments?.length || 0,
      aspectRatio,
      selectedAspectRatio,
      language  // 💫 Log language
    });

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

    // Support both Grok and Google Flow
    if (selectedProvider !== 'grok' && selectedProvider !== 'google-flow') {
      return res.status(400).json({
        success: false,
        error: `Video generation supported for: grok, google-flow. Got: ${selectedProvider}`
      });
    }

    console.log('\n🎬 VIDEO GENERATION REQUEST');
    console.log('━'.repeat(80));
    console.log(`Duration: ${duration}s`);
    console.log(`Scenario: ${scenario}`);
    console.log(`Segments: ${segments.length}`);
    console.log(`Provider: ${selectedProvider}`);
    console.log('');

    // ====================================
    // Handle Google Flow video generation
    // ====================================
    if (selectedProvider === 'google-flow') {
      console.log('\n📺 [Backend] ✅ Using Google Flow for video generation');
      console.log('   selectedProvider:', selectedProvider);
      console.log(`   Segments: ${segments.length}`);
      console.log(`   Duration: ${duration}s\n`);

      // 💫 COMPUTE ACTUAL SEGMENTS BASED ON 8S PER VIDEO
      // Example: 20s / 8s = 2.5 → 3 segments
      const SECONDS_PER_VIDEO = 8;
      const numSegments = Math.ceil(duration / SECONDS_PER_VIDEO);
      
      console.log(`   📊 Segment calculation:`);
      console.log(`      Total duration: ${duration}s`);
      console.log(`      Per video length: ${SECONDS_PER_VIDEO}s`);
      console.log(`      Computed segments: ${numSegments}`);
      console.log(`      Input segments: ${segments.length}`);
      
      // Use input segments if available, otherwise split duration
      const finalSegments = segments && segments.length > 0 ? segments : 
                           Array(numSegments).fill(null).map((_, i) => 
                             `Segment ${i + 1}: ${scenario || 'Fashion video'}`
                           );

      console.log(`   🎯 Final segments to generate: ${finalSegments.length}\n`);

      try {
        const { default: GoogleFlowAutomationService } = await import('../services/googleFlowAutomationService.js');
        
        const generatedVideos = [];
        const outputDir = path.join(tempDir, `video-output-${Date.now()}`);
        
        // Create output directory
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // 💫 CONVERT IMAGE TO FILE PATH (handle base64, API URLs, or local paths)
        let imagePath = sourceImage;
        
        // Handle API URLs like /api/v1/browser-automation/generated-image/...
        if (sourceImage && sourceImage.startsWith('/api/')) {
          console.log('   📋 Resolving API image URL to file path...');
          const filename = path.basename(sourceImage);
          const localPath = global.generatedImagePaths?.[filename];
          
          if (localPath && fs.existsSync(localPath)) {
            imagePath = localPath;
            console.log(`   ✅ Resolved API URL to local file: ${imagePath}`);
          } else {
            console.warn(`   ⚠️  API image URL not found in cache, searching downloads folder...`);
            // Try common locations
            const possiblePaths = [
              path.join(tempDir, 'google-flow-downloads', filename),
              path.join(tempDir, filename),
              path.join(process.cwd(), 'temp', filename)
            ];
            
            const foundPath = possiblePaths.find(p => fs.existsSync(p));
            if (foundPath) {
              imagePath = foundPath;
              console.log(`   ✅ Found image at: ${imagePath}`);
            } else {
              console.warn(`   ⚠️  Could not resolve API URL: ${sourceImage}`);
            }
          }
        }
        // Handle base64 images
        else if (sourceImage && sourceImage.startsWith('data:')) {
          console.log('   📋 Converting base64 image to file...');
          const base64Match = sourceImage.match(/^data:image\/(\w+);base64,(.+)$/);
          if (base64Match) {
            const imageFormat = base64Match[1] || 'jpeg';
            const imageBuffer = Buffer.from(base64Match[2], 'base64');
            imagePath = path.join(tempDir, `video-source-${Date.now()}.${imageFormat}`);
            fs.writeFileSync(imagePath, imageBuffer);
            console.log(`   ✅ Image saved to: ${imagePath}`);
          }
        }

        // 💫 LOOP: Generate video for EACH segment
        for (let i = 0; i < finalSegments.length; i++) {
          const segmentPrompt = finalSegments[i];
          const segmentNum = i + 1;
          
          console.log(`\n📹 [VIDEO ${segmentNum}/${finalSegments.length}] Generating...`);
          console.log(`    Prompt: "${segmentPrompt.substring(0, 100)}..."`);

          try {
            const result = await runVideoGeneration({
              imagePath: imagePath,  // 💫 USE CONVERTED IMAGE PATH
              prompt: segmentPrompt,
              duration: SECONDS_PER_VIDEO,  // Each video is 8s
              quality: 'high',
              aspectRatio: selectedAspectRatio,  // 💫 USE SELECTED ASPECT RATIO (16:9 or 9:16)
              outputDir: outputDir,
              headless: false
            });

            if (result.success && result.videoPath) {
              console.log(`    ✅ Video ${segmentNum} generated successfully`);
              
              // 💫 GET PATH FROM RESULT AND RENAME
              const srcFile = result.videoPath;
              const destFile = path.join(outputDir, `segment-${segmentNum}-video.mp4`);
              
              // Rename file: segment-${segmentNum}-video.mp4
              if (fs.existsSync(srcFile) && srcFile !== destFile) {
                fs.renameSync(srcFile, destFile);
                console.log(`    📁 Renamed to: segment-${segmentNum}-video.mp4`);
              }
              
              generatedVideos.push({
                segmentNum,
                filename: `segment-${segmentNum}-video.mp4`,
                path: destFile,
                prompt: segmentPrompt
              });
            } else {
              console.warn(`    ⚠️  Video ${segmentNum} generation failed: ${result.error}`);
            }
          } catch (segmentError) {
            console.error(`    ❌ Error generating video ${segmentNum}:`, segmentError.message);
          }
        }

        console.log(`\n━`.repeat(40));
        console.log(`✅ Video generation batch complete: ${generatedVideos.length}/${finalSegments.length} videos`);
        console.log(`━`.repeat(40));

        const responseData = {
          success: true,
          data: {
            generatedVideos: generatedVideos.map(v => ({
              segmentNum: v.segmentNum,
              filename: v.filename,
              path: v.path,  // 💫 NEW: Include full path for download
              url: `/api/v1/browser-automation/download-video/${v.filename}?path=${encodeURIComponent(v.path)}`,
              previewUrl: `/api/v1/browser-automation/preview-video/${v.filename}?path=${encodeURIComponent(v.path)}`,
              prompt: v.prompt
            })),
            totalVideos: generatedVideos.length,
            totalSegments: finalSegments.length,
            computedSegments: numSegments,
            outputDir: outputDir,
            provider: 'google-flow',
            aspectRatio: selectedAspectRatio,  // 💫 NEW: Include aspect ratio in response
            scenario,
            duration,
            generatedAt: new Date().toISOString()
          },
          message: `Generated ${generatedVideos.length} videos successfully via Google Flow`
        };

        // 💫 DEBUG: Log full response structure
        console.log('\n📤 [Backend Response]');
        console.log(JSON.stringify(responseData, null, 2));

        return res.json(responseData);

      } catch (flowError) {
        console.error(`❌ Google Flow Video Generation Error:`, flowError.message);

        return res.status(500).json({
          error: `Google Flow video generation failed: ${flowError.message}`,
          success: false,
          stage: 'video-generation'
        });
      }
    }

    // ====================================
    // Default: Grok video generation
    // ====================================
    console.log('\n🤖 [Backend] ❌ Using Grok for video generation (NOT Google Flow)');
    console.log('   selectedProvider:', selectedProvider);
    console.log('   Verify that frontend is sending videoProvider or check default value\n');

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
      provider: 'grok'
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
          provider: 'grok'
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
          const ext = new URL(imageUrl).pathname.split('.').pop() || 'jpg';
          resolve(`data:image/${ext};base64,${base64}`);
        });
      }).on('error', reject);
    });
  } catch (error) {
    console.error('Failed to download image:', error.message);
    throw error;
  }
}

/**
 * Generate video using selected provider (Grok or Google Flow)
 * @param {Object} req - Express request with videoProvider, prompt, duration, quality, etc.
 * @param {Object} res - Express response
 */
export async function generateVideo(req, res) {
  try {
    const {
      videoProvider = 'grok',  // 💫 Video provider selection
      prompt,
      imagePath,  // 💫 Path to image file for video generation
      imageBase64,  // 💫 Base64 encoded image
      duration = 5,  // seconds
      quality = 'high',  // low, medium, high
      aspectRatio = '16:9',  // 16:9, 9:16, 1:1
      characterImageBase64,  // Optional: for Grok background generation
      productImageBase64,  // Optional: for context
      // 💫 NEW: Accept file paths from frontend image generation step
      generatedImagePaths = [],
      characterImagePath,
      productImagePath,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required',
        success: false
      });
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎬 VIDEO GENERATION - ${videoProvider.toUpperCase()}`);
    console.log(`${'='.repeat(80)}\n`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📐 Aspect Ratio: ${aspectRatio}`);
    console.log(`✨ Quality: ${quality}\n`);

    // ====================================
    // 💫 Check if using Google Flow video generation
    // ====================================
    if (videoProvider === 'google-flow') {
      console.log(`📺 Using Google Labs Flow for video generation\n`);

      try {
        let finalImagePath = imagePath;

        // 💫 PRIORITY: Use generated image from frontend (from image generation step)
        if (generatedImagePaths && generatedImagePaths.length > 0) {
          console.log(`   📷 Using generated image from frontend: ${generatedImagePaths[0]}`);
          finalImagePath = generatedImagePaths[0];
        }

        // 💫 PRIORITY 2: Use passed characterImagePath
        if (!finalImagePath && characterImagePath) {
          console.log(`   📷 Using character image path: ${characterImagePath}`);
          finalImagePath = characterImagePath;
        }

        // 💫 PRIORITY 3: Handle API image URLs (resolve to local file path)
        if (!finalImagePath && imagePath && imagePath.startsWith('/api/')) {
          console.log(`   📋 Resolving API image URL to file path...`);
          const filename = path.basename(imagePath);
          const localPath = global.generatedImagePaths?.[filename];
          
          if (localPath && fs.existsSync(localPath)) {
            finalImagePath = localPath;
            console.log(`   ✅ Resolved API URL to local file: ${finalImagePath}`);
          } else {
            console.warn(`   ⚠️  API image URL not found in cache, searching downloads folder...`);
            // Try common locations
            const possiblePaths = [
              path.join(tempDir, 'google-flow-downloads', filename),
              path.join(tempDir, filename),
              path.join(process.cwd(), 'temp', filename)
            ];
            
            const foundPath = possiblePaths.find(p => fs.existsSync(p));
            if (foundPath) {
              finalImagePath = foundPath;
              console.log(`   ✅ Found image at: ${finalImagePath}`);
            } else {
              console.warn(`   ⚠️  Could not resolve API URL: ${imagePath}`);
            }
          }
        }
        // 💫 NEW: Handle Base64 image upload
        else if (imageBase64 && !imagePath) {
          const base64Match = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!base64Match) {
            throw new Error('Invalid Base64 image format');
          }
          
          const imageFormat = base64Match[1];
          const imageBuffer = Buffer.from(base64Match[2], 'base64');
          const tempImagePath = path.join(tempDir, `video-source-${Date.now()}.${imageFormat}`);
          
          fs.writeFileSync(tempImagePath, imageBuffer);
          finalImagePath = tempImagePath;
          console.log(`✓ Saved uploaded image to ${tempImagePath}\n`);
        }

        const videoResult = await runVideoGeneration({
          prompt: prompt,
          imagePath: finalImagePath,  // 💫 NEW: Pass image path to service
          duration: duration,
          aspectRatio: aspectRatio,
          quality: quality,
          outputDir: path.join(process.cwd(), 'temp', 'video-results')
        });

        if (!videoResult.success) {
          throw new Error(videoResult.error || 'Video generation failed');
        }

        console.log(`✅ Google Flow video generation complete`);

        return res.json({
          success: true,
          data: {
            video: videoResult.video,
            provider: 'google-flow',
            prompt: prompt,
            duration: duration,
            quality: quality,
            aspectRatio: aspectRatio,
            hasImage: !!finalImagePath,  // 💫 NEW: Indicate if image was used
            generatedAt: new Date().toISOString()
          },
          message: `Video generated successfully via Google Labs Flow`
        });

      } catch (flowError) {
        console.error(`❌ Google Flow Video Generation Error:`, flowError.message);

        return res.status(500).json({
          error: `Google Flow video generation failed: ${flowError.message}`,
          success: false,
          stage: 'video-generation'
        });
      }
    }

    // ====================================
    // Default: Grok video generation (with segments)
    // ====================================
    console.log(`🤖 Using Grok for video generation\n`);

    try {
      // For Grok, we might use image-based video generation if images provided
      let imageBase64 = null;

      if (characterImageBase64) {
        imageBase64 = characterImageBase64;
      } else if (productImageBase64) {
        imageBase64 = productImageBase64;
      }

      const grokService = new GrokServiceV2({ headless: false });

      let videoResult;

      if (imageBase64) {
        // Video generation from image with segments
        const segments = [prompt]; // Can split prompt into segments for complex videos

        videoResult = await grokService.generateVideoWithSegments(imageBase64, segments, {
          duration: duration,
          scenario: prompt.substring(0, 100),
          quality: quality
        });
      } else {
        // Text-only video generation - will use Grok's direct video generation
        videoResult = {
          success: true,
          message: 'Use text prompt for Grok video generation',
          prompt: prompt,
          duration: duration
        };
      }

      console.log(`✅ Grok video generation setup complete`);

      return res.json({
        success: true,
        data: {
          video: videoResult,
          provider: 'grok',
          prompt: prompt,
          duration: duration,
          quality: quality,
          aspectRatio: aspectRatio,
          generatedAt: new Date().toISOString()
        },
        message: `Video generation initiated via Grok`
      });

    } catch (grokError) {
      console.error(`❌ Grok Video Generation Error:`, grokError.message);

      return res.status(500).json({
        error: `Grok video generation failed: ${grokError.message}`,
        success: false,
        stage: 'video-generation'
      });
    }

  } catch (error) {
    console.error('❌ Video generation error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * 💫 NEW: Multi-Video Generation with Content Use Cases
 * Generates seamless multi-video sequences for content workflows
 * Supports frame chaining, ChatGPT-based prompting, and reference image management
 */
export async function generateMultiVideoSequence(req, res) {
  try {
    const {
      sessionId = `session-${Date.now()}`,  // Unique session ID
      useCase,  // 'change-clothes', 'product-showcase', 'styling-guide', etc.
      refImage = null,  // Base64 encoded reference image
      analysis = null,  // Analysis data from previous step (character, product details)
      duration = 20,  // Total duration (will be split into segments)
      quality = 'high',  // low, medium, high
      aspectRatio = '16:9',  // 16:9, 9:16, 1:1
      videoProvider = 'google-flow'  // Provider for video generation
    } = req.body;

    // Validate required parameters
    if (!useCase) {
      return res.status(400).json({
        error: 'useCase is required',
        success: false
      });
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎬 MULTI-VIDEO GENERATION WITH CONTENT USE CASE`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Session: ${sessionId}`);
    console.log(`Use Case: ${useCase}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Provider: ${videoProvider}`);
    console.log(`Quality: ${quality}`);
    console.log();

    try {
      // Import the multi-video service
      const MultiVideoGenerationService = (await import('../services/multiVideoGenerationService.js')).default;
      const multiVideoService = new MultiVideoGenerationService();

      // Generate multi-video sequence
      const result = await multiVideoService.generateMultiVideoSequence({
        sessionId,
        useCase,
        duration,
        refImage,
        analysis,
        quality,
        aspectRatio,
        videoProvider
      });

      // Close browser after generation
      try {
        await multiVideoService.close();
      } catch (closeError) {
        console.warn(`Warning: Could not close browser: ${closeError.message}`);
      }

      if (!result.success) {
        return res.status(500).json({
          error: result.error,
          success: false,
          sessionId: sessionId,
          videosGenerated: result.videosGenerated || 0
        });
      }

      return res.json({
        success: true,
        data: {
          sessionId: sessionId,
          useCase: useCase,
          videos: result.videos,
          videoCount: result.videoCount,
          totalDuration: result.totalDuration,
          frameChaining: result.frameChaining,
          frameMetadata: result.frameMetadata,
          quality: quality,
          aspectRatio: aspectRatio,
          generatedAt: new Date().toISOString(),
          sessionPath: result.sessionPath
        },
        message: `Successfully generated ${result.videoCount} videos for ${useCase} workflow`
      });

    } catch (serviceError) {
      console.error(`❌ Multi-Video Service Error:`, serviceError.message);
      
      return res.status(500).json({
        error: `Multi-video generation failed: ${serviceError.message}`,
        success: false,
        sessionId: sessionId,
        useCase: useCase,
        stage: 'multi-video-generation'
      });
    }

  } catch (error) {
    console.error('❌ Multi-video generation error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}
