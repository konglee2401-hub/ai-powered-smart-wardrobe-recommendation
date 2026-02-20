/**
 * Smart Fashion Prompt Builder - Prompt Templates (Backend Version)
 * Phase 2: Revised with all fixes
 * 
 * Features:
 * 1. 10 Fashion Use Cases
 * 2. Dynamic Prompt Generation
 * 3. Age-based Adjustments
 * 4. Material-specific Enhancements
 * 5. Setting-based Customization
 */

// ============ USE CASE TEMPLATES ============

export const USE_CASE_TEMPLATES = {
  casualBeach: {
    name: 'Casual Beach Wear',
    template: `A {gender} model, age {age}, wearing casual beach wear in {colors}. 
The outfit is made of {material} and features a relaxed, playful style. 
The setting is a beautiful beach with golden hour lighting, ocean waves in the background, 
and natural sandy textures. The mood is carefree and joyful, perfect for summer vibes. 
The model has a confident, relaxed posture with a genuine smile. 
Professional photography, natural lighting, high quality, detailed fabric textures.`,
    keywords: ['beach', 'ocean', 'golden hour', 'casual', 'summer', 'relaxed', 'playful']
  },

  formalBusiness: {
    name: 'Formal Business Attire',
    template: `A {gender} model, age {age}, wearing formal business attire in {colors}. 
The outfit is made of {material} and exudes professionalism and authority. 
The setting is a modern office environment with subtle lighting, clean backgrounds, 
and professional ambiance. The mood is serious, confident, and established professional. 
The model has a composed posture with a professional expression. 
Studio photography, professional lighting, high quality, corporate aesthetic.`,
    keywords: ['formal', 'business', 'professional', 'office', 'corporate', 'serious', 'established']
  },

  elegantEvening: {
    name: 'Elegant Evening Wear',
    template: `A {gender} model, age {age}, wearing elegant evening wear in {colors}. 
The outfit is made of {material} with sophisticated draping and luxurious details. 
The setting is an upscale venue with soft, romantic lighting, elegant backgrounds, 
and refined ambiance. The mood is romantic, sophisticated, and glamorous. 
The model has a graceful posture with an elegant, serene expression. 
Studio photography, soft lighting, high quality, luxury aesthetic, detailed embellishments.`,
    keywords: ['elegant', 'evening', 'romantic', 'glamorous', 'sophisticated', 'luxury', 'refined']
  },

  casualStreetwear: {
    name: 'Casual Streetwear',
    template: `A {gender} model, age {age}, wearing trendy streetwear in {colors}. 
The outfit is made of {material} and features urban, contemporary style. 
The setting is an urban environment with street photography aesthetics, 
graffiti walls, modern architecture, and city vibes. The mood is playful, cool, and contemporary. 
The model has a relaxed, confident posture with an effortless attitude. 
Street photography style, natural lighting, high quality, urban aesthetic.`,
    keywords: ['streetwear', 'urban', 'casual', 'contemporary', 'trendy', 'cool', 'city']
  },

  sportyAthleisure: {
    name: 'Sporty Athleisure',
    template: `A {gender} model, age {age}, wearing sporty athleisure in {colors}. 
The outfit is made of {material} with performance features and athletic styling. 
The setting is a gym or fitness environment with energetic lighting, 
modern equipment, and active ambiance. The mood is energetic, fit, and dynamic. 
The model has an active posture with a confident, energized expression. 
Action photography, bright lighting, high quality, athletic aesthetic, dynamic composition.`,
    keywords: ['sporty', 'athletic', 'energetic', 'fitness', 'active', 'dynamic', 'performance']
  },

  vintageRetro: {
    name: 'Vintage Retro Style',
    template: `A {gender} model, age {age}, wearing vintage retro clothing in {colors}. 
The outfit is made of {material} and features nostalgic, classic styling. 
The setting is a vintage-inspired environment with retro props, warm lighting, 
and nostalgic ambiance. The mood is calm, nostalgic, and timeless. 
The model has a relaxed posture with a nostalgic, dreamy expression. 
Vintage photography style, warm lighting, high quality, retro aesthetic, classic composition.`,
    keywords: ['vintage', 'retro', 'nostalgic', 'classic', 'timeless', 'warm', 'dreamy']
  },

  luxuryHighFashion: {
    name: 'Luxury High Fashion',
    template: `A {gender} model, age {age}, wearing exclusive luxury fashion in {colors}. 
The outfit is made of {material} with premium craftsmanship and high-end details. 
The setting is an upscale, luxurious environment with sophisticated lighting, 
exclusive backgrounds, and refined aesthetics. The mood is elegant, exclusive, and prestigious. 
The model has a poised posture with a confident, sophisticated expression. 
High fashion photography, professional lighting, high quality, luxury aesthetic, editorial style.`,
    keywords: ['luxury', 'high fashion', 'exclusive', 'premium', 'prestigious', 'sophisticated', 'editorial']
  },

  bohemianHippie: {
    name: 'Bohemian Hippie Style',
    template: `A {gender} model, age {age}, wearing bohemian hippie clothing in {colors}. 
The outfit is made of {material} with free-spirited, natural styling. 
The setting is a natural environment with earth tones, natural textures, 
flowing fabrics, and organic ambiance. The mood is calm, natural, and free-spirited. 
The model has a relaxed posture with a serene, peaceful expression. 
Natural photography style, soft lighting, high quality, bohemian aesthetic, organic composition.`,
    keywords: ['bohemian', 'hippie', 'natural', 'free-spirited', 'organic', 'calm', 'earthy']
  },

  minimalistModern: {
    name: 'Minimalist Modern',
    template: `A {gender} model, age {age}, wearing minimalist modern clothing in {colors}. 
The outfit is made of {material} with clean lines and simple, elegant design. 
The setting is a minimalist environment with clean backgrounds, simple lighting, 
and modern aesthetics. The mood is calm, focused, and contemporary. 
The model has a composed posture with a serene, thoughtful expression. 
Minimalist photography, clean lighting, high quality, modern aesthetic, simple composition.`,
    keywords: ['minimalist', 'modern', 'simple', 'clean', 'contemporary', 'focused', 'elegant']
  },

  edgyAlternative: {
    name: 'Edgy Alternative Fashion',
    template: `A {gender} model, age {age}, wearing edgy alternative clothing in {colors}. 
The outfit is made of {material} with bold, rebellious styling and attitude. 
The setting is an edgy urban environment with dramatic lighting, 
dark tones, and alternative ambiance. The mood is serious, rebellious, and bold. 
The model has a confident posture with an intense, edgy expression. 
Alternative photography, dramatic lighting, high quality, edgy aesthetic, bold composition.`,
    keywords: ['edgy', 'alternative', 'rebellious', 'bold', 'dramatic', 'intense', 'attitude']
  }
};

