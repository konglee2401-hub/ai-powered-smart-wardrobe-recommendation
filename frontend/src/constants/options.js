/**
 * Smart Fashion Prompt Builder - Constants & Options
 * Phase 2: Revised with all fixes
 * 
 * Features:
 * 1. All Select Options
 * 2. Descriptions
 * 3. Validation Rules
 * 4. Default Values
 */

// ============ SELECT OPTIONS ============

export const AGE_OPTIONS = [
  { value: '18-25', label: '18-25 years', description: 'Youthful and fresh' },
  { value: '25-30', label: '25-30 years', description: 'Vibrant and energetic' },
  { value: '30-40', label: '30-40 years', description: 'Established professional' },
  { value: '40-50', label: '40-50 years', description: 'Elegant maturity' },
  { value: '50+', label: '50+ years', description: 'Timeless elegance' }
];

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', description: 'Male model' },
  { value: 'female', label: 'Female', description: 'Female model' },
  { value: 'non-binary', label: 'Non-binary', description: 'Non-binary model' }
];

export const STYLE_OPTIONS = [
  { value: 'casual', label: 'Casual', description: 'Relaxed and comfortable' },
  { value: 'formal', label: 'Formal', description: 'Professional and elegant' },
  { value: 'elegant', label: 'Elegant', description: 'Sophisticated and refined' },
  { value: 'sporty', label: 'Sporty', description: 'Athletic and active' },
  { value: 'vintage', label: 'Vintage', description: 'Retro and nostalgic' },
  { value: 'luxury', label: 'Luxury', description: 'Premium and exclusive' },
  { value: 'bohemian', label: 'Bohemian', description: 'Free-spirited and natural' },
  { value: 'minimalist', label: 'Minimalist', description: 'Simple and clean' },
  { value: 'edgy', label: 'Edgy', description: 'Bold and rebellious' }
];

export const COLOR_OPTIONS = [
  { value: 'vibrant', label: 'Vibrant', description: 'Bright and saturated colors' },
  { value: 'monochrome', label: 'Monochrome', description: 'Black, white, and grays' },
  { value: 'pastel', label: 'Pastel', description: 'Soft and muted tones' },
  { value: 'jewel tones', label: 'Jewel Tones', description: 'Rich and luxurious colors' },
  { value: 'earth tones', label: 'Earth Tones', description: 'Natural and warm colors' },
  { value: 'white and black', label: 'White & Black', description: 'Classic contrast' }
];

export const MATERIAL_OPTIONS = [
  { value: 'silk blend', label: 'Silk Blend', description: 'Luxurious and smooth' },
  { value: 'cotton', label: 'Cotton', description: 'Comfortable and breathable' },
  { value: 'wool', label: 'Wool', description: 'Structured and elegant' },
  { value: 'leather', label: 'Leather', description: 'Edgy and bold' },
  { value: 'linen', label: 'Linen', description: 'Natural and relaxed' },
  { value: 'polyester', label: 'Polyester', description: 'Athletic and modern' }
];

export const SETTING_OPTIONS = [
  { value: 'studio', label: 'Studio', description: 'Professional studio setup' },
  { value: 'beach', label: 'Beach', description: 'Sandy beach environment' },
  { value: 'office', label: 'Office', description: 'Corporate office setting' },
  { value: 'urban', label: 'Urban', description: 'City streets and architecture' },
  { value: 'gym', label: 'Gym', description: 'Fitness and athletic environment' },
  { value: 'nature', label: 'Nature', description: 'Outdoor natural setting' }
];

export const MOOD_OPTIONS = [
  { value: 'playful', label: 'Playful', description: 'Fun and joyful' },
  { value: 'serious', label: 'Serious', description: 'Professional and focused' },
  { value: 'romantic', label: 'Romantic', description: 'Dreamy and intimate' },
  { value: 'energetic', label: 'Energetic', description: 'Dynamic and vibrant' },
  { value: 'calm', label: 'Calm', description: 'Peaceful and serene' },
  { value: 'elegant', label: 'Elegant', description: 'Sophisticated and refined' }
];

// ============ DEFAULT VALUES ============

export const DEFAULT_INPUTS = {
  age: '20-30',
  gender: 'female',
  style: 'elegant',
  colors: 'white and black',
  material: 'silk blend',
  setting: 'studio',
  mood: 'elegant'
};

// ============ VALIDATION RULES ============

export const VALIDATION_RULES = {
  age: {
    required: true,
    enum: AGE_OPTIONS.map(o => o.value),
    message: 'Please select a valid age range'
  },
  gender: {
    required: true,
    enum: GENDER_OPTIONS.map(o => o.value),
    message: 'Please select a valid gender'
  },
  style: {
    required: true,
    enum: STYLE_OPTIONS.map(o => o.value),
    message: 'Please select a valid style'
  },
  colors: {
    required: true,
    enum: COLOR_OPTIONS.map(o => o.value),
    message: 'Please select a valid color scheme'
  },
  material: {
    required: true,
    enum: MATERIAL_OPTIONS.map(o => o.value),
    message: 'Please select a valid material'
  },
  setting: {
    required: true,
    enum: SETTING_OPTIONS.map(o => o.value),
    message: 'Please select a valid setting'
  },
  mood: {
    required: true,
    enum: MOOD_OPTIONS.map(o => o.value),
    message: 'Please select a valid mood'
  }
};

// ============ HELPER FUNCTIONS ============

/**
 * Get label for value
 */
export const getLabel = (options, value) => {
  const option = options.find(o => o.value === value);
  return option ? option.label : value;
};

/**
 * Get description for value
 */
export const getDescription = (options, value) => {
  const option = options.find(o => o.value === value);
  return option ? option.description : '';
};

/**
 * Get all options as object
 */
export const getAllOptions = () => ({
  age: AGE_OPTIONS,
  gender: GENDER_OPTIONS,
  style: STYLE_OPTIONS,
  colors: COLOR_OPTIONS,
  material: MATERIAL_OPTIONS,
  setting: SETTING_OPTIONS,
  mood: MOOD_OPTIONS
});

/**
 * Validate input value
 */
export const validateInputValue = (field, value) => {
  const rule = VALIDATION_RULES[field];
  if (!rule) return { valid: true };

  if (rule.required && !value) {
    return { valid: false, message: `${field} is required` };
  }

  if (rule.enum && !rule.enum.includes(value)) {
    return { valid: false, message: rule.message };
  }

  return { valid: true };
};

// ============ EXPORT DEFAULT ============

export default {
  AGE_OPTIONS,
  GENDER_OPTIONS,
  STYLE_OPTIONS,
  COLOR_OPTIONS,
  MATERIAL_OPTIONS,
  SETTING_OPTIONS,
  MOOD_OPTIONS,
  DEFAULT_INPUTS,
  VALIDATION_RULES,
  getLabel,
  getDescription,
  getAllOptions,
  validateInputValue
};
