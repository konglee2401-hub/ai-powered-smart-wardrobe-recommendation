/**
 * Statistics & Analytics Service
 * Handles all stats-related API calls
 */

import axiosInstance from './axios';
import { API_ENDPOINTS } from '../config/api';

// ============================================
// OVERALL STATISTICS
// ============================================

/**
 * Get overall statistics
 * @returns {Promise<Object>} Overall stats
 */
export async function getOverallStats() {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.STATS);
    
    return {
      success: true,
      data: response.data.stats || response.data,
    };
  } catch (error) {
    console.error('[Get Overall Stats Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy thống kê tổng quan',
      error,
    };
  }
}

// ============================================
// PROVIDER STATISTICS
// ============================================

/**
 * Get provider-specific statistics
 * @returns {Promise<Object>} Provider stats
 */
export async function getProviderStats() {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.STATS_PROVIDERS);
    
    return {
      success: true,
      data: response.data.providers || response.data,
    };
  } catch (error) {
    console.error('[Get Provider Stats Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy thống kê providers',
      error,
    };
  }
}

// ============================================
// USAGE STATISTICS
// ============================================

/**
 * Get usage statistics over time
 * @param {string} timeRange - Time range (7d, 30d, 90d, 1y)
 * @returns {Promise<Object>} Usage stats
 */
export async function getUsageStats(timeRange = '7d') {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.STATS_USAGE}?range=${timeRange}`
    );
    
    return {
      success: true,
      data: response.data.usage || response.data,
    };
  } catch (error) {
    console.error('[Get Usage Stats Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy thống kê sử dụng',
      error,
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate success rate percentage
 * @param {number} successful - Number of successful generations
 * @param {number} total - Total number of generations
 * @returns {string} Success rate percentage
 */
export function calculateSuccessRate(successful, total) {
  if (total === 0) return '0.00';
  return ((successful / total) * 100).toFixed(2);
}

/**
 * Format generation time (milliseconds to human readable)
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time
 */
export function formatGenerationTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Get stats summary for dashboard
 * @returns {Promise<Object>} Dashboard stats summary
 */
export async function getDashboardStats() {
  try {
    const [overallStats, providerStats, usageStats] = await Promise.all([
      getOverallStats(),
      getProviderStats(),
      getUsageStats('7d'),
    ]);
    
    return {
      success: true,
      data: {
        overall: overallStats.data,
        providers: providerStats.data,
        usage: usageStats.data,
      },
    };
  } catch (error) {
    console.error('[Get Dashboard Stats Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy thống kê dashboard',
      error,
    };
  }
}

/**
 * Get performance metrics
 * @returns {Promise<Object>} Performance metrics
 */
export async function getPerformanceMetrics() {
  try {
    const [overallStats, providerStats] = await Promise.all([
      getOverallStats(),
      getProviderStats(),
    ]);
    
    const overall = overallStats.data;
    const providers = providerStats.data;
    
    // Calculate metrics
    const metrics = {
      totalGenerations: overall.total || 0,
      successRate: calculateSuccessRate(overall.successful, overall.total),
      avgGenerationTime: formatGenerationTime(overall.avgGenerationTime || 0),
      fastestProvider: null,
      mostReliableProvider: null,
    };
    
    // Find fastest provider
    if (providers && providers.length > 0) {
      const sorted = [...providers].sort((a, b) => a.avgTime - b.avgTime);
      metrics.fastestProvider = sorted[0]?._id;
      
      // Find most reliable provider
      const sortedBySuccess = [...providers].sort((a, b) => {
        const rateA = calculateSuccessRate(a.successful, a.total);
        const rateB = calculateSuccessRate(b.successful, b.total);
        return parseFloat(rateB) - parseFloat(rateA);
      });
      metrics.mostReliableProvider = sortedBySuccess[0]?._id;
    }
    
    return {
      success: true,
      data: metrics,
    };
  } catch (error) {
    console.error('[Get Performance Metrics Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy performance metrics',
      error,
    };
  }
}

/**
 * Get usage trend (increasing/decreasing)
 * @param {string} timeRange - Time range
 * @returns {Promise<Object>} Usage trend
 */
export async function getUsageTrend(timeRange = '30d') {
  try {
    const usageStats = await getUsageStats(timeRange);
    const usage = usageStats.data;
    
    if (!usage || usage.length < 2) {
      return {
        success: true,
        data: {
          trend: 'stable',
          change: 0,
        },
      };
    }
    
    // Calculate trend
    const firstHalf = usage.slice(0, Math.floor(usage.length / 2));
    const secondHalf = usage.slice(Math.floor(usage.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.count, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.count, 0) / secondHalf.length;
    
    const change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    let trend = 'stable';
    if (change > 10) trend = 'increasing';
    else if (change < -10) trend = 'decreasing';
    
    return {
      success: true,
      data: {
        trend,
        change: change.toFixed(2),
      },
    };
  } catch (error) {
    console.error('[Get Usage Trend Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy usage trend',
      error,
    };
  }
}

export default {
  getOverallStats,
  getProviderStats,
  getUsageStats,
  getDashboardStats,
  getPerformanceMetrics,
  getUsageTrend,
  calculateSuccessRate,
  formatGenerationTime,
};
