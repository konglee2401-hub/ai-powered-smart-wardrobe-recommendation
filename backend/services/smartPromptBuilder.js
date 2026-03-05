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
import VietnamesePromptBuilder from './vietnamesePromptBuilder.js';

/**
 * Helper: Compact prompt by removing unnecessary whitespace
 * - Removes empty lines
 * - Replaces multiple newlines with single space
 * - Replaces multiple spaces with single space
 * - Trims leading/trailing whitespace
 */
function compactPrompt(parts) {
  if (!Array.isArray(parts)) return parts;
  
  // Filter out empty strings and join with single space
  const compacted = parts
    .filter(part => part && part.trim().length > 0)  // Remove empty parts
    .join(' ')                                          // Join with single space
    .replace(/\s+/g, ' ')                              // Replace multiple spaces with single
    .trim();                                           // Trim
  
  return compacted;
}

// ============================================================
// LOAD OPTION DETAILS: TECHNICAL DETAILS & PROMPT SUGGESTIONS
// ============================================================

/**
 * Load technical details for an option
 */
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

/**
 * Load prompt suggestion for an option (NEW)
 * Returns contextual detailed text to replace generic option names
 * Example: 'minimalist-indoor' -> 'Room with organized wardrobe and designer shoes'
 */
async function loadPromptSuggestion(optionValue, category) {
  try {
    const option = await PromptOption.findOne({ value: optionValue, category });
    if (option && option.promptSuggestion) {
      return option.promptSuggestion;
    }
  } catch (error) {
    console.warn(`Could not load prompt suggestion for ${category}:${optionValue}:`, error.message);
  }
  
  // Return fallback: just the option value if no promptSuggestion found
  return optionValue;
}


/**
 * Get comprehensive scene reference info including locked prompt and optional reference image
 * Returns both text directive and reference image info for proper image generation
 */
async function getSceneReferenceInfo(sceneValue, selectedOptions = {}, language = 'en') {
  if (!sceneValue) return { prompt: '', imageUrl: null, hasImage: false };

  let option = null;
  try {
    option = await PromptOption.findOne({ value: sceneValue, category: 'scene' });
  } catch (error) {
    console.warn(`Could not load scene option for scene reference ${sceneValue}:`, error.message);
  }

  const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
  
  // Get the canonical locked prompt
  const canonical = normalizedLanguage === 'vi'
    ? (option?.sceneLockedPromptVi?.trim() || option?.sceneLockedPrompt?.trim())
    : (option?.sceneLockedPrompt?.trim() || option?.sceneLockedPromptVi?.trim());

  if (!canonical && !option?.sceneLockedImageUrl) {
    return { prompt: '', imageUrl: null, hasImage: false };
  }

  // Get technical details if available
  const technicalDetails = option?.technicalDetails || {};
  const detailParts = Object.entries(technicalDetails)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  // Build prompt directive
  let promptDirective = '';
  if (canonical) {
    promptDirective = `Scene Locked Prompt: ${canonical}`;
    if (detailParts) {
      promptDirective += `. Fixed technical details: ${detailParts}`;
    }
  } else {
    const fallback = normalizedLanguage === 'vi'
      ? (option?.promptSuggestionVi?.trim() || option?.promptSuggestion?.trim() || sceneValue)
      : (option?.promptSuggestion?.trim() || option?.promptSuggestionVi?.trim() || sceneValue);
    promptDirective = fallback;
  }

  const selectedAspectRatio = typeof selectedOptions?.aspectRatio === 'string'
    ? selectedOptions.aspectRatio.trim()
    : '';
  const sceneLockedImageUrls = option?.sceneLockedImageUrls && typeof option.sceneLockedImageUrls === 'object'
    ? option.sceneLockedImageUrls
    : {};

  // Get scene reference image URL with aspect priority (16:9 / 9:16)
  const imageUrl = (
    (selectedAspectRatio && sceneLockedImageUrls[selectedAspectRatio])
    || option?.sceneLockedImageUrl
    || sceneLockedImageUrls['9:16']
    || sceneLockedImageUrls['16:9']
    || option?.previewImage
    || null
  );
  
  return {
    prompt: promptDirective,
    imageUrl: imageUrl,
    hasImage: !!(imageUrl),
    sceneValue: sceneValue,
    sceneLabel: option?.label || sceneValue,
    useSceneLock: option?.useSceneLock !== false
  };
}

/**
 * Build a locked scene directive to keep scene consistency across generations
 * Priority: sceneLockedPrompt > promptSuggestion > option value
 * NOW RETURNS: Text prompt + Optional reference image info
 */
