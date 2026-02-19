/**
 * Axios Instance with Interceptors
 * Handles authentication, retries, and error handling
 */

import axios from 'axios';
import { API_BASE_URL, API_CONFIG } from '../config/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request counter for retry logic
const requestRetryCount = new Map();

// ============================================
// REQUEST INTERCEPTOR
// ============================================
axiosInstance.interceptors.request.use(
  (config) => {
    // Add authentication token if exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
axiosInstance.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime;
    
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        duration: `${duration}ms`,
        data: response.data,
      });
    }
    
    // Clear retry count on success
    const requestKey = `${response.config.method}_${response.config.url}`;
    requestRetryCount.delete(requestKey);
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // ============================================
    // HANDLE NETWORK ERRORS (No Response)
    // ============================================
    if (!error.response) {
      console.error('[Network Error]', error.message);
      
      // Retry logic for network errors
      if (!originalRequest._retry) {
        const requestKey = `${originalRequest.method}_${originalRequest.url}`;
        const retryCount = requestRetryCount.get(requestKey) || 0;
        
        if (retryCount < API_CONFIG.RETRY.MAX_RETRIES) {
          originalRequest._retry = true;
          requestRetryCount.set(requestKey, retryCount + 1);
          
          // Wait before retrying
          await new Promise(resolve => 
            setTimeout(resolve, API_CONFIG.RETRY.RETRY_DELAY * (retryCount + 1))
          );
          
          console.log(`[Retry ${retryCount + 1}/${API_CONFIG.RETRY.MAX_RETRIES}]`, originalRequest.url);
          return axiosInstance(originalRequest);
        }
      }
      
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        originalError: error,
      });
    }
    
    // ============================================
    // HANDLE HTTP ERRORS (With Response)
    // ============================================
    const { status, data } = error.response;
    
    console.error(`[API Error ${status}]`, {
      url: originalRequest.url,
      status,
      message: data?.error || data?.message || (status === 408 ? API_ERROR_MESSAGES.TIMEOUT : API_ERROR_MESSAGES.SERVER_ERROR),
    });
    
    // Handle specific status codes
    switch (status) {
      case 401: // Unauthorized
        console.warn('[Unauthorized] Redirecting to login...');
        localStorage.removeItem('token');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject({
          message: 'Unauthorized. Please log in again.',
          status,
          data,
        });
      
      case 403: // Forbidden
        return Promise.reject({
          message: 'You do not have permission to access this resource.',
          status,
          data,
        });
      
      case 404: // Not Found
        return Promise.reject({
          message: 'The requested resource was not found.',
          status,
          data,
        });
      
      case 408: // Request Timeout
      case 429: // Too Many Requests
      case 500: // Internal Server Error
      case 502: // Bad Gateway
      case 503: // Service Unavailable
      case 504: // Gateway Timeout
        // Retry logic for server errors
        if (!originalRequest._retry) {
          const requestKey = `${originalRequest.method}_${originalRequest.url}`;
          const retryCount = requestRetryCount.get(requestKey) || 0;
          
          if (retryCount < API_CONFIG.RETRY.MAX_RETRIES) {
            originalRequest._retry = true;
            requestRetryCount.set(requestKey, retryCount + 1);
            
            // Exponential backoff
            const delay = API_CONFIG.RETRY.RETRY_DELAY * Math.pow(2, retryCount);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            console.log(`[Retry ${retryCount + 1}/${API_CONFIG.RETRY.MAX_RETRIES}]`, originalRequest.url);
            return axiosInstance(originalRequest);
          }
        }
        
        return Promise.reject({
          message: data?.error || data?.message || (status === 408 ? API_ERROR_MESSAGES.TIMEOUT : API_ERROR_MESSAGES.SERVER_ERROR),
          status,
          data,
        });
      
      case 422: // Validation Error
        return Promise.reject({
          message: API_ERROR_MESSAGES.VALIDATION_ERROR,
          status,
          data,
          validationErrors: data?.errors || {},
        });
      
      default:
        return Promise.reject({
          message: data?.message || data?.error || API_ERROR_MESSAGES.SERVER_ERROR,
          status,
          data,
        });
    }
  }
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create FormData from object
 */
export function createFormData(data) {
  const formData = new FormData();
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (value instanceof File) {
      formData.append(key, value);
    } else if (value instanceof Blob) {
      formData.append(key, value);
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  
  return formData;
}

/**
 * Validate image file
 */
export function validateImageFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }
  
  // Check file size
  if (file.size > API_CONFIG.UPLOAD.MAX_FILE_SIZE) {
    throw new Error(API_ERROR_MESSAGES.FILE_TOO_LARGE);
  }
  
  // Check file type
  if (!API_CONFIG.UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(API_ERROR_MESSAGES.INVALID_FILE_TYPE);
  }
  
  return true;
}

/**
 * Convert blob URL to File
 */
export async function blobUrlToFile(blobUrl, filename = 'image.jpg') {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

/**
 * Download file from URL
 */
export function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const API_ERROR_MESSAGES = {
  TIMEOUT: 'The request timed out. Please try again.',
  SERVER_ERROR: 'An unexpected server error occurred.',
  VALIDATION_ERROR: 'Please check your input and try again.',
};

export default axiosInstance;