// ============ AGE-BASED ADJUSTMENTS ============

export const AGE_ADJUSTMENTS = {
  '18-25': {
    descriptor: 'youthful',
    additions: 'The model has a youthful glow and fresh appearance. Natural beauty with minimal makeup.'
  },
  '25-30': {
    descriptor: 'vibrant',
    additions: 'The model has a vibrant, energetic presence. Confident and stylish appearance.'
  },
  '30-40': {
    descriptor: 'established professional',
    additions: 'The model has an established professional appearance. Sophisticated and experienced look.'
  },
  '40-50': {
    descriptor: 'elegant maturity',
    additions: 'The model has elegant maturity and refined features. Distinguished and graceful appearance.'
  },
  '50+': {
    descriptor: 'timeless elegance',
    additions: 'The model has timeless elegance and distinguished features. Sophisticated and poised appearance.'
  }
};

// ============ MATERIAL-BASED ADJUSTMENTS ============

export const MATERIAL_ADJUSTMENTS = {
  'silk blend': {
    descriptor: 'luxurious drape',
    additions: 'The fabric has a luxurious drape with smooth, flowing movement. Premium silk sheen and elegant texture.'
  },
  'cotton': {
    descriptor: 'comfortable',
    additions: 'The fabric is comfortable and breathable with natural texture. Soft, casual appearance with relaxed fit.'
  },
  'wool': {
    descriptor: 'structured elegance',
    additions: 'The fabric has structured elegance with refined texture. Professional appearance with quality craftsmanship.'
  },
  'leather': {
    descriptor: 'edgy texture',
    additions: 'The fabric has edgy texture with bold presence. Rich, dark appearance with attitude and edge.'
  },
  'linen': {
    descriptor: 'natural flow',
    additions: 'The fabric has natural flow with organic texture. Relaxed, bohemian appearance with earthy quality.'
  },
  'polyester': {
    descriptor: 'athletic sheen',
    additions: 'The fabric has athletic sheen with performance quality. Modern appearance with technical aesthetic.'
  }
};

