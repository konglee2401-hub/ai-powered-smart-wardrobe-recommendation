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
// PROMPTS APIs - Simple prompt generation
// ============================================

export const promptsAPI = {
  // Generate simple prompt
  generatePrompt: (data) => api.post(API_ENDPOINTS.PROMPTS, data),
  
  // Enhance a draft prompt
  enhancePrompt: (draft, analysis, selectedOptions) => 
    api.post(API_ENDPOINTS.ENHANCE_PROMPT, { draft, analysis, selectedOptions }),
};

// ============================================
// TEMPLATES APIs - Simple template CRUD
// ============================================

export const templatesAPI = {
  getAll: async () => {
    try {
      const response = await axiosInstance.get('/prompt-templates');
      return response.data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/prompt-templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  },

  create: async (name, description, useCase, style, defaultPrompt, defaultNegativePrompt) => {
    try {
      const response = await axiosInstance.post('/prompt-templates', {
        name,
        description,
        useCase,
        style,
        defaultPrompt,
        defaultNegativePrompt,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  update: async (id, name, description, useCase, style, defaultPrompt, defaultNegativePrompt) => {
    try {
      const response = await axiosInstance.put(`/prompt-templates/${id}`, {
        name,
        description,
        useCase,
        style,
        defaultPrompt,
        defaultNegativePrompt,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/prompt-templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  },
};

// ============================================
// AI OPTIONS APIs - Discover new options from AI analysis
// ============================================

export const aiOptionsAPI = {
  // Discover new options from AI response
  discoverOptions: (options) => api.post('/prompt-options/discover', { options }),
  
  // Get all options grouped by category
  getAllOptions: () => api.get('/prompt-options'),
  
  // Get options by category
  getOptionsByCategory: (category) => api.get(`/prompt-options/${category}`),
  
  // Create a new option (save to database)
  createOption: (category, value, label, description, metadata = {}) => 
    api.post('/prompt-options', { category, value, label, description, metadata }),
  
  // Delete option
  deleteOption: (id) => api.delete(`/prompt-options/${id}`),
  
  // Export options for training
  exportOptions: () => api.get('/prompt-options/export'),
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
   * Build Prompt from Analysis
   * Takes analysis data and options, returns a prompt ready for image generation
   * Now includes use-case and product-focus aware prompt building
   * @param {Object} analysis - Analysis data from analyzeUnified
   * @param {Object} selectedOptions - User-selected options for the prompt
   * @param {string} useCase - Use case (change-clothes, styling, complete-look, etc.)
   * @param {string} productFocus - Product focus (full-outfit, top, bottom, etc.)
   */
  buildPrompt: async (analysis, selectedOptions = {}, useCase = 'change-clothes', productFocus = 'full-outfit') => {
    return api.post('/ai/build-prompt-unified', {
      analysis,
      selectedOptions,
      useCase,
      productFocus
    });
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
    // Send as JSON instead of FormData since we're not uploading files
    const payload = {
      prompt: params.prompt,
      negativePrompt: params.negativePrompt || '',
      options: params.options || {},
      // Extract imageCount to top level as expected by backend
      imageCount: params.options?.imageCount || 2
    };
    
    return api.post(API_ENDPOINTS.UNIFIED_GENERATE, payload);
  },
  
  /**
   * Get provider status
   */
  getProviderStatus: () => api.get(API_ENDPOINTS.PROVIDER_STATUS),
  
  /**
   * Test key rotation
   */
  testKeyRotation: () => api.get(API_ENDPOINTS.KEY_ROTATION_TEST),

  /**
   * Generate video with AI
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - Video prompt
   * @param {string} params.provider - Video provider
   * @param {Array} params.referenceImages - Reference images
   * @param {Object} params.options - Video options
   */
  generateVideo: async (params) => {
    const formData = new FormData();
    
    if (params.referenceImages && params.referenceImages.length > 0 && params.referenceImages[0].preview) {
      try {
        const response = await fetch(params.referenceImages[0].preview);
        const blob = await response.blob();
        formData.append('character_image', blob, 'character.jpg');
      } catch (e) {
        console.warn('Could not convert image:', e);
      }
    }
    
    formData.append('prompt', params.prompt);
    if (params.provider) {
      formData.append('model', params.provider);
    }
    if (params.options) {
      formData.append('style_preferences', JSON.stringify(params.options));
    }
    
    return api.postFormData(API_ENDPOINTS.VIDEO_GENERATE, formData);
  },
};

// ============================================
// BROWSER AUTOMATION APIs
// ============================================

export const browserAutomationAPI = {
  /**
   * Analyze images using browser automation (Step 2 - ANALYSIS ONLY, no generation)
   * @param {File} characterImage - Character image file
   * @param {File} productImage - Product/clothing image file
   * @param {Object} options - Analysis options (scene, lighting, mood, etc.)
   */
  analyzeBrowserOnly: async (characterImage, productImage, options = {}) => {
    const formData = new FormData();
    
    // Convert base64 strings to Blob/File objects for multipart/form-data
    // characterImage and productImage are base64 strings (without data URL prefix)
    const base64ToBlob = (base64String) => {
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'image/jpeg' });
    };
    
    const charBlob = base64ToBlob(characterImage);
    const prodBlob = base64ToBlob(productImage);
    
    // Append as files, not raw strings
    formData.append('characterImage', charBlob, 'character.jpg');
    formData.append('productImage', prodBlob, 'product.jpg');
    formData.append('analysisProvider', options.provider || 'grok');
    
    // Add all style options
    if (options.scene) formData.append('scene', options.scene);
    if (options.lighting) formData.append('lighting', options.lighting);
    if (options.mood) formData.append('mood', options.mood);
    if (options.style) formData.append('style', options.style);
    if (options.colorPalette) formData.append('colorPalette', options.colorPalette);
    if (options.hairstyle) formData.append('hairstyle', options.hairstyle);
    if (options.makeup) formData.append('makeup', options.makeup);
    if (options.cameraAngle) formData.append('cameraAngle', options.cameraAngle);
    if (options.aspectRatio) formData.append('aspectRatio', options.aspectRatio);
    if (options.customPrompt) formData.append('customPrompt', options.customPrompt);
    
    return api.postFormData('/v1/browser-automation/analyze-browser', formData);
  },
  
  /**
   * Generate image using browser automation (Step 5 - GENERATION ONLY)
   * @param {string} prompt - Generation prompt
   * @param {Object} options - Generation options
   */
  generateBrowserOnly: async (prompt, options = {}) => {
    const payload = {
      prompt,
      generationProvider: options.generationProvider || 'grok',  // 💫 Image generation provider
      imageGenProvider: options.imageGenProvider || options.provider || 'grok',
      negativePrompt: options.negativePrompt || '',
      scene: options.scene || 'studio',
      lighting: options.lighting || 'soft-diffused',
      mood: options.mood || 'confident',
      style: options.style || 'minimalist',
      colorPalette: options.colorPalette || 'neutral',
      cameraAngle: options.cameraAngle || 'eye-level',
      aspectRatio: options.aspectRatio || '1:1',
      // Images need to be passed as base64 or paths from previous step
      characterImageBase64: options.characterImageBase64,
      productImageBase64: options.productImageBase64,
      characterImagePath: options.characterImagePath,
      productImagePath: options.productImagePath,
      // 💫 Pass conversation ID to reuse
      grokConversationId: options.grokConversationId,
      grokUrl: options.grokUrl,
      // 💫 NEW: Pass image count and character description
      imageCount: options.imageCount || 1,
      characterDescription: options.characterDescription || '',
      // Storage configuration
      storageType: options.storageType || 'cloud',
      localFolder: options.localFolder,
      cloudProvider: options.cloudProvider || 'imgbb'
    };
    
    return api.post('/v1/browser-automation/generate-browser', payload);
  },

  /**
   * Generate video with provider selection (Grok or Google Flow)
   * @param {Object} options - Generation options
   */
  generateVideoWithProvider: async (options = {}) => {
    const payload = {
      videoProvider: options.videoProvider || 'grok',  // 💫 Video provider selection
      prompt: options.prompt || '',
      duration: options.duration || 5,
      quality: options.quality || 'high',
      aspectRatio: options.aspectRatio || '16:9',
      characterImageBase64: options.characterImageBase64,
      productImageBase64: options.productImageBase64
    };

    return api.post('/v1/browser-automation/generate-video-with-provider', payload);
  },

  /**
   * Analyze images using browser automation (legacy)
   * @param {File} characterImage - Character image file
   * @param {File} clothingImage - Clothing image file
   * @param {string} provider - Provider to use (grok, zai-chat)
   */
  analyze: async (characterImage, clothingImage, provider = 'grok') => {
    const formData = new FormData();
    formData.append('characterImage', characterImage);
    formData.append('clothingImage', clothingImage);
    formData.append('provider', provider);
    return api.postFormData('/v1/browser-automation/analyze', formData);
  },
  
  /**
   * Generate image using browser automation (full flow: analyze + generate)
   * @param {File} characterImage - Character image file
   * @param {File} productImage - Product/clothing image file
   * @param {Object} options - Generation options
   */
  generateImage: async (characterImage, productImage, options = {}) => {
    const formData = new FormData();
    formData.append('characterImage', characterImage);
    formData.append('productImage', productImage);
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }
    // Send both analysis and image gen provider
    const provider = options.provider || 'grok';
    formData.append('analysisProvider', provider);
    formData.append('imageGenProvider', provider);
    formData.append('useRealAnalysis', 'true');
    return api.postFormData('/v1/browser-automation/generate-image', formData);
  },
  
  /**
   * Generate image only (using existing analysis)
   * @param {string} prompt - Generation prompt
   * @param {string} provider - Provider to use (grok, zai-image)
   */
  generateImageOnly: async (prompt, provider = 'grok') => {
    return api.post('/v1/browser-automation/generate-image-browser', { prompt, provider });
  },
  
  /**
   * Generate video using browser automation
   * @param {Object} videoData - Video generation data
   * @param {string} videoData.duration - Video duration (20, 30, 40)
   * @param {string} videoData.scenario - Video scenario (dancing, product-intro, etc.)
   * @param {Array} videoData.segments - Array of prompt segments
   * @param {string} videoData.sourceImage - Source image URL
   * @param {string} videoData.characterImage - Character image URL
   * @param {string} videoData.productImage - Product image URL
   */
  generateVideo: async (videoData) => {
    const payload = {
      duration: videoData.duration,
      scenario: videoData.scenario,
      segments: videoData.segments,
      sourceImage: videoData.sourceImage,
      characterImage: videoData.characterImage,
      productImage: videoData.productImage,
      provider: 'grok'  // Grok is the default video provider
    };
    return api.post('/v1/browser-automation/generate-video', payload);
  },

  /**
   * Generate video segment prompts from Grok AI (legacy)
   * @param {number} duration - Video duration (20, 30, 40, etc.)
   * @param {string} scenario - Video scenario (product-intro, fashion-show, styling-tips, unboxing)
   * @param {number} segments - Number of segments (default: 3)
   * @param {string} style - Style of prompts (professional, creative, casual)
   */
  generateVideoPrompts: async (duration, scenario, segments = 3, style = 'professional') => {
    const payload = {
      duration,
      scenario,
      segments,
      style
    };
    return api.post('/api/videos/generate-prompts', payload);
  },

  /**
   * Generate video segment prompts using ChatGPT browser service
   * This is the main endpoint for video prompt enhancement
   * @param {number} duration - Video duration (20, 30, 40, etc.)
   * @param {string} scenario - Video scenario
   * @param {number} segments - Number of segments
   * @param {string} style - Style of prompts
   * @param {string} videoProvider - Video provider (grok or google-flow)
   * @param {string} useCase - Optional content use case
   * @param {string} aspectRatio - Video aspect ratio
   */
  generateVideoPromptsChatGPT: async (
    duration, 
    scenario, 
    segments = 3, 
    style = 'professional',
    videoProvider = 'grok',
    useCase = null,
    aspectRatio = '16:9'
  ) => {
    const payload = {
      duration,
      scenario,
      segments,
      style,
      videoProvider,
      useCase,
      aspectRatio
    };
    return api.post('/api/videos/generate-prompts-chatgpt', payload);
  },

  /**
   * 💫 NEW: Generate multi-video sequence with content use cases
   * Supports frame chaining and ChatGPT-based prompting
   * @param {Object} options - Multi-video generation options
   */
  generateMultiVideoSequence: async (options = {}) => {
    const payload = {
      sessionId: options.sessionId || `session-${Date.now()}`,
      useCase: options.useCase,  // 'change-clothes', 'product-showcase', 'styling-guide', etc.
      refImage: options.refImage || null,  // Base64 reference image
      analysis: options.analysis || null,  // Analysis data from previous steps
      duration: options.duration || 20,    // Total duration
      quality: options.quality || 'high',  // low, medium, high
      aspectRatio: options.aspectRatio || '16:9',  // 16:9, 9:16, 1:1
      videoProvider: options.videoProvider || 'google-flow'  // google-flow, grok
    };

    return api.post('/v1/browser-automation/generate-multi-video-sequence', payload);
  },
  
  /**
   * Full workflow: Analyze + Generate image + optional video
   * @param {File} characterImage - Character image file
   * @param {File} clothingImage - Clothing image file
   * @param {string} provider - Provider to use
   * @param {boolean} generateVideo - Whether to generate video
   */
  fullWorkflow: async (characterImage, clothingImage, provider = 'grok', generateVideo = false) => {
    const formData = new FormData();
    formData.append('characterImage', characterImage);
    formData.append('clothingImage', clothingImage);
    formData.append('provider', provider);
    formData.append('generateVideo', generateVideo);
    return api.postFormData('/v1/browser-automation/generate-image', formData);
  },
};

// ============================================
// PROVIDER APIs (Provider Manager)
// ============================================

export const providersAPI = {
  // Get all providers and their models
  getAll: () => api.get('/providers'),

  // Update provider (settings, enabled status)
  update: (id, data) => api.put(`/providers/${id}`, data),

  // Reorder providers
  reorder: (orderedIds) => api.post('/providers/reorder', { orderedIds }),

  // Add API Key
  addKey: (providerId, key, label) => 
    api.post(`/providers/${providerId}/keys`, { action: 'add', keyData: { key, label } }),

  // Remove API Key
  removeKey: (providerId, keyId) => 
    api.post(`/providers/${providerId}/keys`, { action: 'remove', keyData: { keyId } }),

  // Update Key Status
  updateKey: (providerId, keyId, status) => 
    api.post(`/providers/${providerId}/keys`, { action: 'update', keyData: { keyId, status } }),

  // Sync models
  syncModels: (force = false) => api.post('/providers/sync', { force })
};

export default api;