async function buildLockedSceneDirective(sceneValue, selectedOptions = {}, language = 'en') {
  if (!sceneValue) return '';

  // Manual override from UI/request takes highest priority
  const overridePrompt = selectedOptions?.sceneOverridePrompt || selectedOptions?.sceneLockOverridePrompt;
  if (overridePrompt && typeof overridePrompt === 'string' && overridePrompt.trim()) {
    return `Scene Locked Prompt (OVERRIDE): ${overridePrompt.trim()}`;
  }

  let option = null;
  try {
    option = await PromptOption.findOne({ value: sceneValue, category: 'scene' });
  } catch (error) {
    console.warn(`Could not load scene option for scene lock ${sceneValue}:`, error.message);
  }

  const disableSceneLock = selectedOptions?.disableSceneLock === true || option?.useSceneLock === false;
  if (disableSceneLock) {
    const fallbackSuggestion = option?.promptSuggestion?.trim() || sceneValue;
    return fallbackSuggestion;
  }

  const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
  const canonical = normalizedLanguage === 'vi'
    ? (option?.sceneLockedPromptVi?.trim() || option?.sceneLockedPrompt?.trim())
    : (option?.sceneLockedPrompt?.trim() || option?.sceneLockedPromptVi?.trim());

  if (canonical) {
    return `Scene Locked Prompt: ${canonical}`;
  }

  const baseSuggestion = normalizedLanguage === 'vi'
    ? (option?.promptSuggestionVi?.trim() || option?.promptSuggestion?.trim() || sceneValue)
    : (option?.promptSuggestion?.trim() || option?.promptSuggestionVi?.trim() || sceneValue);
  const technicalDetails = option?.technicalDetails || getFallbackTechnicalDetails('scene', sceneValue);

  const detailParts = Object.entries(technicalDetails || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  const consistencyRules = [
    'Keep backdrop structure and geometry unchanged in every generation',
    'Keep floor material and color relationship with backdrop consistent',
    'Keep prop layout and spacing consistent; do not introduce new dominant objects',
    'Keep camera-to-subject distance and horizon perspective stable'
  ].join('; ');

  if (detailParts) {
    return `Scene Locked Prompt: ${baseSuggestion}. Fixed technical details: ${detailParts}. Consistency rules: ${consistencyRules}.`;
  }

  return `Scene Locked Prompt: ${baseSuggestion}. Consistency rules: ${consistencyRules}.`;
}


function resolvePoseSuggestion(selectedOptions = {}, mode = 'wearing') {
  const poseForScene = selectedOptions?.poseForScene || {};
  const modePose = mode === 'holding' ? poseForScene?.holding : poseForScene?.wearing;
  const fallback = selectedOptions?.poseGuidance || selectedOptions?.bodyPose || '';
  return (modePose || fallback || '').toString().trim();
}

/**
 * Resolve character alias token so prompt can pin identity by a stable short name.
 * Example: "Linh Pháp" -> "LinhPhap"
 */
function resolveCharacterAlias(selectedOptions = {}) {
  const explicitAlias = selectedOptions?.characterAlias || selectedOptions?.characterToken || selectedOptions?.characterName;
  if (typeof explicitAlias === 'string' && explicitAlias.trim()) {
    return explicitAlias.trim();
  }

  const sourceName = selectedOptions?.characterDisplayName || selectedOptions?.characterLabel;
  if (typeof sourceName !== 'string' || !sourceName.trim()) return '';

  const normalized = sourceName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');

  return normalized.trim();
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
 * NOW: Includes detailed contextual promptSuggestions for all options instead of generic names
 * @param {Object} analysis - Full analysis data from unified analysis
 * @param {Object} selectedOptions - User-selected options
 * @param {string} useCase - 'change-clothes', 'styling', 'complete-look', etc.
 * @param {string} productFocus - 'full-outfit', 'top', 'bottom', 'accessory'
 */
export async function buildDetailedPrompt(analysis, selectedOptions, useCase = 'change-clothes', productFocus = 'full-outfit', language = 'en', promptConfig = {}) {
  const useShortPrompt = typeof promptConfig === 'boolean'
    ? promptConfig
    : Boolean(promptConfig?.useShortPrompt);
  // 💫 NEW: Support Vietnamese language for image generation
  // Normalize language code: 'vi-VN' or 'vi_VN' → 'vi'
  const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
  
  if (normalizedLanguage === 'vi') {
    try {
      console.log(`\n🇻🇳 Using Vietnamese prompts for image generation...`);
      console.log(`   Use case: ${useCase}`);
      
      // Build Vietnamese prompt based on use case
      let vietnamesePrompt = '';
      
      // Extract relevant garment data from analysis parameter
      const product = analysis?.product || {};
      const garmentData = {
        garment_type: product.garment_type || product.type || 'trang phuc',
        primary_color: product.primary_color || product.color || 'mau chinh',
        secondary_color: product.secondary_color ? `với ${product.secondary_color}` : '',
        secondary_color: product.secondary_color || '',
        fabric_type: product.fabric_type || product.material || 'chat vai',
        fabric_texture: 'cam giac vai',
        fit_type: product.fit_type || product.fit || 'kieu dang',
        pattern: product.pattern || 'mau tron',
        neckline_line: product.neckline ? `Cổ: ${product.neckline}` : '',
        sleeves_line: product.sleeves ? `Tay: ${product.sleeves}` : '',
        key_details: product.key_details || 'chi tiet noi bat',
        key_details_line: product.key_details ? `Chi tiết: ${product.key_details}` : '',
        length_coverage: product.length ? product.length : 'chieu dai',
        scene: selectedOptions.scene || 'nen trang',
        scene_directive: selectedOptions.scene || 'canh nhat tren nha',
        lighting: selectedOptions.lighting || 'sang tu nhien',
        lighting_info: selectedOptions.lighting || 'sang tu nhien',
        mood: selectedOptions.mood || 'chuyen nghiep',
        style: selectedOptions.style || 'hien dai',
        camera_angle: selectedOptions.cameraAngle || 'tam ngang',
        color_palette: selectedOptions.colorPalette || 'am ap'
      };
      
      if (useCase === 'change-clothes') {
        // Use Vietnamese image generation prompt for wearing product (virtual try-on)
        vietnamesePrompt = VietnamesePromptBuilder.buildImageGenerationWearingProductPrompt(garmentData, { short: useShortPrompt, pose: resolvePoseSuggestion(selectedOptions, 'wearing') });
        console.log(`✅ Using Vietnamese WEARING product prompt`);
      } else if (useCase === 'character-holding-product') {
        // Use Vietnamese image generation prompt for holding product
        vietnamesePrompt = VietnamesePromptBuilder.buildHoldingProductPrompt(garmentData, { short: useShortPrompt, pose: resolvePoseSuggestion(selectedOptions, 'holding') });
        console.log(`✅ Using Vietnamese HOLDING product prompt`);
      } else {
        // Fallback to character analysis for other use cases
        vietnamesePrompt = VietnamesePromptBuilder.buildCharacterAnalysisPrompt();
        console.log(`⚠️ No specific Vietnamese image generation prompt for use case '${useCase}', using character analysis prompt`);
      }
      
      // Ensure prompt is a valid string
      const finalPrompt = (vietnamesePrompt || '').toString().trim();
      const negPrompt = (buildNegativePromptGeneric(selectedOptions) || '').toString().trim();
      
      return {
        prompt: finalPrompt,
        negativePrompt: negPrompt
      };
    } catch (error) {
      console.warn(`⚠️ Vietnamese prompt builder error, falling back to English:`, error.message);
      // Fall through to English prompts if Vietnamese fails
    }
  }

  if (!analysis) {
    return { prompt: '', negativePrompt: buildNegativePromptGeneric(selectedOptions) };
  }

  // Ensure product object exists
  if (!analysis.product) {
    analysis.product = {};
  }

  let promptStr = '';

  // Route to appropriate prompt builder based on use case
  switch (useCase) {
    case 'change-clothes':
      promptStr = await buildChangeClothesPrompt(analysis, selectedOptions, productFocus, normalizedLanguage, useShortPrompt);
      break;
    case 'character-holding-product':
      promptStr = await buildCharacterHoldingProductPrompt(analysis, selectedOptions, productFocus, normalizedLanguage, useShortPrompt);
      break;
    case 'ecommerce-product':
      promptStr = await buildEcommerceProductPrompt(analysis, selectedOptions, productFocus, normalizedLanguage);
      break;
    case 'social-media':
      promptStr = await buildSocialMediaPrompt(analysis, selectedOptions, productFocus, normalizedLanguage);
      break;
    case 'fashion-editorial':
      promptStr = await buildFashionEditorialPrompt(analysis, selectedOptions, productFocus, normalizedLanguage);
      break;
    case 'lifestyle-scene':
      promptStr = await buildLifestyleScenePrompt(analysis, selectedOptions, productFocus, normalizedLanguage);
      break;
    case 'before-after':
      promptStr = await buildBeforeAfterPrompt(analysis, selectedOptions, productFocus, normalizedLanguage);
      break;
    case 'styling':
      promptStr = await buildStylingPrompt(analysis, selectedOptions, productFocus, normalizedLanguage);
      break;
    case 'complete-look':
      promptStr = await buildCompleteLookPrompt(analysis, selectedOptions, productFocus, normalizedLanguage);
      break;
    default:
      promptStr = await buildDefaultPrompt(analysis, selectedOptions, normalizedLanguage);
  }

  const negativePrompt = buildNegativePrompt(analysis?.product, selectedOptions);

  // 💫 NEW: Get scene reference image info if available
  let sceneReferenceImage = null;
  if (selectedOptions?.scene) {
    const sceneInfo = await getSceneReferenceInfo(selectedOptions.scene, selectedOptions, normalizedLanguage);
    if (sceneInfo.hasImage && sceneInfo.imageUrl) {
      sceneReferenceImage = {
        url: sceneInfo.imageUrl,
        sceneValue: sceneInfo.sceneValue,
        sceneLabel: sceneInfo.sceneLabel
      };
    }
  }

  return {
    prompt: (promptStr || '').toString().trim(),
    negativePrompt: (negativePrompt || '').toString().trim(),
    sceneReferenceImage: sceneReferenceImage
  };
}

/**
 * CHANGE CLOTHES: Keep character's face and body, ONLY change the clothing
 * Most important: Emphasize keeping face, body, pose identical
 * OPTIMIZED: Uses new bilingual template format - English for model, Vietnamese for debug
 */
async function buildChangeClothesPrompt(analysis, selectedOptions, productFocus, language = 'en', useShortPrompt = false) {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};
  const characterAlias = resolveCharacterAlias(selectedOptions);

  if (useShortPrompt) {
    const garmentType = product.garment_type || product.type || 'garment';
    const garmentColor = product.primary_color
      ? (product.secondary_color ? `${product.primary_color} + ${product.secondary_color}` : product.primary_color)
      : 'as in Image 2';
    const garmentMaterial = product.fabric_type || product.material || 'as in Image 2';
    const scene = selectedOptions.scene || 'clean studio';
    const lighting = selectedOptions.lighting || 'soft diffused';
    const mood = selectedOptions.mood || 'confident';

    return [
      '[IMAGE MAPPING]',
      'Image 1 = CHARACTER (identity source).',
      'Image 2 = GARMENT (product source).',
      '',
      '[IDENTITY LOCK — STRICT]',
      'Keep EXACT same face, body, pose, hair, gaze from Image 1. No identity change.',
      ...(characterAlias ? [`Identity anchor token: ${characterAlias}. Always keep this exact person identity.`] : []),
      '',
      '[MODE — wearing]',
      'Character WEARS garment from Image 2. Ignore any model in Image 2, extract garment only.',
      '',
      `[GARMENT] ${garmentType}; color: ${garmentColor}; material: ${garmentMaterial}`,
      `[SCENE] ${scene}; [LIGHTING] ${lighting}; [MOOD] ${mood}`,
      ...(resolvePoseSuggestion(selectedOptions, 'wearing') ? [`[POSE] ${resolvePoseSuggestion(selectedOptions, 'wearing')}`] : []),
      '',
      '[HARD RULES]',
      'No anatomy errors, no deformation, no blur, no extra limbs, no text/logo/watermark.'
    ].join('\n');
  }

  // ==========================================
  // IMAGE MAPPING
  // ==========================================
  parts.push('[IMAGE MAPPING]');
  parts.push('Image 1 (first uploaded): CHARACTER REFERENCE — the person to use.');
  parts.push('Image 2 (second uploaded): GARMENT REFERENCE — the garment to use.');
  parts.push('IMPORTANT: Do not confuse the images. Always keep the character from Image 1.\n');

  // ==========================================
  // IDENTITY LOCK — ABSOLUTE
  // ==========================================
  parts.push('[IDENTITY LOCK — ABSOLUTE]');
  parts.push('Use the EXACT SAME character from Image 1.');
  parts.push('Preserve without any change:');
  parts.push('- Face (identical facial structure, features, expression)');
  parts.push('- Body (identical shape, proportions, anatomy)');
  parts.push('- Pose (identical position of head, arms, and legs)');
  parts.push('- Gaze and emotion');
  parts.push('- Hair (style, color, length, placement)');
  parts.push('Strict identity lock. Zero tolerance for any variation.\n');
  if (characterAlias) {
    parts.push(`Identity anchor token: ${characterAlias}`);
    parts.push(`Always treat "${characterAlias}" as this exact same person from Image 1 only.\n`);
  }

  // ==========================================
  // MODE SWITCH — WEARING
  // ==========================================
  parts.push('[MODE SWITCH — wearing]');
  parts.push('The character is WEARING the garment from Image 2.');
  parts.push('The garment is naturally fitted on the body.');
  parts.push('If Image 2 contains a model, IGNORE the model completely and extract ONLY the garment.\n');

  // ==========================================
  // CHARACTER DETAILS (for reference)
  // ==========================================
  if (character.age) parts.push(`Character age: ${character.age} years old`);
  if (character.gender) parts.push(`Gender: ${character.gender}`);
  if (character.skinTone) parts.push(`Skin tone: ${character.skinTone}`);
  
  if (character.hair?.color && character.hair?.style) {
    const hairLength = character.hair.length || 'medium length';
    parts.push(`Hair: ${character.hair.color} hair, ${character.hair.style} style, ${hairLength}`);
  }
  
  if (character.facialFeatures) {
    parts.push(`Facial features: ${character.facialFeatures}`);
  }
  parts.push(`Body: IDENTICAL - same body type and proportions`);
  parts.push(`Pose: IDENTICAL - same position, orientation, and arm placement`);
  parts.push(`Head: IDENTICAL - same tilt and neck angle`);
  parts.push(`Do NOT change: face shape, eye color, nose, mouth, body structure\n`);

  // ==========================================
  // GARMENT DETAILS
  // ==========================================
  parts.push('[GARMENT DETAILS]');
  
  const garmentType = product.garment_type || product.type || 'garment';
  parts.push(`Garment type: ${garmentType}`);
  
  // Colors
  const garmentColor = product.primary_color 
    ? (product.secondary_color ? `${product.primary_color} with ${product.secondary_color}` : product.primary_color)
    : 'fashionable';
  parts.push(`Color(s): ${garmentColor}`);
  
  // Material
  const garmentMaterial = product.fabric_type || product.material || 'premium quality';
  parts.push(`Material(s): ${garmentMaterial}`);
  
  // Fit and style
  const garmentFitStyle = [product.fit_type || product.fit, product.style_category].filter(Boolean).join(', ') || 'stylish fit';
  parts.push(`Fit and style: ${garmentFitStyle}`);
  
  // Length and coverage
  const garmentLength = product.length || product.coverage || 'standard';
  parts.push(`Length and coverage: ${garmentLength}`);
  
  // Additional details
  const designDetails = [];
  if (product.neckline) designDetails.push(product.neckline);
  if (product.sleeves) designDetails.push(product.sleeves);
  if (product.pattern && product.pattern !== 'Solid color' && product.pattern !== 'solid') {
    designDetails.push(product.pattern);
  }
  if (designDetails.length > 0) {
    parts.push(`Design details: ${designDetails.join(', ')}`);
  }
  
  if (product.key_details) {
    parts.push(`Special features: ${product.key_details}`);
  }
  
  parts.push('\nMatch the garment EXACTLY in design, fabric, color, cut, and details.\n');

  // ==========================================
  // FABRIC & FIT BEHAVIOR
  // ==========================================
  parts.push('[FABRIC & FIT BEHAVIOR]');
  parts.push('Match fabric behavior to material type.');
  parts.push('Create realistic folds, gravity, and tension.');
  parts.push('Do NOT resize or alter the body to fit the garment.');
  parts.push('Align neckline, armholes, waist, and ankles correctly.\n');

  const wearingPoseSuggestion = resolvePoseSuggestion(selectedOptions, 'wearing');
  if (wearingPoseSuggestion) {
    parts.push('[POSE IN SCENE]');
    parts.push(`Use this pose guidance to fit scene perspective naturally: ${wearingPoseSuggestion}`);
    parts.push('Allow natural adaptation from original pose; avoid rigid pasted full-body stance.\n');
  }

  // ==========================================
  // HAIR & MAKEUP
  // ==========================================
  parts.push('[HAIR & MAKEUP]');
  parts.push('Keep the same hairstyle and makeup as Image 1.');
  parts.push('Natural, professional, unchanged.\n');

  // ==========================================
  // SCENE & QUALITY
  // ==========================================
  parts.push('[SCENE & QUALITY]');
  parts.push('Lighting: studio, soft diffused.');
  
  if (selectedOptions.mood) {
    const moodSuggestion = await loadPromptSuggestion(selectedOptions.mood, 'mood');
    parts.push(`Mood: ${moodSuggestion}`);
  } else {
    parts.push('Mood: professional, confident');
  }
  
  if (selectedOptions.style) {
    const styleSuggestion = await loadPromptSuggestion(selectedOptions.style, 'style');
    parts.push(`Style: ${styleSuggestion}`);
  } else {
    parts.push('Style: modern, professional');
  }
  
  const cameraAngle = selectedOptions.cameraAngle || 'eye-level';
  parts.push(`Camera: ${cameraAngle}.`);
  if (selectedOptions.cameraLock?.framing) {
    parts.push(`Framing lock: ${selectedOptions.cameraLock.framing}.`);
  }
  if (selectedOptions.cameraLock?.lens) {
    parts.push(`Lens lock: ${selectedOptions.cameraLock.lens} equivalent.`);
  }
  if (selectedOptions.cameraLock?.cameraDistance) {
    parts.push(`Camera distance lock: ${selectedOptions.cameraLock.cameraDistance}.`);
  }
  if (selectedOptions.cameraLock?.subjectBackgroundDistance) {
    parts.push(`Subject/background distance: ${selectedOptions.cameraLock.subjectBackgroundDistance}.`);
  }
  if (selectedOptions.cameraLock?.horizonAlignment) {
    parts.push(`Horizon alignment: ${selectedOptions.cameraLock.horizonAlignment}.`);
  }
  parts.push('Color palette: neutral.\n');

  parts.push('High realism, professional fashion photography.');
  parts.push('Sharp focus, natural skin texture.');
  parts.push('Realistic fabric texture and accurate anatomy.\n');

  // ==========================================
  // 💫 NEW: SCENE REFERENCE IMAGE HANDLING
  // ==========================================
  if (selectedOptions.scene) {
    const sceneInfo = await getSceneReferenceInfo(selectedOptions.scene, selectedOptions, language);
    
    if (sceneInfo.prompt) {
      parts.push('[SCENE LOCK INSTRUCTION]');
      parts.push(sceneInfo.prompt);
      
      // If scene has a reference image, add instruction for AI to use it
      if (sceneInfo.hasImage && sceneInfo.imageUrl) {
        parts.push(`\n[SCENE REFERENCE IMAGE]`);
        parts.push(`A reference image of the scene environment is provided.`);
        parts.push(`Use the reference image to replicate the background, lighting, props, and atmosphere.`);
        parts.push(`Keep: backdrop composition, floor material, lighting angles, prop placement, and overall ambiance.`);
        parts.push(`ONLY replace the character and clothing - keep EVERYTHING ELSE identical to the reference image.`);
      }
      parts.push('');
    }
  }

  // ==========================================
  // HARD CONSTRAINTS
  // ==========================================
  parts.push('[HARD CONSTRAINTS]');
  parts.push('Do not change the character.');
  parts.push('Do not alter face, body, pose, gaze, or hair.');
  parts.push('Do not swap identity or merge identities.');
  parts.push('Do not merge garment with body.');
  parts.push('No distorted anatomy, no extra fingers, no blur, no low quality.');

  return compactPrompt(parts);
}

/**
 * Helper: Determine accessory category from accessory name
 */
function determineAccessoryCategory(accessory) {
  const accessories = {
    'necklaces': ['pendant', 'chain', 'choker', 'locket', 'layer', 'statement', 'pearl', 'name', 'zodiac'],
    'earrings': ['stud', 'hoop', 'drop', 'chandelier', 'huggie', 'threader', 'cluster', 'tassel'],
    'bracelets': ['bangle', 'cuff', 'chain', 'beaded', 'tennis', 'charm', 'wrap', 'minimalist'],
    'hair-accessories': ['hairpins', 'clips', 'headband', 'scrunchie', 'claw', 'stick', 'wrap', 'barrette'],
    'hats': ['beanie', 'cap', 'fedora', 'beret', 'bucket', 'brim', 'straw', 'visor'],
    'belts': ['leather', 'chain', 'fabric', 'corset', 'obi', 'elastic', 'cinch'],
    'scarves': ['knit', 'silk', 'shawl', 'infinity', 'bandana', 'tie', 'collar']
  };
  
  const acc = accessory.toLowerCase();
  for (const [category, keywords] of Object.entries(accessories)) {
    if (keywords.some(kw => acc.includes(kw))) {
      return category.replace('-', ' ').toUpperCase();
    }
  }
  return 'ACCESSORIES';
}

/**
 * Helper: Get technical details for specific scenes
 */
function getSceneTechnicalDetails(scene) {
  const sceneDetails = {
    'studio': 'White seamless background, professional studio setup, reflective floor',
    'minimalist-studio': 'Clean white or neutral background, minimal props',
    'outdoor': 'Natural daylight, outdoor setting, natural shadows',
    'luxury': 'High-end luxury setting with elegant details, refined ambiance',
    'casual': 'Relaxed, natural environment',
    'urban': 'City setting, architectural elements in background'
  };
  
  return sceneDetails[scene] || null;
}

// ============================================================
// � CHARACTER HOLDING PRODUCT: Character looking at/presenting product in hand
// ============================================================

/**
 * CHARACTER HOLDING PRODUCT: Character prominently holding or presenting the product
 * OPTIMIZED: Uses new bilingual template format - English for model, Vietnamese for debug
 * 
 * Key Focus:
 * - Character is the PRIMARY SUBJECT (60%+ of image)
 * - Product is VISIBLE in hands/displayed (40% of focus)
 * - Natural pose of holding/presenting product
 * - Character's expression shows the product or engagement with it
 */
async function buildCharacterHoldingProductPrompt(analysis, selectedOptions, productFocus, language = 'en', useShortPrompt = false) {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};
  const characterAlias = resolveCharacterAlias(selectedOptions);

  if (useShortPrompt) {
    const garmentType = product.garment_type || product.type || 'garment';
    const garmentColor = product.primary_color
      ? (product.secondary_color ? `${product.primary_color} + ${product.secondary_color}` : product.primary_color)
      : 'as in Image 2';
    const garmentMaterial = product.fabric_type || product.material || 'as in Image 2';
    const scene = selectedOptions.scene || 'clean studio';
    const lighting = selectedOptions.lighting || 'soft diffused';
    const mood = selectedOptions.mood || 'professional';

    return [
      '[IMAGE MAPPING]',
      'Image 1 = CHARACTER (identity source).',
      'Image 2 = GARMENT (product source).',
      '',
      '[IDENTITY LOCK — STRICT]',
      'Keep EXACT same face, body, pose, hair, gaze from Image 1. No identity change.',
      ...(characterAlias ? [`Identity anchor token: ${characterAlias}. Always keep this exact person identity.`] : []),
      '',
      '[MODE — holding]',
      'Character does NOT wear garment. Character HOLDS and presents garment from Image 2 clearly to camera.',
      '',
      `[GARMENT] ${garmentType}; color: ${garmentColor}; material: ${garmentMaterial}`,
      `[SCENE] ${scene}; [LIGHTING] ${lighting}; [MOOD] ${mood}`,
      ...(resolvePoseSuggestion(selectedOptions, 'holding') ? [`[POSE] ${resolvePoseSuggestion(selectedOptions, 'holding')}`] : []),
      '',
      '[HARD RULES]',
      'No anatomy errors, no deformation, no blur, no extra limbs, no text/logo/watermark.'
    ].join('\n');
  }

  // ==========================================
  // IMAGE MAPPING
  // ==========================================
  parts.push('[IMAGE MAPPING]');
  parts.push('Image 1 (first uploaded): CHARACTER REFERENCE — the person to use.');
  parts.push('Image 2 (second uploaded): GARMENT REFERENCE — the garment to use.');
  parts.push('IMPORTANT: Do not confuse the images. Always keep the character from Image 1.\n');

  // ==========================================
  // IDENTITY LOCK — ABSOLUTE
  // ==========================================
  parts.push('[IDENTITY LOCK — ABSOLUTE]');
  parts.push('Use the EXACT SAME character from Image 1.');
  parts.push('Preserve without any change:');
  parts.push('- Face (identical facial structure, features, expression)');
  parts.push('- Body (identical shape, proportions, anatomy)');
  parts.push('- Pose (identical position of head, arms, and legs)');
  parts.push('- Gaze and emotion');
  parts.push('- Hair (style, color, length, placement)');
  parts.push('Strict identity lock. Zero tolerance for any variation.\n');
  if (characterAlias) {
    parts.push(`Identity anchor token: ${characterAlias}`);
    parts.push(`Always treat "${characterAlias}" as this exact same person from Image 1 only.\n`);
  }

  // ==========================================
  // MODE SWITCH — HOLDING
  // ==========================================
  parts.push('[MODE SWITCH — holding]');
  parts.push('The character is NOT wearing the garment.');
  parts.push('The character is HOLDING the garment from Image 2 in her hands,');
  parts.push('presenting it clearly to the camera like a product showcase.');
  parts.push('If Image 2 contains a model, IGNORE the model completely and extract ONLY the garment.\n');

  // ==========================================
  // CHARACTER DETAILS (for reference)
  // ==========================================
  if (character.age) parts.push(`Character age: ${character.age} years old`);
  if (character.gender) parts.push(`Gender: ${character.gender}`);
  if (character.skinTone) parts.push(`Skin tone: ${character.skinTone}`);
  
  if (character.hair?.color && character.hair?.style) {
    parts.push(`Hair: ${character.hair.color} hair, ${character.hair.style} style`);
  }
  
  if (character.facialFeatures) {
    parts.push(`Facial features: ${character.facialFeatures}`);
  }
  parts.push(`Body: IDENTICAL - same body type and proportions`);
  parts.push(`Pose: Natural position to HOLD/PRESENT product in hands`);
  parts.push(`Expression: Engaged, confident, product-presentation energy\n`);

  // ==========================================
  // GARMENT DETAILS
  // ==========================================
  parts.push('[GARMENT DETAILS]');
  
  const garmentType = product.garment_type || product.type || 'garment';
  parts.push(`Garment type: ${garmentType}`);
  
  // Colors
  const garmentColor = product.primary_color 
    ? (product.secondary_color ? `${product.primary_color} with ${product.secondary_color}` : product.primary_color)
    : 'fashionable';
  parts.push(`Color(s): ${garmentColor}`);
  
  // Material
  const garmentMaterial = product.fabric_type || product.material || 'premium quality';
  parts.push(`Material(s): ${garmentMaterial}`);
  
  // Fit and style
  const garmentFitStyle = [product.fit_type || product.fit, product.style_category].filter(Boolean).join(', ') || 'stylish fit';
  parts.push(`Fit and style: ${garmentFitStyle}`);
  
  // Length and coverage
  const garmentLength = product.length || product.coverage || 'standard';
  parts.push(`Length and coverage: ${garmentLength}`);
  
  // Additional details
  const designDetails = [];
  if (product.neckline) designDetails.push(product.neckline);
  if (product.sleeves) designDetails.push(product.sleeves);
  if (product.pattern && product.pattern !== 'Solid color' && product.pattern !== 'solid') {
    designDetails.push(product.pattern);
  }
  if (designDetails.length > 0) {
    parts.push(`Design details: ${designDetails.join(', ')}`);
  }
  
  if (product.key_details) {
    parts.push(`Special features: ${product.key_details}`);
  }
  
  parts.push('\nMatch the garment EXACTLY in design, fabric, color, cut, and details.\n');

  // ==========================================
  // HOW PRODUCT IS PRESENTED
  // ==========================================
  parts.push('[PRODUCT PRESENTATION]');
  parts.push('- Character HOLDS garment clearly visible to camera');
  parts.push('- Hand position: Comfortable natural holding position');
  parts.push('- Garment orientation: Clearly visible, not hidden or folded');
  parts.push('- Angle: Best angle to show garment details');
  parts.push('- Lighting on garment: Well-lit, colors true-to-life');
  if (selectedOptions.holdingPresentation?.method) {
    parts.push(`- Holding method: ${selectedOptions.holdingPresentation.method}`);
  }
  if (selectedOptions.holdingPresentation?.handPlacement) {
    parts.push(`- Hand placement: ${selectedOptions.holdingPresentation.handPlacement}`);
  }
  if (selectedOptions.holdingPresentation?.orientation) {
    parts.push(`- Product orientation: ${selectedOptions.holdingPresentation.orientation}`);
  }
  if (selectedOptions.holdingPresentation?.notes) {
    parts.push(`- Practical notes: ${selectedOptions.holdingPresentation.notes}`);
  }
  parts.push('');

  const holdingPoseSuggestion = resolvePoseSuggestion(selectedOptions, 'holding');
  if (holdingPoseSuggestion) {
    parts.push('[POSE IN SCENE]');
    parts.push(`Use this pose guidance to fit scene perspective naturally: ${holdingPoseSuggestion}`);
    parts.push('Keep product visibility while adapting posture naturally to scene perspective.\n');
  }

  // ==========================================
  // HAIR & MAKEUP
  // ==========================================
  parts.push('[HAIR & MAKEUP]');
  parts.push('Keep the same hairstyle and makeup as Image 1.');
  parts.push('Natural, professional, unchanged.\n');

  // ==========================================
  // SCENE & QUALITY
  // ==========================================
  parts.push('[SCENE & QUALITY]');
  parts.push('Lighting: studio, soft diffused.');
  
  if (selectedOptions.mood) {
    const moodSuggestion = await loadPromptSuggestion(selectedOptions.mood, 'mood');
    parts.push(`Mood: ${moodSuggestion}`);
  } else {
    parts.push('Mood: professional, confident, engaging');
  }
  
  if (selectedOptions.style) {
    const styleSuggestion = await loadPromptSuggestion(selectedOptions.style, 'style');
    parts.push(`Style: ${styleSuggestion}`);
  } else {
    parts.push('Style: modern, professional');
  }
  
  const cameraAngle = selectedOptions.cameraAngle || 'eye-level';
  parts.push(`Camera: ${cameraAngle}.`);
  if (selectedOptions.cameraLock?.framing) {
    parts.push(`Framing lock: ${selectedOptions.cameraLock.framing}.`);
  }
  if (selectedOptions.cameraLock?.lens) {
    parts.push(`Lens lock: ${selectedOptions.cameraLock.lens} equivalent.`);
  }
  if (selectedOptions.cameraLock?.cameraDistance) {
    parts.push(`Camera distance lock: ${selectedOptions.cameraLock.cameraDistance}.`);
  }
  if (selectedOptions.cameraLock?.subjectBackgroundDistance) {
    parts.push(`Subject/background distance: ${selectedOptions.cameraLock.subjectBackgroundDistance}.`);
  }
  if (selectedOptions.cameraLock?.horizonAlignment) {
    parts.push(`Horizon alignment: ${selectedOptions.cameraLock.horizonAlignment}.`);
  }
  parts.push('Color palette: neutral.\n');

  parts.push('High realism, professional fashion photography.');
  parts.push('Sharp focus, natural skin texture.');
  parts.push('Realistic fabric texture and accurate anatomy.\n');

  // ==========================================
  // HARD CONSTRAINTS
  // ==========================================
  parts.push('[HARD CONSTRAINTS]');
  parts.push('Do not change the character.');
  parts.push('Do not alter face, body, pose, gaze, or hair.');
  parts.push('Do not swap identity or merge identities.');
  parts.push('Do not merge garment with body.');
  parts.push('No distorted anatomy, no extra fingers, no blur, no low quality.');

  return compactPrompt(parts);
}