// ============ SETTING-BASED ADJUSTMENTS ============

export const SETTING_ADJUSTMENTS = {
  'studio': {
    descriptor: 'controlled studio lighting',
    additions: 'Professional studio setting with controlled lighting. Clean background, focused composition.'
  },
  'beach': {
    descriptor: 'natural beach environment',
    additions: 'Beautiful beach setting with natural sunlight. Ocean waves, sandy textures, golden hour lighting.'
  },
  'office': {
    descriptor: 'professional office environment',
    additions: 'Modern office setting with professional ambiance. Clean backgrounds, corporate aesthetic.'
  },
  'urban': {
    descriptor: 'urban street environment',
    additions: 'Urban street setting with city aesthetics. Modern architecture, street elements, city vibes.'
  },
  'gym': {
    descriptor: 'fitness environment',
    additions: 'Active gym setting with fitness equipment. Energetic lighting, modern facilities, dynamic composition.'
  },
  'nature': {
    descriptor: 'natural outdoor environment',
    additions: 'Natural outdoor setting with organic elements. Trees, plants, natural lighting, earthy tones.'
  }
};

// ============ MOOD-BASED ADJUSTMENTS ============

export const MOOD_ADJUSTMENTS = {
  'playful': {
    descriptor: 'playful and joyful',
    additions: 'Playful expression with genuine smile. Light-hearted, fun atmosphere with positive energy.'
  },
  'serious': {
    descriptor: 'serious and focused',
    additions: 'Serious expression with focused intensity. Professional atmosphere with composed demeanor.'
  },
  'romantic': {
    descriptor: 'romantic and dreamy',
    additions: 'Romantic expression with soft gaze. Dreamy atmosphere with intimate, gentle mood.'
  },
  'energetic': {
    descriptor: 'energetic and dynamic',
    additions: 'Energetic expression with dynamic movement. Active atmosphere with vibrant, lively mood.'
  },
  'calm': {
    descriptor: 'calm and serene',
    additions: 'Calm expression with peaceful presence. Serene atmosphere with tranquil, meditative mood.'
  },
  'elegant': {
    descriptor: 'elegant and sophisticated',
    additions: 'Elegant expression with poised demeanor. Sophisticated atmosphere with refined, graceful mood.'
  }
};

// ============ COLOR ADJUSTMENTS ============

export const COLOR_ADJUSTMENTS = {
  'vibrant': 'Vibrant, saturated colors with high contrast and eye-catching appeal.',
  'monochrome': 'Monochrome color scheme with varying tones and subtle contrasts.',
  'pastel': 'Soft pastel colors with gentle, muted tones and romantic appeal.',
  'jewel tones': 'Rich jewel-toned colors with deep, luxurious appearance.',
  'earth tones': 'Natural earth tones with warm, organic color palette.',
  'white and black': 'Classic black and white contrast with timeless elegance.'
};

// ============ MAIN FUNCTION: GENERATE DYNAMIC PROMPT ============

