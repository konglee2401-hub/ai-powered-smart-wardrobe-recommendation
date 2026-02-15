/**
 * Centralized API Configuration
 * All API endpoints and configurations in one place
 */

// Base API URL from environment variable
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// API Endpoints
export const API_ENDPOINTS = {
  // ============================================
  // PRODUCT PHOTOGRAPHY GENERATION
  // ============================================
  GENERATE: `${API_BASE_URL}/generate`,
  OPTIONS: `${API_BASE_URL}/options`,
  PROVIDERS: `${API_BASE_URL}/providers`,
  TEST: `${API_BASE_URL}/test`,
  
  // ============================================
  // GENERATION HISTORY
  // ============================================
  HISTORY: `${API_BASE_URL}/history`,
  HISTORY_BY_ID: (id) => `${API_BASE_URL}/history/${id}`,
  HISTORY_DELETE: (id) => `${API_BASE_URL}/history/${id}`,
  HISTORY_REGENERATE: (id) => `${API_BASE_URL}/history/${id}/regenerate`,
  
  // ============================================
  // STATISTICS & ANALYTICS
  // ============================================
  STATS: `${API_BASE_URL}/stats`,
  STATS_PROVIDERS: `${API_BASE_URL}/stats/providers`,
  STATS_USAGE: `${API_BASE_URL}/stats/usage`,
  
  // ============================================
  // PROMPT TEMPLATES
  // ============================================
  PROMPT_TEMPLATES: `${API_BASE_URL}/prompt-templates`,
  PROMPT_TEMPLATE_BY_ID: (id) => `${API_BASE_URL}/prompt-templates/${id}`,
  PROMPT_TEMPLATE_DELETE: (id) => `${API_BASE_URL}/prompt-templates/${id}`,
  
  // ============================================
  // AUTHENTICATION (if needed)
  // ============================================
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_REGISTER: `${API_BASE_URL}/auth/register`,
  AUTH_LOGOUT: `${API_BASE_URL}/auth/logout`,
  AUTH_ME: `${API_BASE_URL}/auth/me`,
  
  // ============================================
  // AI OPTIONS
  // ============================================
  AI_OPTIONS: `${API_BASE_URL}/ai/options`,
  AI_DISCOVER_OPTIONS: `${API_BASE_URL}/ai/discover-options`,
  
  // ============================================
  // IMAGE GENERATION
  // ============================================
  IMAGE_GENERATE: `${API_BASE_URL}/image/generate`,
  IMAGE_UPLOAD: `${API_BASE_URL}/image/upload`,
  
  // ============================================
  // N8N INTEGRATION (existing)
  // ============================================
  N8N_WEBHOOK: import.meta.env.VITE_N8N_WEBHOOK_URL || '',
};

// API Configuration
export const API_CONFIG = {
  // Request timeout (2 minutes for image generation)
  TIMEOUT: 120000,
  
  // Retry configuration
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],
  },
  
  // Upload configuration
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  },
  
  // Polling configuration (for async generation)
  POLLING: {
    INTERVAL: 2000, // 2 seconds
    MAX_ATTEMPTS: 60, // 2 minutes total
  },
};

// Error Messages
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
  TIMEOUT: 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy tài nguyên yêu cầu.',
  SERVER_ERROR: 'Lỗi server. Vui lòng thử lại sau.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  FILE_TOO_LARGE: 'File quá lớn. Kích thước tối đa là 10MB.',
  INVALID_FILE_TYPE: 'Định dạng file không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP.',
};

// Success Messages
export const API_SUCCESS_MESSAGES = {
  GENERATION_SUCCESS: 'Tạo ảnh thành công!',
  SAVE_SUCCESS: 'Lưu thành công!',
  DELETE_SUCCESS: 'Xóa thành công!',
  UPDATE_SUCCESS: 'Cập nhật thành công!',
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  API_CONFIG,
  API_ERROR_MESSAGES,
  API_SUCCESS_MESSAGES,
};