// ============================================================
// �🛍️ ECOMMERCE: Professional product photography for online stores
// ============================================================



// ============================================================
// FLUX 2 KLEIN OPTIMIZED PROMPTS
// Ultra-compact prompts (~550-650 chars) for Flux 2 Klein
// Based on real-world testing: safe zone ~600-900 chars, optimal ~750 chars
// ============================================================

/**
 * Vietnamese to English translation dictionary for fashion terms
 * Used to ensure Flux prompts are always in English
 */
const VI_TO_EN_FASHION = {
  // Garment types
  'váy maxi hai dây': 'two-strap maxi dress',
  'váy maxi': 'maxi dress',
  'váy': 'dress',
  'áo sơ mi': 'shirt',
  'áo phông': 't-shirt',
  'áo khoác': 'jacket',
  'áo len': 'sweater',
  'quần jean': 'jeans',
  'quần': 'pants',
  'chân váy': 'skirt',
  'đầm': 'dress',
  'áo': 'top',
  
  // Colors
  'trắng kem': 'cream white',
  'trắng': 'white',
  'đen': 'black',
  'đỏ': 'red',
  'xanh dương': 'blue',
  'xanh lá': 'green',
  'vàng': 'yellow',
  'hồng': 'pink',
  'cam': 'orange',
  'tím': 'purple',
  'nâu': 'brown',
  'xám': 'gray',
  'be': 'beige',
  'kem': 'cream',
  
  // Materials
  'voan hoặc chiffon nhẹ, có lớp lót': 'light chiffon with lining',
  'voan': 'voile',
  'chiffon': 'chiffon',
  'lụa': 'silk',
  'cotton': 'cotton',
  'len': 'wool',
  'polyester': 'polyester',
  'vải': 'fabric',
  
  // Fit types
  'ôm nhẹ phần thân trên, xòe tự nhiên từ eo xuống': 'fitted bodice with natural flare from waist',
  'ôm nhẹ': 'slightly fitted',
  'ông rộng': 'loose fit',
  'ông sát': 'tight fit',
  'vừa vặn': 'regular fit',
  'xòe': 'flared',
  'ôm': 'fitted',
  
  // Length
  'maxi dài qua mắt cá chân': 'ankle-length maxi',
  'dài qua gối': 'knee-length',
  'ngắn': 'short',
  'dài': 'long',
  'maxi': 'maxi length',
  'midi': 'midi length',
  'mini': 'mini length'
};

