/**
 * Gallery Service
 * Handles all gallery-related API calls
 */

import axiosInstance from './axios';

// ============================================
// GALLERY API ENDPOINTS
// ============================================
const GALLERY_ENDPOINTS = {
  IMAGES: '/gallery/images',
  IMAGE_DETAIL: (id) => `/gallery/images/${id}`,
  FAVORITES: '/gallery/favorites',
  TOGGLE_FAVORITE: (id) => `/gallery/images/${id}/favorite`,
  DELETE: (id) => `/gallery/images/${id}`,
  EXPORT: '/gallery/export',
  BATCH_EXPORT: '/gallery/batch-export',
  CATEGORIES: '/gallery/categories',
  SEARCH: '/gallery/search',
};

/**
 * Get all gallery images with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Gallery images
 */
export async function getGalleryImages(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.provider) params.append('provider', filters.provider);
    if (filters.dateRange) params.append('dateRange', filters.dateRange);
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await axiosInstance.get(
      `${GALLERY_ENDPOINTS.IMAGES}?${params.toString()}`
    );
    
    return {
      success: true,
      data: response.data.images || response.data,
      pagination: response.data.pagination,
    };
  } catch (error) {
    console.error('[Get Gallery Images Error]', error);
    throw error;
  }
}

/**
 * Get single image details
 * @param {string} imageId - Image ID
 * @returns {Promise<Object>} Image details
 */
export async function getImageDetail(imageId) {
  try {
    const response = await axiosInstance.get(GALLERY_ENDPOINTS.IMAGE_DETAIL(imageId));
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Get Image Detail Error]', error);
    throw error;
  }
}

/**
 * Get favorite images
 * @returns {Promise<Object>} Favorite images
 */
export async function getFavorites() {
  try {
    const response = await axiosInstance.get(GALLERY_ENDPOINTS.FAVORITES);
    
    return {
      success: true,
      data: response.data.images || response.data,
    };
  } catch (error) {
    console.error('[Get Favorites Error]', error);
    throw error;
  }
}

/**
 * Toggle favorite status
 * @param {string} imageId - Image ID
 * @returns {Promise<Object>} Updated image
 */
export async function toggleFavorite(imageId) {
  try {
    const response = await axiosInstance.post(GALLERY_ENDPOINTS.TOGGLE_FAVORITE(imageId));
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Toggle Favorite Error]', error);
    throw error;
  }
}

/**
 * Delete image
 * @param {string} imageId - Image ID
 * @returns {Promise<Object>} Delete result
 */
export async function deleteImage(imageId) {
  try {
    const response = await axiosInstance.delete(GALLERY_ENDPOINTS.DELETE(imageId));
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Delete Image Error]', error);
    throw error;
  }
}

/**
 * Export single image
 * @param {string} imageId - Image ID
 * @returns {Promise<Blob>} Image blob
 */
export async function exportImage(imageId) {
  try {
    const response = await axiosInstance.get(GALLERY_ENDPOINTS.EXPORT, {
      params: { id: imageId },
      responseType: 'blob',
    });
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Export Image Error]', error);
    throw error;
  }
}

/**
 * Batch export images
 * @param {Array<string>} imageIds - Array of image IDs
 * @returns {Promise<Blob>} ZIP blob
 */
export async function batchExportImages(imageIds) {
  try {
    const response = await axiosInstance.post(
      GALLERY_ENDPOINTS.BATCH_EXPORT,
      { imageIds },
      { responseType: 'blob' }
    );
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Batch Export Error]', error);
    throw error;
  }
}

/**
 * Get gallery categories
 * @returns {Promise<Object>} Categories
 */
export async function getCategories() {
  try {
    const response = await axiosInstance.get(GALLERY_ENDPOINTS.CATEGORIES);
    
    return {
      success: true,
      data: response.data.categories || response.data,
    };
  } catch (error) {
    console.error('[Get Categories Error]', error);
    throw error;
  }
}

/**
 * Search gallery
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} Search results
 */
export async function searchGallery(query, filters = {}) {
  try {
    const params = new URLSearchParams({ query });
    
    if (filters.category) params.append('category', filters.category);
    if (filters.provider) params.append('provider', filters.provider);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await axiosInstance.get(
      `${GALLERY_ENDPOINTS.SEARCH}?${params.toString()}`
    );
    
    return {
      success: true,
      data: response.data.results || response.data,
    };
  } catch (error) {
    console.error('[Search Gallery Error]', error);
    throw error;
  }
}

export default {
  getGalleryImages,
  getImageDetail,
  getFavorites,
  toggleFavorite,
  deleteImage,
  exportImage,
  batchExportImages,
  getCategories,
  searchGallery,
};
