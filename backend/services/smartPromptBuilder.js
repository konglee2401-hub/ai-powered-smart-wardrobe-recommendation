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
    },
    cameraAngle: {
      'eye-level': { 'height': 'subject eye level', 'distance': '3-4 meters', 'lens': '85mm f/1.8', 'perspective': 'natural' },
      'slightly-above': { 'height': '20-30cm above eye level', 'distance': '3-4 meters', 'lens': '85mm f/1.8', 'effect': 'slimming' },
      'low-angle': { 'height': '1 meter below eye level', 'distance': '2-3 meters', 'lens': '50mm f/1.4', 'effect': 'powerful' },
      'three-quarter': { 'angle': '45° to subject', 'height': 'eye level', 'distance': '3-4 meters', 'lens': '70mm f/1.8', 'effect': 'dynamic' },
      'full-body-straight': { 'height': 'eye level', 'distance': '4-5 meters', 'lens': '50mm f/1.8', 'perspective': 'straight on' },
      'close-up-detail': { 'distance': '1-2 meters', 'lens': '100mm f/2.8', 'focus': 'product details', 'depth': 'shallow' }
    }
  };
  
  return fallbacks[category]?.[optionValue] || {};
}

// ============================================================
// BUILD COMPREHENSIVE PROMPT STRUCTURE
// ============================================================

export async function buildDetailedPrompt(analysis, selectedOptions = {}) {
  const { character, product, compatibility, recommendations, promptKeywords, pose, stylingNotes } = analysis;
  
  console.log('\n🎨 BUILDING DETAILED PROMPT...');
  
  // Load technical details for each selected option
  const technicalDetails = {};
  for (const [category, rec] of Object.entries(recommendations)) {
    const selectedValue = selectedOptions[category] || rec.primary;
    technicalDetails[category] = await loadOptionDetails(selectedValue, category);
  }
  
  // Build structured prompt sections
  const promptSections = {
    photography: buildPhotographySection(selectedOptions, technicalDetails),
    subject: buildSubjectSection(character, promptKeywords.subject || []),
    clothing: buildClothingSection(product, promptKeywords.clothing || []),
    environment: buildEnvironmentSection(selectedOptions, technicalDetails, promptKeywords.environment || []),
    lighting: buildLightingSection(selectedOptions, technicalDetails, promptKeywords.lighting || []),
    mood: buildMoodSection(selectedOptions, promptKeywords.mood || []),
    camera: buildCameraSection(selectedOptions, technicalDetails, promptKeywords.camera || []),
    quality: buildQualitySection(promptKeywords.quality || [])
  };
  
  // Combine into final prompt
  const finalPrompt = Object.values(promptSections).filter(section => section).join(', ');
  
  // Build negative prompt
  const negativePrompt = buildNegativePrompt(product, selectedOptions);
  
  console.log(`📝 Final prompt length: ${finalPrompt.length} chars`);
  console.log(`🚫 Negative prompt length: ${negativePrompt.length} chars`);
  
  return {
    prompt: finalPrompt,
    negativePrompt,
    metadata: {
      selectedOptions,
      technicalDetails,
      analysis: {
        compatibilityScore: compatibility?.score,
        characterVibe: character?.overallVibe,
        productType: product?.type
      },
      promptStructure: promptSections,
      timestamp: new Date().toISOString()
    }
  };
}

// ============================================================
// PHOTOGRAPHY SETUP SECTION
// ============================================================

function buildPhotographySection(selectedOptions, technicalDetails) {
  const parts = [];
  
  // Camera specs
  const cameraAngle = selectedOptions.cameraAngle || 'eye-level';
  const cameraTech = technicalDetails.cameraAngle || {};
  
  parts.push('Professional fashion photography');
  parts.push('full-frame DSLR camera');
  parts.push(`${cameraTech.lens || '85mm f/1.8 lens'}`);
  parts.push(`${cameraTech.distance || '3-4 meters'} distance`);
  parts.push(`${cameraAngle} perspective`);
  
  // Shot type based on product focus
  const productFocus = selectedOptions.productFocus || 'full-outfit';
  switch (productFocus) {
    case 'full-outfit':
      parts.push('full-body fashion shot');
      break;
    case 'top':
      parts.push('three-quarter body shot focusing on upper body');
      break;
    case 'bottom':
      parts.push('lower body focused shot');
      break;
    case 'shoes':
      parts.push('feet and lower leg detail shot');
      break;
    case 'accessories':
      parts.push('close-up detail shot');
      break;
    default:
      parts.push('full-body fashion shot');
  }
  
  return parts.join(', ');
}

