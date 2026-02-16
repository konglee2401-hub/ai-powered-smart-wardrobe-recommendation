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
import PromptOption from '../models/PromptOption.js';
import { getKeyManager, executeWithKeyRotation } from '../utils/keyManager.js';
import {
  analyzeMultipleImagesWithOpenRouter,
  analyzeWithOpenRouter
} from '../services/openRouterService.js';

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
        // Fallback to hardcoded defaults if DB is empty
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
// DEFAULT OPTIONS FALLBACK (when DB is empty)
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
      { value: 'artistic', label: 'Artistic', description: 'Creative, experimental' }
    ],
    colorPalette: [
      { value: 'neutral', label: 'Neutral Tones', description: 'Black, white, gray, beige' },
      { value: 'warm', label: 'Warm Tones', description: 'Red, orange, gold, earth' },
      { value: 'cool', label: 'Cool Tones', description: 'Blue, teal, silver' },
      { value: 'vibrant', label: 'Vibrant', description: 'Bold, saturated colors' },
      { value: 'pastel', label: 'Pastel', description: 'Soft, muted, delicate' },
      { value: 'monochrome', label: 'Monochrome', description: 'Single color variations' },
      { value: 'earth', label: 'Earth Tones', description: 'Brown, olive, terracotta' },
      { value: 'jewel', label: 'Jewel Tones', description: 'Deep emerald, ruby, sapphire' }
    ],
    cameraAngle: [
      { value: 'eye-level', label: 'Eye Level', description: 'Straight on, natural perspective' },
      { value: 'slightly-above', label: 'Slightly Above', description: 'Flattering, slimming' },
      { value: 'low-angle', label: 'Low Angle', description: 'Looking up, powerful' },
      { value: 'three-quarter', label: 'Three-Quarter', description: '45-degree angle, dynamic' },
      { value: 'full-body-straight', label: 'Full Body Straight', description: 'Head to toe, centered' },
      { value: 'close-up-detail', label: 'Close-Up Detail', description: 'Focus on product details' }
    ]
  };
  
  return defaults[category] || [];
}

// ============================================================
// BUILD THE UNIFIED ANALYSIS PROMPT
// ============================================================

function buildUnifiedPrompt(allOptions, useCase, productFocus) {
  // Format options for AI
  const optionsText = Object.entries(allOptions).map(([category, opts]) => {
    const optList = opts.map(o => `    - "${o.value}": ${o.label} (${o.description})`).join('\n');
    return `  ${category}:\n${optList}`;
  }).join('\n\n');

  return `You are an expert fashion photographer and stylist AI. You will receive TWO images:

IMAGE 1 (first image): CHARACTER/MODEL - The person who will wear the clothing
IMAGE 2 (second image): PRODUCT/CLOTHING - The fashion item to be worn

TASK: Analyze BOTH images together and provide a comprehensive assessment.

USE CASE: ${useCase}
PRODUCT FOCUS: ${productFocus}

AVAILABLE OPTIONS (you MUST select from these):
${optionsText}

Return ONLY a valid JSON object with this EXACT structure:

{
  "character": {
    "age": "estimated age range (e.g., '25-30')",
    "gender": "male/female/non-binary",
    "ethnicity": "observed ethnicity",
    "skinTone": "light/medium/olive/tan/dark/deep",
    "faceShape": "oval/round/square/heart/oblong",
    "hair": {
      "color": "hair color",
      "length": "short/medium/long",
      "style": "straight/wavy/curly/braided/updo",
      "texture": "fine/medium/thick"
    },
    "bodyType": "slim/athletic/average/curvy/plus-size",
    "height": "petite/average/tall",
    "distinctiveFeatures": ["feature1", "feature2"],
    "currentClothing": "brief description of what they are currently wearing",
    "overallVibe": "brief personality/style vibe"
  },
  "product": {
    "type": "specific clothing type (e.g., 'evening gown', 'casual blazer')",
    "category": "top/bottom/dress/outerwear/shoes/accessories/full-outfit",
    "style": "style description",
    "colors": ["primary color", "secondary color"],
    "patterns": ["solid/striped/floral/plaid/etc"],
    "material": "fabric type (e.g., 'silk', 'cotton', 'polyester blend')",
    "fit": "tight/slim/regular/relaxed/oversized",
    "silhouette": "A-line/fitted/flowing/structured",
    "details": ["detail1", "detail2"],
    "occasion": "when to wear",
    "season": "spring/summer/fall/winter/all-season",
    "priceRange": "budget/mid-range/premium/luxury"
  },
  "compatibility": {
    "score": 85,
    "strengths": ["reason1", "reason2", "reason3"],
    "concerns": ["concern1 if any"],
    "fitAssessment": "How well the product would fit this body type"
  },
  "recommendations": {
    "scene": {
      "primary": "value from options above",
      "reason": "Why this scene works best for this character + product combo",
      "alternatives": ["alt1", "alt2"]
    },
    "lighting": {
      "primary": "value from options above",
      "reason": "Why this lighting flatters both the person and the product",
      "alternatives": ["alt1", "alt2"]
    },
    "mood": {
      "primary": "value from options above",
      "reason": "Why this mood matches the character's vibe and product style",
      "alternatives": ["alt1", "alt2"]
    },
    "style": {
      "primary": "value from options above",
      "reason": "Why this photography style suits the use case",
      "alternatives": ["alt1", "alt2"]
    },
    "colorPalette": {
      "primary": "value from options above",
      "reason": "Why this palette complements the product colors and skin tone",
      "alternatives": ["alt1", "alt2"]
    },
    "cameraAngle": {
      "primary": "value from options above",
      "reason": "Why this angle best showcases the product on this body type",
      "alternatives": ["alt1", "alt2"]
    }
  },
  "pose": {
    "description": "Detailed pose description for the model",
    "hands": "What to do with hands",
    "legs": "Stance/leg position",
    "headTilt": "Head position",
    "expression": "Facial expression",
    "bodyAngle": "How the body is angled to camera"
  },
  "promptKeywords": {
    "subject": ["keyword1", "keyword2", "keyword3"],
    "clothing": ["keyword1", "keyword2", "keyword3"],
    "environment": ["keyword1", "keyword2", "keyword3"],
    "lighting": ["keyword1", "keyword2", "keyword3"],
    "camera": ["keyword1", "keyword2", "keyword3"],
    "mood": ["keyword1", "keyword2", "keyword3"],
    "quality": ["professional fashion photography", "8K", "sharp focus", "photorealistic"]
  },
  "stylingNotes": {
    "accessories": "Suggested accessories to complement the look",
    "shoes": "Suggested shoe type",
    "hair": "Suggested hairstyle for the shoot",
    "makeup": "Suggested makeup style"
  }
}

CRITICAL RULES:
1. Return ONLY the JSON object - no markdown, no explanations, no code blocks
2. For recommendations, ONLY use values from the AVAILABLE OPTIONS listed above
3. Be specific and detailed in descriptions - these will be used to generate images
4. The "reason" fields should explain WHY each choice works for THIS specific character + product combination
5. promptKeywords should contain descriptive phrases useful for image generation AI
6. Consider skin tone when recommending lighting and color palette
7. Consider body type when recommending camera angle and pose
8. Consider product style when recommending scene and mood`;
}

