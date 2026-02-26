/**
 * Prompt i18n Helper
 * Translates prompt options between English and Vietnamese
 * Used by prompt builders to generate language-appropriate prompts
 */

// ============================================================
// Vietnamese Translation for Prompt Options
// ============================================================

export const PROMPT_TRANSLATIONS_VI = {
  // Scene options
  scene: {
    studio: 'Studio chuyên nghiệp',
    'white-background': 'Nền trắng',
    'urban-street': 'Đường phố thành phố',
    'minimalist-indoor': 'Phòng tối giản',
    cafe: 'Quán cà phê',
    'outdoor-park': 'Công viên ngoài trời',
    office: 'Văn phòng hiện đại',
    'luxury-interior': 'Nội thất sang trọng',
    rooftop: 'Sân thượng',
    beach: 'Bãi biển',
    nature: 'Thiên nhiên',
    garden: 'Vườn',
    home: 'Nhà ở'
  },

  // Lighting options
  lighting: {
    'soft-diffused': 'Ánh sáng mềm, khuếch tán',
    'golden-hour': 'Ánh sáng vàng chiều',
    'studio-bright': 'Ánh sáng studio sáng',
    'dramatic-shadow': 'Ánh sáng kịch tính với bóng',
    backlighting: 'Ánh sáng từ sau',
    'rim-light': 'Ánh sáng viền',
    'natural-window': 'Ánh sáng từ cửa sổ tự nhiên',
    'sunset': 'Ánh sáng hoàng hôn',
    'moody-dark': 'Ánh sáng u ám',
    overcast: 'Ánh sáng u mưu'
  },

  // Mood options
  mood: {
    confident: 'Tự tin',
    elegant: 'Thanh lịch',
    playful: 'Vui tươi',
    serious: 'Nghiêm túc',
    romantic: 'Lãng mạn',
    energetic: 'Năng động',
    calm: 'Bình tĩnh',
    mysterious: 'Bí ẩn',
    sultry: 'Gợi cảm',
    joyful: 'Vui vẻ'
  },

  // Style options
  style: {
    minimalist: 'Tối giản',
    casual: 'Thường ngày',
    formal: 'Trang trọng',
    elegant: 'Thanh lịch',
    sporty: 'Thể thao',
    vintage: 'Cổ điển',
    edgy: 'Táo bạo',
    bohemian: 'Tự do phong cách',
    vintage: 'Hoài cổ',
    luxury: 'Sang trọng'
  },

  // Color palette options
  colorPalette: {
    vibrant: 'Sôi động',
    monochrome: 'Đơn sắc',
    pastel: 'Pastel nhẹ nhàng',
    'jewel-tones': 'Tông màu đá quý',
    'earth-tones': 'Tông màu đất',
    'white-black': 'Trắng-Đen tương phản',
    'warm': 'Ấm áp',
    'cool': 'Mát lạnh',
    'neutral': 'Trung tính'
  },

  // Camera angle options
  cameraAngle: {
    'eye-level': 'Góc mắt',
    'low-angle': 'Góc thấp',
    'high-angle': 'Góc cao',
    'side-profile': 'Hồ sơ bên',
    'over-shoulder': 'Phía trên vai',
    'close-up': 'Chụp cận cảnh',
    'full-body': 'Toàn thân'
  },

  // Fashion elements
  hairstyle: {
    straight: 'Thẳng',
    wavy: 'Xoăn nhẹ',
    curly: 'Xoăn',
    'high-ponytail': 'Đuôi ngựa cao',
    'low-ponytail': 'Đuôi ngựa thấp',
    'half-up': 'Nửa tóc',
    bun: 'Tóc búi',
    braided: 'Tóc bện',
    'tousled': 'Tóc tù xù'
  },

  makeup: {
    natural: 'Tự nhiên',
    'bold-eye': 'Mắt kẻ đậm',
    'red-lips': 'Môi đỏ',
    'smoky-eyes': 'Mắt khói',
    'clean-girl': 'Cô gái sạch',
    'douyin': 'Style Douyin',
    glam: 'Lộng lẫy'
  }
};

// ============================================================
// Core Translation Helper Functions
// ============================================================

/**
 * Get translated option label based on language
 * @param {string} category - Option category (scene, lighting, mood, etc.)
 * @param {string} value - Option value
 * @param {string} language - Language code (en, vi)
 * @returns {string} Translated label
 */
export function getTranslatedOptionLabel(category, value, language = 'en') {
  if (language === 'vi' && PROMPT_TRANSLATIONS_VI[category]?.[value]) {
    return PROMPT_TRANSLATIONS_VI[category][value];
  }
  // Fallback to English or first-letter uppercase
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

/**
 * Get all translated options for a category
 * @param {string} category - Option category
 * @param {string} language - Language code (en, vi)
 * @returns {Object} All options in specified language
 */
export function getCategoryTranslations(category, language = 'en') {
  if (language === 'vi' && PROMPT_TRANSLATIONS_VI[category]) {
    return PROMPT_TRANSLATIONS_VI[category];
  }
  return {};
}

/**
 * Translate an object of selected options
 * @param {Object} selectedOptions - {scene: 'studio', lighting: 'soft-diffused', ...}
 * @param {string} language - Language code (en, vi)
 * @returns {Object} Translated options
 */
export function translateSelectedOptions(selectedOptions, language = 'en') {
  if (language === 'en') return selectedOptions;

  const translated = {};
  for (const [category, value] of Object.entries(selectedOptions)) {
    translated[category] = getTranslatedOptionLabel(category, value, language);
  }
  return translated;
}

/**
 * Build English-to-Vietnamese mapping for use in prompts
 * @param {Array} optionsArray - Array of selected options
 * @returns {Object} Mapping of English to Vietnamese
 */
export function buildOptionTranslationMap(optionsArray) {
  const map = {};
  for (const option of optionsArray) {
    const { category, value } = option;
    const enLabel = value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
    const viLabel = getTranslatedOptionLabel(category, value, 'vi') || enLabel;
    map[enLabel] = viLabel;
    map[value] = viLabel;
  }
  return map;
}

/**
 * Translate entire prompt from English template to Vietnamese
 * Replaces English option labels with Vietnamese equivalents
 * @param {string} englishPrompt - Prompt with English labels
 * @param {Object} translationMap - Mapping of EN to VI
 * @returns {string} Prompt with Vietnamese labels
 */
export function translatePrompt(englishPrompt, translationMap) {
  let translatedPrompt = englishPrompt;
  for (const [enLabel, viLabel] of Object.entries(translationMap)) {
    // Create regex to match whole words
    const regex = new RegExp(`\\b${enLabel}\\b`, 'gi');
    translatedPrompt = translatedPrompt.replace(regex, viLabel);
  }
  return translatedPrompt;
}

export default {
  PROMPT_TRANSLATIONS_VI,
  getTranslatedOptionLabel,
  getCategoryTranslations,
  translateSelectedOptions,
  buildOptionTranslationMap,
  translatePrompt
};
