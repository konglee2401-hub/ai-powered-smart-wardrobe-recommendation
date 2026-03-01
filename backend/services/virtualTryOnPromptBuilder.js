/**
 * Virtual Try-On Prompt Builder
 * 
 * Specialized prompt system for changing clothing on a person while keeping character intact.
 * 
 * KEY STRATEGY:
 * 1. EXPLICIT IMAGE ROLE LABELING - Tell AI exactly which image is character, which is product
 * 2. DETAILED GARMENT SPECIFICATION - Product details extracted from analysis
 * 3. GEOMETRIC POSITIONING - Precise instructions on where to place the garment
 * 4. REFERENCE PRESERVATION - Keep character features (face, body, pose) identical
 */

/**
 * Build optimized virtual try-on prompt
 * 
 * INPUT:
 * - characterAnalysis: Details about person (face, body, pose)
 * - productAnalysis: Details about clothing (type, color, material)
 * - selectedOptions: User style preferences
 * 
 * OUTPUT:
 * - Prompt that clearly separates IMAGE 1 (CHARACTER) vs IMAGE 2 (PRODUCT)
 * - Complete clothing specifications to replace
 * - Clear preservation instructions for character
 */
export function buildVirtualTryOnPrompt(characterAnalysis, productAnalysis, selectedOptions = {}) {
  const character = characterAnalysis || {};
  const product = productAnalysis || {};
  
  let prompt = '';

  // ==========================================
  // PART 1: IMAGE REFERENCE MAPPING
  // ==========================================
  prompt += `[IMAGE 1 - CHARACTER REFERENCE]\n`;
  prompt += `Use this image as the character/person reference.\n`;
  prompt += `Keep: Face, body type, pose, position, and orientation EXACTLY as shown.\n`;
  prompt += `Only change the clothing.\n\n`;

  prompt += `[IMAGE 2 - PRODUCT/OUTFIT REFERENCE]\n`;
  prompt += `This image shows the clothing/outfit to apply.\n`;
  prompt += `Use this as the garment specification reference.\n\n`;

  // ==========================================
  // PART 2: CHARACTER PRESERVATION (STRICT)
  // ==========================================
  prompt += `=== CHARACTER MUST STAY UNCHANGED ===\n`;
  
  // Consolidated character details (removed excessive "KEEP", "IDENTICAL", "PRESERVE" repetitions)
  prompt += `Face & Head:\n`;
  if (character.age) prompt += `- Age: ${character.age}\n`;
  if (character.gender) prompt += `- Gender: ${character.gender}\n`;
  if (character.facialFeatures) prompt += `- Features: ${character.facialFeatures}\n`;
  if (character.eyes) prompt += `- Eyes: ${character.eyes}\n`;
  if (character.skinTone) prompt += `- Skin: ${character.skinTone}\n`;
  
  // Hair - consolidated
  if (character.hair) {
    prompt += `Hair: ${character.hair.color || ''} ${character.hair.style || ''} ${character.hair.length || ''} - same as reference\n`;
  } else {
    prompt += `Hair: Same as reference image\n`;
  }
  
  // Body & Pose - consolidated
  prompt += `Body & Pose: Same body type, posture, arm position, head angle, hand position\n`;
  prompt += `Expression: Same facial expression and gaze direction\n`;
  prompt += `Do NOT change: face, body type, pose, expression, or hairstyle\n\n`;

  // ==========================================
  // PART 3: PRODUCT/CLOTHING CHANGE SECTION (CONSOLIDATED)
  // ==========================================
  prompt += `=== CHANGE CLOTHING TO ===\n`;
  prompt += `Replace current clothing with the outfit from IMAGE 2.\n\n`;

  // Consolidated garment specifications (removed scattered sections)
  if (product.garment_type || product.type) {
    const garmentType = product.garment_type || product.type;
    prompt += `Garment: ${garmentType}`;
    if (product.style_category) prompt += ` (${product.style_category})`;
    prompt += `\n`;
  }

  // Consolidated colors (was in separate COLOR section)
  if (product.primary_color) {
    const colorLine = product.secondary_color 
      ? `${product.primary_color} with ${product.secondary_color}` 
      : product.primary_color;
    prompt += `Color: ${colorLine}\n`;
  }

  // Consolidated material & texture (was separate section)
  if (product.fabric_type || product.material) {
    const material = product.fabric_type || product.material;
    prompt += `Material: ${material} with realistic texture\n`;
  }

  // Consolidated design details - no duplicate suffixes
  const designDetails = [];
  if (product.neckline) designDetails.push(product.neckline);
  if (product.sleeves) designDetails.push(product.sleeves);
  if (product.fit_type || product.fit) designDetails.push(product.fit_type || product.fit);
  if (product.pattern && product.pattern !== 'solid' && product.pattern !== 'Solid color') {
    designDetails.push(product.pattern);
  }
  
  if (designDetails.length > 0) {
    prompt += `Details: ${designDetails.join(', ')}\n`;
  }
  
  // Special Features - separate line
  if (product.key_details) {
    prompt += `Special Features: ${product.key_details}\n`;
  }
  
  // Length & Coverage - separate line without duplicate suffixes
  if (product.length || product.coverage) {
    const lengthInfo = product.length || '';
    const coverageInfo = product.coverage || '';
    prompt += `Fit & Coverage: ${[lengthInfo, coverageInfo].filter(Boolean).join(', ')}\n`;
  }

  prompt += `\n`;

  // ==========================================
  // PART 4: GARMENT PLACEMENT & DRAPING
  // ==========================================
  prompt += `=== HOW TO APPLY THE GARMENT ===\n`;
  prompt += `1. Take the garment dimensions from IMAGE 2 reference\n`;
  prompt += `2. Place it on the character's body with realistic draping\n`;
  prompt += `3. Ensure natural fabric folds and wrinkles\n`;
  prompt += `4. Match fabric behavior to material type\n`;
  prompt += `5. Ensure proper fit on character's body from IMAGE 1\n`;
  prompt += `6. Keep all gaps (neck, wrists, ankles) appropriate\n`;
  prompt += `7. Maintain body proportions visible in shoulders/waist/hips\n\n`;

  // ==========================================
  // PART 5: STYLING & ACCESSORIES
  // ==========================================
  prompt += `=== HAIRSTYLE & MAKEUP ===\n`;
  
  if (selectedOptions.hairstyle && selectedOptions.hairstyle !== 'same') {
    prompt += `Hairstyle: ${selectedOptions.hairstyle}\n`;
  } else {
    prompt += `Hairstyle: Keep EXACTLY same as reference image\n`;
  }

  if (selectedOptions.makeup) {
    prompt += `Makeup: ${selectedOptions.makeup}\n`;
  } else if (character.makeup) {
    prompt += `Makeup: ${character.makeup}\n`;
  } else {
    prompt += `Makeup: Keep same as reference (natural/professional)\n`;
  }

  prompt += `\n`;

  // Accessories
  if (selectedOptions.accessories && selectedOptions.accessories.length > 0) {
    prompt += `=== ACCESSORIES ===\n`;
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
      prompt += `${category}: ${items.join(', ')}\n`;
    }
    prompt += `\n`;
  }

  // Footwear
  if (selectedOptions.shoes) {
    prompt += `=== FOOTWEAR ===\n`;
    prompt += `Shoes: ${selectedOptions.shoes}\n\n`;
  }

  // ==========================================
  // PART 6: ENVIRONMENT & PHOTOGRAPHY (CONSOLIDATED)
  // ==========================================
  prompt += `=== ENVIRONMENT & PHOTOGRAPHY ===\n`;
  
  if (selectedOptions.scene) {
    prompt += `Setting: ${selectedOptions.scene}`;
    if (selectedOptions.scene === 'studio') prompt += ` (white seamless background)`;
    prompt += `\n`;
  }
  
  if (selectedOptions.lighting) {
    prompt += `Lighting: ${selectedOptions.lighting}\n`;
  } else {
    prompt += `Lighting: Natural, professional\n`;
  }
  
  if (selectedOptions.mood) {
    prompt += `Mood: ${selectedOptions.mood}\n`;
  } else {
    prompt += `Mood: Professional, elegant\n`;
  }
  
  // Style and camera angle
  if (selectedOptions.style) {
    prompt += `Style: ${selectedOptions.style}\n`;
  }
  
  if (selectedOptions.cameraAngle) {
    prompt += `Camera angle: ${selectedOptions.cameraAngle}\n`;
  }
  
  if (selectedOptions.colorPalette) {
    prompt += `Color palette: ${selectedOptions.colorPalette}\n`;
  }
  
  // Simplified quality statement (removed excessive technical terms)
  prompt += `Quality: Professional 8K photography, sharp focus, ultra-detailed, photorealistic\n`;
  prompt += `Anatomy: Anatomically correct, realistic proportions\n`;

  return prompt;
}

