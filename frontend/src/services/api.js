/**
 * API Service - Unified API client
 * Combines all API endpoints and uses axios instance with interceptors
 */

import axiosInstance, { createFormData } from './axios';
import { API_ENDPOINTS } from '../config/api';

// ============================================
// GENERIC API METHODS
// ============================================

/**
 * Generic API methods using axios instance with interceptors
 */
export const api = {
  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Additional axios options
   */
  post: async (endpoint, data, options = {}) => {
    const response = await axiosInstance.post(endpoint, data, options);
    return response.data;
  },

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   */
  get: async (endpoint, params = {}) => {
    const response = await axiosInstance.get(endpoint, { params });
    return response.data;
  },

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   */
  put: async (endpoint, data = {}) => {
    const response = await axiosInstance.put(endpoint, data);
    return response.data;
  },

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   */
  delete: async (endpoint) => {
    const response = await axiosInstance.delete(endpoint);
    return response.data;
  },

  /**
   * POST with FormData (for file uploads)
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with files
   * @param {Function} onProgress - Progress callback
   */
  postFormData: async (endpoint, formData, onProgress = null) => {
    const response = await axiosInstance.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
    return response.data;
  },
};

// ============================================
// PROMPT TEMPLATES APIs
// ============================================

export const promptTemplateAPI = {
  // Get all templates
  getTemplates: (params = {}) => api.get(API_ENDPOINTS.PROMPT_TEMPLATES, params),
  
  // Get single template
  getTemplateById: (id) => api.get(API_ENDPOINTS.PROMPT_TEMPLATE_BY_ID(id)),
  
  // Create template
  createTemplate: (templateData) => api.post(API_ENDPOINTS.PROMPT_TEMPLATES, templateData),
  
  // Update template
  updateTemplate: (id, templateData) => api.put(API_ENDPOINTS.PROMPT_TEMPLATE_BY_ID(id), templateData),
  
  // Delete template
  deleteTemplate: (id) => api.delete(API_ENDPOINTS.PROMPT_TEMPLATE_DELETE(id)),
  
  // Preview template
  previewTemplate: (templateId, data) => 
    api.post(`${API_ENDPOINTS.PROMPT_TEMPLATES}/preview`, { templateId, data }),
};

// ============================================
// AI OPTIONS APIs - Discover new options from AI analysis
// ============================================

export const aiOptionsAPI = {
  // Discover new options from AI response
  discoverOptions: (options) => api.post(API_ENDPOINTS.AI_DISCOVER_OPTIONS, { options }),
  
  // Get all options grouped by category
  getAllOptions: () => api.get(API_ENDPOINTS.AI_OPTIONS),
  
  // Get options by category
  getOptionsByCategory: (category) => api.get(`${API_ENDPOINTS.AI_OPTIONS}/${category}`),
  
  // Delete option
  deleteOption: (id) => api.delete(`${API_ENDPOINTS.AI_OPTIONS}/${id}`),
  
  // Export options for training
  exportOptions: () => api.get(`${API_ENDPOINTS.AI_OPTIONS}/export`),
};

// ============================================
// IMAGE GENERATION APIs
// ============================================

export const imageGenAPI = {
  // Generate image
  generate: (productImage, modelImage = null, options = {}, onProgress = null) => {
    const formData = createFormData({
      productImage,
      ...(modelImage && { modelImage }),
      options: JSON.stringify(options),
    });
    return api.postFormData(API_ENDPOINTS.IMAGE_GENERATE, formData, onProgress);
  },
  
  // Get options
  getOptions: () => api.get(API_ENDPOINTS.OPTIONS),
  
  // Get providers
  getProviders: () => api.get(API_ENDPOINTS.PROVIDERS),
  
  // Test provider
  testProvider: (providerId) => api.post(API_ENDPOINTS.TEST, { providerId }),
};

// ============================================
// HISTORY APIs
// ============================================

