import PromptOption from '../models/PromptOption.js';

// ==================== BUILD NEGATIVE PROMPT ====================

/**
 * Build negative prompt based on type and user input
 * @param {string} userNegative - User-provided negative prompts
 * @param {string} type - Type: 'character', 'clothing', 'product'
 * @returns {string} Complete negative prompt
 */
export function buildNegativePrompt(userNegative = '', type = 'character') {
  const baseNegative = [
    'low quality',
    'blurry',
    'distorted',
    'deformed',
    'ugly',
    'bad anatomy',
    'watermark',
    'signature',
    'text',
    'jpeg artifacts',
    'worst quality'
  ];
  
  const typeSpecific = {
    character: [
      'extra limbs',
      'missing limbs',
      'bad hands',
      'bad face',
      'disfigured face',
      'mutation',
      'mutated',
      'extra fingers',
      'fewer fingers'
    ],
    clothing: [
      'wrinkled',
      'damaged',
      'torn',
      'dirty',
      'stained',
      'faded',
      'poorly fitted'
    ],
    product: [
      'cluttered background',
      'messy',
      'unprofessional',
      'bad lighting',
      'shadows'
    ]
  };
  
  const negative = [
    ...baseNegative,
    ...(typeSpecific[type] || [])
  ];
  
  // Add user-provided negative prompts
  if (userNegative && userNegative.trim()) {
    negative.push(userNegative.trim());
  }
  
  return negative.join(', ');
}

// ==================== BUILD DETAILED PROMPT (FULL VERSION) ====================

