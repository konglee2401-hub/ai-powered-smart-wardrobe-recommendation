/**
 * Prompt Template Service
 * Handles prompt template management API calls
 */

import axiosInstance from './axios';
import { API_ENDPOINTS, API_SUCCESS_MESSAGES } from '@/config/api';

// ============================================
// GET TEMPLATES
// ============================================

/**
 * Get all prompt templates
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Templates data
 */
export async function getPromptTemplates(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.PROMPT_TEMPLATES}?${params.toString()}`
    );
    
    return {
      success: true,
      data: response.data.templates || response.data,
    };
  } catch (error) {
    console.error('[Get Prompt Templates Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy danh sách templates',
      error,
    };
  }
}

/**
 * Get template by ID
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Template data
 */
export async function getPromptTemplateById(id) {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.PROMPT_TEMPLATE_BY_ID(id));
    
    return {
      success: true,
      data: response.data.template || response.data,
    };
  } catch (error) {
    console.error('[Get Prompt Template By ID Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy template',
      error,
    };
  }
}

// ============================================
// CREATE TEMPLATE
// ============================================

/**
 * Create new prompt template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
export async function createPromptTemplate(templateData) {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.PROMPT_TEMPLATES,
      templateData
    );
    
    return {
      success: true,
      message: API_SUCCESS_MESSAGES.SAVE_SUCCESS,
      data: response.data.template || response.data,
    };
  } catch (error) {
    console.error('[Create Prompt Template Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể tạo template',
      error,
    };
  }
}

// ============================================
// UPDATE TEMPLATE
// ============================================

/**
 * Update existing prompt template
 * @param {string} id - Template ID
 * @param {Object} templateData - Updated template data
 * @returns {Promise<Object>} Updated template
 */
export async function updatePromptTemplate(id, templateData) {
  try {
    const response = await axiosInstance.put(
      API_ENDPOINTS.PROMPT_TEMPLATE_BY_ID(id),
      templateData
    );
    
    return {
      success: true,
      message: API_SUCCESS_MESSAGES.UPDATE_SUCCESS,
      data: response.data.template || response.data,
    };
  } catch (error) {
    console.error('[Update Prompt Template Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể cập nhật template',
      error,
    };
  }
}

// ============================================
// DELETE TEMPLATE
// ============================================

/**
 * Delete prompt template
 * @param {string} id - Template ID
 * @returns {Promise<Object>} Delete result
 */
export async function deletePromptTemplate(id) {
  try {
    const response = await axiosInstance.delete(
      API_ENDPOINTS.PROMPT_TEMPLATE_DELETE(id)
    );
    
    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DELETE_SUCCESS,
      data: response.data,
    };
  } catch (error) {
    console.error('[Delete Prompt Template Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể xóa template',
      error,
    };
  }
}

// ============================================
// CATEGORIES
// ============================================

/**
 * Get template categories
 * @returns {Promise<Object>} Categories
 */
export async function getTemplateCategories() {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.PROMPT_TEMPLATES}/categories`
    );
    
    return {
      success: true,
      data: response.data.categories || response.data,
    };
  } catch (error) {
    console.error('[Get Template Categories Error]', error);
    
    // Return default categories if API fails
    return {
      success: true,
      data: [
        'E-commerce',
        'Fashion',
        'Luxury',
        'Lifestyle',
        'Studio',
        'Product',
        'Custom',
      ],
    };
  }
}

// ============================================
// SEARCH & FILTER
// ============================================

/**
 * Search templates by keyword
 * @param {string} keyword - Search keyword
 * @returns {Promise<Object>} Search results
 */
export async function searchPromptTemplates(keyword) {
  try {
    return await getPromptTemplates({ search: keyword });
  } catch (error) {
    console.error('[Search Prompt Templates Error]', error);
    throw error;
  }
}

/**
 * Get templates by category
 * @param {string} category - Category name
 * @returns {Promise<Object>} Templates in category
 */
