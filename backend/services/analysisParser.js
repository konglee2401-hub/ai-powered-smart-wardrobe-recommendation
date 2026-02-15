/**
 * Analysis Parser Service
 * Extracts structured data from AI analysis responses
 */

/**
 * Parse JSON blocks from text
 */
function extractJSONBlocks(text) {
  const jsonBlocks = [];
  
  // Match ```json ... ``` blocks
  const jsonRegex = /```json\s*\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = jsonRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      jsonBlocks.push(parsed);
    } catch (error) {
      console.warn('Failed to parse JSON block:', error.message);
    }
  }
  
  // Also try to find standalone JSON objects
  const standaloneRegex = /\{[\s\S]*?"[^"]+"\s*:[\s\S]*?\}/g;
  while ((match = standaloneRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Object.keys(parsed).length > 0) {
        jsonBlocks.push(parsed);
      }
    } catch (error) {
      // Ignore parsing errors for standalone attempts
    }
  }
  
  return jsonBlocks;
}

/**
 * Extract character information
 */
function extractCharacterInfo(text) {
  const jsonBlocks = extractJSONBlocks(text);
  
  // Find character block
  const characterBlock = jsonBlocks.find(block => 
    block.name || block.personality || block.features || 
    block.style || block.series
  );
  
  if (characterBlock) {
    return {
      name: characterBlock.name || 'Unknown',
      series: characterBlock.series || null,
      personality: characterBlock.personality || '',
      style: characterBlock.style || '',
      colors: Array.isArray(characterBlock.colors) ? characterBlock.colors : [],
      features: Array.isArray(characterBlock.features) ? characterBlock.features : [],
      bodyType: characterBlock.bodyType || characterBlock.body_type || null,
      pose: characterBlock.pose || null,
      expression: characterBlock.expression || null,
      // NEW: Extended character fields
      age: characterBlock.age || null,
      ethnicity: characterBlock.ethnicity || null,
      skin: characterBlock.skin || null,
      hair: characterBlock.hair || null,
      body: characterBlock.body || null
    };
  }
  
  return null;
}

/**
 * Extract clothing/product information
 */
function extractClothingInfo(text) {
  const jsonBlocks = extractJSONBlocks(text);
  
  // Find clothing block
  const clothingBlock = jsonBlocks.find(block => 
    block.type || block.style || block.occasion || 
    block.patterns || block.material
  );
  
  if (clothingBlock) {
    return {
      type: clothingBlock.type || 'clothing',
      style: clothingBlock.style || '',
      colors: Array.isArray(clothingBlock.colors) ? clothingBlock.colors : [],
      patterns: Array.isArray(clothingBlock.patterns) ? clothingBlock.patterns : [],
      material: clothingBlock.material || null,
      fit: clothingBlock.fit || null,
      occasion: clothingBlock.occasion || '',
      season: clothingBlock.season || null,
      brand: clothingBlock.brand || null,
      details: clothingBlock.details || []
    };
  }
  
  return null;
}

/**
 * Extract scene/settings information
 */
function extractSceneInfo(text) {
  const sceneRegex = /Settings?:\s*Scene:\s*([^,\n]+),?\s*Mood:\s*([^,\n]+),?\s*Style:\s*([^\n]+)/i;
  const match = text.match(sceneRegex);
  
  if (match) {
    return {
      scene: match[1].trim(),
      mood: match[2].trim(),
      style: match[3].trim()
    };
  }
  
  // Try to extract from JSON
  const jsonBlocks = extractJSONBlocks(text);
  const sceneBlock = jsonBlocks.find(block => 
    block.scene || block.mood || block.setting || block.background
  );
  
  if (sceneBlock) {
    return {
      scene: sceneBlock.scene || sceneBlock.setting || sceneBlock.background || 'studio',
      mood: sceneBlock.mood || 'neutral',
      style: sceneBlock.style || 'realistic',
      lighting: sceneBlock.lighting || null,
      time: sceneBlock.time || null,
      weather: sceneBlock.weather || null
    };
  }
  
  return {
    scene: 'studio',
    mood: 'neutral',
    style: 'realistic'
  };
}

/**
 * Extract styling suggestions
 */
function extractStylingInfo(text) {
  const suggestions = {
    accessories: [],
    footwear: [],
    hair: [],
    makeup: [],
    props: [],
    // NEW: Extended styling fields
    suggestedTop: null,
    suggestedBottom: null,
    suggestedShoes: null,
    suggestedAccessories: null,
    colorCoordination: null,
    stylingTips: []
  };
  
  // Extract accessories
  const accessoriesRegex = /accessories?[:\s]+([^\n]+)/i;
  const accessoriesMatch = text.match(accessoriesRegex);
  if (accessoriesMatch) {
    suggestions.accessories = accessoriesMatch[1]
      .split(/,|;/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  // Extract footwear
  const footwearRegex = /footwear|shoes?[:\s]+([^\n]+)/i;
  const footwearMatch = text.match(footwearRegex);
  if (footwearMatch) {
    suggestions.footwear = footwearMatch[1]
      .split(/,|;/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  // Extract hair
  const hairRegex = /hair[:\s]+([^\n]+)/i;
  const hairMatch = text.match(hairRegex);
  if (hairMatch) {
    suggestions.hair = hairMatch[1]
      .split(/,|;/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  // Extract makeup
  const makeupRegex = /makeup[:\s]+([^\n]+)/i;
  const makeupMatch = text.match(makeupRegex);
  if (makeupMatch) {
    suggestions.makeup = makeupMatch[1]
      .split(/,|;/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  return suggestions;
}

/**
 * Parse complete analysis
 */
export function parseAnalysis(analysisText, useCase = 'general') {
  console.log('📊 Parsing analysis...');
  
  // Try to extract new format (character, product, settings) first
  const jsonBlocks = extractJSONBlocks(analysisText);
  
  // Look for new format
  const newFormatBlock = jsonBlocks.find(block => 
    block.character && block.product && block.settings
  );
  
  let parsed;
  
  if (newFormatBlock) {
    // New format: character, product, settings
    parsed = {
      raw: analysisText,
      useCase: useCase,
      character: newFormatBlock.character,
      product: newFormatBlock.product,
      settings: newFormatBlock.settings,
      // Also populate old format for backward compatibility
      clothing: newFormatBlock.product,
      scene: newFormatBlock.settings,
      styling: null,
      timestamp: new Date().toISOString()
    };
  } else {
    // Old format fallback
    parsed = {
      raw: analysisText,
      useCase: useCase,
      character: extractCharacterInfo(analysisText),
      clothing: extractClothingInfo(analysisText),
      scene: extractSceneInfo(analysisText),
      styling: extractStylingInfo(analysisText),
      // Also populate new format for consistency
      product: extractClothingInfo(analysisText),
      settings: extractSceneInfo(analysisText),
      timestamp: new Date().toISOString()
    };
  }
  
  console.log('✅ Parsed analysis:', {
    hasCharacter: !!parsed.character,
    hasClothing: !!parsed.clothing,
    hasProduct: !!parsed.product,
    hasSettings: !!parsed.settings,
    hasScene: !!parsed.scene,
    hasStyling: !!parsed.styling
  });
  
  return parsed;
}

/**
 * ADVANCED: Generate image prompt from parsed analysis
 * This creates a detailed, structured prompt for image generation
 */
export function generateImagePrompt(parsedAnalysis, options = {}) {
  console.log('🎨 Generating ADVANCED image prompt from parsed analysis...');
  
  // Support both old format (clothing, scene, styling) and new format (product, settings)
  const character = parsedAnalysis.character;
  const product = parsedAnalysis.product || parsedAnalysis.clothing;
  const settings = parsedAnalysis.settings || parsedAnalysis.scene;
  const styling = parsedAnalysis.styling;
  
  if (!character || !product) {
    throw new Error('Missing character or product information');
  }
  
  // Build prompt sections
  const promptSections = [];
  
  // ==================== CHARACTER SECTION ====================
  const charParts = [];
  
  // Age and ethnicity
  if (character.age) {
    charParts.push(`${character.age} year old`);
  }
  if (character.ethnicity) {
    charParts.push(character.ethnicity);
  }
  
  // Physical features
  if (character.features && character.features.length > 0) {
    charParts.push(character.features.join(', '));
  }
  
  // Skin
  if (character.skin) {
    charParts.push(`${character.skin} skin`);
  }
  
  // Hair
  if (character.hair) {
    charParts.push(character.hair);
  }
  
  // Body type
  if (character.body) {
    charParts.push(character.body);
  }
  
  // Personality and style
  if (character.personality) {
    charParts.push(`with ${character.personality} demeanor`);
  }
  
  if (character.style) {
    charParts.push(`${character.style} style`);
  }
  
  // Colors
  if (character.colors && character.colors.length > 0) {
    charParts.push(`featuring ${character.colors.join(', ')} tones`);
  }
  
  if (charParts.length > 0) {
    promptSections.push(`A ${charParts.join(', ')}`);
  }
  
  // ==================== OUTFIT SECTION ====================
  const outfitParts = [];
  
  // Type
  if (product.type) {
    outfitParts.push(product.type);
  }
  
  // Style
  if (product.style) {
    outfitParts.push(`in ${product.style} style`);
  }
  
  // Material
  if (product.material) {
    outfitParts.push(`made of ${product.material}`);
  }
  
  // Colors
  if (product.colors && product.colors.length > 0) {
    outfitParts.push(`in ${product.colors.join(' and ')} colors`);
  }
  
  // Patterns
  if (product.patterns && product.patterns.length > 0) {
    outfitParts.push(`with ${product.patterns.join(' and ')} patterns`);
  }
  
  // Details
  if (product.details && product.details.length > 0) {
    outfitParts.push(`featuring ${product.details.join(', ')}`);
  }
  
  // Fit
  if (product.fit) {
    outfitParts.push(`${product.fit} fit`);
  }
  
  if (outfitParts.length > 0) {
    promptSections.push(`wearing ${outfitParts.join(', ')}`);
  }
  
  // Occasion
  if (product.occasion) {
    promptSections.push(`perfect for ${product.occasion}`);
  }
  
  // Season
  if (product.season) {
    promptSections.push(`${product.season} season`);
  }
  
  // ==================== SCENE & SETTINGS ====================
  if (settings) {
    const sceneParts = [];
    
    // Scene
    if (settings.scene) {
      sceneParts.push(`in ${settings.scene}`);
    }
    
    // Lighting
    if (settings.lighting) {
      sceneParts.push(`with ${settings.lighting} lighting`);
    }
    
    // Mood
    if (settings.mood) {
      sceneParts.push(`${settings.mood} atmosphere`);
    }
    
    // Photography style
    if (settings.style) {
      sceneParts.push(`${settings.style} photography style`);
    }
    
    // Color palette
    if (settings.colorPalette) {
      sceneParts.push(`${settings.colorPalette} color palette`);
    }
    
    if (sceneParts.length > 0) {
      promptSections.push(sceneParts.join(', '));
    }
  }
  
  // ==================== AI STYLING SUGGESTIONS ====================
  if (styling) {
    const stylingParts = [];
    
    if (styling.suggestedAccessories || (styling.accessories && styling.accessories.length > 0)) {
      const accessories = styling.suggestedAccessories || styling.accessories.join(', ');
      stylingParts.push(`accessorized with ${accessories}`);
    }
    
    if (styling.colorCoordination) {
      stylingParts.push(styling.colorCoordination);
    }
    
    if (stylingParts.length > 0) {
      promptSections.push(stylingParts.join(', '));
    }
  }
  
  // ==================== COMBINE ALL SECTIONS ====================
  let generationPrompt = promptSections.join(', ') + '.';
  
  // ==================== QUALITY ENHANCERS ====================
  const qualityTags = [
    'Professional fashion photography',
    'high quality',
    'detailed',
    '8k resolution',
    'photorealistic',
    'sharp focus',
    'professional color grading',
    'studio lighting',
    'commercial photography quality'
  ];
  
  // Add use case specific tags
  if (parsedAnalysis.useCase) {
    const useCase = parsedAnalysis.useCase;
    
    if (useCase === 'ecommerce') {
      qualityTags.push('clean product presentation', 'e-commerce ready', 'trustworthy');
    } else if (useCase === 'styling' || useCase === 'change-clothes') {
      qualityTags.push('fashion editorial', 'trendy', 'inspirational');
    } else if (useCase === 'brand') {
      qualityTags.push('brand storytelling', 'cinematic', 'luxury presentation');
    } else if (useCase === 'influencer') {
      qualityTags.push('lifestyle photography', 'authentic', 'relatable');
    } else if (useCase === 'social') {
      qualityTags.push('dynamic', 'engaging', 'viral-worthy');
    }
  }
  
  generationPrompt += ' ' + qualityTags.join(', ') + '.';
  
  console.log(`✅ Advanced prompt built (${generationPrompt.length} chars)`);
  console.log(`   📊 Sections: ${promptSections.length}`);
  console.log(`   🎯 Quality tags: ${qualityTags.length}`);
  console.log(`   📄 Preview: ${generationPrompt.substring(0, 200)}...`);
  
  // Return both full prompt and structured sections for frontend display
  return {
    full: generationPrompt,
    sections: {
      character: charParts.join(', '),
      outfit: outfitParts.join(', '),
      scene: settings ? Object.values(settings).filter(Boolean).join(', ') : '',
      quality: qualityTags.join(', ')
    }
  };
}

/**
 * Legacy function for backward compatibility
 */
export function generateImagePromptLegacy(parsedAnalysis, options = {}) {
  console.log('🎨 Generating image prompt from parsed analysis (legacy)...');
  
  // Support both old format (clothing, scene, styling) and new format (product, settings)
  const character = parsedAnalysis.character;
  const product = parsedAnalysis.product || parsedAnalysis.clothing;
  const settings = parsedAnalysis.settings || parsedAnalysis.scene;
  const styling = parsedAnalysis.styling;
  
  if (!character || !product) {
    throw new Error('Missing character or product information');
  }
  
  // Build prompt parts
  const parts = [];
  
  // 1. Main subject
  parts.push(`A photorealistic full-body portrait of ${character.name || 'a person'}`);
  
  // 2. Product/Clothing description
  const productDesc = [
    product.style,
    product.type,
    product.colors && product.colors.length > 0 ? `in ${product.colors.join(' and ')}` : '',
    product.patterns && product.patterns.length > 0 ? `with ${product.patterns.join(' and ')} pattern` : ''
  ].filter(Boolean).join(' ');
  
  parts.push(`wearing ${productDesc}`);
  
  // 3. Character features
  if (character.features && character.features.length > 0) {
    parts.push(`Character features: ${character.features.slice(0, 3).join(', ')}`);
  }
  
  // 4. Styling (if available)
  if (styling) {
    if (styling.accessories && styling.accessories.length > 0) {
      parts.push(`Accessories: ${styling.accessories.slice(0, 2).join(', ')}`);
    }
    
    if (styling.footwear && styling.footwear.length > 0) {
      parts.push(`Footwear: ${styling.footwear[0]}`);
    }
    
    if (styling.hair && styling.hair.length > 0) {
      parts.push(`Hair: ${styling.hair[0]}`);
    }
  }
  
  // 5. Character pose and expression
  if (character.pose) {
    parts.push(`Pose: ${character.pose}`);
  }
  
  if (character.expression) {
    parts.push(`Expression: ${character.expression}`);
  }
  
  // 6. Settings/Scene and mood (new format)
  if (settings) {
    if (settings.scene) {
      parts.push(`Setting: ${settings.scene}`);
    }
    if (settings.mood) {
      parts.push(`Mood: ${settings.mood}`);
    }
    if (settings.style) {
      parts.push(`Style: ${settings.style}, professional photography`);
    }
    if (settings.lighting) {
      parts.push(`Lighting: ${settings.lighting}`);
    }
    if (settings.colorPalette) {
      parts.push(`Color Palette: ${settings.colorPalette}`);
    }
  }
  
  // 7. Quality tags
  parts.push('High quality, detailed, 8K resolution, professional fashion photography');
  
  const prompt = parts.join('. ') + '.';
  
  console.log('✅ Generated prompt:', prompt.substring(0, 200) + '...');
  
  return prompt;
}

/**
 * Extract all unique options from analysis
 */
export function extractOptions(parsedAnalysis) {
  const options = {
    scenes: new Set(),
    moods: new Set(),
    styles: new Set(),
    clothingTypes: new Set(),
    colors: new Set(),
    patterns: new Set(),
    accessories: new Set(),
    occasions: new Set()
  };
  
  const { character, clothing, scene, styling } = parsedAnalysis;
  
  // Scene options
  if (scene.scene) options.scenes.add(scene.scene);
  if (scene.mood) options.moods.add(scene.mood);
  if (scene.style) options.styles.add(scene.style);
  
  // Clothing options
  if (clothing) {
    if (clothing.type) options.clothingTypes.add(clothing.type);
    if (clothing.occasion) options.occasions.add(clothing.occasion);
    
    clothing.colors.forEach(c => options.colors.add(c));
    clothing.patterns.forEach(p => options.patterns.add(p));
  }
  
  // Styling options
  if (styling && styling.accessories) {
    styling.accessories.forEach(a => options.accessories.add(a));
  }
  
  // Convert Sets to Arrays
  return {
    scenes: Array.from(options.scenes),
    moods: Array.from(options.moods),
    styles: Array.from(options.styles),
    clothingTypes: Array.from(options.clothingTypes),
    colors: Array.from(options.colors),
    patterns: Array.from(options.patterns),
    accessories: Array.from(options.accessories),
    occasions: Array.from(options.occasions)
  };
}

export default {
  parseAnalysis,
  generateImagePrompt,
  generateImagePromptLegacy,
  extractOptions
};