export async function buildDetailedPrompt(options) {
  const {
    characterAnalysis,
    productAnalysis,
    mode = 'full',
    useCase = 'fashion-editorial',
    userSelections = {},
    customPrompt = '',
    maxLength = 3500
  } = options;

  console.log('🎨 Building detailed prompt...');
  console.log('   Mode:', mode);
  console.log('   Use Case:', useCase);
  console.log('   Max Length:', maxLength);

  let prompt = '';

  // ==================== HEADER ====================
  const useCaseLabel = await getUseCaseLabel(useCase);
  prompt += `=== CONTENT TYPE: ${useCaseLabel.toUpperCase()} ===\n\n`;

  // ==================== IMAGE REFERENCES ====================
  prompt += `=== IMAGE REFERENCES ===\n`;
  prompt += `Reference Character Image: The person who will wear the outfit (use EXACT appearance)\n`;
  prompt += `Reference Product Image: The fashion item/outfit to be worn (replicate EXACT design)\n\n`;

  // ==================== CHARACTER DESCRIPTION ====================
  prompt += `=== CHARACTER (MUST MATCH REFERENCE IMAGE) ===\n`;

  const characterInfo = parseAnalysis(characterAnalysis);

  if (characterInfo) {
    // Age
    if (characterInfo.age) {
      prompt += `Age: ${characterInfo.age}\n`;
    }

    // Ethnicity
    if (characterInfo.ethnicity) {
      prompt += `Ethnicity: ${characterInfo.ethnicity}\n`;
    }

    // Facial Features
    if (characterInfo.face || characterInfo.features) {
      prompt += `Facial Features: ${characterInfo.face || characterInfo.features}\n`;
    }

    // Eyes
    if (characterInfo.eyes) {
      prompt += `Eyes: ${characterInfo.eyes}\n`;
    }

    // Skin
    if (characterInfo.skin) {
      prompt += `Skin: ${characterInfo.skin}\n`;
    }

    // Hair
    if (characterInfo.hair) {
      prompt += `Hair: ${characterInfo.hair}\n`;
    }

    // Body
    if (characterInfo.body) {
      prompt += `Body Type: ${characterInfo.body}\n`;
    }

    // Style
    if (characterInfo.style) {
      prompt += `Personal Style: ${characterInfo.style}\n`;
    }

    // Additional details
    if (characterInfo.additional) {
      prompt += `Additional Details: ${characterInfo.additional}\n`;
    }
  } else {
    // Fallback if parsing fails
    prompt += `Use the exact appearance from the reference character image\n`;
    prompt += `Maintain all facial features, body type, skin tone, and hair style\n`;
  }

  prompt += `\n`;

  // ==================== OUTFIT DESCRIPTION ====================
  prompt += `=== OUTFIT (MUST MATCH REFERENCE IMAGE) ===\n`;

  const productInfo = parseAnalysis(productAnalysis);

  if (productInfo) {
    // Type
    if (productInfo.type) {
      prompt += `Type: ${productInfo.type}\n`;
    }

    // Style
    if (productInfo.style) {
      prompt += `Style: ${productInfo.style}\n`;
    }

    // Colors
    if (productInfo.colors) {
      prompt += `Colors: ${productInfo.colors}\n`;
    }

    // Material
    if (productInfo.material) {
      prompt += `Material: ${productInfo.material}\n`;
    }

    // Details
    if (productInfo.details) {
      prompt += `Details: ${productInfo.details}\n`;
    }

    // Fit
    if (productInfo.fit) {
      prompt += `Fit: ${productInfo.fit}\n`;
    }

    // Occasion
    if (productInfo.occasion) {
      prompt += `Occasion: ${productInfo.occasion}\n`;
    }

    // Pattern
    if (productInfo.pattern) {
      prompt += `Pattern: ${productInfo.pattern}\n`;
    }

    // Texture
    if (productInfo.texture) {
      prompt += `Texture: ${productInfo.texture}\n`;
    }

    // Additional
    if (productInfo.additional) {
      prompt += `Additional: ${productInfo.additional}\n`;
    }
  } else {
    prompt += `Replicate the exact outfit from the reference product image\n`;
    prompt += `Maintain all design details, colors, materials, and styling\n`;
  }

  prompt += `\n`;

  // ==================== SCENE & STYLE ====================
  prompt += `=== SCENE & STYLE ===\n`;

  // Scene
  if (userSelections.scene) {
    const sceneText = await getOptionPromptText('scene', userSelections.scene);
    prompt += `Setting: ${sceneText}\n`;
  }

  // Lighting
  if (userSelections.lighting) {
    const lightingText = await getOptionPromptText('lighting', userSelections.lighting);
    prompt += `Lighting: ${lightingText}\n`;
  }

  // Mood
  if (userSelections.mood) {
    const moodText = await getOptionPromptText('mood', userSelections.mood);
    prompt += `Mood: ${moodText}\n`;
  }

  // Style
  if (userSelections.style) {
    const styleText = await getOptionPromptText('style', userSelections.style);
    prompt += `Photography Style: ${styleText}\n`;
  }

  // Color Palette
  if (userSelections.colorPalette) {
    const colorText = await getOptionPromptText('colorPalette', userSelections.colorPalette);
    prompt += `Color Palette: ${colorText}\n`;
  }

  prompt += `\n`;

  // ==================== CUSTOM INSTRUCTIONS ====================
  if (customPrompt && customPrompt.trim()) {
    prompt += `=== CUSTOM INSTRUCTIONS ===\n`;
    prompt += `${customPrompt.trim()}\n\n`;
  }

  // ==================== USE CASE SPECIFIC ====================
  const useCasePrompt = getUseCasePrompt(useCase);
  if (useCasePrompt) {
    prompt += `=== CONTENT STRATEGY ===\n`;
    prompt += `${useCasePrompt}\n\n`;
  }

  // ==================== QUALITY & TECHNICAL ====================
  prompt += `=== QUALITY & TECHNICAL SPECIFICATIONS ===\n`;
  prompt += `Professional fashion photography\n`;
  prompt += `High quality, 8K resolution, ultra detailed\n`;
  prompt += `Photorealistic rendering with accurate textures\n`;
  prompt += `Sharp focus on both character and outfit\n`;
  prompt += `Professional color grading and post-processing\n`;
  prompt += `Commercial photography quality\n`;
  prompt += `Perfect lighting and shadows\n`;
  prompt += `Natural skin texture and fabric details\n`;
  prompt += `Accurate color reproduction\n`;

  // Camera specs
  prompt += `\nCamera Settings:\n`;
  prompt += `- Medium format camera (Hasselblad, Phase One)\n`;
  prompt += `- 80mm or 85mm portrait lens\n`;
  prompt += `- f/2.8 to f/4 aperture for shallow depth of field\n`;
  prompt += `- Professional studio or natural lighting setup\n`;
  prompt += `- RAW format with professional color grading\n`;

  // Composition
  prompt += `\nComposition:\n`;
  prompt += `- Rule of thirds for balanced framing\n`;
  prompt += `- Professional model pose and expression\n`;
  prompt += `- Clear view of outfit details\n`;
  prompt += `- Appropriate background that doesn't distract\n`;
  prompt += `- Perfect focus on face and clothing\n`;

  prompt += `\n`;

  // ==================== USE CASE SPECIFIC QUALITY ====================
  if (useCase === 'ecommerce' || useCase === 'e-commerce') {
    prompt += `E-Commerce Specific:\n`;
    prompt += `- Clean, professional product presentation\n`;
    prompt += `- Clear visibility of all product details\n`;
    prompt += `- Trustworthy and authentic appearance\n`;
    prompt += `- Suitable for online shopping platforms\n`;
    prompt += `- Accurate color representation for buyers\n\n`;
  } else if (useCase === 'fashion-editorial') {
    prompt += `Editorial Specific:\n`;
    prompt += `- High-fashion magazine quality\n`;
    prompt += `- Artistic and creative composition\n`;
    prompt += `- Dramatic lighting and mood\n`;
    prompt += `- Avant-garde styling elements\n`;
    prompt += `- Trendsetting and inspirational\n\n`;
  } else if (useCase === 'social-media') {
    prompt += `Social Media Specific:\n`;
    prompt += `- Eye-catching and engaging\n`;
    prompt += `- Platform-optimized composition\n`;
    prompt += `- Authentic and relatable vibe\n`;
    prompt += `- Shareable and viral-worthy\n`;
    prompt += `- Mobile-friendly framing\n\n`;
  } else if (useCase === 'lookbook') {
    prompt += `Lookbook Specific:\n`;
    prompt += `- Cohesive styling and presentation\n`;
    prompt += `- Clear outfit coordination\n`;
    prompt += `- Professional yet accessible\n`;
    prompt += `- Suitable for fashion catalogs\n`;
    prompt += `- Consistent brand aesthetic\n\n`;
  }

  // ==================== CRITICAL REQUIREMENTS ====================
  prompt += `=== CRITICAL REQUIREMENTS ===\n`;
  prompt += `✓ Character MUST look EXACTLY like the reference image\n`;
  prompt += `✓ Outfit MUST match the reference product image precisely\n`;
  prompt += `✓ Maintain photorealistic quality throughout\n`;
  prompt += `✓ No distortions, deformities, or anatomical errors\n`;
  prompt += `✓ Perfect skin texture and fabric rendering\n`;
  prompt += `✓ Professional lighting without overexposure\n`;
  prompt += `✓ Sharp focus on both face and clothing details\n`;
  prompt += `✓ Natural poses and expressions\n`;
  prompt += `✓ Accurate colors matching reference images\n`;
  prompt += `✓ Commercial-grade professional quality\n`;

  // ==================== CHECK LENGTH ====================
  console.log(`📏 Prompt length: ${prompt.length} characters`);

  if (mode === 'short' && prompt.length > 1500) {
    prompt = truncatePromptIntelligently(prompt, 1500);
    console.log(`✂️ Truncated to: ${prompt.length} characters`);
  } else if (prompt.length > maxLength) {
    prompt = truncatePromptIntelligently(prompt, maxLength);
    console.log(`✂️ Truncated to: ${prompt.length} characters`);
  }

  console.log('✅ Prompt built successfully');

  return prompt;
}


