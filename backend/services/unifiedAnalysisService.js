/**
 * Unified Analysis Service
 * 
 * CORE CONCEPT: Send BOTH images (character + product) in a SINGLE API call.
 * AI analyzes both, compares them, and recommends options from our DB.
 * 
 * This replaces the old 2-call approach (analyzeCharacter + analyzeProduct).
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import PromptOption from '../models/PromptOption.js';
import { getKeyManager, executeWithKeyRotation } from '../utils/keyManager.js';
import { getAnalysisProviders } from '../config/analysisProviders.js';
import AIModel from '../models/AIModel.js';

// ============================================================
// ANALYZE MULTIPLE IMAGES WITH GOOGLE GEMINI (Native)
// ============================================================

async function analyzeMultipleImagesWithGemini(imagePaths, prompt) {
  const keyManager = getKeyManager('google');
  const keyInfo = keyManager.getNextKey();
  const apiKey = keyInfo.key;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY missing');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  console.log('   Gemini: Analyzing multiple images...');
  
  const imageParts = [];
  for (const imgPath of imagePaths) {
    const imageBuffer = fs.readFileSync(imgPath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(imgPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    imageParts.push({
      inlineData: {
        data: base64,
        mimeType
      }
    });
  }
  
  const contents = [
    ...imageParts,
    { text: prompt }
  ];
  
  const result = await model.generateContent(contents);
  const response = result.response;
  const text = response.text();
  
  return text;
}

// ============================================================
// LOAD ALL OPTIONS FROM DB FOR AI CONTEXT
// ============================================================

async function loadAllOptionsForAI() {
  console.log('\n📦 Loading all prompt options from DB for AI context...');
  
  const categories = ['scene', 'lighting', 'mood', 'style', 'colorPalette', 'cameraAngle'];
  const allOptions = {};
  
  for (const category of categories) {
    try {
      const options = await PromptOption.find({ category }).sort({ usageCount: -1, label: 1 });
      
      if (options.length > 0) {
        allOptions[category] = options.map(opt => ({
          value: opt.value,
          label: opt.label,
          description: opt.description || '',
          keywords: opt.keywords || []
        }));
        console.log(`   ✅ ${category}: ${options.length} options loaded`);
      } else {
        allOptions[category] = getDefaultOptions(category);
        console.log(`   ⚠️  ${category}: Using ${allOptions[category].length} default options (DB empty)`);
      }
    } catch (error) {
      allOptions[category] = getDefaultOptions(category);
      console.log(`   ⚠️  ${category}: Using defaults (DB error: ${error.message})`);
    }
  }
  
  console.log(`📦 Total options loaded: ${Object.values(allOptions).flat().length}\n`);
  return allOptions;
}

// ============================================================
// DEFAULT OPTIONS FALLBACK
// ============================================================

function getDefaultOptions(category) {
  const defaults = {
    scene: [
      { value: 'studio', label: 'Professional Studio', description: 'Clean studio with seamless backdrop' },
      { value: 'white-background', label: 'White Background', description: 'Pure white for product focus' },
      { value: 'urban-street', label: 'Urban Street', description: 'City street environment' },
      { value: 'minimalist-indoor', label: 'Minimalist Indoor', description: 'Simple indoor setting' },
      { value: 'cafe', label: 'Cafe', description: 'Coffee shop environment' },
      { value: 'outdoor-park', label: 'Outdoor Park', description: 'Natural park setting' },
      { value: 'office', label: 'Modern Office', description: 'Contemporary office space' },
      { value: 'luxury-interior', label: 'Luxury Interior', description: 'High-end interior' },
      { value: 'rooftop', label: 'Rooftop', description: 'Urban rooftop with skyline' }
    ],
    lighting: [
      { value: 'soft-diffused', label: 'Soft Diffused', description: 'Large softbox, flattering, even' },
      { value: 'natural-window', label: 'Natural Window', description: 'Soft window light, organic' },
      { value: 'golden-hour', label: 'Golden Hour', description: 'Warm sunset/sunrise glow' },
      { value: 'dramatic-rembrandt', label: 'Dramatic Rembrandt', description: 'Strong key light, deep shadows' },
      { value: 'high-key', label: 'High Key', description: 'Bright, minimal shadows, clean' },
      { value: 'backlit', label: 'Backlit', description: 'Light from behind, rim glow' },
      { value: 'neon-colored', label: 'Neon/Colored', description: 'Colored gels, creative mood' },
      { value: 'overcast-outdoor', label: 'Overcast Outdoor', description: 'Even outdoor light, no harsh shadows' }
    ],
    mood: [
      { value: 'confident', label: 'Confident & Powerful', description: 'Strong stance, direct gaze' },
      { value: 'relaxed', label: 'Relaxed & Casual', description: 'Natural, comfortable' },
      { value: 'elegant', label: 'Elegant & Sophisticated', description: 'Refined, graceful' },
      { value: 'energetic', label: 'Energetic & Dynamic', description: 'Active, movement' },
      { value: 'playful', label: 'Playful & Fun', description: 'Lighthearted, joyful' },
      { value: 'mysterious', label: 'Mysterious & Edgy', description: 'Dark, intriguing' },
      { value: 'romantic', label: 'Romantic & Dreamy', description: 'Soft, ethereal' },
      { value: 'professional', label: 'Professional & Corporate', description: 'Business-appropriate' }
    ],
    style: [
      { value: 'minimalist', label: 'Minimalist', description: 'Clean, simple, negative space' },
      { value: 'editorial', label: 'Editorial', description: 'Magazine-quality, artistic' },
      { value: 'commercial', label: 'Commercial', description: 'Product-focused, selling' },
      { value: 'lifestyle', label: 'Lifestyle', description: 'Natural, candid feel' },
      { value: 'high-fashion', label: 'High Fashion', description: 'Avant-garde, dramatic' },
      { value: 'vintage', label: 'Vintage/Retro', description: 'Film-like, nostalgic' },
      { value: 'street', label: 'Street Style', description: 'Urban, authentic' },
      { value: 'bohemian', label: 'Bohemian', description: 'Free-spirited, artistic' }
    ],
    colorPalette: [
      { value: 'neutral', label: 'Neutral', description: 'Black, white, gray, beige - versatile' },
      { value: 'warm', label: 'Warm Tones', description: 'Reds, oranges, yellows - inviting' },
      { value: 'cool', label: 'Cool Tones', description: 'Blues, greens, purples - calming' },
      { value: 'pastel', label: 'Pastel', description: 'Soft pinks, blues, greens - gentle' },
      { value: 'monochrome', label: 'Monochrome', description: 'Single color family variations' },
      { value: 'vibrant', label: 'Vibrant/High-saturation', description: 'Bold, eye-catching colors' },
      { value: 'earth-tones', label: 'Earth Tones', description: 'Browns, greens, terracotta - natural' },
      { value: 'metallic', label: 'Metallic', description: 'Gold, silver, bronze accents' }
    ],
    cameraAngle: [
      { value: 'eye-level', label: 'Eye Level', description: 'Natural, direct perspective' },
      { value: 'slight-angle', label: 'Slight Angle', description: 'Slightly from above or below' },
      { value: 'three-quarter', label: 'Three-Quarter', description: 'Classic flattering angle' },
      { value: 'full-front', label: 'Full Front', description: 'Directly facing camera' },
      { value: 'over-shoulder', label: 'Over Shoulder', description: 'Profile with shoulder visible' }
    ]
  };
  
  return defaults[category] || [];
}

// ============================================================
// BUILD UNIFIED PROMPT
// ============================================================

function buildUnifiedPrompt(allOptions, useCase, productFocus) {
  const sceneOpts = allOptions.scene?.map(o => o.value).join(', ') || 'studio, outdoor, urban';
  const lightingOpts = allOptions.lighting?.map(o => o.value).join(', ') || 'soft, natural, dramatic';
  const moodOpts = allOptions.mood?.map(o => o.value).join(', ') || 'confident, elegant, relaxed';
  const styleOpts = allOptions.style?.map(o => o.value).join(', ') || 'minimalist, editorial, commercial';
  const colorOpts = allOptions.colorPalette?.map(o => o.value).join(', ') || 'neutral, warm, cool';
  const cameraOpts = allOptions.cameraAngle?.map(o => o.value).join(', ') || 'eye-level, three-quarter';

  return `You are an elite AI fashion stylist and technical photographer. Your task is to analyze BOTH images to create a highly detailed generation prompt.

IMAGES TO ANALYZE:
1. Character/Model image: Analyze physique, skin, hair, facial features, and pose.
2. Product image: Analyze the clothing item(s) in extreme technical detail (fabric, cut, texture, stitching).

USE CASE: ${useCase}
PRODUCT FOCUS: ${productFocus}

AVAILABLE OPTIONS:
SCENE: ${sceneOpts}
LIGHTING: ${lightingOpts}
MOOD: ${moodOpts}
STYLE: ${styleOpts}
COLOR PALETTE: ${colorOpts}
CAMERA ANGLE: ${cameraOpts}

TASK:
Provide a JSON response with these EXACT fields. Do not omit any field.

{
  "character": {
    "gender": "male, female, or non-binary (be precise based on visual)",
    "age": "specific age range (e.g. 25-28)",
    "bodyType": "precise body shape (e.g. hourglass, athletic, slim, curvy, pear, rectangle)",
    "skinTone": "detailed skin tone (e.g. fair cool, olive warm, deep brown, porcelain)",
    "hair": { 
      "color": "exact color (e.g. honey blonde, jet black)", 
      "length": "short/medium/long", 
      "style": "wavy/straight/curly/braided/updo" 
    },
    "facialFeatures": "distinctive features (e.g. high cheekbones, freckles, sharp jawline)",
    "overallVibe": "specific vibe (e.g. confident executive, boho chic, streetwear edginess)"
  },
  "product": {
    "category": "exact category (e.g. Maxi Dress, T-Shirt, Suit)",
    "type": "Top, Bottom, One-Piece, Outerwear, or Accessory",
    "detailedDescription": "A comprehensive paragraph describing the garment. FORCEFULLY include fabric texture (silk, denim), cut, fit, neckline, sleeve length, patterns, and distinctive details.",
    "technicalDetails": {
      "fabric": "material name (e.g. 100% Cotton, Satin, Heavy Denim)",
      "texture": "texture description (e.g. ribbed, smooth, distressed)",
      "pattern": "pattern details (e.g. floral, solid, stripes)",
      "neckline": "neckline type (e.g. V-neck, crew, halter)",
      "sleeves": "sleeve length/style (e.g. sleeveless, long puff, cap)",
      "fit": "fit type (e.g. Oversized, Slim, Tailored, Bodycon)"
    },
    "colors": ["primary color", "secondary color"]
  },
  "compatibility": {
    "score": 0-100,
    "reasoning": "Why this product works (or doesn't) with this character",
    "fitAssessment": "How well the item fits the character's body type"
  },
  "recommendations": {
    "scene": { 
      "primary": "MUST be from available list: ${sceneOpts}. Choose the BEST match for this character + product. If the product is a formal dress, choose 'elegant-interior' or 'outdoor-luxury'. If casual, choose 'street' or 'urban'. Provide detailed reasoning.",
      "reason": "Detailed explanation of why this scene best showcases the character and product together",
      "alternatives": ["other good scene options from the list"]
    },
    "lighting": { 
      "primary": "value from list", 
      "reason": "Explain how lighting should highlight the character's features AND the product's texture/details" 
    },
    "mood": { 
      "primary": "value from list", 
      "reason": "Describe the overall emotional tone for photography" 
    },
    "style": { 
      "primary": "value from list", 
      "reason": "Photography style that complements both character and product" 
    },
    "colorPalette": {
      "primary": "MUST be from available list: ${colorOpts}. Analyze: (1) Character's skin tone, (2) Product's colors, (3) Overall harmony. For warm skin with cool-toned product, balance with 'warm' palette. For cool skin with warm product, use 'cool' palette. Choose palette that HARMONIZES character + product.",
      "reason": "Detailed analysis: How does this palette complement the character's skin tone? How does it enhance the product colors? Why is this the best choice?",
      "alternatives": ["other good color palette options from the list"]
    },
    "cameraAngle": { 
      "primary": "value from list", 
      "reason": "Camera angle that flatters the character's body and shows the product details" 
    }
  },
  "promptKeywords": {
    "subject": ["keywords defining the person"],
    "clothing": ["technical keywords for the garment"],
    "environment": ["background keywords"],
    "lighting": ["lighting keywords"],
    "quality": ["8k", "masterpiece", "raw photo", "ultra-detailed"]
  },
  "stylingNotes": {
    "accessories": "suggested accessories that work with this product for this character",
    "shoes": "suggested footwear that complements the outfit",
    "makeup": "suggested makeup look that works with the overall vibe"
  },
  "newOptions": [
    {
      "category": "scene|colorPalette",
      "value": "new_option_slug",
      "label": "New Option Label",
      "description": "Why this new option is unique and better than existing ones in the list",
      "reason": "When and why a stylist should use this option"
    }
  ]
}

CRITICAL INSTRUCTIONS:
1. SCENE: You MUST choose from the provided list. Be detailed about WHY this scene works for this character+product combination.
2. COLOR PALETTE: This is CRITICAL. Analyze the character's skin tone + product colors together. Choose the palette that HARMONIZES them. Provide detailed reasoning about skin tone compatibility and how the palette makes the product colors pop.
3. If available options don't fit, suggest NEW OPTIONS in the "newOptions" array (e.g., if the character is Asian with warm undertones and needs a specific palette, suggest "warm-golden" if not in the list).
4. For recommendations, always provide detailed "reason" fields that explain the visual/technical reasoning.
5. "newOptions" should only include options that are truly better than existing ones, not duplicates.`;
}

// Enhance instructions when productFocus indicates a partial item (e.g., top, bottom, shoes, accessory)
// Require AI to suggest complementary items and include them in `stylingNotes` and `newOptions`.
function buildComplementaryInstructions(productFocus) {
  if (!productFocus || productFocus === 'full-outfit') return '';

  return `\n\nADDITIONAL INSTRUCTION FOR PARTIAL PRODUCTS (MANDATORY):\n` +
    `If PRODUCT FOCUS is '${productFocus}', you MUST suggest complementary items to make a complete outfit.\n` +
    `- If '${productFocus}' is 'top' or product type indicates a top, provide recommendations for bottoms, shoes, and accessories that pair well (include styles, colors, and example item labels).\n` +
    `- If '${productFocus}' is 'bottom', recommend matching tops, shoes, and accessories.\n` +
    `- If '${productFocus}' is 'shoes', recommend matching outfit pieces and accessories.\n` +
    `- If '${productFocus}' is 'accessory', recommend the outfit and shoes that work best with this accessory.\n` +
    `Provide these suggestions under the 'stylingNotes' field (keys: 'suggestedTops','suggestedBottoms','shoes','accessories') and also emit any novel palette/scene options under 'newOptions' when appropriate.\n` +
    `Each suggested item should include: category, value (slug), label, brief description, and why it pairs well.\n`;
}


// ============================================================
// MAIN: UNIFIED ANALYSIS FUNCTION
// ============================================================

/**
 * Main unified analysis function with smart provider selection and fallback.
 * This is the core function for analyzing images.
 */
