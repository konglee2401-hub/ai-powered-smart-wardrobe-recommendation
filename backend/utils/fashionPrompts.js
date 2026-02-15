/**
 * Fashion Matching Prompts
 * Optimized prompts for clothing change use case
 */

/**
 * Generate analysis prompt for character + clothing
 */
export function generateAnalysisPrompt(options = {}) {
  const {
    characterImageName = 'character',
    clothingImageName = 'clothing',
    includeStyleSuggestions = true,
    includeAccessories = true,
    includeContext = true
  } = options;
  
  let prompt = `You are a professional fashion stylist and AI image analyst. Analyze these two images:

**Image 1 (${characterImageName})**: The person/character who will wear the clothing
**Image 2 (${clothingImageName})**: The clothing item or outfit to be worn

## Your Task:
Provide a detailed analysis for creating a new image where the character wears the clothing item.

## Analysis Structure:

### 1. CHARACTER ANALYSIS
- **Body Type**: Describe body shape, proportions, height estimate
- **Current Pose**: Exact pose description (standing, sitting, angle, etc.)
- **Facial Features**: Face shape, expression, notable features
- **Current Clothing**: What they're currently wearing
- **Skin Tone**: Describe for color matching
- **Hair**: Style, color, length
- **Background**: Current setting/environment

### 2. CLOTHING ANALYSIS
- **Type**: Specific clothing category (t-shirt, dress, jacket, etc.)
- **Color**: Primary and secondary colors with exact shades
- **Style**: Fashion style (casual, formal, streetwear, etc.)
- **Material**: Fabric type and texture (cotton, silk, denim, etc.)
- **Fit**: How it should fit (loose, tight, regular, oversized)
- **Design Details**: Patterns, prints, logos, embellishments

### 3. MATCHING COMPATIBILITY
- **Color Harmony**: How clothing colors complement skin tone
- **Style Fit**: How well the style suits the character
- **Proportion Match**: How the clothing fits the body type
- **Occasion Suitability**: What occasions this outfit works for`;

  if (includeStyleSuggestions) {
    prompt += `

### 4. STYLING SUGGESTIONS
- **Recommended Accessories**: What accessories would enhance the look
  - Jewelry (necklaces, earrings, bracelets, rings)
  - Bags/purses
  - Belts
  - Watches
  - Sunglasses/glasses
- **Footwear**: Best shoe types for this outfit
- **Additional Layers**: Jackets, cardigans, vests if needed
- **Hair Styling**: Suggested hairstyle to match the outfit`;
  }

  if (includeContext) {
    prompt += `

### 5. CONTEXT & SETTING RECOMMENDATIONS
- **Best Background**: Ideal setting for this outfit (urban, nature, studio, etc.)
- **Lighting**: Recommended lighting (natural, studio, golden hour, etc.)
- **Mood**: Overall vibe (professional, casual, edgy, elegant, etc.)
- **Activity**: What activity suits this outfit (work, party, casual outing, etc.)
- **Season**: Best season for this outfit`;
  }

  prompt += `

### 6. IMAGE GENERATION PROMPT
Based on your analysis, create a detailed, technical prompt for an AI image generator that will:
- Place the character in the exact same pose
- Dress them in the analyzed clothing
- Include recommended accessories and styling
- Set appropriate background and lighting
- Maintain character's features and proportions
- Ensure photorealistic quality

**Format the generation prompt as:**
"A [detailed character description] wearing [detailed clothing description], [pose description], [setting description], [lighting description], [style modifiers], photorealistic, high quality, professional photography"

## Important Guidelines:
- Be extremely specific and detailed
- Use technical fashion and photography terms
- Maintain character's identity and features
- Ensure clothing fits naturally
- Focus on realistic, achievable results`;

  return prompt;
}

/**
 * Generate image generation prompt from analysis
 */
export function generateImagePromptFromAnalysis(analysis, options = {}) {
  const {
    emphasizeQuality = true,
    includeNegativePrompt = true,
    style = 'photorealistic'
  } = options;
  
  let prompt = `Based on the following fashion analysis, generate an image:\n\n${analysis}\n\n`;
  
  if (emphasizeQuality) {
    prompt += `\nQuality modifiers: professional photography, high resolution, detailed, sharp focus, studio lighting, fashion photography, editorial quality`;
  }
  
  if (style) {
    prompt += `\nStyle: ${style}`;
  }
  
  if (includeNegativePrompt) {
    const negativePrompt = `low quality, blurry, distorted, deformed, bad anatomy, disfigured, poorly drawn, amateur, low resolution, pixelated, watermark, text, logo`;
    prompt += `\n\nNegative prompt (things to avoid): ${negativePrompt}`;
  }
  
  return prompt;
}

/**
 * Generate multiple variation prompts
 */
export function generateVariationPrompts(baseAnalysis, count = 5) {
  const variations = [
    {
      name: 'Professional/Business',
      context: 'in a modern office setting, professional lighting, business casual atmosphere',
      accessories: 'minimal jewelry, professional watch, leather bag',
      mood: 'confident, professional, polished'
    },
    {
      name: 'Casual/Everyday',
      context: 'in an urban street setting, natural daylight, relaxed atmosphere',
      accessories: 'casual accessories, sneakers, backpack or tote bag',
      mood: 'relaxed, comfortable, approachable'
    },
    {
      name: 'Evening/Party',
      context: 'in an upscale venue, dramatic lighting, elegant atmosphere',
      accessories: 'statement jewelry, clutch bag, heels',
      mood: 'glamorous, sophisticated, confident'
    },
    {
      name: 'Outdoor/Active',
      context: 'in a natural outdoor setting, golden hour lighting, fresh atmosphere',
      accessories: 'practical accessories, comfortable footwear, sunglasses',
      mood: 'energetic, natural, vibrant'
    },
    {
      name: 'Editorial/Fashion',
      context: 'in a minimalist studio, professional fashion lighting, artistic atmosphere',
      accessories: 'high-fashion accessories, designer pieces, statement items',
      mood: 'editorial, artistic, high-fashion'
    }
  ];
  
  return variations.slice(0, count).map(variation => {
    return `${baseAnalysis}\n\nVariation: ${variation.name}\nContext: ${variation.context}\nAccessories: ${variation.accessories}\nMood: ${variation.mood}`;
  });
}

/**
 * Optimize prompt for specific image generation model
 */
export function optimizePromptForModel(prompt, model) {
  const modelOptimizations = {
    'flux': {
      prefix: '[FLUX] ',
      emphasize: 'highly detailed, photorealistic, professional photography',
      maxLength: 500
    },
    'stable-diffusion': {
      prefix: '',
      emphasize: 'masterpiece, best quality, highly detailed',
      maxLength: 400
    },
    'midjourney': {
      prefix: '',
      emphasize: '--ar 2:3 --style raw --stylize 750',
      maxLength: 300
    },
    'dall-e': {
      prefix: '',
      emphasize: 'detailed, high quality, professional',
      maxLength: 1000
    }
  };
  
  const optimization = modelOptimizations[model] || modelOptimizations['flux'];
  
  let optimized = optimization.prefix + prompt;
  
  if (optimized.length > optimization.maxLength) {
    optimized = optimized.substring(0, optimization.maxLength - 3) + '...';
  }
  
  optimized += ` ${optimization.emphasize}`;
  
  return optimized;
}

export default {
  generateAnalysisPrompt,
  generateImagePromptFromAnalysis,
  generateVariationPrompts,
  optimizePromptForModel
};
