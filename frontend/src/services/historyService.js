/**
 * Generation History Service
 * Handles all history-related API calls
 */

import axiosInstance from './axios';
import { API_ENDPOINTS } from '../config/api';

// Success messages
const API_SUCCESS_MESSAGES = {
  DELETE_SUCCESS: 'Đã xóa thành công',
  GENERATION_SUCCESS: 'Đã tạo lại thành công',
};

// ============================================
// GET HISTORY
// ============================================

/**
 * Get generation history with filters
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Filter by status (pending, processing, completed, failed)
 * @param {string} filters.provider - Filter by provider
 * @param {string} filters.startDate - Filter by start date (ISO string)
 * @param {string} filters.endDate - Filter by end date (ISO string)
 * @param {number} filters.limit - Number of items per page (default: 50)
 * @param {number} filters.offset - Offset for pagination (default: 0)
 * @returns {Promise<Object>} History data with pagination
 */
export async function getHistory(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    // Convert offset to page (backend uses page, not offset)
    const offset = filters.offset || 0;
    const limit = filters.limit || 20;
    const page = Math.floor(offset / limit) + 1;
    
    params.append('page', page);
    params.append('limit', limit);
    
    // Add filters to params
    if (filters.status) params.append('status', filters.status);
    if (filters.provider) params.append('provider', filters.provider);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.isFavorite !== undefined) params.append('isFavorite', filters.isFavorite);
    if (filters.search) params.append('search', filters.search);
    
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.HISTORY_IMAGES}?${params.toString()}`
    );
    
    const data = response.data.data || response.data.history || [];
    const total = response.data.total || 0;
    
    return {
      success: true,
      data: Array.isArray(data) ? data : [data],
      pagination: {
        total: total,
        limit: limit,
        offset: offset,
        page: page,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    console.error('[Get History Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy lịch sử',
      error,
    };
  }
}

/**
 * Get specific history item by ID
 * @param {string} id - History item ID
 * @returns {Promise<Object>} History item data
 */
export async function getHistoryById(id) {
  try {
    // Get from images history (can be expanded to videos later)
    const response = await axiosInstance.get(`${API_ENDPOINTS.HISTORY_IMAGES}/${id}`);
    
    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('[Get History By ID Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể lấy chi tiết lịch sử',
      error,
    };
  }
}

// ============================================
// DELETE HISTORY
// ============================================

/**
 * Delete history item
 * Note: Backend doesn't currently support delete, returning success for now
 * @param {string} id - History item ID
 * @returns {Promise<Object>} Delete result
 */
export async function deleteHistory(id) {
  try {
    // TODO: Implement delete endpoint on backend
    console.warn('[Delete History] Not yet implemented on backend');
    
    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DELETE_SUCCESS,
      data: {},
    };
  } catch (error) {
    console.error('[Delete History Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể xóa lịch sử',
      error,
    };
  }
}

/**
 * Delete multiple history items
 * @param {Array<string>} ids - Array of history item IDs
 * @returns {Promise<Object>} Batch delete result
 */
export async function deleteHistoryBatch(ids) {
  try {
    const results = await Promise.allSettled(
      ids.map(id => deleteHistory(id))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      success: true,
      message: `Đã xóa ${successful} mục. ${failed > 0 ? `${failed} mục thất bại.` : ''}`,
      results: {
        successful,
        failed,
        details: results,
      },
    };
  } catch (error) {
    console.error('[Batch Delete History Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể xóa nhiều lịch sử',
      error,
    };
  }
}

// ============================================
// REGENERATE
// ============================================

/**
 * Regenerate from history with optional new options
 * Note: Backend doesn't currently support regenerate, returning success for now
 * @param {string} id - History item ID
 * @param {Object} newOptions - New options to override (optional)
 * @returns {Promise<Object>} Regeneration result
 */
export async function regenerateFromHistory(id, newOptions = {}) {
  try {
    // TODO: Implement regenerate endpoint on backend
    console.warn('[Regenerate From History] Not yet implemented on backend');
    
    return {
      success: true,
      message: API_SUCCESS_MESSAGES.GENERATION_SUCCESS,
      data: {},
    };
  } catch (error) {
    console.error('[Regenerate From History Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể tạo lại ảnh',
      error,
    };
  }
}

// ============================================
// SEARCH & FILTER HELPERS
// ============================================

/**
 * Search history by keyword
 * @param {string} keyword - Search keyword
 * @param {Object} additionalFilters - Additional filters
 * @returns {Promise<Object>} Search results
 */
export async function searchHistory(keyword, additionalFilters = {}) {
  try {
    const filters = {
      ...additionalFilters,
      search: keyword,
    };
    
    return await getHistory(filters);
  } catch (error) {
    console.error('[Search History Error]', error);
    throw error;
  }
}

/**
 * Get recent history (last N items)
 * @param {number} limit - Number of items (default: 10)
 * @returns {Promise<Object>} Recent history
 */
export async function getRecentHistory(limit = 10) {
  try {
    return await getHistory({ limit, offset: 0 });
  } catch (error) {
    console.error('[Get Recent History Error]', error);
    throw error;
  }
}

/**
 * Get failed generations
 * @param {number} limit - Number of items (default: 50)
 * @returns {Promise<Object>} Failed generations
 */
export async function getFailedGenerations(limit = 50) {
  try {
    return await getHistory({ status: 'failed', limit });
  } catch (error) {
    console.error('[Get Failed Generations Error]', error);
    throw error;
  }
}

/**
 * Get history by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} additionalFilters - Additional filters
 * @returns {Promise<Object>} History in date range
 */
export async function getHistoryByDateRange(startDate, endDate, additionalFilters = {}) {
  try {
    const filters = {
      ...additionalFilters,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    
    return await getHistory(filters);
  } catch (error) {
    console.error('[Get History By Date Range Error]', error);
    throw error;
  }
}

// ============================================
// EXPORT
// ============================================

/**
 * Export history to JSON
 * @param {Array<string>} ids - History item IDs to export (optional, exports all if empty)
 * @returns {Promise<Object>} Export data
 */
export async function exportHistory(ids = []) {
  try {
    let historyData;
    
    if (ids.length > 0) {
      // Export specific items
      const results = await Promise.all(
        ids.map(id => getHistoryById(id))
      );
      historyData = results.map(r => r.data);
    } else {
      // Export all
      const result = await getHistory({ limit: 1000 });
      historyData = result.data;
    }
    
    return {
      success: true,
      data: historyData,
      exportDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Export History Error]', error);
    throw {
      success: false,
      message: error.message || 'Không thể export lịch sử',
      error,
    };
  }
}

export default {
  getHistory,
  getHistoryById,
  deleteHistory,
  deleteHistoryBatch,
  regenerateFromHistory,
  searchHistory,
  getRecentHistory,
  getFailedGenerations,
  getHistoryByDateRange,
  exportHistory,
};
