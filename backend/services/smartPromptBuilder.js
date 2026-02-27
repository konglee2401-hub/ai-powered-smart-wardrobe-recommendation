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
 * Build a locked scene directive to keep scene consistency across generations
 * Priority: sceneLockedPrompt > promptSuggestion > option value
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
export async function buildDetailedPrompt(analysis, selectedOptions, useCase = 'change-clothes', productFocus = 'full-outfit', language = 'en') {
  // 💫 NEW: Support Vietnamese language for image generation
  // Normalize language code: 'vi-VN' or 'vi_VN' → 'vi'
  const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
  
  if (normalizedLanguage === 'vi') {
    try {
      console.log(`\n🇻🇳 Using Vietnamese prompts for image generation...`);
      const VietnamesePromptBuilder = require('./vietnamesePromptBuilder.js');
      
      // Build Vietnamese prompt based on use case
      let vietnamesePrompt = '';
      if (useCase === 'change-clothes' || useCase === 'character-holding-product') {
        // Use character analysis prompt which includes detailed instructions
        vietnamesePrompt = VietnamesePromptBuilder.buildCharacterAnalysisPrompt();
        console.log(`✅ Using Vietnamese character analysis prompt`);
      } else {
        // Fallback to default behavior for other use cases
        vietnamesePrompt = VietnamesePromptBuilder.buildCharacterAnalysisPrompt();
        console.log(`⚠️ No specific Vietnamese prompt for use case '${useCase}', using character analysis prompt`);
      }
      
      return {
        prompt: vietnamesePrompt.trim(),
        negativePrompt: buildNegativePromptGeneric(selectedOptions)
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
      promptStr = await buildChangeClothesPrompt(analysis, selectedOptions, productFocus, normalizedLanguage);
      break;
    case 'character-holding-product':
      promptStr = await buildCharacterHoldingProductPrompt(analysis, selectedOptions, productFocus, normalizedLanguage);
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

  return {
    prompt: promptStr.trim(),
    negativePrompt: negativePrompt.trim()
  };
}

/**
 * CHANGE CLOTHES: Keep character's face and body, ONLY change the clothing
 * Most important: Emphasize keeping face, body, pose identical
 */
async function buildChangeClothesPrompt(analysis, selectedOptions, productFocus, language = 'en') {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  // ==========================================
  // 🎯 NEW: IMAGE REFERENCE LABELING (CRITICAL)
  // ==========================================
  // This addresses the main issue: when both images have people, AI gets confused
  // By explicitly labeling IMAGE 1 as CHARACTER and IMAGE 2 as PRODUCT,
  // we force AI to understand which one to modify and which to preserve
  parts.push('[IMAGE REFERENCE MAPPING]');
  parts.push('Image 1 (First Upload) = CHARACTER REFERENCE - Person to be dressed');
  parts.push('Image 2 (Second Upload) = PRODUCT/OUTFIT REFERENCE - Clothing to apply');
  parts.push('CRITICAL: Do NOT swap these images. Keep character unchanged, change clothing only.\n');

  // 1. CHARACTER SECTION - Emphasize what STAYS THE SAME
  parts.push('=== KEEP CHARACTER UNCHANGED (CRITICAL) ===');
  parts.push('Preserve EXACTLY everything about the person from Image 1:');
  
  if (character.age) parts.push(`- Age: ${character.age} years old`);
  if (character.gender) parts.push(`- Gender: ${character.gender}`);
  if (character.skinTone) parts.push(`- Skin tone: ${character.skinTone}`);
  
  if (character.hair?.color && character.hair?.style) {
    parts.push(`- Hair: ${character.hair.color} hair, ${character.hair.style} style, ${character.hair.length || 'medium length'}`);
  }
  
  if (character.facialFeatures) {
    parts.push(`- Facial features: ${character.facialFeatures}`);
  }
  
  parts.push(`- SAME face with same expression and gaze`);
  parts.push(`- SAME body and body type exactly`);
  parts.push(`- SAME pose and position exactly as shown in Image 1`);
  parts.push(`- SAME pose orientation and arm position`);
  parts.push(`- SAME head tilt and neck angle`);
  parts.push(`- Do NOT change: face shape, eye color, nose, mouth, body texture\n`);

  // 2. CHANGE THIS - The new clothing (ENHANCED with full product details from Image 2)
  parts.push(`=== CHANGE CLOTHING TO (FROM IMAGE 2) ===`);
  parts.push(`Replace what the person is wearing with the garment specifications from Image 2.\n`);
  
  // Product garment details - EXPANDED
  if (product.garment_type) {
    parts.push(`GARMENT TYPE: ${product.garment_type}`);
  } else if (product.type) {
    parts.push(`GARMENT TYPE: ${product.type}`);
  } else if (product.detailedDescription) {
    parts.push(`GARMENT: ${product.detailedDescription}`);
  }
  
  // Product styling details
  if (product.style_category) parts.push(`Style Category: ${product.style_category}`);
  
  // Colors - NOW COMPLETE (this was the missing part)
  parts.push(`\n📍 COLORS (Distinguishing feature for garment identification):`);
  if (product.primary_color) parts.push(`  Primary Color: ${product.primary_color}`);
  if (product.secondary_color && product.secondary_color !== '') {
    parts.push(`  Secondary Color: ${product.secondary_color}`);
  } else if (!product.primary_color) {
    parts.push(`  Color: As shown in Image 2`);
  }
  
  // Fabric and material - NOW COMPLETE
  parts.push(`\n🧵 MATERIAL & TEXTURE:`);
  if (product.fabric_type) {
    parts.push(`  Fabric: ${product.fabric_type}`);
    parts.push(`  Appearance: Realistic ${product.fabric_type.toLowerCase()} texture`);
  } else if (product.material) {
    parts.push(`  Material: ${product.material}`);
  } else {
    parts.push(`  Material: High-quality as shown in Image 2`);
  }
  
  // Pattern - NOW COMPLETE
  parts.push(`\n🎨 PATTERN:`);
  if (product.pattern) {
    parts.push(`  Pattern: ${product.pattern}`);
  } else {
    parts.push(`  Pattern: Solid color`);
  }
  
  // Fit - NOW COMPLETE
  parts.push(`\n👕 FIT & SILHOUETTE:`);
  if (product.fit_type) parts.push(`  Fit: ${product.fit_type}`);
  else if (product.fit) parts.push(`  Fit: ${product.fit}`);
  
  // Design details - NOW COMPLETE
  parts.push(`\n🎭 DESIGN DETAILS:`);
  if (product.neckline) parts.push(`  Neckline: ${product.neckline}`);
  if (product.sleeves) parts.push(`  Sleeves: ${product.sleeves}`);
  if (product.key_details) parts.push(`  Special Details: ${product.key_details}`);
  else parts.push(`  Details: As shown in Image 2 reference`);
  
  // Length & coverage
  parts.push(`\n📏 LENGTH & COVERAGE:`);
  if (product.length) parts.push(`  Length: ${product.length}`);
  if (product.coverage) parts.push(`  Coverage: ${product.coverage}`);
  else parts.push(`  Coverage: As shown in product image\n`);

  // 3. HAIR & MAKEUP STYLING
  parts.push(`\n=== HAIRSTYLE & MAKEUP ===`);
  if (selectedOptions.hairstyle && selectedOptions.hairstyle !== 'same') {
    const hairstyleSuggestion = await loadPromptSuggestion(selectedOptions.hairstyle, 'hairstyle');
    parts.push(`Hairstyle: ${hairstyleSuggestion}`);
  } else {
    parts.push(`Hairstyle: Keep SAME as reference image - do NOT change`);
  }
  
  // Makeup from selectedOptions or from character analysis
  if (selectedOptions.makeup) {
    const makeupSuggestion = await loadPromptSuggestion(selectedOptions.makeup, 'makeup');
    parts.push(`Makeup: ${makeupSuggestion}`);
  } else if (character.makeup) {
    parts.push(`Makeup: ${character.makeup}`);
  } else {
    parts.push(`Makeup: Keep same as reference - professional, natural look`);
  }

  // 4. ACCESSORIES (NEW - from selectedOptions)
  if (selectedOptions.accessories && selectedOptions.accessories.length > 0) {
    parts.push(`\n=== ACCESSORIES ===`);
    const accessories = Array.isArray(selectedOptions.accessories) 
      ? selectedOptions.accessories 
      : selectedOptions.accessories.split(',');
    
    // Group accessories by category
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

  // 5. FOOTWEAR (NEW - from selectedOptions with promptSuggestion)
  if (selectedOptions.shoes) {
    parts.push(`\n=== FOOTWEAR ===`);
    const shoesSuggestion = await loadPromptSuggestion(selectedOptions.shoes, 'shoes');
    parts.push(`Shoes: ${shoesSuggestion}`);
  }

  // 6. BOTTOM WEAR (NEW - if specified with promptSuggestion)
  if (selectedOptions.bottom) {
    parts.push(`\n=== BOTTOM WEAR ===`);
    const bottomSuggestion = await loadPromptSuggestion(selectedOptions.bottom, 'bottoms');
    parts.push(`${bottomSuggestion}`);
  }

  // 7. GARMENT PLACEMENT INSTRUCTIONS (NEW - Critical for virtual try-on)
  parts.push(`\n=== HOW TO APPLY THE GARMENT ===`);
  parts.push(`1. Take the garment from Image 2 reference`);
  parts.push(`2. Place it on the character's body with realistic draping`);
  parts.push(`3. Ensure natural fabric folds and wrinkles`);
  parts.push(`4. Match fabric behavior to material type`);
  parts.push(`5. Ensure proper fit on character's body`);
  parts.push(`6. Keep all gaps (neck, wrists, ankles) appropriate`);
  parts.push(`7. Do NOT distort character's body to fit garment`);
  parts.push(`8. Keep body proportions visible in shoulders/waist/hips\n`);

  // 8. ENVIRONMENT & LIGHTING (WITH TECHNICAL DETAILS AND PROMPT SUGGESTIONS)
  parts.push(`\n=== SCENE LOCKED BACKGROUND ===`);
  if (selectedOptions.scene) {
    const lockedSceneDirective = await buildLockedSceneDirective(selectedOptions.scene, selectedOptions, language);
    parts.push(`Setting: ${lockedSceneDirective}`);
  }
  
  if (selectedOptions.lighting) {
    const lightingSuggestion = await loadPromptSuggestion(selectedOptions.lighting, 'lighting');
    parts.push(`\nLighting: ${lightingSuggestion}`);
    // Add technical details for lighting setup
    const lightingDetails = getFallbackTechnicalDetails('lighting', selectedOptions.lighting);
    if (lightingDetails && Object.keys(lightingDetails).length > 0) {
      for (const [key, value] of Object.entries(lightingDetails)) {
        parts.push(`  ${key}: ${value}`);
      }
    }
  }
  
  if (selectedOptions.mood) {
    const moodSuggestion = await loadPromptSuggestion(selectedOptions.mood, 'mood');
    parts.push(`\nMood/Atmosphere: ${moodSuggestion}`);
  }

  // 9. PHOTO STYLE & TECHNICAL (WITH PROMPT SUGGESTIONS)
  parts.push(`\n=== PHOTOGRAPHY & QUALITY ===`);
  if (selectedOptions.style) {
    const styleSuggestion = await loadPromptSuggestion(selectedOptions.style, 'style');
    parts.push(`Style: ${styleSuggestion}`);
  }
  if (selectedOptions.cameraAngle) {
    const angleSuggestion = await loadPromptSuggestion(selectedOptions.cameraAngle, 'cameraAngle');
    parts.push(`Camera angle: ${angleSuggestion}`);
  }
  if (selectedOptions.colorPalette) {
    const paletteSuggestion = await loadPromptSuggestion(selectedOptions.colorPalette, 'colorPalette');
    parts.push(`Color palette: ${paletteSuggestion}`);
  }
  
  parts.push(`Quality: Professional photography, 8k, sharp focus, ultra-detailed, photorealistic`);
  parts.push(`Detail Level: Realistic fabric texture, proper draping, anatomically correct\n`);

  // 10. FINAL CRITICAL REMINDER
  parts.push(`=== EXECUTION CHECKLIST ===`);
  parts.push(`✓ Photo of person from Image 1 with character details preserved`);
  parts.push(`✓ Wearing garment from Image 2 with correct colors and materials`);
  parts.push(`✓ Same face, body, pose, expression - UNCHANGED`);
  parts.push(`✓ Realistic garment placement with natural draping`);
  parts.push(`✓ Professional lighting and composition`);
  parts.push(`✓ No distorted anatomy or bad proportions`);

  return parts.join('\n');
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
 * 
 * Key Focus:
 * - Character is the PRIMARY SUBJECT (60%+ of image)
 * - Product is VISIBLE in hands/displayed (40% of focus)
 * - Natural pose of holding/presenting product
 * - Character's expression shows the product or engagement with it
 * 
 * Best For:
 * - Affiliate marketing (presenter + product)
 * - Fashion styling (model showing outfit piece)
 * - Product demonstration (how to use/wear)
 * - Social media content (trending product showcase)
 * - Unboxing-style content
 */
async function buildCharacterHoldingProductPrompt(analysis, selectedOptions, productFocus, language = 'en') {
  const parts = [];
  const character = analysis.character || {};
  const product = analysis.product || {};

  parts.push('[CHARACTER HOLDING PRODUCT COMPOSITION]');
  parts.push('Purpose: Character prominently holding or presenting product for affiliate/marketing content');
  parts.push('Focus: Character (60%) + Product in hand (40%)\n');

  // ==========================================
  // IMAGE REFERENCE SETUP
  // ==========================================
  parts.push('[IMAGE REFERENCE MAPPING]');
  parts.push('Image 1 (First Upload) = CHARACTER REFERENCE - Person to feature');
  parts.push('Image 2 (Second Upload) = PRODUCT REFERENCE - Item to hold/present');
  parts.push('CRITICAL: Character holds/presents product from Image 2 in hand or elevated position.\n');

  // ==========================================
  // CHARACTER SECTION (PRIMARY FOCUS)
  // ==========================================
  parts.push('=== CHARACTER (PRIMARY SUBJECT - 60% of focus) ===');
  parts.push('The character is the MAIN SUBJECT - prominently featured\n');

  // Physical appearance - KEEP SAME
  parts.push('Character Description (KEEP FROM IMAGE 1):');
  if (character.age) parts.push(`- Age: ${character.age} years old`);
  if (character.gender) parts.push(`- Gender: ${character.gender}`);
  if (character.skinTone) parts.push(`- Skin tone: ${character.skinTone}`);
  
  if (character.hair?.color && character.hair?.style) {
    parts.push(`- Hair: ${character.hair.color} hair, ${character.hair.style} style`);
  }
  
  if (character.facialFeatures) {
    parts.push(`- Facial features: ${character.facialFeatures}`);
  }
  parts.push(`- SAME face, body, and overall appearance as Image 1\n`);

  // Pose for holding product
  parts.push('POSE & POSITIONING:');
  parts.push('- Standing or seated, natural comfortable position');
  parts.push(`- Hands/arms prominently HOLDING or PRESENTING the product`);
  parts.push('- Product visible and well-placed in character\'s hands or near body');
  parts.push('- Character looking at product OR toward camera with confident/engaging expression');
  parts.push('- Posture: Open, approachable, product-focused pose');
  parts.push('- Full body or close-up focusing on the hands holding product\n');

  // Expression & Engagement
  parts.push('EXPRESSION & ENGAGEMENT:');
  parts.push('- Expression: Engaged, interested, possibly smiling or intrigued');
  parts.push('- Focus: Looking at product or making eye contact while holding it');
  parts.push('- Energy: Positive, confident, product-presentation energy');
  parts.push('- NOT looking away from or ignoring the product\n');

  // Outfit for character
  parts.push('CHARACTER OUTFIT:');
  if (selectedOptions.outfitColor) {
    parts.push(`- Color: ${selectedOptions.outfitColor}`);
  } else {
    parts.push(`- Color: Neutral or complementary to product`);
  }
  if (selectedOptions.outfitStyle) {
    parts.push(`- Style: ${selectedOptions.outfitStyle}`);
  } else {
    parts.push(`- Style: Casual, clean, professional casual`);
  }
  parts.push(`- Purpose: Does NOT compete with product - subtle background outfit\n`);

  // ==========================================
  // PRODUCT SECTION (SECONDARY FOCUS - IN HANDS)
  // ==========================================
  parts.push('=== PRODUCT (SECONDARY FOCUS - IN HANDS) ===');
  parts.push('The product is PROMINENTLY VISIBLE, held or presented by character\n');

  // Product identification
  if (product.garment_type) {
    parts.push(`Garment: ${product.garment_type}`);
  } else if (product.detailedDescription) {
    parts.push(`Item: ${product.detailedDescription}`);
  } else if (product.type) {
    parts.push(`Type: ${product.type}`);
  }

  // Product styling details
  if (product.style_category) parts.push(`Style: ${product.style_category}`);

  // Colors
  parts.push(`\n📍 COLORS (Clear identification):`);
  if (product.primary_color) parts.push(`  Primary: ${product.primary_color}`);
  if (product.secondary_color && product.secondary_color !== '') {
    parts.push(`  Secondary: ${product.secondary_color}`);
  }

  // Material
  parts.push(`\n🧵 MATERIAL & TEXTURE:`);
  if (product.fabric_type) {
    parts.push(`  Fabric: ${product.fabric_type}`);
    parts.push(`  Appearance: Realistic ${product.fabric_type.toLowerCase()} texture`);
  } else if (product.material) {
    parts.push(`  Material: ${product.material}`);
  }

  // Pattern
  parts.push(`\n🎨 PATTERN & DESIGN:`);
  if (product.pattern) {
    parts.push(`  Pattern: ${product.pattern}`);
  } else {
    parts.push(`  Pattern: Solid color`);
  }

  // Design details
  if (product.key_details) {
    parts.push(`  Key details: ${product.key_details}`);
  }

  // HOW PRODUCT IS HELD
  parts.push(`\n👐 HOW PRODUCT IS PRESENTED:`);
  parts.push(`- Character HOLDS product clearly visible to camera`);
  parts.push(`- Hand position: Comfortable natural holding position`);
  parts.push(`- Product orientation: Clearly visible, not hidden or folded`);
  parts.push(`- Angle: Best angle to show product details`);
  if (productFocus === 'full-outfit') {
    parts.push(`- Display: Garment held up, draped on arms, or worn by character`);
  } else if (productFocus === 'top') {
    parts.push(`- Display: Top piece held or draped, clearly visible`);
  } else if (productFocus === 'bottom') {
    parts.push(`- Display: Bottom piece held up, folded visible in hands`);
  } else if (productFocus === 'shoes') {
    parts.push(`- Display: Shoes held in hands showing front/side view`);
  } else if (productFocus === 'accessory') {
    parts.push(`- Display: Accessory prominently held or displayed near face/chest`);
  }
  parts.push(`- Lighting on product: Well-lit, colors true-to-life\n`);

  // ==========================================
  // HANDS & PLACEMENT
  // ==========================================
  parts.push('=== HANDS & PRODUCT PLACEMENT ===');
  parts.push('- Hands: Natural, well-shaped, clearly visible');
  parts.push('- Hand position: Comfortable holding or presenting pose');
  parts.push('- Fingers: Visible but not distracting, natural posture');
  parts.push('- Product placement: Center-right or slightly off-center for visual balance');
  parts.push('- Hand-product relationship: Product clearly held/presented by character\n');

  // ==========================================
  // STYLING & APPEARANCE
  // ==========================================
  parts.push('=== STYLING & APPEARANCE ===');
  
  // Hairstyle
  if (selectedOptions.hairstyle && selectedOptions.hairstyle !== 'same') {
    const hairstyleSuggestion = await loadPromptSuggestion(selectedOptions.hairstyle, 'hairstyle');
    parts.push(`Hairstyle: ${hairstyleSuggestion}`);
  } else {
    parts.push(`Hairstyle: Keep from Image 1 reference`);
  }

  // Makeup
  if (selectedOptions.makeup) {
    const makeupSuggestion = await loadPromptSuggestion(selectedOptions.makeup, 'makeup');
    parts.push(`Makeup: ${makeupSuggestion}`);
  } else {
    parts.push(`Makeup: Natural, fresh, professional look - enhances but not overpowering`);
  }

  // Accessories
  if (selectedOptions.accessories && selectedOptions.accessories.length > 0) {
    parts.push(`\nAccessories: Minimal - does not compete with held product`);
    const accessories = Array.isArray(selectedOptions.accessories)
      ? selectedOptions.accessories
      : selectedOptions.accessories.split(',');
    parts.push(`- Featured: ${accessories.join(', ')}`);
  }

  // ==========================================
  // ENVIRONMENT & SETTING
  // ==========================================
  parts.push(`\n=== SCENE LOCKED BACKGROUND ===`);
  if (selectedOptions.scene) {
    const lockedSceneDirective = await buildLockedSceneDirective(selectedOptions.scene, selectedOptions, language);
    parts.push(`Location: ${lockedSceneDirective}`);
  } else {
    parts.push(`Location: Clean, uncluttered background - focus on character`);
  }
  parts.push(`Background: Slightly soft-focused or neutral to emphasize character\n`);

  // ==========================================
  // PHOTOGRAPHY STYLE & TECHNICAL
  // ==========================================
  parts.push('=== LIGHTING & PHOTOGRAPHY ===');
  if (selectedOptions.lighting) {
    parts.push(`Lighting style: ${selectedOptions.lighting}`);
  } else {
    parts.push(`Lighting: Soft, flattering, even lighting on character and product`);
  }
  parts.push('- Key light: Slightly front/45° for flattering character lighting');
  parts.push('- Product lighting: Well-lit showing colors and texture clearly');
  parts.push('- No harsh shadows on character or product');
  
  if (selectedOptions.mood) parts.push(`Mood: ${selectedOptions.mood}`);
  else parts.push(`Mood: Positive, engaging, professional presentation`);

  parts.push(`\n=== COMPOSITION ===`);
  if (selectedOptions.cameraAngle) parts.push(`Camera angle: ${selectedOptions.cameraAngle}`);
  else parts.push(`Camera angle: Eye-level or slightly below eye-level for engagement`);

  if (selectedOptions.colorPalette) parts.push(`Color harmony: ${selectedOptions.colorPalette}`);
  else parts.push(`Color harmony: Warm, inviting, product colors pop`);

  parts.push(`\nFrame: Character from waist/hips up OR full-body showing hands clearly`);
  parts.push(`Focus: Sharp and detailed on face and hands`);
  parts.push(`Depth: Slight background blur to emphasize character and product\n`);

  // ==========================================
  // FINAL TECHNICAL SPECS
  // ==========================================
  parts.push('=== QUALITY & TECHNICAL SPECS ===');
  parts.push('Resolution: 8K ultra high quality');
  parts.push('Style: Professional marketing/affiliate photography');
  parts.push('Finish: Magazine-quality, retail-ready');
  parts.push('Details: Ultra-detailed, sharp focus, excellent clarity');
  parts.push('Aesthetic: Clean, professional, product-focused marketing image');

  return parts.join('\n');
}

// ============================================================
// �🛍️ ECOMMERCE: Professional product photography for online stores
// ============================================================

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

  return parts.join('\n');
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

  return parts.join('\n');
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

  return parts.join('\n');
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

  return parts.join('\n');
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

  return parts.join('\n');
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

  return parts.join('\n');
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

  return parts.join('\n');
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

  return parts.join('\n');
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