/**
 * Translate Vietnamese fashion term to English
 * Falls back to original text if no translation found
 */
function translateToEn(text, fallback = '') {
  if (!text) return fallback;
  
  const lowerText = text.toLowerCase().trim();
  
  // Direct match
  if (VI_TO_EN_FASHION[lowerText]) {
    return VI_TO_EN_FASHION[lowerText];
  }
  
  // Partial match (find longest matching key)
  let bestMatch = '';
  let bestKey = '';
  for (const [vi, en] of Object.entries(VI_TO_EN_FASHION)) {
    if (lowerText.includes(vi) && vi.length > bestKey.length) {
      bestKey = vi;
      bestMatch = en;
    }
  }
  
  if (bestMatch) {
    // Replace the Vietnamese part with English
    return lowerText.replace(bestKey, bestMatch).trim();
  }
  
  // Return fallback if available, otherwise original
  return fallback || text;
}

/**
 * Extract and translate product info for Flux prompts
 */
function getEnglishProductInfo(product) {
  return {
    garmentType: translateToEn(product.garment_type || product.type, 'garment'),
    garmentColor: translateToEn(product.primary_color, 'fashionable color'),
    garmentMaterial: translateToEn(product.fabric_type || product.material, 'premium fabric'),
    garmentFit: translateToEn(product.fit_type || product.fit, 'stylish fit'),
    garmentLength: translateToEn(product.length || product.coverage, 'standard length')
  };
}

