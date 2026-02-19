/**
 * Smart Prompt Builder Service
 * 
 * BUILDS DETAILED, STRUCTURED PROMPTS from unified analysis results.
 * 
 * Instead of: "studio with soft lighting"
 * Creates: "Professional studio with seamless white backdrop, 10x10 feet space, 
 *          soft diffused lighting from 45° angle with 2x3 foot softbox at 2m height,
 *          eye-level full-body shot with 85mm lens, confident pose with weight on back leg..."
 */

import PromptOption from '../models/PromptOption.js';

// ============================================================
// LOAD TECHNICAL DETAILS FOR OPTIONS
// ============================================================

async function loadOptionDetails(optionValue, category) {
  try {
    const option = await PromptOption.findOne({ value: optionValue, category });
    if (option && option.technicalDetails) {
      return option.technicalDetails;
    }
  } catch (error) {
    console.warn(`Could not load technical details for ${category}:${optionValue}:`, error.message);
  }
  
  // Fallback to hardcoded technical details
  return getFallbackTechnicalDetails(category, optionValue);
}

function getFallbackTechnicalDetails(category, optionValue) {
  const fallbacks = {
    scene: {
      'studio': { 'background': 'white seamless paper', 'floor': 'reflective', 'space': '10x10 feet' },
      'white-background': { 'background': 'pure white #FFFFFF', 'lighting': 'even, no shadows', 'post': 'white balance critical' },
      'urban-street': { 'location': 'downtown area', 'time': 'golden hour', 'elements': 'architecture, street art' },
      'minimalist-indoor': { 'background': 'neutral gray', 'furniture': 'minimal', 'lighting': 'soft, diffused' },
      'cafe': { 'setting': 'cozy coffee shop', 'props': 'wooden table, coffee cup', 'ambiance': 'warm, inviting' },
      'outdoor-park': { 'location': 'lush green park', 'lighting': 'natural sunlight', 'elements': 'trees, grass, benches' },
      'office': { 'setting': 'modern corporate office', 'furniture': 'desk, chair, computer', 'lighting': 'fluorescent' },
      'luxury-interior': { 'decor': 'high-end furniture, artwork', 'materials': 'marble, wood, metal', 'lighting': 'chandelier, accent lights' },
      'rooftop': { 'view': 'city skyline', 'surface': 'concrete or wooden deck', 'elements': 'railings, lounge chairs' }
    },
    lighting: {
      'soft-diffused': { 'key_light': '2x3 foot softbox, 45° angle, 2m high', 'fill': 'reflector opposite side', 'ratio': '1:2', 'power': '400W' },
      'natural-window': { 'source': 'large window or open shade', 'time': 'morning or late afternoon', 'quality': 'soft, indirect' },
      'golden-hour': { 'direction': 'low angle, warm', 'intensity': 'medium', 'color_temp': '3200K' },
      'dramatic-rembrandt': { 'key_light': 'strong single source, 45° high', 'fill': 'minimal', 'shadows': 'deep, defined', 'ratio': '1:4' },
      'high-key': { 'setup': 'multiple soft sources', 'intensity': 'bright', 'shadows': 'minimal', 'ratio': '1:1' },
      'backlit': { 'rim_light': 'from behind subject', 'intensity': 'medium to high', 'effect': 'silhouette, rim glow' },
      'neon-colored': { 'gels': 'RGB LED panels', 'colors': 'vibrant', 'intensity': 'medium', 'mood': 'creative, energetic' },
      'overcast-outdoor': { 'source': 'cloudy sky', 'quality': 'even, soft', 'direction': 'diffused', 'shadows': 'soft' }
    }
  };
  
  return fallbacks[category]?.[optionValue] || {};
}

// ============================================================
// BUILD COMPREHENSIVE PROMPT STRUCTURE
// ============================================================

/**
 * Build smart, structured prompt based on use case and product focus
 * @param {Object} analysis - Full analysis data from unified analysis
 * @param {Object} selectedOptions - User-selected options
 * @param {string} useCase - 'change-clothes', 'styling', 'complete-look', etc.
 * @param {string} productFocus - 'full-outfit', 'top', 'bottom', 'accessory'
 */
