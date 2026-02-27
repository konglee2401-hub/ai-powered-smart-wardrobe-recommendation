/**
 * Language-Aware Prompt Builder
 * Wrapper around prompt builder to support Vietnamese language generation
 * 
 * Usage:
 * const prompt = buildLanguageAwarePrompt(analysis, options, language='vi');
 */

import { buildDetailedPrompt } from './smartPromptBuilder.js';

import {
  getTranslatedOptionLabel,
  translatePrompt,
  buildOptionTranslationMap,
  translateSelectedOptions,
  PROMPT_TRANSLATIONS_VI
} from './promptI18n.js';

// ============================================================
// Vietnamese Prompt Templates
// ============================================================

const USE_CASE_TEMPLATES_VI = {
  'change-clothes': {
    name: 'Thay Quần Áo',
    template: `Một người mẫu {gender}, tuổi {age}, mặc {colors} {material}. 
Hình ảnh chính xác từ tham chiếu nhân vật, khuôn mặt hoàn hảo, cơ thể tự nhiên.
Chụp ảnh chuyên nghiệp, ánh sáng studio, độ phân giải cao, chi tiết kết cấu chính xác.`
  },
  'character-holding-product': {
    name: 'Nhân Vật Cầm Sản Phẩm',
    template: `Một người mẫu {gender}, tuổi {age}, cầm sản phẩm trong tay, mặc {colors} {material}.
Khuôn mặt chính xác từ tham chiếu, cơ thể tự nhiên, tư thế tự nhiên.
Chụp ảnh chuyên nghiệp, chi tiết cao, ánh sáng tự nhiên, thương mại.`
  },
  'ecommerce-product': {
    name: 'Ảnh Sản Phẩm Thương Mại',
    template: `Ảnh sản phẩm chuyên nghiệp, {colors} {material}.
Chi tiết tuyệt vời, ánh sáng studio, nền trắng sạch, độ phân giải cao.
Phong cách thương mại, tập trung vào sản phẩm.`
  },
  'social-media': {
    name: 'Bài Đăng Mạng Xã Hội',
    template: `Bài đăng mạng xã hội, người mẫu {gender}, tuổi {age}, mặc {colors} {material}.
Phong cách xu hướng, ánh sáng tự nhiên, bố cục năng động, góc chụp hiện đại.`
  },
  'fashion-editorial': {
    name: 'Bài Báo Thời Trang',
    template: `Ảnh bài báo thời trang chuyên nghiệp, người mẫu {gender}, tuổi {age}.
Trang phục {colors} {material}, ánh sáng kịch tính, tạp chí phong cách.
Thành phố sang trọng, thành phần nghệ thuật, chi tiết cao.`
  }
};

// ============================================================
// Core Function: Build Language-Aware Prompt
// ============================================================

/**
 * Build prompt with language support (EN/VI)
 * Main entry point for language-aware prompt generation
 * @param {Object} analysis - Product/character analysis
 * @param {Object} selectedOptions - User selected options (scene, lighting, mood, etc.)
 * @param {string} language - 'en' or 'vi' (default: 'en')
 * @param {string} useCase - Use case for prompt (default: auto-detect)
 * @param {string} productFocus - Product focus area
 * @returns {Object} {positive, negative} prompt strings
 */
export async function buildLanguageAwarePrompt(
  analysis,
  selectedOptions = {},
  language = 'en',
  useCase = 'change-clothes',
  productFocus = 'full-outfit'
) {
  // Build English prompt first using the detailed prompt builder
  const detailedPrompt = await buildDetailedPrompt(analysis, selectedOptions, useCase, productFocus);
  
  // Map detailed prompt format to standard format {positive, negative}
  const englishPrompt = {
    positive: detailedPrompt.prompt || '',
    negative: detailedPrompt.negativePrompt || ''
  };

  // Normalize language code: 'vi-VN' or 'vi_VN' → 'vi'
  const normalizedLanguage = (language || 'en').split('-')[0].split('_')[0].toLowerCase();
  
  // If English requested, return as-is
  if (normalizedLanguage === 'en') {
    return englishPrompt;
  }

  // If Vietnamese requested, translate
  if (normalizedLanguage === 'vi') {
    return translatePromptToVietnamese(englishPrompt, selectedOptions, analysis);
  }

  return englishPrompt;
}

/**
 * Translate English prompt to Vietnamese
 * Uses Vietnamese template when available, otherwise translates EN template
 * @param {string} englishPrompt - English prompt text
 * @param {Object} selectedOptions - Selected options
 * @param {Object} analysis - Analysis data
 * @returns {Object} {positive, negative} Vietnamese prompt
 */
function translatePromptToVietnamese(englishPrompt, selectedOptions, analysis) {
  // Build translation map from selected options
  const optionsArray = Object.entries(selectedOptions).map(([category, value]) => ({
    category,
    value
  }));
  const translationMap = buildOptionTranslationMap(optionsArray);

  // Translate each part of the English prompt
  const viPrompt = {
    positive: translatePrompt(englishPrompt.positive, translationMap),
    negative: translatePrompt(englishPrompt.negative, translationMap)
  };

  return viPrompt;
}