// ============================================================
// SUBJECT SECTION
// ============================================================

function buildSubjectSection(character, subjectKeywords) {
  const parts = [];
  
  // Base description
  if (character.age) parts.push(`${character.age} year old ${character.gender || 'person'}`);
  if (character.ethnicity) parts.push(character.ethnicity);
  if (character.skinTone) parts.push(`${character.skinTone} skin tone`);
  
  // Body type and features
  if (character.bodyType) parts.push(`${character.bodyType} body type`);
  if (character.height) parts.push(character.height);
  
  if (character.distinctiveFeatures && character.distinctiveFeatures.length > 0) {
    parts.push(`with ${character.distinctiveFeatures.join(', ')}`);
  }
  
  // Hair
  if (character.hair) {
    const hairDesc = [];
    if (character.hair.color) hairDesc.push(character.hair.color);
    if (character.hair.length) hairDesc.push(character.hair.length);
    if (character.hair.style) hairDesc.push(character.hair.style);
    if (character.hair.texture) hairDesc.push(character.hair.texture + ' hair');
    
    if (hairDesc.length > 0) {
      parts.push(hairDesc.join(' '));
    }
  }
  
  // Face shape
  if (character.faceShape) parts.push(`${character.faceShape} face`);
  
  // Overall vibe
  if (character.overallVibe) parts.push(character.overallVibe);
  
  // Add custom keywords
  if (subjectKeywords.length > 0) {
    parts.push(...subjectKeywords);
  }
  
  return parts.join(', ');
}

// ============================================================
// CLOTHING SECTION
// ============================================================

function buildClothingSection(product, clothingKeywords) {
  const parts = [];
  
  // Product type and style
  if (product.type) parts.push(product.type);
  if (product.style) parts.push(product.style);
  
  // Colors and patterns
  if (product.colors && product.colors.length > 0) {
    parts.push(`${product.colors.join(' and ')} colors`);
  }
  
  if (product.patterns && product.patterns.length > 0) {
    parts.push(product.patterns.join(' '));
  }
  
  // Material and fit
  if (product.material) parts.push(`${product.material} fabric`);
  if (product.fit) parts.push(`${product.fit} fit`);
  if (product.silhouette) parts.push(`${product.silhouette} silhouette`);
  
  // Details
  if (product.details && product.details.length > 0) {
    parts.push(`with ${product.details.join(', ')}`);
  }
  
  // Occasion and season
  if (product.occasion) parts.push(`for ${product.occasion}`);
  if (product.season) parts.push(`${product.season} season`);
  
  // Add custom keywords
  if (clothingKeywords.length > 0) {
    parts.push(...clothingKeywords);
  }
  
  return parts.join(', ');
}

// ============================================================
// ENVIRONMENT SECTION
// ============================================================

function buildEnvironmentSection(selectedOptions, technicalDetails, environmentKeywords) {
  const scene = selectedOptions.scene || 'studio';
  const sceneTech = technicalDetails.scene || {};
  
  const parts = [];
  
  // Scene description
  parts.push(`${scene} setting`);
  
  // Technical details
  if (sceneTech.background) parts.push(sceneTech.background);
  if (sceneTech.location) parts.push(sceneTech.location);
  if (sceneTech.space) parts.push(`${sceneTech.space} space`);
  
  // Time and elements
  if (sceneTech.time) parts.push(sceneTech.time);
  if (sceneTech.elements) parts.push(sceneTech.elements);
  
  // Props and details
  if (sceneTech.props) parts.push(sceneTech.props);
  if (sceneTech.floor) parts.push(`${sceneTech.floor} floor`);
  if (sceneTech.decor) parts.push(sceneTech.decor);
  if (sceneTech.materials) parts.push(sceneTech.materials);
  if (sceneTech.view) parts.push(sceneTech.view);
  if (sceneTech.surface) parts.push(sceneTech.surface);
  
  // Add custom keywords
  if (environmentKeywords.length > 0) {
    parts.push(...environmentKeywords);
  }
  
  return parts.join(', ');
}

// ============================================================
// LIGHTING SECTION
// ============================================================