/**
 * Build negative prompt for virtual try-on
 * Explicitly tell AI what NOT to do
 */
export function buildVirtualTryOnNegativePrompt(productAnalysis = {}, selectedOptions = {}) {
  const negatives = [
    // CRITICAL: Prevent character changes
    'changes to face',
    'different face shape',
    'modified body type',
    'changed pose',
    'different expression',
    'altered eye appearance',
    'different skin color',
    'changed hair style',
    'different hairstyle',
    'cropped head',
    
    // Prevent garment issues
    'blurry garment',
    'distorted clothing',
    'wrinkled badly',
    'damaged clothing',
    'torn fabric',
    'stained garment',
    'poorly fitted',
    'baggy fitting',
    
    // Quality issues
    'low quality',
    'pixelated',
    'compressed',
    'blurry',
    'out of focus',
    'jpeg artifacts',
    'watermark',
    'signature',
    'text overlay',
    
    // Anatomical issues
    'bad anatomy',
    'extra limbs',
    'missing limbs',
    'distorted hands',
    'bad hands',
    'extra fingers',
    'deformed body',
    'ugly',
    'mutation',
    
    // Unwanted modifications
    'floating garment',
    'disconnected clothing',
    'unrealistic draping',
    'awkward fit',
    'reversed colors',
    'color bleeding',
    'misaligned seams'
  ];

  return negatives.join(', ');
}