export const historyAPI = {
  // Get history with filters
  getHistory: (filters = {}) => api.get(API_ENDPOINTS.HISTORY, filters),
  
  // Get history by ID
  getHistoryById: (id) => api.get(API_ENDPOINTS.HISTORY_BY_ID(id)),
  
  // Delete history
  deleteHistory: (id) => api.delete(API_ENDPOINTS.HISTORY_DELETE(id)),
  
  // Regenerate from history
  regenerateFromHistory: (id, newOptions = {}) => 
    api.post(API_ENDPOINTS.HISTORY_REGENERATE(id), { options: newOptions }),
};

// ============================================
// STATS APIs
// ============================================

export const statsAPI = {
  // Get overall stats
  getOverallStats: () => api.get(API_ENDPOINTS.STATS),
  
  // Get provider stats
  getProviderStats: () => api.get(API_ENDPOINTS.STATS_PROVIDERS),
  
  // Get usage stats
  getUsageStats: (timeRange = '7d') => api.get(API_ENDPOINTS.STATS_USAGE, { range: timeRange }),
};

// ============================================
// AUTH APIs (if needed)
// ============================================

export const authAPI = {
  // Login
  login: (credentials) => api.post(API_ENDPOINTS.AUTH_LOGIN, credentials),
  
  // Register
  register: (userData) => api.post(API_ENDPOINTS.AUTH_REGISTER, userData),
  
  // Logout
  logout: () => api.post(API_ENDPOINTS.AUTH_LOGOUT),
  
  // Get current user
  getMe: () => api.get(API_ENDPOINTS.AUTH_ME),
};

// ============================================
// UNIFIED FLOW APIs (Phase 1)
// ============================================

export const unifiedFlowAPI = {
  /**
   * Unified Analysis - Analyze both character and product in ONE call
   * @param {File} characterImage - Character image file
   * @param {File} productImage - Product image file
   * @param {Object} options - Analysis options
   * @param {string} options.useCase - Use case (change-clothes, ecommerce-product, etc.)
   * @param {string} options.productFocus - Product focus (full-outfit, top, bottom, etc.)
   * @param {boolean} options.generateImages - Whether to generate images
   * @param {number} options.imageCount - Number of images to generate
   * @param {Function} onProgress - Progress callback
   */
  analyzeUnified: async (characterImage, productImage, options = {}, onProgress = null) => {
    const formData = new FormData();
    formData.append('characterImage', characterImage);
    formData.append('productImage', productImage);
    formData.append('useCase', options.useCase || 'change-clothes');
    formData.append('productFocus', options.productFocus || 'full-outfit');
    
    if (options.generateImages !== undefined) {
      formData.append('generateImages', options.generateImages);
    }
    if (options.imageCount) {
      formData.append('imageCount', options.imageCount);
    }
    if (options.selectedOptions) {
      formData.append('selectedOptions', JSON.stringify(options.selectedOptions));
    }
    
    return api.postFormData(API_ENDPOINTS.UNIFIED_ANALYZE, formData, onProgress);
  },
  
  /**
   * Generate images with smart fallback
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - Positive prompt
   * @param {string} params.negativePrompt - Negative prompt
   * @param {Object} params.options - Generation options
   * @param {Function} onProgress - Progress callback
   */
  generateImages: async (params, onProgress = null) => {
    const formData = new FormData();
    formData.append('prompt', params.prompt);
    formData.append('negativePrompt', params.negativePrompt || '');
    
    if (params.options) {
      formData.append('options', JSON.stringify(params.options));
    }
    
    return api.postFormData(API_ENDPOINTS.UNIFIED_GENERATE, formData, onProgress);
  },
  
  /**
   * Get provider status
   */
  getProviderStatus: () => api.get(API_ENDPOINTS.PROVIDER_STATUS),
  
  /**
   * Test key rotation
   */
  testKeyRotation: () => api.get(API_ENDPOINTS.KEY_ROTATION_TEST),
};

export default api;