export async function analyzeUnified(characterImagePath, productImagePath, options = {}) {
  const {
    useCase = 'change-clothes',
    productFocus = 'full-outfit',
    preferredModel = null
  } = options;

  const startTime = Date.now();

  console.log('\n' + '='.repeat(80));
  console.log('🎯 UNIFIED ANALYSIS: Analyzing BOTH images in a single call');
  console.log('='.repeat(80));
  console.log(`   👤 Character: ${path.basename(characterImagePath)}`);
  console.log(`   👗 Product: ${path.basename(productImagePath)}`);
  console.log(`   🎬 Use Case: ${useCase}`);
  console.log(`   🎯 Product Focus: ${productFocus}`);

  const allOptions = await loadAllOptionsForAI();
  const prompt = buildUnifiedPrompt(allOptions, useCase, productFocus) + buildComplementaryInstructions(productFocus);
  console.log(`   📝 Prompt length: ${prompt.length} chars`);

  if (!fs.existsSync(characterImagePath)) {
    throw new Error(`Character image not found: ${characterImagePath}`);
  }
  if (!fs.existsSync(productImagePath)) {
    throw new Error(`Product image not found: ${productImagePath}`);
  }

  console.log('\n   🤖 Calling AI Vision with both images...');
  
  let rawResult = null;
  let usedProvider = null;
  let usedModel = null;

  const availableModels = await AIModel.find({ 
    type: 'analysis', 
    'status.available': true 
  }).sort({ 'status.performanceScore': -1 });

  console.log(`\n   🔍 Found ${availableModels.length} available analysis models in DB.`);

  if (availableModels.length === 0) {
    return { success: false, error: 'No available analysis models found in the database.' };
  }
  
  const providers = getAnalysisProviders(); // Still need the config for the .analyze function
  let lastError = null;

  for (const model of availableModels) {
    const providerConfig = providers.find(p => p.id === model.modelId);
    if (!providerConfig) continue;

    try {
      console.log(`\nAttempting analysis with: ${providerConfig.name}`);
      const result = await executeWithKeyRotation(
          providerConfig.provider.toUpperCase(),
          (apiKey) => providerConfig.analyze.bind(providerConfig)(characterImagePath, productImagePath, apiKey, options, prompt)
        );
      // Parse the result immediately
      console.log('\n   📊 Parsing AI response...');
      const parsed = parseUnifiedResult(result.data);

      // Ensure newOptions are included in the final response
      const finalParsed = { ...parsed, newOptions: parsed.newOptions || [] };
      
      // Save any new options discovered
      if (parsed.newOptions && Array.isArray(parsed.newOptions) && parsed.newOptions.length > 0) {
        console.log(`   ✨ AI suggested ${parsed.newOptions.length} new options. Saving to DB...`);
        for (const newOpt of parsed.newOptions) {
            try {
                await PromptOption.updateOne(
                    { category: newOpt.category, value: newOpt.value },
                    {
                        $set: {
                            label: newOpt.label,
                            description: newOpt.description,
                            isAIGenerated: true,
                            lastUsed: new Date()
                        },
                        $inc: { usageCount: 1 }
                    },
                    { upsert: true }
                );
                console.log(`      ➕ Saved new option: ${newOpt.category}/${newOpt.value}`);
            } catch (dbError) {
                console.warn(`      ⚠️ Failed to save new option: ${dbError.message}`);
            }
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logAnalysisResult(finalParsed, providerConfig.name, result.model, duration);

      return {
        success: true,
        data: finalParsed,
        metadata: {
          provider: providerConfig.name,
          model: result.model,
          duration: result.duration,
        },
      };
    } catch (error) {
      console.error(`Analysis with ${providerConfig.name} failed:`, error.message);
      lastError = error;
    }
  }

  if (!rawResult) {
    console.log('\n   ⚠️  Multi-image analysis failed, trying single-image fallback...');
    
    for (const model of availableModels) {
      const providerConfig = providers.find(p => p.id === model.modelId);
      if (!providerConfig) continue;

      try {
        console.log(`\n   ▶️  Trying single-image with: ${providerConfig.name}`);
        
        // Pass a flag to the analyze function to indicate single image mode
        const result = await executeWithKeyRotation(
          providerConfig.provider.toUpperCase(),
          (apiKey) => providerConfig.analyze.bind(providerConfig)(characterImagePath, null, apiKey, { ...options, singleImage: true }, prompt)
        );
        
        rawResult = result.data; // The parsed JSON data is in result.data now
        usedProvider = `${providerConfig.name} (single-image)`;
        usedModel = result.model;
        console.log(`   ✅ Single-image fallback succeeded with ${providerConfig.name}`);
        break; // Exit loop on first success
        
      } catch (fallbackError) {
        console.log(`   ❌ Single-image fallback failed with ${providerConfig.name}: ${fallbackError.message}`);
      }
    }
  }

  if (!rawResult) {
    throw new Error('All analysis providers failed. Check API keys and try again.');
  }

  console.log('\n   📊 Parsing AI response...');
  const parsed = parseUnifiedResult(rawResult);

  // Ensure newOptions are included in the final response
  const finalParsed = { ...parsed, newOptions: parsed.newOptions || [] };

  // Process and save new options if any
  if (parsed.newOptions && Array.isArray(parsed.newOptions) && parsed.newOptions.length > 0) {
    console.log(`   ✨ AI suggested ${parsed.newOptions.length} new options. Saving to DB...`);
    for (const newOpt of parsed.newOptions) {
      try {
        await PromptOption.updateOne(
          { category: newOpt.category, value: newOpt.value },
          {
            $set: {
              label: newOpt.label,
              description: newOpt.description,
              isAIGenerated: true,
              lastUsed: new Date()
            },
            $inc: { usageCount: 1 }
          },
          { upsert: true }
        );
        console.log(`      ➕ Saved new option: ${newOpt.category}/${newOpt.value}`);
      } catch (dbError) {
        console.warn(`      ⚠️ Failed to save new option: ${dbError.message}`);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logAnalysisResult(finalParsed, usedProvider, usedModel, duration);

  return {
    success: true,
    data: finalParsed,
    metadata: {
      provider: usedProvider,
      model: usedModel,
      duration: `${duration}s`,
      useCase,
      productFocus,
      optionsLoaded: Object.values(allOptions).flat().length,
      timestamp: new Date().toISOString()
    }
  };
}

// ============================================================
// PARSE THE UNIFIED RESULT
// ============================================================

function parseUnifiedResult(rawInput) {
  // Handle case where input is already an object (pre-parsed)
  if (typeof rawInput === 'object' && rawInput !== null) {
    console.log('   [DEBUG] Input is already a parsed object. Content preview:');
    console.log(JSON.stringify(rawInput, null, 2).substring(0, 1000));
    return validateAndFillDefaults(rawInput);
  }

  // Handle string input
  const rawText = String(rawInput || ''); // Ensure rawText is a string
  console.log(`   📄 Raw response length: ${rawText.length} chars`);
  console.log(`   📄 Raw Text Preview: ${rawText.substring(0, 1000)}`); 

  let jsonString = rawText.trim();
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonString = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonString);
    return validateAndFillDefaults(parsed);
  } catch (parseError) {
    console.error('   ❌ JSON parse failed:', parseError.message);
    console.error('   📄 Attempted to parse:', jsonString.substring(0, 500));
    
    return {
      character: { overallVibe: 'Could not parse', raw: rawText.substring(0, 500) },
      product: { type: 'clothing', raw: rawText.substring(0, 500) },
      compatibility: { score: 50, strengths: ['Analysis completed but parsing failed'], concerns: ['Manual review recommended'] },
      recommendations: getDefaultRecommendations(),
      promptKeywords: getDefaultPromptKeywords(),
      pose: { description: 'natural standing pose' },
      newOptions: [],
      stylingNotes: {},
      _parseError: true,
      _rawText: rawText
    };
  }
}

function validateAndFillDefaults(parsed) {
    const requiredFields = ['character', 'product', 'recommendations', 'promptKeywords'];
    const missing = requiredFields.filter(f => !parsed[f]);
    
    if (missing.length > 0) {
      console.warn(`   ⚠️  Missing fields: ${missing.join(', ')}`);
      if (!parsed.character) parsed.character = { overallVibe: 'unknown' };
      if (!parsed.product) parsed.product = { type: 'clothing', style: 'casual' };
      if (!parsed.compatibility) parsed.compatibility = { score: 70, strengths: [], concerns: [] };
      if (!parsed.recommendations) parsed.recommendations = getDefaultRecommendations();
      if (!parsed.promptKeywords) parsed.promptKeywords = getDefaultPromptKeywords();
      if (!parsed.pose) parsed.pose = { description: 'natural standing pose' };
      if (!parsed.stylingNotes) parsed.stylingNotes = {};
    }
    if (!parsed.newOptions) parsed.newOptions = [];

    console.log('   ✅ Data validation successful');
    console.log(`   📊 Character: ${parsed.character?.overallVibe || 'parsed'}`);
    console.log(`   📊 Product: ${parsed.product?.type || 'parsed'} - ${parsed.product?.style || ''}`);
    console.log(`   📊 Compatibility: ${parsed.compatibility?.score || 'N/A'}/100`);
    console.log(`   📊 Recommendations: ${Object.keys(parsed.recommendations || {}).length} categories`);

    return parsed;
}

function getDefaultRecommendations() {
  return {
    scene: { primary: 'studio', reason: 'Default - safe choice', alternatives: ['white-background'] },
    lighting: { primary: 'soft-diffused', reason: 'Default - flattering', alternatives: ['natural-window'] },
    mood: { primary: 'confident', reason: 'Default - versatile', alternatives: ['elegant'] },
    style: { primary: 'commercial', reason: 'Default - product focused', alternatives: ['editorial'] },
    colorPalette: { primary: 'neutral', reason: 'Default - safe', alternatives: ['warm'] },
    cameraAngle: { primary: 'eye-level', reason: 'Default - natural', alternatives: ['three-quarter'] }
  };
}

function getDefaultPromptKeywords() {
  return {
    subject: ['fashion model', 'professional pose'],
    clothing: ['fashion item', 'well-fitted'],
    environment: ['studio', 'clean background'],
    lighting: ['soft light', 'professional'],
    camera: ['full-body shot', '85mm lens'],
    mood: ['confident', 'professional'],
    quality: ['professional fashion photography', '8K', 'sharp focus', 'photorealistic']
  };
}

// ============================================================
// DETAILED LOGGING
// ============================================================

function logAnalysisResult(parsed, provider, model, duration) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 UNIFIED ANALYSIS RESULT');
  console.log('='.repeat(80));

  console.log(`\n⏱️  Duration: ${duration}s`);
  console.log(`🔧 Provider: ${provider}`);
  console.log(`🤖 Model: ${model}`);

  console.log('\n👤 CHARACTER ANALYSIS:');
  if (parsed.character) {
    const c = parsed.character;
    console.log(`   Age: ${c.age || 'N/A'}`);
    console.log(`   Gender: ${c.gender || 'N/A'}`);
    console.log(`   Skin Tone: ${c.skinTone || 'N/A'}`);
    console.log(`   Hair: ${c.hair?.color || 'N/A'} ${c.hair?.length || ''} ${c.hair?.style || ''}`);
    console.log(`   Body Type: ${c.bodyType || 'N/A'}`);
    console.log(`   Vibe: ${c.overallVibe || 'N/A'}`);
    if (c.distinctiveFeatures?.length) {
      console.log(`   Features: ${c.distinctiveFeatures.join(', ')}`);
    }
  }

  console.log('\n👗 PRODUCT ANALYSIS:');
  if (parsed.product) {
    const p = parsed.product;
    console.log(`   Type: ${p.type || 'N/A'}`);
    console.log(`   Style: ${p.style || 'N/A'}`);
    console.log(`   Colors: ${(p.colors || []).join(', ') || 'N/A'}`);
    console.log(`   Material: ${p.material || 'N/A'}`);
    console.log(`   Fit: ${p.fit || 'N/A'}`);
    console.log(`   Occasion: ${p.occasion || 'N/A'}`);
    console.log(`   Season: ${p.season || 'N/A'}`);
    if (p.details?.length) {
      console.log(`   Details: ${p.details.join(', ')}`);
    }
  }

  console.log('\n💫 COMPATIBILITY:');
  if (parsed.compatibility) {
    const comp = parsed.compatibility;
    const scoreBar = '█'.repeat(Math.floor((comp.score || 0) / 5)) + '░'.repeat(20 - Math.floor((comp.score || 0) / 5));
    console.log(`   Score: [${scoreBar}] ${comp.score || 0}/100`);
    if (comp.strengths?.length) {
      console.log('   ✅ Strengths:');
      comp.strengths.forEach(s => console.log(`      - ${s}`));
    }
    if (comp.concerns?.length) {
      console.log('   ⚠️  Concerns:');
      comp.concerns.forEach(c => console.log(`      - ${c}`));
    }
    if (comp.fitAssessment) {
      console.log(`   📏 Fit: ${comp.fitAssessment}`);
    }
  }

  console.log('\n🎨 AI RECOMMENDATIONS:');
  if (parsed.recommendations) {
    Object.entries(parsed.recommendations).forEach(([key, rec]) => {
      console.log(`\n   ${key.toUpperCase()}:`);
      console.log(`      ✅ Selected: ${rec.primary}`);
      console.log(`      📝 Reason: ${rec.reason}`);
      if (rec.alternatives?.length) {
        console.log(`      📋 Alternatives: ${rec.alternatives.join(', ')}`);
      }
    });
  }

  if (parsed.pose) {
    console.log('\n📷 POSE DIRECTION:');
    console.log(`   ${parsed.pose.description || 'N/A'}`);
    if (parsed.pose.hands) console.log(`   Hands: ${parsed.pose.hands}`);
    if (parsed.pose.expression) console.log(`   Expression: ${parsed.pose.expression}`);
  }

  console.log('\n🔑 PROMPT KEYWORDS:');
  if (parsed.promptKeywords) {
    Object.entries(parsed.promptKeywords).forEach(([category, keywords]) => {
      console.log(`   ${category}: ${(keywords || []).join(', ')}`);
    });
  }

  if (parsed.stylingNotes) {
    console.log('\n💅 STYLING NOTES:');
    Object.entries(parsed.stylingNotes).forEach(([key, value]) => {
      if (value) console.log(`   ${key}: ${value}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// ============================================================
// EXPORTS
// ============================================================

export { loadAllOptionsForAI, buildUnifiedPrompt, getDefaultOptions, logAnalysisResult };