// ==================== PARSE ANALYSIS (HANDLE JSON OR TEXT) ====================

function parseAnalysis(analysis) {
  if (!analysis) return null;

  try {
    // If it's already an object
    if (typeof analysis === 'object') {
      return flattenObject(analysis);
    }

    // Try to parse as JSON
    const parsed = JSON.parse(analysis);
    return flattenObject(parsed);

  } catch (e) {
    // If not JSON, treat as plain text
    if (typeof analysis === 'string') {
      return extractFromText(analysis);
    }
    return null;
  }
}

// ==================== FLATTEN NESTED OBJECT ====================

function flattenObject(obj, prefix = '') {
  const flattened = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenObject(value, prefix));
    } else if (Array.isArray(value)) {
      // Join arrays
      flattened[key] = value.join(', ');
    } else {
      // Direct value
      flattened[key] = value;
    }
  }

  return flattened;
}

// ==================== EXTRACT FROM TEXT ====================

function extractFromText(text) {
  const info = {};

  // Extract age
  const ageMatch = text.match(/age[:\s]+([^,\n]+)/i);
  if (ageMatch) info.age = ageMatch[1].trim();

  // Extract ethnicity
  const ethMatch = text.match(/ethnicity[:\s]+([^,\n]+)/i);
  if (ethMatch) info.ethnicity = ethMatch[1].trim();

  // Extract face/features
  const faceMatch = text.match(/face[:\s]+([^,\n]+)/i) || text.match(/features[:\s]+([^,\n]+)/i);
  if (faceMatch) info.face = faceMatch[1].trim();

  // Extract skin
  const skinMatch = text.match(/skin[:\s]+([^,\n]+)/i);
  if (skinMatch) info.skin = skinMatch[1].trim();

  // Extract hair
  const hairMatch = text.match(/hair[:\s]+([^,\n]+)/i);
  if (hairMatch) info.hair = hairMatch[1].trim();

  // Extract body
  const bodyMatch = text.match(/body[:\s]+([^,\n]+)/i);
  if (bodyMatch) info.body = bodyMatch[1].trim();

  // Extract type (for product)
  const typeMatch = text.match(/type[:\s]+([^,\n]+)/i);
  if (typeMatch) info.type = typeMatch[1].trim();

  // Extract material
  const matMatch = text.match(/material[:\s]+([^,\n]+)/i);
  if (matMatch) info.material = matMatch[1].trim();

  // Extract color
  const colorMatch = text.match(/color[s]?[:\s]+([^,\n]+)/i);
  if (colorMatch) info.colors = colorMatch[1].trim();

  // Extract style
  const styleMatch = text.match(/style[:\s]+([^,\n]+)/i);
  if (styleMatch) info.style = styleMatch[1].trim();

  return info;
}