export async function buildDetailedPrompt(analysis, selectedOptions, useCase = 'change-clothes', productFocus = 'full-outfit') {
  if (!analysis) {
    return { prompt: '', negativePrompt: buildNegativePromptGeneric(selectedOptions) };
  }

  let promptStr = '';

  // Route to appropriate prompt builder based on use case
  switch (useCase) {
    case 'change-clothes':
      promptStr = buildChangeClothesPrompt(analysis, selectedOptions, productFocus);
      break;
    case 'styling':
      promptStr = buildStylingPrompt(analysis, selectedOptions, productFocus);
      break;
    case 'complete-look':
      promptStr = buildCompleteLookPrompt(analysis, selectedOptions, productFocus);
      break;
    default:
      promptStr = buildDefaultPrompt(analysis, selectedOptions);
  }

  const negativePrompt = buildNegativePrompt(analysis?.product, selectedOptions);

  return {
    prompt: promptStr.trim(),
    negativePrompt: negativePrompt.trim()
  };
}

/**
 * CHANGE CLOTHES: Keep character's face and body, ONLY change the clothing
 * Most important: Emphasize keeping face, body, pose identical
 */
function buildChangeClothesPrompt(analysis, selectedOptions, productFocus) {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  // 1. CHARACTER SECTION - Emphasize what STAYS THE SAME
  parts.push('=== KEEP CHARACTER UNCHANGED ===');
  if (character.age) parts.push(`${character.age} year old`);
  if (character.gender) parts.push(character.gender);
  if (character.skinTone) parts.push(`${character.skinTone} skin tone`);
  
  if (character.hair?.color && character.hair?.style) {
    parts.push(`${character.hair.color} hair, ${character.hair.style} style, ${character.hair.length || 'medium length'}`);
  }
  
  parts.push(`SAME face with same expression`);
  parts.push(`SAME body and body type`);
  parts.push(`SAME pose and position exactly as reference image`);
  parts.push(`SAME pose orientation and arm position`);

  // 2. CHANGE THIS - The new clothing
  parts.push(`\n=== CHANGE CLOTHING TO ===`);
  if (product.detailedDescription) {
    parts.push(product.detailedDescription);
  } else {
    if (product.type) parts.push(`${product.type}`);
    if (product.style) parts.push(`${product.style} style`);
    if (product.colors?.length > 0) parts.push(`in ${product.colors.join(' and ')}`);
  }
  
  if (product.material) parts.push(`${product.material} material`);
  if (product.fit) parts.push(`${product.fit} fit`);

  // 3. HAIRSTYLE & MAKEUP (usually stay same for change-clothes, but include in case user customize)
  if (selectedOptions.hairstyle && selectedOptions.hairstyle !== 'same') {
    parts.push(`\n=== OPTIONAL ===`);
    parts.push(`Hairstyle: ${selectedOptions.hairstyle}`);
  }

  // 4. ENVIRONMENT & LIGHTING
  parts.push(`\n=== ENVIRONMENT ===`);
  if (selectedOptions.scene) parts.push(`Setting: ${selectedOptions.scene}`);
  if (selectedOptions.lighting) parts.push(`Lighting: ${selectedOptions.lighting}`);
  if (selectedOptions.mood) parts.push(`Mood/Vibe: ${selectedOptions.mood}`);

  // 5. PHOTO STYLE
  parts.push(`\n=== PHOTOGRAPHY ===`);
  if (selectedOptions.style) parts.push(`Style: ${selectedOptions.style}`);
  if (selectedOptions.cameraAngle) parts.push(`Camera angle: ${selectedOptions.cameraAngle}`);
  if (selectedOptions.colorPalette) parts.push(`Color palette: ${selectedOptions.colorPalette}`);
  
  parts.push(`Professional photography, 8k, sharp focus, ultra-detailed, photorealistic`);

  return parts.join('\n');
}

/**
 * STYLING: Change styling elements (hair, makeup, accessories) with the outfit
 */