export async function getTemplatesByCategory(category) {
  try {
    return await getPromptTemplates({ category });
  } catch (error) {
    console.error('[Get Templates By Category Error]', error);
    throw error;
  }
}

// ============================================
// IMPORT/EXPORT
// ============================================

/**
 * Export templates to JSON
 * @param {Array<string>} ids - Template IDs to export (optional)
 * @returns {Promise<Object>} Export data
 */
export async function exportTemplates(ids = []) {
  try {
    let templates;
    
    if (ids.length > 0) {
      const results = await Promise.all(
        ids.map(id => getPromptTemplateById(id))
      );
      templates = results.map(r => r.data);
    } else {
      const result = await getPromptTemplates({ limit: 1000 });
      templates = result.data;
    }
    
    return {
      success: true,
      data: templates,
      exportDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Export Templates Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể export templates',
      error,
    };
  }
}

/**
 * Import templates from JSON
 * @param {Array<Object>} templates - Templates to import
 * @returns {Promise<Object>} Import result
 */
export async function importTemplates(templates) {
  try {
    const results = await Promise.allSettled(
      templates.map(template => createPromptTemplate(template))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      success: true,
      message: `Import thành công ${successful} templates. ${failed > 0 ? `${failed} templates thất bại.` : ''}`,
      results: {
        successful,
        failed,
        details: results,
      },
    };
  } catch (error) {
    console.error('[Import Templates Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể import templates',
      error,
    };
  }
}

// ============================================
// PREDEFINED TEMPLATES
// ============================================

export const PREDEFINED_TEMPLATES = {
  ecommerce: {
    name: 'E-commerce Standard',
    category: 'E-commerce',
    prompt: 'Professional product photography, clean and professional, studio lighting, pure white background, eye-level perspective, centered composition, high quality, sharp details, vibrant colors, crisp details, realistic shadows',
    negativePrompt: 'blurry, low quality, distorted, watermark, text, logo, colored background, busy background',
    options: {
      quality: 'high',
      style: 'professional',
      lighting: 'studio',
      background: 'white',
      cameraAngle: 'eye-level',
      composition: 'centered',
    },
  },
  fashion: {
    name: 'Fashion Editorial',
    category: 'Fashion',
    prompt: 'Professional product photography, dramatic and artistic, natural daylight, lifestyle environment, slightly elevated angle, rule of thirds composition, high quality, sharp details, vibrant colors, crisp details, realistic shadows',
    negativePrompt: 'blurry, low quality, distorted, watermark, text, logo, amateur, casual, messy',
    options: {
      quality: 'high',
      style: 'dramatic',
      lighting: 'natural',
      background: 'lifestyle',
      cameraAngle: 'slightly-above',
      composition: 'rule-of-thirds',
    },
  },
  luxury: {
    name: 'Luxury Premium',
    category: 'Luxury',
    prompt: 'Professional product photography, minimalist and elegant, soft diffused lighting, subtle gradient background, eye-level perspective, centered composition, ultra high quality, 8K resolution, vibrant colors, crisp details',
    negativePrompt: 'blurry, low quality, distorted, watermark, text, logo, amateur, casual, messy, noise, artifacts, compression',
    options: {
      quality: 'ultra',
      style: 'minimalist',
      lighting: 'soft',
      background: 'gradient',
      cameraAngle: 'eye-level',
      composition: 'centered',
    },
  },
};

/**
 * Get predefined templates
 * @returns {Array<Object>} Predefined templates
 */
export function getPredefinedTemplates() {
  return Object.entries(PREDEFINED_TEMPLATES).map(([key, template]) => ({
    id: key,
    ...template,
    isPredefined: true,
  }));
}

export default {
  getPromptTemplates,
  getPromptTemplateById,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  getTemplateCategories,
  searchPromptTemplates,
  getTemplatesByCategory,
  exportTemplates,
  importTemplates,
  getPredefinedTemplates,
  PREDEFINED_TEMPLATES,
};