// ==================== GET OPTION PROMPT TEXT ====================

async function getOptionPromptText(category, value) {
  try {
    const option = await PromptOption.findOne({ category, value });
    if (option && option.promptText) {
      return option.promptText;
    }
    return value;
  } catch (error) {
    return value;
  }
}

// ==================== GET USE CASE LABEL ====================

async function getUseCaseLabel(useCase) {
  const labels = {
    'change-clothes': 'Virtual Try-On / Change Clothes',
    'ecommerce-product': 'E-Commerce Product Photography',
    'ecommerce': 'E-Commerce Product Photography',
    'e-commerce': 'E-Commerce Product Photography',
    'social-media': 'Social Media Content',
    'fashion-editorial': 'Fashion Editorial',
    'lifestyle-scene': 'Lifestyle Scene',
    'before-after': 'Before/After Comparison',
    'lookbook': 'Fashion Lookbook',
    'campaign': 'Brand Campaign',
    'influencer': 'Influencer Content',
    'luxury': 'Luxury Fashion',
    'street-style': 'Street Style',
    'casual': 'Casual Lifestyle'
  };

  return labels[useCase] || useCase;
}

// ==================== GET USE CASE PROMPT ====================

function getUseCasePrompt(useCase) {
  const prompts = {
    'change-clothes': 'Virtual try-on photography showing the product worn by the character model. Focus on realistic fit, natural drape, and authentic appearance.',
    'ecommerce-product': 'E-commerce product photography with clear product visibility, professional presentation, and trustworthy appearance suitable for online shopping.',
    'ecommerce': 'E-commerce product photography with clear product visibility, professional presentation, and trustworthy appearance suitable for online shopping.',
    'e-commerce': 'E-commerce product photography with clear product visibility, professional presentation, and trustworthy appearance suitable for online shopping.',
    'social-media': 'Engaging, lifestyle-oriented content for Instagram/TikTok/Facebook. Natural, relatable vibe with eye-catching composition.',
    'fashion-editorial': 'High-fashion editorial for magazine cover or spread. Dramatic, artistic, avant-garde styling with professional model pose and expression.',
    'lifestyle-scene': 'Lifestyle photography showing product in real-life context. Natural setting, authentic moment, storytelling composition.',
    'before-after': 'Before/after comparison showcase. Clear transformation, side-by-side or sequential presentation.',
    'lookbook': 'Fashion lookbook showcasing outfit coordination with professional yet accessible styling.',
    'campaign': 'Brand campaign imagery with strong visual identity, consistent styling, and high production value.',
    'influencer': 'Influencer-style content with authentic, relatable, and aspirational qualities.',
    'luxury': 'High-end luxury fashion photography with sophisticated, elegant, premium quality and aspirational mood.',
    'street-style': 'Urban street photography aesthetic with natural lighting, candid moments, and authentic styling.',
    'casual': 'Relaxed, everyday fashion photography with approachable, comfortable, lifestyle-focused vibe.'
  };

  return prompts[useCase] || '';
}