/**
 * FLUX WEARING PROMPT - Ultra-compact for Flux 2 Klein
 * Character wears the garment from Image 2
 * Target: ~550-650 characters
 */
function buildFluxWearingPrompt(analysis, selectedOptions = {}) {
  const product = analysis?.product || {};
  const { garmentType, garmentColor, garmentMaterial, garmentFit, garmentLength } = getEnglishProductInfo(product);
  
  const prompt = `Image 1: character reference. Image 2: garment reference.
Always keep the character from Image 1. Only change clothing.

Use the EXACT SAME character from Image 1.
Same face, body, pose, gaze, expression, and hair.
Strict identity lock.

The character is WEARING the garment from Image 2.
The garment fits naturally on the body.

Ignore any model in Image 2. Use ONLY the garment.

Garment: ${garmentType}, ${garmentColor}, ${garmentMaterial}, ${garmentFit}, ${garmentLength}.
Match the garment exactly in design and details.

Natural fabric drape, correct material behavior.
Studio lighting, eye-level camera.
High realism, sharp face, realistic fabric.`;

  return prompt.trim();
}

/**
 * FLUX HOLDING PROMPT - Ultra-compact for Flux 2 Klein
 * Character holds/presents the garment from Image 2
 * Target: ~550-650 characters
 */
function buildFluxHoldingPrompt(analysis, selectedOptions = {}) {
  const product = analysis?.product || {};
  const { garmentType, garmentColor, garmentMaterial, garmentFit, garmentLength } = getEnglishProductInfo(product);
  
  const prompt = `Image 1: character reference. Image 2: garment reference.
Always keep the character from Image 1. Only change clothing.

Use the EXACT SAME character from Image 1.
Same face, body, pose, gaze, expression, and hair.
Strict identity lock.

The character is NOT wearing the garment.
The character is HOLDING the garment in her hands, clearly presenting it.
Wearing the garment is forbidden.

Ignore any model in Image 2. Use ONLY the garment.

Garment: ${garmentType}, ${garmentColor}, ${garmentMaterial}, ${garmentFit}, ${garmentLength}.
Match the garment exactly in design and details.

Natural fabric drape, correct material behavior.
Studio lighting, eye-level camera.
High realism, sharp face, realistic fabric.`;

  return prompt.trim();
}

/**
 * Build Flux-optimized prompt based on use case
 * @param {string} useCase - 'change-clothes' (wearing) or 'character-holding-product' (holding)
 * @param {object} analysis - Analysis data with product info
 * @param {object} selectedOptions - Selected options
 * @returns {object} - { prompt, negativePrompt, charCount }
 */
function buildFluxPrompt(useCase, analysis, selectedOptions = {}) {
  let prompt;
  
  if (useCase === 'character-holding-product') {
    prompt = buildFluxHoldingPrompt(analysis, selectedOptions);
  } else {
    // Default to wearing
    prompt = buildFluxWearingPrompt(analysis, selectedOptions);
  }
  
  // Negative prompt - also compact
  const negativePrompt = 'blurry, distorted, deformed, extra fingers, missing fingers, bad anatomy, low quality, jpeg artifacts, watermark, text, logo';
  
  return {
    prompt,
    negativePrompt,
    charCount: prompt.length
  };
}

async function buildEcommerceProductPrompt(analysis, selectedOptions, productFocus, language = 'en') {
  const parts = [];
  const product = analysis.product || {};

  parts.push('[ECOMMERCE PRODUCT PHOTOGRAPHY]');
  parts.push('Purpose: Professional product photography for online retail');
  parts.push('Focus: Product clarity, colors, details, and commercial appeal\n');

  // 1. PRODUCT FOCUS (PRIMARY)
  parts.push('=== PRODUCT (PRIMARY FOCUS) ===');
  parts.push('Product is the MAIN SUBJECT - displayed clearly and prominently');
  
  if (product.garment_type) parts.push(`Item: ${product.garment_type}`);
  if (product.detailedDescription) parts.push(`Description: ${product.detailedDescription}`);
  
  if (product.primary_color) parts.push(`Primary Color: ${product.primary_color}`);
  if (product.secondary_color) parts.push(`Secondary Color: ${product.secondary_color}`);
  if (product.pattern) parts.push(`Pattern: ${product.pattern}`);
  if (product.fabric_type) parts.push(`Material: ${product.fabric_type}`);
  if (product.fit_type) parts.push(`Fit: ${product.fit_type}`);
  if (product.key_details) parts.push(`Key Details: ${product.key_details}`);
  
  parts.push('\nProduct Display Requirements:');
  parts.push('- All details visible and clear');
  parts.push('- True-to-life colors (not saturated)');
  parts.push('- Realistic fabric appearance and texture');
  parts.push('- Professional presentation suitable for retail\n');

  // 2. BACKGROUND & SETTING (SUPPORTING)
  parts.push('=== BACKGROUND ===');
  if (selectedOptions.scene === 'white-background' || !selectedOptions.scene) {
    parts.push('Background: Pure white (#FFFFFF) or very subtle neutral');
    parts.push('Why: Ecommerce standard, allows easy background removal');
    parts.push('Lighting: Even, no shadows on background');
  } else {
    parts.push(`Background: ${await buildLockedSceneDirective(selectedOptions.scene, selectedOptions, language)}`);
  }
  parts.push('Context: Minimal - Focus on product\n');

  // 3. PRESENTATION METHOD
  parts.push('=== HOW TO DISPLAY THE PRODUCT ===');
  
  if (productFocus === 'full-outfit') {
    parts.push('Display Method: ON A MODEL or REALISTIC FORM');
    parts.push('- Model should be neutral and not distract from product');
    parts.push('- Face should be calm, neutral expression');
    parts.push('- Pose should showcase the garment');
    parts.push('- Model is secondary to product visibility');
  } else {
    parts.push('Display Method: FLAT LAY or DETAIL CLOSE-UP');
    parts.push('- Show product against clean background');
    parts.push('- Multiple angles if possible');
    parts.push('- Highlight key design elements');
  }
  parts.push('- All product edges visible and clear');
  parts.push('- No distortion or wrinkles that hide details\n');

  // 4. LIGHTING & TECHNICAL
  parts.push('=== LIGHTING & TECHNICAL SPECS ===');
  parts.push('Lighting: Bright, even studio lighting');
  parts.push('- Soft diffused light (3-light setup standard)');
  parts.push('- No harsh shadows');
  parts.push('- Consistent color temperature (5500K daylight)');
  parts.push('- High key (bright overall)');
  
  if (selectedOptions.lighting) parts.push(`Style: ${selectedOptions.lighting}`);
  
  parts.push('\nColor & Accuracy:');
  parts.push('- Accurate color reproduction');
  parts.push('- Neutral white balance');
  parts.push('- True material appearance');
  
  parts.push('\nQuality:');
  parts.push('- 8K resolution, ultra high quality');
  parts.push('- Sharp focus on entire product');
  parts.push('- Crisp details, clean edges');
  parts.push('- Commercial photography standard\n');

  // 5. NEGATIVE REQUIREMENTS
  parts.push('=== WHAT NOT TO DO ===');
  parts.push('- Do NOT have busy or distracting background');
  parts.push('- Do NOT use excessive styling or decoration');
  parts.push('- Do NOT distort or exaggerate product size');
  parts.push('- Do NOT add watermarks or logos');
  parts.push('- Do NOT use artistic filters or effects');
  parts.push('- Do NOT hide any important product details');

  return compactPrompt(parts);
}

// ============================================================
// 📱 SOCIAL MEDIA: Engaging, trendy content for Instagram/TikTok
// ============================================================