/**
 * Helper: Determine accessory category from name
 */
function determineAccessoryCategory(accessory) {
  const accessories = {
    'NECKLACES': ['pendant', 'chain', 'choker', 'locket', 'layer', 'statement', 'pearl', 'name', 'zodiac'],
    'EARRINGS': ['stud', 'hoop', 'drop', 'chandelier', 'huggie', 'threader', 'cluster', 'tassel'],
    'BRACELETS': ['bangle', 'cuff', 'chain', 'beaded', 'tennis', 'charm', 'wrap', 'minimalist'],
    'HAIR ACCESSORIES': ['hairpins', 'clips', 'headband', 'scrunchie', 'claw', 'stick', 'wrap', 'barrette'],
    'HATS': ['beanie', 'cap', 'fedora', 'beret', 'bucket', 'brim', 'straw', 'visor'],
    'BELTS': ['leather', 'chain', 'fabric', 'corset', 'obi', 'elastic', 'cinch'],
    'SCARVES': ['knit', 'silk', 'shawl', 'infinity', 'bandana', 'tie', 'collar']
  };
  
  const acc = accessory.toLowerCase();
  for (const [category, keywords] of Object.entries(accessories)) {
    if (keywords.some(kw => acc.includes(kw))) {
      return category;
    }
  }
  return 'ACCESSORIES';
}

/**
 * Create comprehensive virtual try-on configuration
 */
export function createVirtualTryOnConfig(analysis, selectedOptions = {}) {
  return {
    type: 'virtual-try-on',
    characterPreservation: {
      keepFace: true,
      keepBody: true,
      keepPose: true,
      keepExpression: true,
      keepHair: selectedOptions.hairstyle === 'same' || !selectedOptions.hairstyle
    },
    garmentSpecification: {
      type: analysis?.product?.garment_type || analysis?.product?.type,
      colors: {
        primary: analysis?.product?.primary_color,
        secondary: analysis?.product?.secondary_color
      },
      material: analysis?.product?.fabric_type || analysis?.product?.material,
      details: analysis?.product?.key_details,
      pattern: analysis?.product?.pattern,
      fit: analysis?.product?.fit_type || analysis?.product?.fit
    },
    imageReferences: {
      character: 'IMAGE 1 - CHARACTER PRESERVED',
      product: 'IMAGE 2 - GARMENT SPECIFICATION'
    },
    qualityRequirements: {
      resolution: '8k',
      focus: 'sharp-full',
      detail: 'ultra-detailed',
      realism: 'photorealistic'
    }
  };
}

export default {
  buildVirtualTryOnPrompt,
  buildVirtualTryOnNegativePrompt,
  createVirtualTryOnConfig
};