/**
 * Build Vietnamese prompt directly from template
 * Generates Vietnamese prompt without first generating English
 * @param {Object} analysis - Analysis data
 * @param {Object} selectedOptions - Selected options
 * @param {string} useCase - Use case
 * @returns {Object} {positive, negative} Vietnamese prompt
 */
export function buildVietnamesePrompt(
  analysis,
  selectedOptions = {},
  useCase = 'change-clothes'
) {
  const character = analysis?.character || {};
  const product = analysis?.product || {};

  // Translate selected options to Vietnamese
  const viOptions = translateSelectedOptions(selectedOptions, 'vi');

  let positivePrompt = '';
  let negativePrompt = 'mờ nhạt, chất lượng thấp, méo mó, hình mờ, giải phẫu tồi, chi nhánh dặc biệt, biến dạng';

  // Character description in Vietnamese
  if (character.gender || character.age) {
    const genderVi = character.gender === 'female' ? 'nữ' : 'nam';
    positivePrompt += `${genderVi}, tuổi ${character.age || 'không xác định'}, `;
  }

  // Translate body type
  if (character.bodyType) {
    const bodyTypeMap = {
      slim: 'mảnh khảnh',
      athletic: 'vận động viên',
      curvy: 'cong',
      petite: 'nhỏ bé',
      tall: 'cao',
      average: 'trung bình'
    };
    positivePrompt += `dáng ${bodyTypeMap[character.bodyType] || character.bodyType}, `;
  }

  // Skin tone in Vietnamese
  if (character.skinTone) {
    const skinToneMap = {
      fair: 'da sáng',
      medium: 'da trung bình',
      dark: 'da tối',
      olive: 'da olive',
      tan: 'da nâu'
    };
    positivePrompt += `${skinToneMap[character.skinTone] || character.skinTone}, `;
  }

  // Product/clothing description
  if (product.type || product.category) {
    positivePrompt += `mặc ${product.type || product.category}, `;
  }

  // Add Vietnamese selected options
  if (viOptions.scene) {
    positivePrompt += `cảnh ${viOptions.scene}, `;
  }
  if (viOptions.lighting) {
    positivePrompt += `ánh sáng ${viOptions.lighting}, `;
  }
  if (viOptions.mood) {
    positivePrompt += `tâm trạng ${viOptions.mood}, `;
  }
  if (viOptions.style) {
    positivePrompt += `phong cách ${viOptions.style}, `;
  }

  // Quality indicators in Vietnamese
  positivePrompt += 'độ phân giải cao, chụp ảnh chuyên nghiệp, kết cấu chi tiết, bố cục hoàn hảo.';

  return {
    positive: positivePrompt,
    negative: negativePrompt
  };
}

/**
 * Get Vietnamese use case template
 * Falls back to Vietnamese translation if available
 * @param {string} useCase - Use case key
 * @returns {Object|null} Template or null
 */
export function getVietnameseUseCaseTemplate(useCase) {
  return USE_CASE_TEMPLATES_VI[useCase] || null;
}

/**
 * Get translated age descriptor
 * @param {string} ageRange - Age range (e.g., '18-25')
 * @param {string} language - 'en' or 'vi'
 * @returns {string} Descriptor in specified language
 */
export function getTranslatedAgeDescriptor(ageRange, language = 'en') {
  const AGE_ADJUSTMENTS_VI = {
    '18-25': {
      descriptor: 'trẻ trung',
      additions: 'Người mẫu có vẻ tươi mới, trẻ trung. Vẻ đẹp tự nhiên với trang điểm nhẹ nhàng.'
    },
    '25-30': {
      descriptor: 'sôi động',
      additions: 'Người mẫu có sự hiện diện sôi động. Vẻ ngoài tự tin và phong cách.'
    },
    '30-40': {
      descriptor: 'chuyên nghiệp',
      additions: 'Người mẫu có vẻ chuyên nghiệp. Vẻ ngoài tinh tế và thành thạo.'
    },
    '40-50': {
      descriptor: 'trưởng thành thanh lịch',
      additions: 'Người mẫu có sự trưởng thành thanh lịch. Vẻ ngoài phân biệt và duyên dáng.'
    },
    '50+': {
      descriptor: 'thanh lịch vượt trội',
      additions: 'Người mẫu có sự thanh lịch vượt trội. Vẻ ngoài tinh tế và tươi sáng.'
    }
  };

  if (language === 'en') {
    return AGE_ADJUSTMENTS[ageRange] || AGE_ADJUSTMENTS['25-30'];
  }
  return AGE_ADJUSTMENTS_VI[ageRange] || AGE_ADJUSTMENTS_VI['25-30'];
}

export default {
  buildLanguageAwarePrompt,
  buildVietnamesePrompt,
  getVietnameseUseCaseTemplate,
  getTranslatedAgeDescriptor,
  translatePromptToVietnamese,
  USE_CASE_TEMPLATES_VI
};