/**
 * Generate a dynamic prompt based on user inputs
 * @param {Object} inputs - User input object
 * @param {string} inputs.age - Age range
 * @param {string} inputs.gender - Gender
 * @param {string} inputs.style - Fashion style
 * @param {string} inputs.colors - Color scheme
 * @param {string} inputs.material - Fabric material
 * @param {string} inputs.setting - Photography setting
 * @param {string} inputs.mood - Mood/atmosphere
 * @returns {string} Generated prompt
 * @throws {Error} If inputs are invalid or missing required fields
 */
export function generateDynamicPrompt(inputs) {
  // Validation
  if (!inputs || typeof inputs !== 'object') {
    throw new Error('Invalid inputs: inputs must be a valid object');
  }

  const requiredFields = ['age', 'gender', 'style', 'colors', 'material', 'setting', 'mood'];
  const missingFields = requiredFields.filter(field => !inputs[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Detect use case
  const useCase = detectUseCase(inputs);
  const template = USE_CASE_TEMPLATES[useCase];

  if (!template) {
    throw new Error(`Invalid use case: ${useCase}`);
  }

  // Replace template placeholders
  let prompt = template.template
    .replaceAll('{gender}', inputs.gender)
    .replaceAll('{age}', inputs.age)
    .replaceAll('{colors}', inputs.colors)
    .replaceAll('{material}', inputs.material);

  // Add age-based adjustments
  const ageAdjustment = AGE_ADJUSTMENTS[inputs.age];
  if (ageAdjustment) {
    prompt += ` ${ageAdjustment.additions}`;
  }

  // Add material-based adjustments
  const materialAdjustment = MATERIAL_ADJUSTMENTS[inputs.material];
  if (materialAdjustment) {
    prompt += ` ${materialAdjustment.additions}`;
  }

  // Add setting-based adjustments
  const settingAdjustment = SETTING_ADJUSTMENTS[inputs.setting];
  if (settingAdjustment) {
    prompt += ` ${settingAdjustment.additions}`;
  }

  // Add mood-based adjustments
  const moodAdjustment = MOOD_ADJUSTMENTS[inputs.mood];
  if (moodAdjustment) {
    prompt += ` ${moodAdjustment.additions}`;
  }

  // Add color adjustments
  const colorAdjustment = COLOR_ADJUSTMENTS[inputs.colors];
  if (colorAdjustment) {
    prompt += ` Colors: ${colorAdjustment}`;
  }

  // Add quality indicators
  prompt += ' High resolution, professional photography, detailed textures, perfect composition.';

  return prompt;
}

// ============ USE CASE DETECTION ============

/**
 * Detect the fashion use case based on user inputs
 * Uses priority-based logic for accurate detection
 * @param {Object} inputs - User input object
 * @returns {string} Detected use case name
 */
export function detectUseCase(inputs) {
  const { style, setting, mood, material } = inputs;

  // Priority 1: Style + Setting combination
  if (style === 'casual' && setting === 'beach') return 'casualBeach';
  if (style === 'formal' && setting === 'office') return 'formalBusiness';
  if (style === 'elegant' && setting === 'studio') return 'elegantEvening';
  if (style === 'casual' && setting === 'urban') return 'casualStreetwear';
  if (style === 'sporty' && setting === 'gym') return 'sportyAthleisure';
  if (style === 'vintage' && setting === 'studio') return 'vintageRetro';
  if (style === 'luxury' && setting === 'studio') return 'luxuryHighFashion';
  if (style === 'bohemian' && setting === 'nature') return 'bohemianHippie';
  if (style === 'minimalist' && setting === 'studio') return 'minimalistModern';
  if (style === 'edgy' && setting === 'urban') return 'edgyAlternative';

  // Priority 2: Style only
  if (style === 'casual') return 'casualBeach';
  if (style === 'formal') return 'formalBusiness';
  if (style === 'elegant') return 'elegantEvening';
  if (style === 'sporty') return 'sportyAthleisure';
  if (style === 'vintage') return 'vintageRetro';
  if (style === 'luxury') return 'luxuryHighFashion';
  if (style === 'bohemian') return 'bohemianHippie';
  if (style === 'minimalist') return 'minimalistModern';
  if (style === 'edgy') return 'edgyAlternative';

  // Priority 3: Setting only
  if (setting === 'beach') return 'casualBeach';
  if (setting === 'office') return 'formalBusiness';
  if (setting === 'urban') return 'casualStreetwear';
  if (setting === 'gym') return 'sportyAthleisure';
  if (setting === 'nature') return 'bohemianHippie';

  // Default fallback
  return 'casualBeach';
}

// ============ HELPER FUNCTIONS ============

/**
 * Get all available use cases
 * @returns {Array<string>} Array of use case names
 */
export function getAllUseCases() {
  return Object.keys(USE_CASE_TEMPLATES);
}

/**
 * Get specific use case template
 * @param {string} useCase - Use case name
 * @returns {Object|null} Use case template or null if not found
 */
export function getUseCaseTemplate(useCase) {
  return USE_CASE_TEMPLATES[useCase] || null;
}

/**
 * Get use case name from inputs
 * @param {Object} inputs - User input object
 * @returns {string} Use case name
 */
export function getUseCase(inputs) {
  return detectUseCase(inputs);
}

/**
 * Customize a prompt by replacing specific words
 * @param {string} prompt - Original prompt
 * @param {Object} replacements - Object with key-value pairs for replacement
 * @returns {string} Customized prompt
 */
export function customizePrompt(prompt, replacements) {
  let customized = prompt;
  
  for (const [key, value] of Object.entries(replacements)) {
    customized = customized.replaceAll(key, value);
  }
  
  return customized;
}

/**
 * Enhance prompt with additional details
 * @param {string} prompt - Original prompt
 * @param {Array<string>} enhancements - Array of enhancement phrases
 * @returns {string} Enhanced prompt
 */
export function enhancePrompt(prompt, enhancements = []) {
  let enhanced = prompt;
  
  enhancements.forEach(enhancement => {
    enhanced += ` ${enhancement}`;
  });
  
  return enhanced;
}

/**
 * Validate user inputs
 * @param {Object} inputs - User input object
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateInputs(inputs) {
  const errors = [];

  if (!inputs || typeof inputs !== 'object') {
    errors.push('Inputs must be a valid object');
    return { isValid: false, errors };
  }

  const requiredFields = ['age', 'gender', 'style', 'colors', 'material', 'setting', 'mood'];
  
  requiredFields.forEach(field => {
    if (!inputs[field]) {
      errors.push(`${field} is required`);
    } else if (typeof inputs[field] !== 'string') {
      errors.push(`${field} must be a string`);
    } else if (inputs[field].trim().length === 0) {
      errors.push(`${field} cannot be empty`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get prompt statistics
 * @param {string} prompt - Prompt text
 * @returns {Object} Statistics object
 */
export function getPromptStats(prompt) {
  return {
    characters: prompt.length,
    words: prompt.split(/\s+/).length,
    sentences: prompt.split(/[.!?]+/).length - 1,
    paragraphs: prompt.split(/\n\n+/).length
  };
}

/**
 * Generate multiple prompts for A/B testing
 * @param {Object} inputs - User input object
 * @param {number} count - Number of variations to generate
 * @returns {Array<string>} Array of generated prompts
 */
export function generatePromptVariations(inputs, count = 3) {
  const variations = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const prompt = generateDynamicPrompt(inputs);
      variations.push(prompt);
    } catch (error) {
      console.error(`Error generating variation ${i + 1}:`, error);
    }
  }
  
  return variations;
}