// ==================== INTELLIGENT TRUNCATION ====================

function truncatePromptIntelligently(prompt, maxLength) {
  if (prompt.length <= maxLength) return prompt;

  // Split by sections
  const sections = prompt.split('===');

  // Priority order (keep these)
  const priority = [
    'IMAGE REFERENCES',
    'CHARACTER',
    'OUTFIT',
    'CRITICAL REQUIREMENTS'
  ];

  let truncated = '';

  // Add high priority sections first
  for (const section of sections) {
    const isPriority = priority.some(p => section.includes(p));

    if (isPriority) {
      truncated += '===' + section;
    }

    if (truncated.length >= maxLength * 0.8) break;
  }

  // Add other sections if space allows
  for (const section of sections) {
    const isPriority = priority.some(p => section.includes(p));

    if (!isPriority && truncated.length < maxLength - 200) {
      truncated += '===' + section;
    }
  }

  // Final truncation
  if (truncated.length > maxLength) {
    truncated = truncated.substring(0, maxLength - 50) + '\n\n[Truncated for length]';
  }

  return truncated;
}

// ==================== BUILD PROMPT WITH AUTO SHORTEN ====================

export async function buildPromptWithAutoShorten(options, maxLength = 2000) {
  let prompt = await buildDetailedPrompt(options);

  if (prompt.length > maxLength) {
    console.log(`⚠️  Prompt too long (${prompt.length} chars), shortening...`);
    prompt = truncatePromptIntelligently(prompt, maxLength);

    if (prompt.length > maxLength) {
      console.log(`⚠️  Still too long, truncating...`);
      prompt = prompt.substring(0, maxLength);
    }
  }

  return prompt;
}

// ==================== EXPORT ALL FUNCTIONS ====================

export {
  buildDetailedPrompt,
  buildNegativePrompt,
  parseAnalysis,
  flattenObject,
  extractFromText,
  getOptionPromptText,
  getUseCaseLabel,
  getUseCasePrompt,
  truncatePromptIntelligently,
  buildPromptWithAutoShorten
};