function buildStylingPrompt(analysis, selectedOptions, productFocus) {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  // 1. CHARACTER & OUTFIT
  parts.push('=== CHARACTER & OUTFIT ===');
  if (character.age && character.gender) {
    parts.push(`${character.age} year old ${character.gender}`);
  }
  if (character.skinTone) parts.push(`${character.skinTone} skin`);
  
  if (product.detailedDescription) {
    parts.push(`wearing ${product.detailedDescription}`);
  } else if (product.type) {
    parts.push(`wearing a ${product.type}`);
  }

  // 2. STYLING FOCUS
  parts.push(`\n=== UPDATE STYLING ===`);
  if (selectedOptions.hairstyle) parts.push(`New hairstyle: ${selectedOptions.hairstyle}`);
  if (selectedOptions.makeup) parts.push(`Makeup look: ${selectedOptions.makeup}`);
  parts.push(`Same face expression as reference`);
  parts.push(`Same pose orientation as reference`);

  // 3. ENVIRONMENT
  parts.push(`\n=== ENVIRONMENT ===`);
  if (selectedOptions.scene) parts.push(`Scene: ${selectedOptions.scene}`);
  if (selectedOptions.lighting) parts.push(`Lighting: ${selectedOptions.lighting}`);
  if (selectedOptions.mood) parts.push(`Mood: ${selectedOptions.mood}`);

  // 4. TECHNICAL
  parts.push(`\n=== PHOTOGRAPHY SPECS ===`);
  if (selectedOptions.style) parts.push(`Style: ${selectedOptions.style}`);
  if (selectedOptions.cameraAngle) parts.push(`Camera angle: ${selectedOptions.cameraAngle}`);
  if (selectedOptions.colorPalette) parts.push(`Color palette: ${selectedOptions.colorPalette}`);
  
  parts.push(`Professional photography, 8k, sharp focus, ultra-detailed`);

  return parts.join('\n');
}

/**
 * COMPLETE LOOK: Show the character in full styling with complete outfit context
 */
function buildCompleteLookPrompt(analysis, selectedOptions, productFocus) {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  parts.push('=== FULL CHARACTER LOOK ===');
  if (character.overallVibe) parts.push(character.overallVibe);
  if (character.age) parts.push(`${character.age} year old`);
  if (character.gender) parts.push(character.gender);
  if (character.skinTone) parts.push(`${character.skinTone} skin`);

  if (character.hair) {
    const hairDesc = [character.hair.color, character.hair.style, character.hair.length]
      .filter(Boolean).join(' ');
    parts.push(`${hairDesc} hair`);
  }

  // OUTFIT DESCRIPTION
  parts.push(`\n=== COMPLETE OUTFIT ===`);
  if (product.detailedDescription) {
    parts.push(product.detailedDescription);
  } else {
    if (product.type) parts.push(`${product.type}`);
    if (product.style) parts.push(`${product.style} style`);
    if (product.colors?.length > 0) parts.push(`in ${product.colors.join(' and ')}`);
  }
  
  // STYLING
  if (selectedOptions.hairstyle) parts.push(`Hairstyle: ${selectedOptions.hairstyle}`);
  if (selectedOptions.makeup) parts.push(`Makeup: ${selectedOptions.makeup}`);
  
  parts.push(`Full body, standing, confident pose`);

  // ENVIRONMENT
  parts.push(`\n=== SETTING ===`);
  if (selectedOptions.scene) parts.push(`Location: ${selectedOptions.scene}`);
  if (selectedOptions.lighting) parts.push(`Lighting: ${selectedOptions.lighting}`);
  if (selectedOptions.mood) parts.push(`Atmosphere: ${selectedOptions.mood}`);

  // TECHNICAL
  parts.push(`\n=== TECHNICAL ===`);
  if (selectedOptions.style) parts.push(`Photography: ${selectedOptions.style}`);
  if (selectedOptions.cameraAngle) parts.push(`Camera angle: ${selectedOptions.cameraAngle}`);
  if (selectedOptions.colorPalette) parts.push(`Color harmony: ${selectedOptions.colorPalette}`);
  
  parts.push(`Professional fashion photography, 8k, sharp focus, magazine-quality, ultra high resolution`);

  return parts.join('\n');
}

