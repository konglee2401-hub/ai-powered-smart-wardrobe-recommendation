/**
 * Prompt I18n (Internationalization) Service
 * Vietnamese translations for prompt building
 */

/**
 * Vietnamese translations for all prompt options
 */
export const PROMPT_TRANSLATIONS_VI = {
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

  lighting: {
    'soft-diffused': 'Ánh sáng mềm, khuếch tán',
    'golden-hour': 'Ánh sáng vàng chiều',
    'studio-bright': 'Ánh sáng studio sáng',
    'dramatic-shadow': 'Ánh sáng kịch tính',
    backlighting: 'Ánh sáng từ sau',
    'rim-light': 'Ánh sáng viền',
    'natural-window': 'Ánh sáng cửa sổ tự nhiên',
    sunset: 'Ánh sáng hoàng hôn',
    'moody-dark': 'Ánh sáng u ám',
    overcast: 'Ánh sáng u mưu'
  },

  mood: {
    confident: 'Tự tin',
    elegant: 'Thanh lịch',
    playful: 'Vui tươi',
    serious: 'Trầm tĩnh',
    romantic: 'Lãng mạn',
    energetic: 'Năng động',
    calm: 'Bình tĩnh',
    mysterious: 'Bí ẩn',
    sultry: 'Quyến rũ',
    joyful: 'Vui mừng'
  },

  style: {
    minimalist: 'Tối giản',
    casual: 'Thường ngày',
    formal: 'Lịch sự',
    elegant: 'Thanh lịch',
    sporty: 'Thể thao',
    vintage: 'Cổ điển',
    edgy: 'Táo bạo',
    bohemian: 'Bohemian',
    luxury: 'Sang trọng',
    avant_garde: 'Tiên phong'
  },

  colorPalette: {
    vibrant: 'Rực rỡ',
    monochrome: 'Đơn sắc',
    pastel: 'Màu pastel',
    'jewel-tones': 'Màu đá quý',
    'earth-tones': 'Màu đất',
    'white-black': 'Trắng đen',
    warm: 'Ấm',
    cool: 'Mát',
    neutral: 'Trung tính'
  },

  cameraAngle: {
    'eye-level': 'Mức mắt',
    'low-angle': 'Góc thấp',
    'high-angle': 'Góc cao',
    'side-profile': 'Hình cạnh',
    'over-shoulder': 'Từ trên vai',
    'close-up': 'Chụp cận',
    'full-body': 'Toàn thân'
  },

  hairstyle: {
    straight: 'Thẳng',
    wavy: 'Sóng',
    curly: 'Xoăn',
    'high-ponytail': 'Đuôi ngựa cao',
    'low-ponytail': 'Đuôi ngựa thâp',
    'half-up': 'Nửa buộc',
    bun: 'Tóc bó',
    braided: 'Tóc bím',
    tousled: 'Tóc xù'
  },

  makeup: {
    natural: 'Tự nhiên',
    'bold-eye': 'Mắt đậm',
    'red-lips': 'Môi đỏ',
    'smoky-eyes': 'Mắt khói',
    'clean-girl': 'Sạch sẽ',
    douyin: 'Douyin style',
    glam: 'Lóng lẫy'
  }
};

/**
 * Get translated label for an option
 * @param {string} category - Category name
 * @param {string} value - Option value
 * @returns {string} Translated label or original value if not found
 */
export function getTranslatedOptionLabel(category, value, language = 'en') {
  if (language === 'en') {
    return value;
  }
  
  if (language === 'vi' && PROMPT_TRANSLATIONS_VI[category]) {
    return PROMPT_TRANSLATIONS_VI[category][value] || value;
  }
  
  return value;
}

/**
 * Build translation map for selected options
 * @param {Array} options - Array of {category, value} objects
 * @returns {Object} Translation map
 */
export function buildOptionTranslationMap(options = []) {
  const map = {};
  options.forEach(({ category, value }) => {
    const translated = getTranslatedOptionLabel(category, value, 'vi');
    if (!map[value]) {
      map[value] = translated;
    }
  });
  return map;
}

/**
 * Translate selected options to Vietnamese
 * @param {Object} selectedOptions - Selected options {category: value}
 * @param {string} language - Target language ('vi')
 * @returns {Object} Translated options
 */
export function translateSelectedOptions(selectedOptions = {}, language = 'vi') {
  const translated = {};
  Object.entries(selectedOptions).forEach(([category, value]) => {
    translated[category] = getTranslatedOptionLabel(category, value, language);
  });
  return translated;
}

/**
 * Translate a prompt string to Vietnamese
 * @param {string} englishPrompt - English prompt text
 * @param {Object} translationMap - Translation map with key-value pairs
 * @returns {string} Translated prompt
 */
export function translatePrompt(englishPrompt = '', translationMap = {}) {
  let translated = englishPrompt;
  
  // Apply translation map substitutions
  Object.entries(translationMap).forEach(([english, vietnamese]) => {
    // Create regex to match the English term (case-insensitive)
    const regex = new RegExp(english, 'gi');
    translated = translated.replace(regex, vietnamese);
  });
  
  return translated;
}

/**
 * Common English to Vietnamese translations for prompt context
 */
export const PROMPT_CONTEXT_TRANSLATIONS_VI = {
  // Photography terms
  'Professional photography': 'Chụp ảnh chuyên nghiệp',
  'studio lighting': 'ánh sáng studio',
  'soft lighting': 'ánh sáng mềm',
  'dramatic lighting': 'ánh sáng kịch tính',
  'full-body shot': 'hình toàn thân',
  'close-up': 'chụp cận',
  'high quality': 'chất lượng cao',
  'detailed': 'chi tiết',
  'sharp focus': 'tiêu điểm sắc nét',
  'bokeh': 'nền mờ',
  'depth of field': 'độ sâu trường',
  
  // Character description
  'character': 'nhân vật',
  'model': 'người mẫu',
  'female': 'nữ',
  'male': 'nam',
  'woman': 'phụ nữ',
  'man': 'đàn ông',
  'beautiful': 'xinh đẹp',
  'elegant': 'thanh lịch',
  'fashionable': 'thời trang',
  'confident': 'tự tin',
  
  // Clothing
  'wearing': 'mặc',
  'dress': 'váy',
  'jacket': 'áo khoác',
  'pants': 'quần',
  'outfit': 'bộ đồ',
  'style': 'phong cách',
  'elegant': 'thanh lịch',
  'casual': 'thường ngày',
  
  // Negative prompts
  'blurry': 'mờ nhạt',
  'low quality': 'chất lượng thấp',
  'distorted': 'méo mó',
  'amateur': 'thô sơ',
  'pixelated': 'pixelated',
  'watermark': 'watermark',
  'text': 'chữ'
};

export default {
  PROMPT_TRANSLATIONS_VI,
  getTranslatedOptionLabel,
  buildOptionTranslationMap,
  translateSelectedOptions,
  translatePrompt,
  PROMPT_CONTEXT_TRANSLATIONS_VI
};