// ============================================================
// MAIN: UNIFIED ANALYSIS FUNCTION
// ============================================================

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

  // Step 1: Load all options from DB
  const allOptions = await loadAllOptionsForAI();

  // Step 2: Build the unified prompt
  const prompt = buildUnifiedPrompt(allOptions, useCase, productFocus);
  console.log(`   📝 Prompt length: ${prompt.length} chars`);

  // Step 3: Validate both files exist
  if (!fs.existsSync(characterImagePath)) {
    throw new Error(`Character image not found: ${characterImagePath}`);
  }
  if (!fs.existsSync(productImagePath)) {
    throw new Error(`Product image not found: ${productImagePath}`);
  }

  // Step 4: Call AI with BOTH images using key rotation
  console.log('\n   🤖 Calling AI Vision with both images...');
  
  let rawResult = null;
  let usedProvider = null;
  let usedModel = null;

  // Try multi-image analysis with OpenRouter first
  const visionModels = [
    'qwen/qwen-2-vl-72b-instruct',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.2-90b-vision-instruct:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free'
  ];

  const modelToTry = preferredModel || visionModels;
  const modelsArray = Array.isArray(modelToTry) ? modelToTry : [modelToTry];

  for (const model of modelsArray) {
    try {
      console.log(`\n   🔄 Trying model: ${model}`);
      
      rawResult = await executeWithKeyRotation('openrouter', async (apiKey) => {
        return await analyzeMultipleImagesWithOpenRouter(
          [characterImagePath, productImagePath],
          prompt,
          { model, apiKey }
        );
      });

      usedProvider = 'openrouter';
      usedModel = model;
      console.log(`   ✅ Success with ${model}`);
      break;

    } catch (error) {
      console.log(`   ❌ Failed with ${model}: ${error.message}`);
      
      // If multi-image fails, try single image approach as fallback
      if (model === modelsArray[modelsArray.length - 1]) {
        console.log('\n   ⚠️  Multi-image failed, trying single-image fallback...');
        
        try {
          rawResult = await executeWithKeyRotation('openrouter', async (apiKey) => {
            // Analyze character only, include product description in prompt
            const fallbackPrompt = prompt + '\n\nNOTE: Only one image is provided (the character). For the product, use reasonable defaults based on the use case.';
            return await analyzeWithOpenRouter(
              characterImagePath,
              fallbackPrompt,
              { model: visionModels[0], apiKey }
            );
          });
          
          usedProvider = 'openrouter (single-image fallback)';
          usedModel = visionModels[0];
          console.log('   ✅ Single-image fallback succeeded');
          break;
        } catch (fallbackError) {
          console.log(`   ❌ Single-image fallback also failed: ${fallbackError.message}`);
        }
      }
    }
  }

  if (!rawResult) {
    throw new Error('All analysis providers failed. Check API keys and try again.');
  }

  // Step 5: Parse the result
  console.log('\n   📊 Parsing AI response...');
  const parsed = parseUnifiedResult(rawResult);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Step 6: Log the full result
  logAnalysisResult(parsed, usedProvider, usedModel, duration);

  return {
    success: true,
    data: parsed,
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

function parseUnifiedResult(rawText) {
  console.log(`   📄 Raw response length: ${rawText.length} chars`);
  console.log(`   📄 First 300 chars: ${rawText.substring(0, 300)}`);

  let jsonString = rawText.trim();

  // Remove markdown code blocks
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Find JSON object
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonString = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonString);
    
    // Validate required fields
    const requiredFields = ['character', 'product', 'recommendations', 'promptKeywords'];
    const missing = requiredFields.filter(f => !parsed[f]);
    
    if (missing.length > 0) {
      console.warn(`   ⚠️  Missing fields: ${missing.join(', ')}`);
      // Fill in defaults for missing fields
      if (!parsed.character) parsed.character = { overallVibe: 'unknown' };
      if (!parsed.product) parsed.product = { type: 'clothing', style: 'casual' };
      if (!parsed.compatibility) parsed.compatibility = { score: 70, strengths: [], concerns: [] };
      if (!parsed.recommendations) parsed.recommendations = getDefaultRecommendations();
      if (!parsed.promptKeywords) parsed.promptKeywords = getDefaultPromptKeywords();
      if (!parsed.pose) parsed.pose = { description: 'natural standing pose' };
      if (!parsed.stylingNotes) parsed.stylingNotes = {};
    }

    console.log('   ✅ JSON parsed successfully');
    console.log(`   📊 Character: ${parsed.character?.overallVibe || 'parsed'}`);
    console.log(`   📊 Product: ${parsed.product?.type || 'parsed'} - ${parsed.product?.style || ''}`);
    console.log(`   📊 Compatibility: ${parsed.compatibility?.score || 'N/A'}/100`);
    console.log(`   📊 Recommendations: ${Object.keys(parsed.recommendations || {}).length} categories`);

    return parsed;

  } catch (parseError) {
    console.error('   ❌ JSON parse failed:', parseError.message);
    console.error('   📄 Attempted to parse:', jsonString.substring(0, 500));
    
    // Return a structured default
    return {
      character: { overallVibe: 'Could not parse', raw: rawText.substring(0, 500) },
      product: { type: 'clothing', raw: rawText.substring(0, 500) },
      compatibility: { score: 50, strengths: ['Analysis completed but parsing failed'], concerns: ['Manual review recommended'] },
      recommendations: getDefaultRecommendations(),
      promptKeywords: getDefaultPromptKeywords(),
      pose: { description: 'natural standing pose' },
      stylingNotes: {},
      _parseError: true,
      _rawText: rawText
    };
  }
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
  console.log(`🏢 Provider: ${provider}`);
  console.log(`🤖 Model: ${model}`);

  // Character
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

  // Product
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

  // Compatibility
  console.log('\n🤝 COMPATIBILITY:');
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
      console.log(`   👔 Fit: ${comp.fitAssessment}`);
    }
  }

  // Recommendations
  console.log('\n💡 AI RECOMMENDATIONS:');
  if (parsed.recommendations) {
    Object.entries(parsed.recommendations).forEach(([key, rec]) => {
      console.log(`\n   📌 ${key.toUpperCase()}:`);
      console.log(`      ✅ Selected: ${rec.primary}`);
      console.log(`      💭 Reason: ${rec.reason}`);
      if (rec.alternatives?.length) {
        console.log(`      🔄 Alternatives: ${rec.alternatives.join(', ')}`);
      }
    });
  }

  // Pose
  if (parsed.pose) {
    console.log('\n🧍 POSE DIRECTION:');
    console.log(`   ${parsed.pose.description || 'N/A'}`);
    if (parsed.pose.hands) console.log(`   Hands: ${parsed.pose.hands}`);
    if (parsed.pose.expression) console.log(`   Expression: ${parsed.pose.expression}`);
  }

  // Prompt Keywords
  console.log('\n🔑 PROMPT KEYWORDS:');
  if (parsed.promptKeywords) {
    Object.entries(parsed.promptKeywords).forEach(([category, keywords]) => {
    console.log(`   ${category}: ${(keywords || []).join(', ')}`);
    });
  }

  // Styling Notes
  if (parsed.stylingNotes) {
    console.log('\n💄 STYLING NOTES:');
    Object.entries(parsed.stylingNotes).forEach(([key, value]) => {
      if (value) console.log(`   ${key}: ${value}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// ============================================================
// EXPORTS
// ============================================================

export {
  loadAllOptionsForAI,
  buildUnifiedPrompt,
  getDefaultOptions,
  logAnalysisResult
};

export default {
  analyzeUnified,
  loadAllOptionsForAI,
  buildUnifiedPrompt,
  getDefaultOptions
};
