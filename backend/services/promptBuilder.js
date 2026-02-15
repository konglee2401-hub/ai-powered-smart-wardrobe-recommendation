// Build prompt cho ảnh & video từ phân tích sản phẩm + options người dùng.
// Hỗ trợ cả prompt thuần (hardcoded) và prompt template (từ DB)

import PromptTemplate from '../models/PromptTemplate.js';

// Fashion options defaults cho fallback/randomization
export const FASHION_OPTIONS_DEFAULTS = {
  hair_style: ['straight', 'wavy', 'loose curls', 'high ponytail', 'half-up half-down', 'elegant low bun'],
  hair_acc: ['silk bow', 'pearl headband', 'minimalist gold clips', 'none'],
  makeup: ['natural glow', 'bold red lips', 'smoky eyes', 'douyin style', 'clean girl aesthetic'],
  top_detail: ['sweetheart neckline', 'off-shoulder', 'halter neck', 'puffy sleeves', 'lace-trimmed'],
  material: ['silk', 'satin', 'lace', 'velvet', 'sheer chiffon'],
  outerwear: ['leather jacket', 'oversized blazer', 'trench coat', 'none'],
  bottom_type: ['high-waisted skirt', 'pleated mini skirt', 'wide-leg trousers', 'bodycon dress'],
  legwear: ['black sheer stockings', 'fishnet tights', 'lace-topped thigh-highs', 'none'],
  necklace: ['layered gold chains', 'pearl choker', 'minimalist pendant'],
  earrings: ['hoop earrings', 'pearl studs', 'drop earrings'],
  hand_acc: ['lace opera gloves', 'silver rings set', 'luxury watch', 'none'],
  waist_acc: ['leather belt', 'chain belt', 'corset cinjer', 'none'],
  shoes: ['stiletto heels', 'mary janes', 'chunky sneakers', 'combat boots'],
  scene: ['luxury grand piano room', 'minimalist studio', 'vintage cafe', 'white studio'],
  lighting: ['cinematic warm light', 'soft studio lighting', 'neon glow', 'natural golden hour'],
  expression: ['gentle smile', 'seductive gaze', 'mysterious look', 'cheerful laughing'],
  style: ['lookbook', 'elegant', 'seductive', 'casual'],
};

// Randomize missing values
export const randomizeFashionOptions = (analysis, options = {}) => {
  const result = { ...analysis };
  
  for (const [key, defaults] of Object.entries(FASHION_OPTIONS_DEFAULTS)) {
    // Nếu giá trị hiện tại là null/undefined/empty, randomize
    if (!result[key] || result[key] === 'none' || result[key] === '') {
      const validOptions = defaults.filter(opt => opt !== 'none');
      result[key] = validOptions[Math.floor(Math.random() * validOptions.length)];
    }
    // Override với user options nếu có
    if (options[key]) {
      result[key] = options[key];
    }
  }
  
  return result;
};

// Build prompt từ template trong DB
export const buildPromptFromTemplate = async ({ templateId, analysis, options, userId }) => {
  const template = await PromptTemplate.findById(templateId);
  
  if (!template) {
    throw new Error(`Template ${templateId} không tồn tại`);
  }

  // Randomize missing values trước khi fill
  const randomizedAnalysis = randomizeFashionOptions(analysis, options);
  
  return fillTemplate(template.content, { analysis: randomizedAnalysis, options, ...randomizedAnalysis });
};

// Fill template với data - thay thế {{placeholders}}
export const fillTemplate = (templateContent, data) => {
  let filledContent = templateContent;
  
  // Flatten nested objects cho easier access
  const flatData = flattenObject(data);

  for (const [key, value] of Object.entries(flatData)) {
    if (value !== undefined && value !== null && value !== 'none') {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      filledContent = filledContent.replace(regex, String(value));
    }
  }

  // Remove any remaining {{placeholders}} that weren't filled
  filledContent = filledContent.replace(/\{\{[^}]+\}\}/g, '');

  return filledContent;
};

// Flatten nested object: { top: { color: 'red' } } => { 'top.color': 'red' }
const flattenObject = (obj, prefix = '') => {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
};

// Build prompt theo cách cũ (hardcoded) - giữ lại cho backward compatibility
export const buildImagePrompt = ({ analysis, options }) => {
  const { scene = 'white studio', style = 'lookbook', focus = 'full' } = options || {};

  const parts = [];

  parts.push(
    'photorealistic fashion photo, full-body shot of a Vietnamese woman, premium realism'
  );

  if (analysis?.description) {
    parts.push(`OUTFIT: ${analysis.description}`);
  }

  parts.push(`SCENE: ${scene}`);
  parts.push(`STYLE: ${style}`);
  parts.push(`FOCUS: ${focus === 'full' ? 'full outfit' : focus}`);

  parts.push(
    'lighting: soft studio lighting, clean background, sharp details on clothing textures'
  );
  parts.push(
    'no watermark, no random text, no brand logos, realistic body proportions'
  );

  return parts.join('. ');
};

export const buildVideoPrompt = ({ analysis, options }) => {
  const {
    scene = 'dance studio',
    motionStyle = 'lookbook',
    durationSeconds = 10,
  } = options || {};

  const parts = [];

  parts.push(
    `photorealistic fashion video, duration ${durationSeconds} seconds, smooth camera`
  );

  if (analysis?.description) {
    parts.push(`OUTFIT: ${analysis.description}`);
  }

  parts.push(`SCENE: ${scene}`);
  parts.push(`MOTION STYLE: ${motionStyle}`);

  parts.push(
    'camera: full body always visible, gentle movement, no cuts, focus on outfit details'
  );
  parts.push(
    'lighting: cinematic but clear, no strobing, no text overlays, no watermarks'
  );

  return parts.join('. ');
};

/**
 * Build negative prompt based on type and user input
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

/**
 * Build character prompt with negative prompt support
 */
export async function buildCharacterPrompt(analysis, userPrompt = '', userNegative = '') {
  // Build the main prompt using existing logic
  const prompt = await buildImagePrompt({ analysis, options: {} });
  
  // Add user custom prompt if provided
  const finalPrompt = userPrompt ? `${prompt}. ${userPrompt}` : prompt;
  
  // Build negative prompt
  const negativePrompt = buildNegativePrompt(userNegative, 'character');
  
  return {
    prompt: finalPrompt,
    negativePrompt: negativePrompt
  };
}

/**
 * Build clothing prompt with negative prompt support
 */
export async function buildClothingPrompt(analysis, userPrompt = '', userNegative = '') {
  // Build the main prompt using existing logic
  const prompt = await buildImagePrompt({ analysis, options: {} });
  
  // Add user custom prompt if provided
  const finalPrompt = userPrompt ? `${prompt}. ${userPrompt}` : prompt;
  
  // Build negative prompt
  const negativePrompt = buildNegativePrompt(userNegative, 'clothing');
  
  return {
    prompt: finalPrompt,
    negativePrompt: negativePrompt
  };
}

export default {
  buildPromptFromTemplate,
  fillTemplate,
  buildImagePrompt,
  buildVideoPrompt,
  randomizeFashionOptions,
  FASHION_OPTIONS_DEFAULTS,
  buildNegativePrompt,
  buildCharacterPrompt,
  buildClothingPrompt
};