async function buildSocialMediaPrompt(analysis, selectedOptions, productFocus, language = 'en') {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  parts.push('[SOCIAL MEDIA CONTENT]');
  parts.push('Platform: Instagram/TikTok optimized');
  parts.push('Purpose: Engaging, trendy, scroll-stopping content\n');

  // 1. CHARACTER & ENERGY
  parts.push('=== CHARACTER & ENERGY ===');
  if (character.age) parts.push(`Age: ${character.age}`);
  if (character.gender) parts.push(`Gender: ${character.gender}`);
  
  parts.push('Energy Level: HIGH - Confident, engaging, expressive');
  parts.push('Expression: Natural smile or expressive emotion');
  parts.push('Vibe: Relatable, trendy, aspirational');
  parts.push('Pose: Dynamic and natural (not stiff)');
  parts.push('Movement: Suggest motion or action\n');

  // 2. OUTFIT STYLING (TRENDY)
  parts.push('=== STYLING (CURRENT TRENDS) ===');
  if (product.garment_type) parts.push(`Item: ${product.garment_type}`);
  if (product.primary_color) parts.push(`Main Color: ${product.primary_color}`);
  if (product.secondary_color) parts.push(`Accent Color: ${product.secondary_color}`);
  if (product.style_category) parts.push(`Style: ${product.style_category} (on-trend)`);
  
  parts.push('Styling: Complete outfit looking, fashion-forward');
  parts.push('Accessories: Strategic, Instagram-worthy accessories');
  if (selectedOptions.shoes) parts.push(`Shoes: ${selectedOptions.shoes}`);
  
  parts.push('\nMakeup: Instagram-optimized');
  if (selectedOptions.makeup) parts.push(`Style: ${selectedOptions.makeup}`);
  else parts.push('Style: Camera-friendly, polished but natural looking');
  
  parts.push('Hair: On-trend, moving naturally (suggests motion)\n');

  // 3. ENVIRONMENT (INSTAGRAM-WORTHY)
  parts.push('=== SCENE LOCKED BACKGROUND ===');
  parts.push('Setting: Instagram-aesthetic location');
  if (selectedOptions.scene) {
    parts.push(`Location: ${await buildLockedSceneDirective(selectedOptions.scene, selectedOptions, language)}`);
  } else {
    parts.push('Location: Urban, modern, aesthetic background');
  }
  
  parts.push('Background: Visually interesting but not distracting');
  parts.push('- Could include trendy cafe, street art, minimalist urban');
  parts.push('- Soft focus background with depth');
  parts.push('- Complementary to outfit colors');
  
  if (selectedOptions.mood) parts.push(`Mood: ${selectedOptions.mood}`);
  else parts.push('Mood: Joyful, aspirational, relatable\n');

  // 4. PHOTOGRAPHY STYLE (SOCIAL MEDIA)
  parts.push('=== PHOTOGRAPHY STYLE ===');
  parts.push('Style: Social media photography (film/aesthetic look)');
  parts.push('- Warm, appealing color grading');
  parts.push('- Subtle film grain or digital clean');
  parts.push('- Natural but slightly enhanced colors');
  
  parts.push('\nComposition:');
  if (selectedOptions.cameraAngle) parts.push(`Angle: ${selectedOptions.cameraAngle}`);
  else parts.push('Angle: Flattering three-quarter or full body');
  
  parts.push('- Composition: Rule of thirds or dynamic');
  parts.push('- Leading lines: Optional but preferred');
  parts.push('- Rule of thirds placement for engagement');
  
  parts.push('\nLighting:');
  if (selectedOptions.lighting) parts.push(`Type: ${selectedOptions.lighting}`);
  else parts.push('Type: Natural golden hour or nice studio light');
  
  parts.push('- Flattering: Enhances skin tone');
  parts.push('- Warm: Inviting and engaging');
  parts.push('- Even: No weird shadows\n');

  // 5. HASHTAG-WORTHY ELEMENTS
  parts.push('=== HASHTAG-WORTHY DETAILS ===');
  parts.push('Make this image SHAREABLE:');
  parts.push('- Aspirational but relatable');
  parts.push('- Trendy yet timeless');
  parts.push('- Clear product visibility');
  parts.push('- Engaging composition');
  parts.push('- Instagram-algorithm-friendly (vibrant, clear, engaging)');
  parts.push('- Suitable for: Feed post, Reels thumbnail, Story\n');

  // 6. QUALITY & TECHNICAL
  parts.push('=== QUALITY ===');
  parts.push('Resolution: High quality for social media');
  parts.push('- 1080x1080 optimal or 1080x1350');
  parts.push('- Sharp focus on subject');
  parts.push('- Vibrant but natural colors');
  parts.push('- Professional but approachable quality');

  return compactPrompt(parts);
}

// ============================================================
// 👗 FASHION EDITORIAL: Magazine-style, artistic fashion content
// ============================================================

async function buildFashionEditorialPrompt(analysis, selectedOptions, productFocus, language = 'en') {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  parts.push('[FASHION EDITORIAL PHOTOGRAPHY]');
  parts.push("Style: High-fashion magazine editorial (Vogue, Harper's Bazaar level)");
  parts.push('Purpose: Artistic, sophisticated fashion storytelling\n');

  // 1. CHARACTER & STYLING
  parts.push('=== CHARACTER & STYLING ===');
  if (character.age) parts.push(`Model: ${character.age} year old`);
  if (character.gender) parts.push(`Gender: ${character.gender}`);
  parts.push('Look: Editorial, chic, sophisticated');
  parts.push('Presence: Strong editorial presence, confident');
  parts.push('Expression: Dramatic but editorial (not smiling necessarily)');
  
  parts.push('\nStyling Approach:');
  parts.push('- Complete editorial look (hair, makeup, accessories all coordinated)');
  parts.push('- High-fashion forward thinking');
  if (product.style_category) parts.push(`- ${product.style_category} styled fashion-forward`);
  
  parts.push('\nMakeup: Editorial beauty');
  if (selectedOptions.makeup) parts.push(`- ${selectedOptions.makeup}`);
  else parts.push('- Artistic, bold but editorial-appropriate');
  
  parts.push('Hair: Editorial styling');
  if (selectedOptions.hairstyle) parts.push(`- ${selectedOptions.hairstyle}`);
  else parts.push('- Perfectly styled or artfully undone')
  
  parts.push('\nAccessories: Curated editorial selection');
  if (selectedOptions.accessories && selectedOptions.accessories.length > 0) {
    parts.push(`- Featured: ${Array.isArray(selectedOptions.accessories) ? selectedOptions.accessories.join(', ') : selectedOptions.accessories}`);
  }
  parts.push('- Coordinated with outfit (not random)\n');

  // 2. OUTFIT (ARTISTIC FOCUS)
  parts.push('=== OUTFIT (ART DIRECTION) ===');
  if (product.garment_type) parts.push(`Garment: ${product.garment_type}`);
  if (product.style_category) parts.push(`Category: ${product.style_category}`);
  
  parts.push('Color Story:');
  if (product.primary_color) parts.push(`- Primary: ${product.primary_color}`);
  if (product.secondary_color) parts.push(`- Secondary: ${product.secondary_color}`);
  if (product.pattern) parts.push(`- Pattern: ${product.pattern}`);
  
  parts.push('Material & Texture:');
  if (product.fabric_type) parts.push(`- Fabric: ${product.fabric_type}`);
  parts.push('- Realistic luxurious texture');
  
  parts.push('Design Elements:');
  if (product.key_details) parts.push(`- Focus: ${product.key_details}`);
  parts.push('- Show garment artfully (from interesting angle)\n');

  // 3. ENVIRONMENT (EDITORIAL SETTING)
  parts.push('=== SCENE LOCKED BACKGROUND ===');
  parts.push('Setting: High-fashion editorial location');
  if (selectedOptions.scene) {
    parts.push(`Location: ${await buildLockedSceneDirective(selectedOptions.scene, selectedOptions, language)}`);
  } else {
    parts.push('Location: Luxury, artistic, or minimalist editorial background');
  }
  
  parts.push('Background Philosophy:');
  parts.push("- Supports the story, doesn't distract");
  parts.push('- Could be architectural, natural, or abstract');
  parts.push('- Must have editorial aesthetic\n');

  // 4. LIGHTING & MOOD (EDITORIAL)
  parts.push('=== LIGHTING & MOOD ===');
  if (selectedOptions.lighting) parts.push(`Lighting: ${selectedOptions.lighting}`);
  else parts.push('Lighting: Dramatic and flattering');
  
  parts.push('Approach:');
  parts.push('- Could be soft and dreamy');
  parts.push('- Or dramatic and moody');
  parts.push('- Or clean and minimal');
  
  if (selectedOptions.mood) parts.push(`Mood: ${selectedOptions.mood}`);
  else parts.push('Mood: Sophisticated, artistic');
  
  parts.push('Atmosphere: Tells a story\n');

  // 5. PHOTOGRAPHY & COMPOSITION
  parts.push('=== PHOTOGRAPHY DIRECTION ===');
  parts.push('Style: High-fashion editorial photography');
  parts.push('- Magazine-quality production');
  parts.push('- Artistic composition');
  parts.push('- Thoughtful use of space and negative space');
  
  if (selectedOptions.cameraAngle) parts.push(`Angle: ${selectedOptions.cameraAngle}`);
  else parts.push('Angle: Dynamic - full body or artistic crop');
  
  parts.push('Direction:');
  parts.push('- Artistic and creative');
  parts.push('- Fashion-forward styling');
  parts.push('- Story-driven imagery');
  parts.push('- Suitable for: Magazine spread, lookbook, collection showcase\n');

  // 6. TECHNICAL SPECIFICATIONS
  parts.push('=== TECHNICAL SPECS ===');
  parts.push('Quality: Editorial/magazine production quality');
  parts.push('- 8K+ resolution');
  parts.push('- Flawless execution');
  parts.push('- Professional color grading');
  parts.push('- Editorial finishing');
  
  if (selectedOptions.colorPalette) parts.push(`Color Palette: ${selectedOptions.colorPalette}`);
  
  parts.push('\nFinal Look: High-fashion, aspirational, magazine-ready');

  return compactPrompt(parts);
}

// ============================================================
// 🌿 LIFESTYLE: Real-world context, day-in-life styling
// ============================================================