// ============ SMART PROMPT BUILDER (App Logic) ============

/**
 * Build smart prompt using exact app logic
 * Replicates the prompt building flow from VirtualTryOnPage.jsx
 * @param {Object} params - Parameters object
 * @param {Object} params.analysis - Analysis data from unified analysis
 * @param {Object} params.selectedOptions - Selected customization options
 * @param {string} params.useCase - Use case (e.g., 'change-clothes')
 * @param {string} params.productFocus - Product focus (e.g., 'full-outfit')
 * @returns {Object} Smart prompt with positive and negative prompts
 */
export function buildSmartPrompt({ analysis, selectedOptions, useCase, productFocus }) {
  // Extract analysis data
  const character = analysis?.character || {};
  const product = analysis?.product || {};
  const recommendations = analysis?.recommendations || {};
  
  // Build base prompt components
  let positivePrompt = '';
  let negativePrompt = 'blurry, low quality, distorted, watermark, bad anatomy, extra limbs, deformed';
  
  // 1. Character description
  if (character.gender || character.age || character.bodyType || character.skinTone) {
    positivePrompt += `${character.gender || 'person'}, age ${character.age || 'unknown'}, `;
    positivePrompt += `body type ${character.bodyType || 'unknown'}, `;
    positivePrompt += `skin tone ${character.skinTone || 'unknown'}. `;
  }
  
  // 2. Product description
  if (product.category || product.type || product.colors) {
    positivePrompt += `${product.category || 'clothing'} item, type ${product.type || 'unknown'}, `;
    positivePrompt += `colors ${product.colors?.join(', ') || 'unknown'}. `;
  }
  
  // 3. Use case specific adjustments
  switch (useCase) {
    case 'change-clothes':
      positivePrompt += 'Change clothes scenario, ';
      break;
    case 'virtual-try-on':
      positivePrompt += 'Virtual try-on scenario, ';
      break;
    case 'accessories-matching':
      positivePrompt += 'Accessories matching scenario, ';
      break;
    default:
      positivePrompt += 'Fashion scenario, ';
  }
  
  // 4. Product focus adjustments
  switch (productFocus) {
    case 'full-outfit':
      positivePrompt += 'full outfit visualization, ';
      break;
    case 'top':
      positivePrompt += 'top clothing item, ';
      break;
    case 'bottom':
      positivePrompt += 'bottom clothing item, ';
      break;
    case 'shoes':
      positivePrompt += 'shoes and footwear, ';
      break;
    case 'accessories':
      positivePrompt += 'accessories and jewelry, ';
      break;
    default:
      positivePrompt += 'fashion item, ';
  }
  
  // 5. Apply selected options (from AI recommendations)
  if (selectedOptions.style) {
    positivePrompt += `${selectedOptions.style} style, `;
  }
  
  if (selectedOptions.scene) {
    positivePrompt += `${selectedOptions.scene} scene, `;
  }
  
  if (selectedOptions.lighting) {
    positivePrompt += `${selectedOptions.lighting} lighting, `;
  }
  
  if (selectedOptions.background) {
    positivePrompt += `${selectedOptions.background} background, `;
  }
  
  // 6. Quality and style enhancements
  positivePrompt += 'professional photography, high quality, 8k, detailed, well-lit, ';
  positivePrompt += 'fashion photography, studio lighting, sharp focus, ';
  positivePrompt += 'realistic textures, accurate colors, ';
  
  // 7. Add specific negative prompts based on analysis
  if (character.age && parseInt(character.age) > 50) {
    negativePrompt += ', wrinkles, aging, ';
  }
  
  if (product.colors && product.colors.includes('white')) {
    negativePrompt += ', yellowing, stains, ';
  }
  
  // 8. Final quality indicators
  positivePrompt += 'perfect composition, award winning, masterpiece';
  
  // Clean up prompt (remove trailing commas and spaces)
  positivePrompt = positivePrompt.replace(/,\s*$/, '');
  
  return {
    positive: positivePrompt,
    negative: negativePrompt
  };
}

// ============ EXPORT DEFAULT ============

export default {
  generateDynamicPrompt,
  detectUseCase,
  getAllUseCases,
  getUseCaseTemplate,
  getUseCase,
  customizePrompt,
  enhancePrompt,
  validateInputs,
  getPromptStats,
  generatePromptVariations,
  buildSmartPrompt,
  USE_CASE_TEMPLATES,
  AGE_ADJUSTMENTS,
  MATERIAL_ADJUSTMENTS,
  SETTING_ADJUSTMENTS,
  MOOD_ADJUSTMENTS,
  COLOR_ADJUSTMENTS
};