function buildLightingSection(selectedOptions, technicalDetails, lightingKeywords) {
  const lighting = selectedOptions.lighting || 'soft-diffused';
  const lightingTech = technicalDetails.lighting || {};
  
  const parts = [];
  
  // Lighting type
  parts.push(`${lighting} lighting`);
  
  // Technical details
  if (lightingTech.key_light) parts.push(lightingTech.key_light);
  if (lightingTech.fill) parts.push(lightingTech.fill);
  if (lightingTech.source) parts.push(lightingTech.source);
  if (lightingTech.direction) parts.push(lightingTech.direction);
  if (lightingTech.rim_light) parts.push(lightingTech.rim_light);
  
  // Quality and ratios
  if (lightingTech.ratio) parts.push(`${lightingTech.ratio} ratio`);
  if (lightingTech.quality) parts.push(lightingTech.quality);
  if (lightingTech.intensity) parts.push(lightingTech.intensity);
  if (lightingTech.color_temp) parts.push(`${lightingTech.color_temp} color temperature`);
  if (lightingTech.setup) parts.push(lightingTech.setup);
  if (lightingTech.shadow) parts.push(lightingTech.shadow);
  if (lightingTech.effect) parts.push(lightingTech.effect);
  
  // Effects
  if (lightingTech.power) parts.push(`${lightingTech.power} power`);
  if (lightingTech.gels) parts.push(lightingTech.gels);
  if (lightingTech.colors) parts.push(lightingTech.colors);
  if (lightingTech.mood) parts.push(lightingTech.mood);
  
  // Add custom keywords
  if (lightingKeywords.length > 0) {
    parts.push(...lightingKeywords);
  }
  
  return parts.join(', ');
}

// ============================================================
// MOOD & STYLE SECTION
// ============================================================

function buildMoodSection(selectedOptions, moodKeywords) {
  const parts = [];
  
  // Mood
  const mood = selectedOptions.mood || 'confident';
  parts.push(`${mood} mood`);
  
  // Style
  const style = selectedOptions.style || 'commercial';
  parts.push(`${style} photography style`);
  
  // Color palette
  const colorPalette = selectedOptions.colorPalette || 'neutral';
  parts.push(`${colorPalette} color palette`);
  
  // Add custom keywords
  if (moodKeywords.length > 0) {
    parts.push(...moodKeywords);
  }
  
  return parts.join(', ');
}

// ============================================================
// CAMERA & COMPOSITION SECTION
// ============================================================

function buildCameraSection(selectedOptions, technicalDetails, cameraKeywords) {
  const parts = [];
  
  // Camera angle technical details
  const cameraTech = technicalDetails.cameraAngle || {};
  
  if (cameraTech.height) parts.push(cameraTech.height);
  if (cameraTech.distance) parts.push(`${cameraTech.distance} distance`);
  if (cameraTech.lens) parts.push(cameraTech.lens);
  if (cameraTech.effect) parts.push(cameraTech.effect);
  if (cameraTech.angle) parts.push(cameraTech.angle);
  if (cameraTech.focus) parts.push(cameraTech.focus);
  if (cameraTech.depth) parts.push(cameraTech.depth);
  if (cameraTech.perspective) parts.push(cameraTech.perspective);
  
  // Composition
  parts.push('centered subject');
  parts.push('rule of thirds composition');
  parts.push('negative space for elegance');
  
  // Add custom keywords
  if (cameraKeywords.length > 0) {
    parts.push(...cameraKeywords);
  }
  
  return parts.join(', ');
}

// ============================================================
// QUALITY SECTION
// ============================================================

function buildQualitySection(qualityKeywords) {
  const defaultQuality = [
    'professional fashion photography',
    '8K resolution',
    'sharp focus',
    'photorealistic',
    'high detail',
    'studio quality',
    'commercial grade'
  ];
  
  const quality = qualityKeywords.length > 0 ? qualityKeywords : defaultQuality;
  return quality.join(', ');
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

export {
  loadOptionDetails,
  buildPhotographySection,
  buildSubjectSection,
  buildClothingSection,
  buildEnvironmentSection,
  buildLightingSection,
  buildMoodSection,
  buildCameraSection,
  buildQualitySection,
  buildNegativePrompt
};

export default {
  buildDetailedPrompt,
  loadOptionDetails,
  buildPhotographySection,
  buildSubjectSection,
  buildClothingSection,
  buildEnvironmentSection,
  buildLightingSection,
  buildMoodSection,
  buildCameraSection,
  buildQualitySection,
  buildNegativePrompt
};