async function buildLifestyleScenePrompt(analysis, selectedOptions, productFocus, language = 'en') {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  parts.push('[LIFESTYLE PHOTOGRAPHY]');
  parts.push('Purpose: Show how outfit works in real-world context');
  parts.push('Approach: Authentic, relatable, aspirational\n');

  // 1. CHARACTER IN CONTEXT
  parts.push('=== CHARACTER IN LIFESTYLE ===');
  if (character.age) parts.push(`Person: ${character.age} years old`);
  if (character.gender) parts.push(`Gender: ${character.gender}`);
  parts.push('Expression: Natural, genuine, often smiling');
  parts.push('Attitude: Authentic, confident in their element');
  parts.push('Posture: Natural, relaxed, comfortable');
  
  parts.push('\nActivity/Context:');
  parts.push('- Suggest a real-world activity or moment');
  parts.push('- Not posed (or naturally posed)');
  parts.push('- Genuine living, not obviously modelling\n');

  // 2. OUTFIT IN CONTEXT
  parts.push("=== OUTFIT (HOW IT'S WORN) ===");
  if (product.garment_type) parts.push(`Item: ${product.garment_type}`);
  if (product.style_category) parts.push(`Style: ${product.style_category}`);
  
  parts.push('Wearing for: [Specific activity]');
  parts.push('- Brunch outfit');
  parts.push('- Work-to-weekend look');
  parts.push('- Casual outing');
  parts.push('- Day-in-life moment');
  
  if (product.primary_color) parts.push(`- Color: ${product.primary_color}`);
  if (product.secondary_color) parts.push(`- With: ${product.secondary_color}`);
  if (selectedOptions.shoes) parts.push(`- Shoes: ${selectedOptions.shoes}`);
  
  parts.push('Accessories:');
  if (selectedOptions.accessories && selectedOptions.accessories.length > 0) {
    parts.push(`- Practical/stylish: ${Array.isArray(selectedOptions.accessories) ? selectedOptions.accessories.join(', ') : selectedOptions.accessories}`);
  }
  parts.push('- Fits naturally into the scene\n');

  // 3. ENVIRONMENT (LIFESTYLE SETTING)
  parts.push('=== SCENE LOCKED BACKGROUND ===');
  parts.push('Setting: Real-world lifestyle context');
  if (selectedOptions.scene) {
    parts.push(`Location: ${await buildLockedSceneDirective(selectedOptions.scene, selectedOptions, language)}`);
  } else {
    parts.push('Location: Cafe, street, home, workplace, park, etc.');
  }
  
  parts.push('Scene Elements:');
  parts.push('- Natural props that make sense (coffee cup, phone, etc.)');
  parts.push('- Real-world context visible');
  parts.push('- Everyday luxury aesthetic');
  parts.push('- Inviting and relatable\n');

  // 4. MOOD & LIGHTING
  parts.push('=== MOOD & ATMOSPHERE ===');
  if (selectedOptions.mood) parts.push(`Vibe: ${selectedOptions.mood}`);
  else parts.push('Vibe: Relaxed, authentic, aspirational');
  
  if (selectedOptions.lighting) parts.push(`Lighting: ${selectedOptions.lighting}`);
  else parts.push('Lighting: Natural, warm, flattering');
  
  parts.push('Feel:');
  parts.push('- Candid moment (or naturally candid-looking)');
  parts.push('- Everyday life lived stylishly');
  parts.push('- Achievable aspirational\n');

  // 5. PHOTOGRAPHY STYLE
  parts.push('=== PHOTOGRAPHY STYLE ===');
  parts.push('Approach: Lifestyle photography');
  parts.push('- Documentary-style with style');
  parts.push('- Natural but polished');
  
  if (selectedOptions.cameraAngle) parts.push(`Angle: ${selectedOptions.cameraAngle}`);
  else parts.push('Angle: Natural, authentic perspective');
  
  parts.push('Composition:');
  parts.push('- Environmental (show the scene)');
  parts.push('- Natural framing');
  parts.push('- Focus on the moment and the outfit');
  parts.push('- Suitable for: Blog post, social content, brand story\n');

  // 6. COLOR & TONE
  parts.push('=== COLOR & TONE ===');
  if (selectedOptions.colorPalette) parts.push(`Palette: ${selectedOptions.colorPalette}`);
  else parts.push('Palette: Warm, inviting, natural');
  
  parts.push('Processing:');
  parts.push('- Natural color grading');
  parts.push('- Warm undertones');
  parts.push('- Film-like or clean digital');
  parts.push('- Feels aspirational but achievable\n');

  // 7. QUALITY & TECHNICAL
  parts.push('=== TECHNICAL SPECS ===');
  parts.push('Quality: High-quality lifestyle photography');
  parts.push('- Sharp focus on subject');
  parts.push('- Nice background blur (if applicable)');
  parts.push('- Professional but natural');
  parts.push('- 4K-8K quality');
  parts.push('- Suitable for: Magazine spread, website, Instagram, blog');

  return compactPrompt(parts);
}

// ============================================================
// ⬅️➡️ BEFORE-AFTER: Transformation showcase (split concept)
// ============================================================

async function buildBeforeAfterPrompt(analysis, selectedOptions, productFocus, language = 'en') {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  parts.push('[BEFORE & AFTER TRANSFORMATION]');
  parts.push('[IMAGE 1 - BEFORE]');
  parts.push('Scenario: Person WITHOUT the outfit (or in basic outfit)');
  parts.push('Scenario: Solid neutral styling, baseline look\n');

  parts.push('[IMAGE 2 - AFTER]');
  parts.push('Scenario: SAME PERSON with the stylish outfit (from product image)');
  parts.push('Scenario: Transformed, elevated, styled\n');

  parts.push('=== TRANSFORMATION CONCEPT ===');
  parts.push('Story: Show how this product/outfit transforms the look');
  parts.push('Before State: Basic, neutral, baseline');
  parts.push('After State: Stylish, confident, elevated\n');

  // 1. BEFORE STATE (BASELINE)
  parts.push('=== BEFORE (BASELINE LOOK) ===');
  if (character.age) parts.push(`Person: ${character.age} years old`);
  if (character.gender) parts.push(`Gender: ${character.gender}`);
  
  parts.push('Starting Point:');
  parts.push('- Plain basics or neutral clothing');
  parts.push('- Minimal styling');
  parts.push('- Authentic/unpolished');
  parts.push('- Relatable everyday look');
  parts.push('- Same person, hairstyle, body as After\n');

  parts.push('Expression: Natural, neutral');
  parts.push('Setting: Simple, clean background');
  parts.push('Lighting: Even, neutral lighting\n');

  // 2. AFTER STATE (STYLED)
  parts.push('=== AFTER (STYLED TRANSFORMATION) ===');
  parts.push('Transformation Point: Outfit + styling');
  parts.push('Same Person: Exact same face, body, everything - ONLY clothing changed');
  parts.push('Added:');
  
  if (product.garment_type) parts.push(`- Stylish ${product.garment_type}`);
  if (product.style_category) parts.push(`- ${product.style_category} styling`);
  if (product.primary_color) parts.push(`- Color: ${product.primary_color}`);
  if (selectedOptions.shoes) parts.push(`- ${selectedOptions.shoes}`);
  if (selectedOptions.accessories && selectedOptions.accessories.length > 0) {
    parts.push(`- Accessories: ${Array.isArray(selectedOptions.accessories) ? selectedOptions.accessories.join(', ') : selectedOptions.accessories}`);
  }
  
  parts.push('\nMakeup: Light enhancement (optional)');
  if (selectedOptions.makeup) parts.push(`- ${selectedOptions.makeup}`);
  
  parts.push('Hair: Same or light refresh');
  if (selectedOptions.hairstyle) parts.push(`- ${selectedOptions.hairstyle}`);
  
  parts.push('\nExpression: Confident, pleased');
  parts.push('Setting: Similar to Before (consistency)');
  parts.push('Impact: Clear visual transformation through styling\n');

  // 3. LIGHTING & PHOTOGRAPHY
  parts.push('=== PHOTOGRAPHY CONSISTENCY ===');
  parts.push('Both images must be consistent:');
  parts.push('- Same lighting style');
  parts.push('- Same background (or very similar)');
  parts.push('- Same camera angle');
  parts.push('- Same background settings');
  parts.push('- Only the outfit and minimal styling changes\n');

  // 4. TRANSFORMATION STORY
  parts.push('=== TRANSFORMATION NARRATIVE ===');
  parts.push('Message: Look what this [product] does!');
  parts.push('- Before: Everyday, relatable');
  parts.push('- After: Transformed, elevated, stylish');
  parts.push('- The power of: Great styling, quality pieces');
  parts.push('- Outcome: Confidence through fashion\n');

  // 5. DESIGN & LAYOUT
  parts.push('=== BEFORE/AFTER LAYOUT ===');
  parts.push('[LEFT SIDE - BEFORE] [RIGHT SIDE - AFTER]');
  parts.push('or');
  parts.push('[TOP - BEFORE] [BOTTOM - AFTER]');
  parts.push('or');
  parts.push('[SPLIT SCREEN] with clear visual comparison');
  parts.push('or');
  parts.push('[SLIDER] effect showing transformation\n');

  // 6. QUALITY & STYLE
  parts.push('=== QUALITY & IMPACT ===');
  parts.push('Overall Look: Impactful and clear');
  parts.push('- High quality professional before/after');
  parts.push('- Clear transformation visible');
  parts.push('- Compelling reason to stylize');
  parts.push('- 8K resolution, sharp, professional');
  parts.push('- Suitable for: Brand campaigns, lookbooks, social proof, styling posts');

  return compactPrompt(parts);
}

/**
 * STYLING: Change styling elements (hair, makeup, accessories) with the outfit
 */
