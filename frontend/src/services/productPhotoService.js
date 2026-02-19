/**
 * Product Photography Generation Service
 * Handles all product photo generation API calls
 */

import axiosInstance, { createFormData, validateImageFile } from './axios';
import { API_ENDPOINTS } from '../config/api';

// ============================================
// GENERATION PRESETS
// ============================================
export const GENERATION_PRESETS = {
  ecommerce: {
    name: 'E-commerce',
    description: 'Ảnh sản phẩm chuyên nghiệp cho website bán hàng',
    options: {
      quality: 'high',
      style: 'professional',
      lighting: 'studio',
      background: 'white',
      cameraAngle: 'eye-level',
      composition: 'centered',
      enhanceColors: true,
      enhanceDetails: true,
      addShadows: true,
      removeBackground: false,
    },
  },
  fashion: {
    name: 'Fashion',
    description: 'Ảnh thời trang với người mẫu',
    options: {
      quality: 'high',
      style: 'dramatic',
      lighting: 'natural',
      background: 'lifestyle',
      cameraAngle: 'slightly-above',
      composition: 'rule-of-thirds',
      enhanceColors: true,
      enhanceDetails: true,
      addShadows: true,
      removeBackground: false,
    },
  },
  luxury: {
    name: 'Luxury',
    description: 'Ảnh cao cấp cho sản phẩm luxury',
    options: {
      quality: 'ultra',
      style: 'minimalist',
      lighting: 'soft',
      background: 'gradient',
      cameraAngle: 'eye-level',
      composition: 'centered',
      enhanceColors: true,
      enhanceDetails: true,
      addShadows: false,
      removeBackground: false,
    },
  },
  lifestyle: {
    name: 'Lifestyle',
    description: 'Ảnh sản phẩm trong bối cảnh thực tế',
    options: {
      quality: 'high',
      style: 'natural',
      lighting: 'golden-hour',
      background: 'lifestyle',
      cameraAngle: 'eye-level',
      composition: 'environmental',
      enhanceColors: false,
      enhanceDetails: true,
      addShadows: true,
      removeBackground: false,
    },
  },
  studio: {
    name: 'Studio',
    description: 'Ảnh studio với ánh sáng chuyên nghiệp',
    options: {
      quality: 'high',
      style: 'professional',
      lighting: 'studio',
      background: 'white',
      cameraAngle: 'eye-level',
      composition: 'centered',
      enhanceColors: true,
      enhanceDetails: true,
      addShadows: true,
      removeBackground: true,
    },
  },
};

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

/**
 * Generate product photography
 * @param {File|Blob} productImage - Product image file
 * @param {File|Blob|null} modelImage - Model image file (optional)
 * @param {Object} options - Generation options
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Generation result
 */
export async function generateProductPhoto(
  productImage,
  modelImage = null,
  options = {},
  onProgress = null
) {
  try {
    // Validate images
    validateImageFile(productImage);
    if (modelImage) {
      validateImageFile(modelImage);
    }
    
    // Create FormData
    const formData = new FormData();
    formData.append('productImage', productImage);
    
    if (modelImage) {
      formData.append('modelImage', modelImage);
    }
    
    // Add options as JSON string
    formData.append('options', JSON.stringify(options));
    
    // Make API request
    const response = await axiosInstance.post(API_ENDPOINTS.GENERATE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress({
            type: 'upload',
            progress: percentCompleted,
            loaded: progressEvent.loaded,
            total: progressEvent.total,
          });
        }
      },
    });
    
    return {
      success: true,
      message: API_SUCCESS_MESSAGES.GENERATION_SUCCESS,
      data: response.data,
    };
  } catch (error) {
    console.error('[Generate Product Photo Error]', error);
    throw {
      success: false,
      message: error.message || 'Có lỗi xảy ra khi tạo ảnh',
      error: error.originalError || error,
    };
  }
}

/**
 * Generate with preset
 * @param {File|Blob} productImage - Product image file
 * @param {File|Blob|null} modelImage - Model image file (optional)
 * @param {string} presetName - Preset name (ecommerce, fashion, luxury, lifestyle, studio)
 * @param {Object} customOptions - Custom options to override preset
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Generation result
 */
export async function generateWithPreset(
  productImage,
  modelImage = null,
  presetName = 'ecommerce',
  customOptions = {},
  onProgress = null
) {
  const preset = GENERATION_PRESETS[presetName];
  
  if (!preset) {
    throw new Error(`Preset "${presetName}" không tồn tại`);
  }
  
  // Merge preset options with custom options
  const options = {
    ...preset.options,
    ...customOptions,
    preset: presetName,
  };
  
  return generateProductPhoto(productImage, modelImage, options, onProgress);
}

// ============================================
// OPTIONS & PROVIDERS
// ============================================

/**
 * Get available generation options
 * @returns {Promise<Object>} Available options
 */
