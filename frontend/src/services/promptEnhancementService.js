/**
 * Prompt Enhancement Service (Frontend)
 * API calls for prompt enhancement functionality
 * 
 * Endpoints:
 * POST /api/prompts/enhance - Enhance prompt
 * POST /api/prompts/analyze - Analyze quality
 * POST /api/prompts/variations - Generate variations
 * POST /api/prompts/check-safety - Check safety
 * POST /api/prompts/optimize - Optimize for use case
 * GET /api/prompts/history - Get user history
 * POST /api/prompts/full-enhancement - Full pipeline
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Enhance a draft prompt using AI
 * @param {string} prompt - Original prompt
 * @param {object} options - Enhancement options
 * @returns {Promise<object>} Enhanced prompt result
 */
export async function enhancePrompt(prompt, options = {}) {
  try {
    const response = await axiosInstance.post('/prompts/enhance', {
      prompt,
      options,
    });
    return response.data;
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    throw error.response?.data || error;
  }
}

/**
 * Analyze prompt quality
 * @param {string} prompt - Prompt to analyze
 * @returns {Promise<object>} Quality analysis result
 */
export async function analyzePromptQuality(prompt) {
  try {
    const response = await axiosInstance.post('/prompts/analyze', {
      prompt,
    });
    return response.data;
  } catch (error) {
    console.error('Error analyzing prompt quality:', error);
    throw error.response?.data || error;
  }
}

/**
 * Generate prompt variations
 * @param {string} prompt - Base prompt
 * @param {number} count - Number of variations (1-5)
 * @returns {Promise<object>} Variations result
 */
export async function generatePromptVariations(prompt, count = 3) {
  try {
    const response = await axiosInstance.post('/prompts/variations', {
      prompt,
      count,
    });
    return response.data;
  } catch (error) {
    console.error('Error generating variations:', error);
    throw error.response?.data || error;
  }
}

/**
 * Check prompt safety
 * @param {string} prompt - Prompt to check
 * @returns {Promise<object>} Safety check result
 */
export async function checkPromptSafety(prompt) {
  try {
    const response = await axiosInstance.post('/prompts/check-safety', {
      prompt,
    });
    return response.data;
  } catch (error) {
    console.error('Error checking prompt safety:', error);
    throw error.response?.data || error;
  }
}

/**
 * Optimize prompt for image or video generation
 * @param {string} prompt - Prompt to optimize
 * @param {string} type - 'image' or 'video'
 * @returns {Promise<object>} Optimization result
 */
export async function optimizePrompt(prompt, type = 'image') {
  try {
    const response = await axiosInstance.post('/prompts/optimize', {
      prompt,
      type,
    });
    return response.data;
  } catch (error) {
    console.error('Error optimizing prompt:', error);
    throw error.response?.data || error;
  }
}

/**
 * Full enhancement pipeline
 * @param {string} prompt - Original prompt
 * @param {object} options - Pipeline options
 * @returns {Promise<object>} Full enhancement result
 */
export async function fullEnhancement(prompt, options = {}) {
  try {
    const response = await axiosInstance.post('/prompts/full-enhancement', {
      prompt,
      options: {
        generateVariations: options.generateVariations ?? true,
        variationCount: options.variationCount ?? 3,
        checkSafety: options.checkSafety ?? true,
        optimizeFor: options.optimizeFor || null,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error in full enhancement:', error);
    throw error.response?.data || error;
  }
}

/**
 * Get prompt enhancement history
 * @param {object} params - Query parameters
 * @returns {Promise<object>} History result
 */
export async function getPromptHistory(params = {}) {
  try {
    const response = await axiosInstance.get('/prompts/history', {
      params: {
        limit: params.limit || 20,
        page: params.page || 1,
        userId: params.userId,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting prompt history:', error);
    throw error.response?.data || error;
  }
}

/**
 * Get specific prompt history by ID
 * @param {string} id - History ID
 * @returns {Promise<object>} History detail
 */
export async function getPromptHistoryById(id) {
  try {
    const response = await axiosInstance.get(`/api/prompts/history/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error getting prompt history by ID:', error);
    throw error.response?.data || error;
  }
}

/**
 * Delete prompt history by ID
 * @param {string} id - History ID
 * @returns {Promise<object>} Delete result
 */
export async function deletePromptHistory(id) {
  try {
    const response = await axiosInstance.delete(`/api/prompts/history/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting prompt history:', error);
    throw error.response?.data || error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get quality level based on score
 * @param {number} score - Quality score (0-100)
 * @returns {string} Quality level
 */
export function getQualityLevel(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Get color for quality level
 * @param {string} level - Quality level
 * @returns {string} CSS color
 */
export function getQualityColor(level) {
  const colors = {
    excellent: '#10b981', // green
    good: '#3b82f6',      // blue
    fair: '#f59e0b',      // yellow
    poor: '#ef4444',      // red
  };
  return colors[level] || '#6b7280';
}

/**
 * Format processing time
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time
 */
export function formatProcessingTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default {
  enhancePrompt,
  analyzePromptQuality,
  generatePromptVariations,
  checkPromptSafety,
  optimizePrompt,
  fullEnhancement,
  getPromptHistory,
  getPromptHistoryById,
  deletePromptHistory,
  getQualityLevel,
  getQualityColor,
  formatProcessingTime,
};
