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
import { getProvidersByPriority } from '../config/imageGenConfig.js';
import {
  analyzeMultipleImagesWithOpenRouter,
  analyzeWithOpenRouter
} from '../services/openRouterService.js';

// ============================================================
// GET PROVIDER PRIORITY FROM CONFIG
// ============================================================

function getAnalysisProviders() {
  if (process.env.VISION_PROVIDER_PRIORITY) {
    return process.env.VISION_PROVIDER_PRIORITY.split(',').map(x => x.trim().toLowerCase());
  }
  
  try {
    const providers = getProvidersByPriority('analysis');
    return providers.map(p => p.name);
  } catch {
    return ['openrouter', 'google', 'anthropic', 'openai'];
  }
}

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

  return `You are an expert AI fashion stylist and photographer. Your task is to analyze BOTH images together and provide detailed recommendations.

IMAGES TO ANALYZE:
1. Character/Model image - the person who will wear the product
2. Product image - the clothing/accessory item

USE CASE: ${useCase}
PRODUCT FOCUS: ${productFocus}

AVAILABLE OPTIONS (Choose ONLY from these values):

SCENE/LOCATION:
${sceneOpts}

LIGHTING:
${lightingOpts}

MOOD:
${moodOpts}

STYLE:
${styleOpts}

COLOR PALETTE:
${colorOpts}

CAMERA ANGLE:
${cameraOpts}

TASK:
Analyze both images together and provide a JSON response with these exact fields:

{
  "character": {
    "age": "estimated age range",
    "gender": "gender presentation",
    "skinTone": "skin tone description",
    "bodyType": "body type description",
    "hair": { "color": "", "length": "", "style": "" },
    "overallVibe": "character personality/style vibe"
  },
  "product": {
    "type": "clothing type",
    "style": "style category",
    "colors": ["main colors"],
    "material": "material description",
    "fit": "fit type",
    "occasion": "suitable occasions",
    "season": "appropriate seasons",
    "details": ["key details"]
  },
  "compatibility": {
    "score": 0-100,
    "strengths": ["why they work together"],
    "concerns": ["potential issues"],
    "fitAssessment": "how the product fits this character"
  },
  "recommendations": {
    "scene": { "primary": "", "reason": "", "alternatives": [] },
    "lighting": { "primary": "", "reason": "", "alternatives": [] },
    "mood": { "primary": "", "reason": "", "alternatives": [] },
    "style": { "primary": "", "reason": "", "alternatives": [] },
    "colorPalette": { "primary": "", "reason": "", "alternatives": [] },
    "cameraAngle": { "primary": "", "reason": "", "alternatives": [] }
  },
  "pose": {
    "description": "recommended pose",
    "hands": "hand positioning",
    "expression": "facial expression"
  },
  "promptKeywords": {
    "subject": ["keywords for subject"],
    "clothing": ["keywords for clothing"],
    "environment": ["keywords for background"],
    "lighting": ["keywords for lighting"],
    "camera": ["keywords for camera setup"],
    "mood": ["keywords for mood"],
    "quality": ["quality descriptors"]
  },
  "stylingNotes": {
    "accessories": "recommended accessories",
    "hair": "hair styling notes",
    "makeup": "makeup recommendations"
  }
}

IMPORTANT INSTRUCTIONS:
1. Analyze the character and product TOGETHER - consider how they complement each other
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

  const allOptions = await loadAllOptionsForAI();
  const prompt = buildUnifiedPrompt(allOptions, useCase, productFocus);
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

  const providers = getAnalysisProviders();
  console.log(`   🔄 Providers in order: ${providers.join(', ')}`);

  const visionModels = [
    'qwen/qwen-2-vl-72b-instruct',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.2-90b-vision-instruct:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free'
  ];

  for (const provider of providers) {
    console.log(`\n   ▶️  Trying provider: ${provider}`);
    
    try {
      if (provider === 'openrouter') {
        const modelsToTry = preferredModel ? [preferredModel] : visionModels;
        
        for (const model of modelsToTry) {
          try {
            console.log(`   🔄 Trying model: ${model}`);
            
            rawResult = await executeWithKeyRotation('OPENROUTER', async (apiKey) => {
              return await analyzeMultipleImagesWithOpenRouter(
                [characterImagePath, productImagePath],
                prompt,
                { model, apiKey }
              );
            });

            usedProvider = 'openrouter';
            usedModel = model;
            console.log(`   ✅ Success with ${provider}/${model}`);
            break;
          } catch (error) {
            console.log(`   ❌ Failed with ${model}: ${error.message}`);
          }
        }
        
        if (rawResult) break;
      }
      
      if (provider === 'google') {
        try {
          rawResult = await analyzeMultipleImagesWithGemini(
            [characterImagePath, productImagePath],
            prompt
          );
          usedProvider = 'google';
          usedModel = 'gemini-2.0-flash-exp';
          console.log(`   ✅ Success with Google Gemini`);
          break;
        } catch (error) {
          console.log(`   ❌ Failed with Google Gemini: ${error.message}`);
        }
      }
      
      if (provider === 'anthropic') {
        console.log('   ⚠️  Anthropic multi-image not yet implemented, skipping...');
      }
      
      if (provider === 'openai') {
        console.log('   ⚠️  OpenAI multi-image not yet implemented, skipping...');
      }
    } catch (error) {
      console.log(`   ❌ Provider ${provider} failed: ${error.message}`);
    }
  }

  if (!rawResult) {
    console.log('\n   ⚠️  Multi-image failed with all providers, trying single-image fallback...');
    
    for (const provider of providers) {
      try {
        console.log(`\n   ▶️  Trying single-image with: ${provider}`);
        
        if (provider === 'openrouter') {
          const fallbackModel = preferredModel || visionModels[0];
          const fallbackPrompt = prompt + '\n\nNOTE: Only one image is provided (the character). For the product, use reasonable defaults based on the use case.';
          
          rawResult = await executeWithKeyRotation('OPENROUTER', async (apiKey) => {
            return await analyzeWithOpenRouter(
              characterImagePath,
              fallbackPrompt,
              { model: fallbackModel, apiKey }
            );
          });
          
          usedProvider = 'openrouter (single-image)';
          usedModel = fallbackModel;
          console.log('   ✅ Single-image fallback succeeded with OpenRouter');
          break;
        }
        
        if (provider === 'google') {
          const keyManager = getKeyManager('google');
          const keyInfo = keyManager.getNextKey();
          const apiKey = keyInfo.key;
          
          if (apiKey) {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
            
            const imageBuffer = fs.readFileSync(characterImagePath);
            const base64 = imageBuffer.toString('base64');
            const ext = path.extname(characterImagePath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            
            const fallbackPrompt = prompt + '\n\nNOTE: Only one image is provided (the character). For the product, use reasonable defaults based on the use case.';
            
            const result = await model.generateContent([
              { inlineData: { data: base64, mimeType } },
              { text: fallbackPrompt }
            ]);
            
            rawResult = result.response.text();
            usedProvider = 'google (single-image)';
            usedModel = 'gemini-2.0-flash-exp';
            console.log('   ✅ Single-image fallback succeeded with Google Gemini');
            break;
          }
        }
        
      } catch (fallbackError) {
        console.log(`   ❌ Single-image fallback failed with ${provider}: ${fallbackError.message}`);
      }
    }
  }

  if (!rawResult) {
    throw new Error('All analysis providers failed. Check API keys and try again.');
  }

  console.log('\n   📊 Parsing AI response...');
  const parsed = parseUnifiedResult(rawResult);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
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

    console.log('   ✅ JSON parsed successfully');
    console.log(`   📊 Character: ${parsed.character?.overallVibe || 'parsed'}`);
    console.log(`   📊 Product: ${parsed.product?.type || 'parsed'} - ${parsed.product?.style || ''}`);
    console.log(`   📊 Compatibility: ${parsed.compatibility?.score || 'N/A'}/100`);
    console.log(`   📊 Recommendations: ${Object.keys(parsed.recommendations || {}).length} categories`);

    return parsed;

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
