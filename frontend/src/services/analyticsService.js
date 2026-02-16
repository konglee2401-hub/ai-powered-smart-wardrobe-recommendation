/**
 * Analytics Service
 * Handles all analytics and statistics API calls
 */

import axiosInstance from './axios';

// ============================================
// ANALYTICS API ENDPOINTS
// ============================================
const ANALYTICS_ENDPOINTS = {
  OVERVIEW: '/api/analytics/overview',
  DAILY_STATS: '/api/analytics/daily',
  PROVIDER_STATS: '/api/analytics/providers',
  CATEGORY_STATS: '/api/analytics/categories',
  TEMPLATE_STATS: '/api/analytics/templates',
  PERFORMANCE: '/api/analytics/performance',
  TRENDS: '/api/analytics/trends',
  EXPORT: '/api/analytics/export',
  // Phase 4 AI Analytics Endpoints
  AI_INSIGHTS: '/api/analytics/ai-insights',
  PREDICTIONS: '/api/analytics/predictions',
  RECOMMENDATIONS: '/api/analytics/recommendations/personalized',
  SMART_SUGGESTIONS: '/api/analytics/suggestions/smart',
  CONTENT_ANALYZE: '/api/analytics/content/analyze',
  CONTENT_SUMMARY: '/api/analytics/content/summary',
  USAGE: '/api/analytics/usage',
  DASHBOARD: '/api/analytics/dashboard',
};

/**
 * Get analytics overview
 * @param {string} timeRange - Time range (week, month, quarter)
 * @returns {Promise<Object>} Analytics overview
 */
export async function getAnalyticsOverview(timeRange = 'week') {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.OVERVIEW}?timeRange=${timeRange}`
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Analytics Overview Error]', error);
    throw error;
  }
}

/**
 * Get daily statistics
 * @param {string} timeRange - Time range (week, month, quarter)
 * @returns {Promise<Object>} Daily statistics
 */
export async function getDailyStats(timeRange = 'week') {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.DAILY_STATS}?timeRange=${timeRange}`
    );
    
    return {
      success: true,
      data: response.data.daily || response.data,
    };
  } catch (error) {
    console.error('[Get Daily Stats Error]', error);
    throw error;
  }
}

/**
 * Get provider statistics
 * @returns {Promise<Object>} Provider statistics
 */
export async function getProviderStats() {
  try {
    const response = await axiosInstance.get(ANALYTICS_ENDPOINTS.PROVIDER_STATS);
    
    return {
      success: true,
      data: response.data.providers || response.data,
    };
  } catch (error) {
    console.error('[Get Provider Stats Error]', error);
    throw error;
  }
}

/**
 * Get category statistics
 * @returns {Promise<Object>} Category statistics
 */
export async function getCategoryStats() {
  try {
    const response = await axiosInstance.get(ANALYTICS_ENDPOINTS.CATEGORY_STATS);
    
    return {
      success: true,
      data: response.data.categories || response.data,
    };
  } catch (error) {
    console.error('[Get Category Stats Error]', error);
    throw error;
  }
}

/**
 * Get template usage statistics
 * @returns {Promise<Object>} Template statistics
 */
export async function getTemplateStats() {
  try {
    const response = await axiosInstance.get(ANALYTICS_ENDPOINTS.TEMPLATE_STATS);
    
    return {
      success: true,
      data: response.data.templates || response.data,
    };
  } catch (error) {
    console.error('[Get Template Stats Error]', error);
    throw error;
  }
}

/**
 * Get performance metrics
 * @returns {Promise<Object>} Performance metrics
 */
export async function getPerformanceMetrics() {
  try {
    const response = await axiosInstance.get(ANALYTICS_ENDPOINTS.PERFORMANCE);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Performance Metrics Error]', error);
    throw error;
  }
}

/**
 * Get trend data
 * @param {string} timeRange - Time range
 * @returns {Promise<Object>} Trend data
 */
export async function getTrends(timeRange = 'week') {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.TRENDS}?timeRange=${timeRange}`
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Trends Error]', error);
    throw error;
  }
}

/**
 * Export analytics data
 * @param {string} timeRange - Time range
 * @param {string} format - Export format (csv, json, pdf)
 * @returns {Promise<Blob>} Exported data
 */
export async function exportAnalytics(timeRange = 'week', format = 'csv') {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.EXPORT}?timeRange=${timeRange}&format=${format}`,
      { responseType: 'blob' }
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Export Analytics Error]', error);
    throw error;
  }
}

// ============================================
// PHASE 4: AI-POWERED ANALYTICS
// ============================================

/**
 * Get AI-powered insights about user behavior
 * @param {string} range - Time range (7d, 30d, 90d, 1y)
 * @returns {Promise<Object>} AI insights
 */
export async function getAIInsights(range = '30d') {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.AI_INSIGHTS}?range=${range}`
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get AI Insights Error]', error);
    throw error;
  }
}

/**
 * Get usage predictions
 * @param {string} range - Time range
 * @returns {Promise<Object>} Predictions data
 */
export async function getPredictions(range = '30d') {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.PREDICTIONS}?range=${range}`
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Predictions Error]', error);
    throw error;
  }
}

/**
 * Get personalized recommendations
 * @param {Object} context - Context for recommendations
 * @returns {Promise<Object>} Recommendations
 */
export async function getPersonalizedRecommendations(context = {}) {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.RECOMMENDATIONS}`,
      { params: context }
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Recommendations Error]', error);
    throw error;
  }
}

/**
 * Get smart suggestions
 * @param {string} context - Context for suggestions
 * @returns {Promise<Object>} Smart suggestions
 */
export async function getSmartSuggestions(context = 'general') {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.SMART_SUGGESTIONS}?context=${context}`
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Smart Suggestions Error]', error);
    throw error;
  }
}

/**
 * Analyze content quality
 * @param {string} generationId - Generation ID
 * @returns {Promise<Object>} Content analysis
 */
export async function analyzeContent(generationId) {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.CONTENT_ANALYZE}/${generationId}`
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Analyze Content Error]', error);
    throw error;
  }
}

/**
 * Get content analysis summary
 * @param {string} range - Time range
 * @returns {Promise<Object>} Content summary
 */
export async function getContentSummary(range = '30d') {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.CONTENT_SUMMARY}?range=${range}`
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Content Summary Error]', error);
    throw error;
  }
}

/**
 * Get usage analytics
 * @param {string} range - Time range
 * @param {string} metric - Specific metric
 * @returns {Promise<Object>} Usage analytics
 */
export async function getUsageAnalytics(range = '30d', metric = 'all') {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.USAGE}?range=${range}&metric=${metric}`
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Usage Analytics Error]', error);
    throw error;
  }
}

/**
 * Get full analytics dashboard
 * @param {string} range - Time range
 * @returns {Promise<Object>} Dashboard data
 */
export async function getDashboard(range = '30d') {
  try {
    const response = await axiosInstance.get(
      `${ANALYTICS_ENDPOINTS.DASHBOARD}?range=${range}`
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Dashboard Error]', error);
    throw error;
  }
}

export default {
  getAnalyticsOverview,
  getDailyStats,
  getProviderStats,
  getCategoryStats,
  getTemplateStats,
  getPerformanceMetrics,
  getTrends,
  exportAnalytics,
  // Phase 4
  getAIInsights,
  getPredictions,
  getPersonalizedRecommendations,
  getSmartSuggestions,
  analyzeContent,
  getContentSummary,
  getUsageAnalytics,
  getDashboard,
};