export async function getGenerationOptions() {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.OPTIONS);
    return {
      success: true,
      data: response.data.options || response.data,
    };
  } catch (error) {
    console.error('[Get Options Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy danh sách options',
      error,
    };
  }
}

/**
 * Get provider status
 * @returns {Promise<Object>} Provider status
 */
export async function getProviderStatus() {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.PROVIDERS);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Provider Status Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy trạng thái providers',
      error,
    };
  }
}

/**
 * Test specific provider
 * @param {string} providerId - Provider ID to test
 * @returns {Promise<Object>} Test result
 */
export async function testProvider(providerId) {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.TEST, {
      providerId,
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Test Provider Error]', error);
    throw {
      success: false,
      message: error.message || `Không thể test provider ${providerId}`,
      error,
    };
  }
}

// ============================================
// PROMPT GENERATION HELPERS
// ============================================

/**
 * Generate dynamic prompt from options
 * @param {Object} options - Generation options
 * @returns {string} Generated prompt
 */
export function generatePromptFromOptions(options) {
  const parts = [];
  
  // Base description
  parts.push('Professional product photography');
  
  // Style
  if (options.style) {
    const styleMap = {
      professional: 'clean and professional',
      dramatic: 'dramatic and artistic',
      minimalist: 'minimalist and elegant',
      natural: 'natural and authentic',
      vintage: 'vintage and nostalgic',
    };
    parts.push(styleMap[options.style] || options.style);
  }
  
  // Lighting
  if (options.lighting) {
    const lightingMap = {
      studio: 'studio lighting',
      natural: 'natural daylight',
      soft: 'soft diffused lighting',
      dramatic: 'dramatic side lighting',
      'golden-hour': 'warm golden hour lighting',
    };
    parts.push(lightingMap[options.lighting] || options.lighting);
  }
  
  // Background
  if (options.background) {
    const backgroundMap = {
      white: 'pure white background',
      gradient: 'subtle gradient background',
      lifestyle: 'lifestyle environment',
      studio: 'studio backdrop',
      transparent: 'transparent background',
    };
    parts.push(backgroundMap[options.background] || options.background);
  }
  
  // Camera angle
  if (options.cameraAngle) {
    const angleMap = {
      'eye-level': 'eye-level perspective',
      'slightly-above': 'slightly elevated angle',
      'birds-eye': 'top-down birds eye view',
      'low-angle': 'low angle shot',
    };
    parts.push(angleMap[options.cameraAngle] || options.cameraAngle);
  }
  
  // Composition
  if (options.composition) {
    const compositionMap = {
      centered: 'centered composition',
      'rule-of-thirds': 'rule of thirds composition',
      environmental: 'environmental storytelling',
      'close-up': 'detailed close-up',
    };
    parts.push(compositionMap[options.composition] || options.composition);
  }
  
  // Quality
  if (options.quality === 'ultra') {
    parts.push('ultra high quality, 8K resolution');
  } else if (options.quality === 'high') {
    parts.push('high quality, sharp details');
  }
  
  // Enhancements
  if (options.enhanceColors) {
    parts.push('vibrant colors');
  }
  if (options.enhanceDetails) {
    parts.push('crisp details');
  }
  if (options.addShadows) {
    parts.push('realistic shadows');
  }
  
  return parts.join(', ');
}

/**
 * Generate negative prompt from options
 * @param {Object} options - Generation options
 * @returns {string} Negative prompt
 */
export function generateNegativePrompt(options) {
  const negatives = [
    'blurry',
    'low quality',
    'distorted',
    'watermark',
    'text',
    'logo',
  ];
  
  if (options.background === 'white') {
    negatives.push('colored background', 'busy background');
  }
  
  if (options.style === 'professional') {
    negatives.push('amateur', 'casual', 'messy');
  }
  
  if (options.quality === 'ultra') {
    negatives.push('noise', 'artifacts', 'compression');
  }
  
  return negatives.join(', ');
}

// ============================================
// BATCH GENERATION (Future)
// ============================================

/**
 * Generate multiple variations
 * @param {File|Blob} productImage - Product image file
 * @param {File|Blob|null} modelImage - Model image file (optional)
 * @param {Array<Object>} optionsArray - Array of option objects
 * @returns {Promise<Array>} Array of generation results
 */
export async function generateBatch(productImage, modelImage = null, optionsArray = []) {
  try {
    const results = await Promise.allSettled(
      optionsArray.map(options => 
        generateProductPhoto(productImage, modelImage, options)
      )
    );
    
    return results.map((result, index) => ({
      index,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  } catch (error) {
    console.error('[Batch Generation Error]', error);
    throw error;
  }
}

export default {
  generateProductPhoto,
  generateWithPreset,
  getGenerationOptions,
  getProviderStatus,
  testProvider,
  generatePromptFromOptions,
  generateNegativePrompt,
  generateBatch,
  GENERATION_PRESETS,
};