async function buildStylingPrompt(analysis, selectedOptions, productFocus, language = 'en') {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  // 1. CHARACTER & OUTFIT
  parts.push('=== CHARACTER & OUTFIT ===');
  if (character.age && character.gender) {
    parts.push(`${character.age} year old ${character.gender}`);
  }
  if (character.skinTone) parts.push(`${character.skinTone} skin`);
  
  if (product.garment_type) {
    parts.push(`wearing ${product.garment_type}`);
  } else if (product.detailedDescription) {
    parts.push(`wearing ${product.detailedDescription}`);
  } else if (product.type) {
    parts.push(`wearing a ${product.type}`);
  }

  // Product styling details
  if (product.primary_color) parts.push(`Color: ${product.primary_color}`);
  if (product.fabric_type) parts.push(`Fabric: ${product.fabric_type}`);
  if (product.key_details) parts.push(`Details: ${product.key_details}`);

  // 2. STYLING FOCUS (UPDATED with full details)
  parts.push(`\n=== UPDATE STYLING ===`);
  if (selectedOptions.hairstyle && selectedOptions.hairstyle !== 'same') {
    parts.push(`New hairstyle: ${selectedOptions.hairstyle}`);
  } else {
    parts.push(`Hairstyle: same as reference`);
  }
  
  if (selectedOptions.makeup) {
    parts.push(`Makeup look: ${selectedOptions.makeup}`);
  } else if (character.makeup) {
    parts.push(`Makeup: ${character.makeup}`);
  }
  
  parts.push(`Same face expression as reference`);
  parts.push(`Same pose orientation as reference`);

  // Accessories (NEW)
  if (selectedOptions.accessories && selectedOptions.accessories.length > 0) {
    parts.push(`\n=== ACCESSORIES ===`);
    const accessories = Array.isArray(selectedOptions.accessories) 
      ? selectedOptions.accessories 
      : selectedOptions.accessories.split(',');
    
    const groupedAccessories = {};
    for (const acc of accessories) {
      const category = determineAccessoryCategory(acc);
      if (!groupedAccessories[category]) groupedAccessories[category] = [];
      groupedAccessories[category].push(acc);
    }
    
    for (const [category, items] of Object.entries(groupedAccessories)) {
      parts.push(`${category}: ${items.join(', ')}`);
    }
  }

  // Footwear (NEW)
  if (selectedOptions.shoes) {
    parts.push(`\n=== FOOTWEAR ===`);
    parts.push(`Shoes: ${selectedOptions.shoes}`);
  }

  // 3. ENVIRONMENT
  parts.push(`\n=== SCENE LOCKED BACKGROUND ===`);
  if (selectedOptions.scene) {
    parts.push(`Scene: ${await buildLockedSceneDirective(selectedOptions.scene, selectedOptions, language)}`);
  }
  if (selectedOptions.lighting) parts.push(`Lighting: ${selectedOptions.lighting}`);
  if (selectedOptions.mood) parts.push(`Mood: ${selectedOptions.mood}`);

  // 4. TECHNICAL
  parts.push(`\n=== PHOTOGRAPHY SPECS ===`);
  if (selectedOptions.style) parts.push(`Style: ${selectedOptions.style}`);
  if (selectedOptions.cameraAngle) parts.push(`Camera angle: ${selectedOptions.cameraAngle}`);
  if (selectedOptions.colorPalette) parts.push(`Color palette: ${selectedOptions.colorPalette}`);
  
  parts.push(`Professional photography, 8k, sharp focus, ultra-detailed`);

  return compactPrompt(parts);
}

/**
 * COMPLETE LOOK: Show the character in full styling with complete outfit context
 */
async function buildCompleteLookPrompt(analysis, selectedOptions, productFocus, language = 'en') {
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

  // OUTFIT DESCRIPTION (ENHANCED)
  parts.push(`\n=== COMPLETE OUTFIT ===`);
  if (product.garment_type) {
    parts.push(`Garment: ${product.garment_type}`);
  }
  if (product.detailedDescription) {
    parts.push(`Description: ${product.detailedDescription}`);
  } else {
    if (product.type) parts.push(`Type: ${product.type}`);
    if (product.style_category) parts.push(`Style: ${product.style_category}`);
  }
  
  if (product.primary_color) parts.push(`Primary color: ${product.primary_color}`);
  if (product.secondary_colors) parts.push(`Secondary colors: ${product.secondary_colors}`);
  if (product.fabric_type) parts.push(`Fabric: ${product.fabric_type}`);
  if (product.fit_type) parts.push(`Fit: ${product.fit_type}`);
  if (product.pattern) parts.push(`Pattern: ${product.pattern}`);
  if (product.key_details) parts.push(`Key details: ${product.key_details}`);
  
  // STYLING
  parts.push(`\n=== STYLING ===`);
  if (selectedOptions.hairstyle && selectedOptions.hairstyle !== 'same') {
    parts.push(`Hairstyle: ${selectedOptions.hairstyle}`);
  } else {
    parts.push(`Hairstyle: same as reference image`);
  }
  
  if (selectedOptions.makeup) {
    parts.push(`Makeup: ${selectedOptions.makeup}`);
  } else if (character.makeup) {
    parts.push(`Makeup: ${character.makeup}`);
  }

  // Accessories (NEW - ENHANCED with grouping)
  if (selectedOptions.accessories && selectedOptions.accessories.length > 0) {
    parts.push(`\n=== ACCESSORIES ===`);
    const accessories = Array.isArray(selectedOptions.accessories)
      ? selectedOptions.accessories
      : selectedOptions.accessories.split(',');
    
    const groupedAccessories = {};
    for (const acc of accessories) {
      const category = determineAccessoryCategory(acc);
      if (!groupedAccessories[category]) groupedAccessories[category] = [];
      groupedAccessories[category].push(acc);
    }
    
    for (const [category, items] of Object.entries(groupedAccessories)) {
      parts.push(`${category}: ${items.join(', ')}`);
    }
  }

  // Footwear (NEW)
  if (selectedOptions.shoes) {
    parts.push(`\n=== FOOTWEAR ===`);
    parts.push(`Shoes: ${selectedOptions.shoes}`);
  }

  parts.push(`Full body, standing, confident pose`);

  // ENVIRONMENT
  parts.push(`\n=== SCENE LOCKED BACKGROUND ===`);
  if (selectedOptions.scene) {
    parts.push(`Location: ${await buildLockedSceneDirective(selectedOptions.scene, selectedOptions, language)}`);
  }
  if (selectedOptions.lighting) parts.push(`Lighting: ${selectedOptions.lighting}`);
  if (selectedOptions.mood) parts.push(`Atmosphere: ${selectedOptions.mood}`);
  if (selectedOptions.background) parts.push(`Background: ${selectedOptions.background}`);

  // TECHNICAL
  parts.push(`\n=== TECHNICAL ===`);
  if (selectedOptions.style) parts.push(`Photography: ${selectedOptions.style}`);
  if (selectedOptions.cameraAngle) parts.push(`Camera angle: ${selectedOptions.cameraAngle}`);
  if (selectedOptions.colorPalette) parts.push(`Color harmony: ${selectedOptions.colorPalette}`);
  
  parts.push(`Professional fashion photography, 8k, sharp focus, magazine-quality, ultra high resolution`);

  return compactPrompt(parts);
}

/**
 * DEFAULT: General structured prompt when use case not specified
 */
async function buildDefaultPrompt(analysis, selectedOptions, language = 'en') {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  parts.push('=== CHARACTER ===');
  if (character.overallVibe) parts.push(character.overallVibe);
  if (character.age && character.gender) {
    parts.push(`${character.age} year old ${character.gender.toLowerCase()}`);
  }
  if (character.skinTone) parts.push(`${character.skinTone} skin`);
  
  parts.push(`\n=== OUTFIT ===`);
  if (product.garment_type) {
    parts.push(`Garment: ${product.garment_type}`);
  } else if (product.detailedDescription) {
    parts.push(`Description: ${product.detailedDescription}`);
  } else if (product.type) {
    parts.push(`Type: ${product.type}`);
  }
  
  if (product.primary_color) parts.push(`Color: ${product.primary_color}`);
  if (product.fabric_type) parts.push(`Fabric: ${product.fabric_type}`);
  if (product.fit_type) parts.push(`Fit: ${product.fit_type}`);
  if (product.key_details) parts.push(`Details: ${product.key_details}`);
  if (product.style_category) parts.push(`Style: ${product.style_category}`);

  // Accessories (NEW - ENHANCED)
  if (selectedOptions.accessories && selectedOptions.accessories.length > 0) {
    parts.push(`\n=== ACCESSORIES ===`);
    const accessories = Array.isArray(selectedOptions.accessories)
      ? selectedOptions.accessories
      : selectedOptions.accessories.split(',');
    
    const groupedAccessories = {};
    for (const acc of accessories) {
      const category = determineAccessoryCategory(acc);
      if (!groupedAccessories[category]) groupedAccessories[category] = [];
      groupedAccessories[category].push(acc);
    }
    
    for (const [category, items] of Object.entries(groupedAccessories)) {
      parts.push(`${category}: ${items.join(', ')}`);
    }
  }

  // Footwear (NEW)
  if (selectedOptions.shoes) {
    parts.push(`\n=== FOOTWEAR ===`);
    parts.push(`Shoes: ${selectedOptions.shoes}`);
  }

  // Makeup (NEW)
  parts.push(`\n=== STYLING ===`);
  if (selectedOptions.makeup) {
    parts.push(`Makeup: ${selectedOptions.makeup}`);
  } else if (character.makeup) {
    parts.push(`Makeup: ${character.makeup}`);
  }
  if (selectedOptions.hairstyle && selectedOptions.hairstyle !== 'same') {
    parts.push(`Hairstyle: ${selectedOptions.hairstyle}`);
  }

  // Environment/Technical (ENHANCED)
  parts.push(`\n=== SCENE LOCKED BACKGROUND ===`);
  if (selectedOptions.scene) {
    parts.push(`Scene: ${await buildLockedSceneDirective(selectedOptions.scene, selectedOptions, language)}`);
  }
  if (selectedOptions.lighting) parts.push(`Lighting: ${selectedOptions.lighting}`);
  if (selectedOptions.mood) parts.push(`Mood: ${selectedOptions.mood}`);
  if (selectedOptions.style) parts.push(`Photography style: ${selectedOptions.style}`);
  if (selectedOptions.cameraAngle) parts.push(`Camera angle: ${selectedOptions.cameraAngle}`);
  if (selectedOptions.colorPalette) parts.push(`Color palette: ${selectedOptions.colorPalette}`);

  parts.push(`Professional photography, 8k, sharp focus, ultra-detailed`);

  return compactPrompt(parts);
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
    // CRITICAL FOR VIRTUAL TRY-ON: Prevent character changes
    'changes to face',
    'different face shape',
    'modified body type',
    'changed pose',
    'different expression',
    'altered eye appearance',
    'different skin color',
    'changed hair style',
    'different hairstyle',
    'different eye color',
    'cropped head',
    'damaged face',
    'changed body',
    
    // General quality issues
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
    'torn clothing',
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
    'chromatic aberration',
    
    // Garment-specific issues
    'floating garment',
    'disconnected clothing',
    'unrealistic draping',
    'awkward fit',
    'reversed colors',
    'color bleeding',
    'misaligned seams'
  ];
  
  // Add product-specific negatives
  if (product && product.type) {
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
  const scene = selectedOptions?.scene;
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
  const lighting = selectedOptions?.lighting;
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

// Export Flux-optimized prompt builder for BFL provider
// Export new scene reference info function for image generation
export { buildFluxPrompt, buildFluxWearingPrompt, buildFluxHoldingPrompt, getSceneReferenceInfo };