/**
 * DEFAULT: General structured prompt when use case not specified
 */
function buildDefaultPrompt(analysis, selectedOptions) {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  if (character.overallVibe) parts.push(character.overallVibe);
  if (character.age && character.gender) {
    parts.push(`${character.age} year old ${character.gender.toLowerCase()}`);
  }
  if (character.skinTone) parts.push(`${character.skinTone} skin`);
  
  if (product.detailedDescription) {
    parts.push(`wearing ${product.detailedDescription}`);
  } else if (product.type) {
    parts.push(`wearing a ${product.type}`);
  }

  if (selectedOptions.scene) parts.push(`in ${selectedOptions.scene}`);
  if (selectedOptions.lighting) parts.push(`${selectedOptions.lighting} lighting`);
  if (selectedOptions.mood) parts.push(`${selectedOptions.mood} mood`);
  if (selectedOptions.style) parts.push(`${selectedOptions.style} photography`);
  if (selectedOptions.colorPalette) parts.push(`${selectedOptions.colorPalette} color palette`);

  parts.push(`8k, professional, sharp focus, ultra-detailed`);

  return parts.join(', ');
}

/**
 * Generic negative prompt when no product data available
 */
function buildNegativePromptGeneric(selectedOptions) {
  const baseNegatives = [
    'blurry', 'low quality', 'distorted', 'bad anatomy', 'ugly',
    'artifacts', 'watermark', 'text', 'out of focus', 'pixelated'
  ];
  return baseNegatives.join(', ');
}

// ============================================================
// NEGATIVE PROMPT BUILDER
// ============================================================

function buildNegativePrompt(product, selectedOptions) {
  const negatives = [
    'blurry',
    'low quality',
    'distorted',
    'deformed',
    'ugly',
    'bad anatomy',
    'extra limbs',
    'missing limbs',
    'bad hands',
    'bad fingers',
    'poorly fitted clothing',
    'wrinkled clothing',
    'damaged clothing',
    'bad lighting',
    'overexposed',
    'underexposed',
    'harsh shadows',
    'bad composition',
    'cropped',
    'cut off',
    'out of frame',
    'watermark',
    'signature',
    'text',
    'jpeg artifacts',
    'pixelated',
    'grainy',
    'noise',
    'chromatic aberration'
  ];
  
  // Add product-specific negatives
  if (product.type) {
    if (product.type.includes('dress') || product.type.includes('gown')) {
      negatives.push('torn fabric', 'stained', 'dirty hem');
    }
    if (product.material === 'silk' || product.material === 'satin') {
      negatives.push('creased', 'wrinkled', 'shiny spots');
    }
    if (product.material === 'leather') {
      negatives.push('scratched', 'worn out', 'artificial looking');
    }
    if (product.category === 'shoes') {
      negatives.push('dirty soles', 'scuffed', 'untied laces');
    }
  }
  
  // Add scene-specific negatives
  const scene = selectedOptions.scene;
  if (scene === 'studio') {
    negatives.push('busy background', 'cluttered', 'messy');
  } else if (scene === 'white-background') {
    negatives.push('shadows on background', 'uneven lighting', 'color cast');
  } else if (scene === 'urban-street') {
    negatives.push('cars', 'people in background', 'garbage');
  } else if (scene === 'luxury-interior') {
    negatives.push('dusty', 'worn furniture', 'cheap decor');
  }
  
  // Add lighting-specific negatives
  const lighting = selectedOptions.lighting;
  if (lighting === 'soft-diffused') {
    negatives.push('harsh shadows', 'bright spots', 'uneven lighting');
  } else if (lighting === 'dramatic-rembrandt') {
    negatives.push('flat lighting', 'no shadows', 'overexposed');
  }
  
  // Remove duplicates and join
  const uniqueNegatives = [...new Set(negatives)];
  return uniqueNegatives.join(', ');
}

// ============================================================
// EXPORTS
// ============================================================

// This file no longer needs to export individual builder functions.
// The main 'buildDetailedPrompt' is the single entry point.
// Removing the old, unnecessary export statements that were causing the crash.
